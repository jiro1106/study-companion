import { app, Notification, BrowserWindow } from 'electron'
import { readFile, writeFile } from 'node:fs/promises'
import { existsSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import type { FocusModeResult, FocusModeStatus } from '../shared/types'

const execAsync = promisify(exec)

const HOSTS_PATH = 'C:\\Windows\\System32\\drivers\\etc\\hosts'
const BACKUP_PATH = 'C:\\Windows\\System32\\drivers\\etc\\hosts.bardhie.bak'

import {
  BLOCK_START_MARKER,
  BLOCK_END_MARKER,
  DISPLAY_BLOCKED_SITES,
  BLOCKED_DOMAINS
} from '../shared/focus-config'

export {
  BLOCK_START_MARKER,
  BLOCK_END_MARKER,
  DISPLAY_BLOCKED_SITES,
  BLOCKED_DOMAINS
}

let watcherInterval: NodeJS.Timeout | null = null
let lastAlertTime = 0

/**
 * Checks if the BARDHIE focus block is currently present in the Windows hosts file.
 * Reading hosts file does not require admin privileges.
 */
export async function isFocusModeActive(): Promise<boolean> {
  if (process.platform !== 'win32') return false
  try {
    const content = await readFile(HOSTS_PATH, 'utf8')
    return content.includes(BLOCK_START_MARKER)
  } catch {
    return false
  }
}

/**
 * Returns the current focus mode status.
 */
export async function getFocusModeStatus(): Promise<FocusModeStatus> {
  const active = await isFocusModeActive()
  return {
    enabled: active,
    blockedSites: DISPLAY_BLOCKED_SITES
  }
}

/**
 * Generates the hosts file block content with both IPv4 (0.0.0.0)
 * and IPv6 (::1, ::) entries so dual-stack browsers (Happy Eyeballs)
 * cannot bypass the block via IPv6 AAAA records.
 */
function buildBlockContent(): string {
  const lines = [BLOCK_START_MARKER]
  for (const domain of BLOCKED_DOMAINS) {
    lines.push(`0.0.0.0 ${domain}`)
    lines.push(`::1 ${domain}`)
    lines.push(`:: ${domain}`)
  }
  lines.push(BLOCK_END_MARKER)
  return lines.join('\r\n')
}

/**
 * Ensures the PowerShell helper script exists in the user data directory.
 */
function getHelperScriptPath(): string {
  const dir = app.getPath('userData')
  const scriptPath = join(dir, 'bardhie-focus-manager.ps1')

  const scriptContent = `param(
    [string]$Action = "enable"
)

$hostsPath = "${HOSTS_PATH.replace(/\\/g, '\\\\')}"
$backupPath = "${BACKUP_PATH.replace(/\\/g, '\\\\')}"

try {
    # 1. Create a safe backup if not already present
    if (-not (Test-Path $backupPath)) {
        Copy-Item -Path $hostsPath -Destination $backupPath -Force -ErrorAction SilentlyContinue
    }

    $existing = ""
    if (Test-Path $hostsPath) {
        $existing = [System.IO.File]::ReadAllText($hostsPath, [System.Text.Encoding]::UTF8)
    }

    # 2. Strip any existing BARDHIE block
    $pattern = "(?s)\\r?\\n?# === BARDHIE FOCUS BLOCK START ===.*?# === BARDHIE FOCUS BLOCK END ===\\r?\\n?"
    $cleaned = [System.Text.RegularExpressions.Regex]::Replace($existing, $pattern, "").TrimEnd()

    if ($Action -eq "enable") {
        $block = @"
${buildBlockContent()}
"@
        $final = if ([string]::IsNullOrWhiteSpace($cleaned)) { $block } else { $cleaned + "\`r\`n\`r\`n" + $block + "\`r\`n" }
    } else {
        $final = if ([string]::IsNullOrWhiteSpace($cleaned)) { "" } else { $cleaned + "\`r\`n" }
    }

    # 3. Ensure not read-only
    Set-ItemProperty -Path $hostsPath -Name IsReadOnly -Value $false -ErrorAction SilentlyContinue

    # 4. Write new content
    [System.IO.File]::WriteAllText($hostsPath, $final, [System.Text.Encoding]::UTF8)

    # 5. Flush DNS cache across the OS for both IPv4 and IPv6
    ipconfig /flushdns | Out-Null
    Clear-DnsClientCache -ErrorAction SilentlyContinue | Out-Null
    netsh interface ip delete arpcache -ErrorAction SilentlyContinue | Out-Null
    exit 0
} catch {
    exit 1
}
`
  writeFileSync(scriptPath, scriptContent, 'utf8')
  return scriptPath
}

/**
 * Enables or disables focus mode on Windows by editing the hosts file with elevation.
 */
export async function setFocusMode(enable: boolean): Promise<FocusModeResult> {
  if (process.platform !== 'win32') {
    return {
      ok: false,
      enabled: false,
      error: 'Focus mode website blocking is currently supported on Windows.'
    }
  }

  const currentlyActive = await isFocusModeActive()
  if (enable && currentlyActive) {
    startDistractionWatcher()
    return { ok: true, enabled: true }
  }
  if (!enable && !currentlyActive) {
    stopDistractionWatcher()
    return { ok: true, enabled: false }
  }

  const scriptPath = getHelperScriptPath()
  const action = enable ? 'enable' : 'disable'

  // First attempt: try direct write in case process is already elevated
  try {
    const existing = existsSync(HOSTS_PATH) ? await readFile(HOSTS_PATH, 'utf8') : ''
    const pattern = /(?:\r?\n)?# === BARDHIE FOCUS BLOCK START ===[\s\S]*?# === BARDHIE FOCUS BLOCK END ===(?:\r?\n)?/
    const cleaned = existing.replace(pattern, '').trimEnd()

    let finalContent = ''
    if (enable) {
      finalContent = (cleaned.length > 0 ? cleaned + '\r\n\r\n' : '') + buildBlockContent() + '\r\n'
    } else {
      finalContent = cleaned.length > 0 ? cleaned + '\r\n' : ''
    }

    await writeFile(HOSTS_PATH, finalContent, 'utf8')
    await execAsync('ipconfig /flushdns')
    await execAsync('powershell.exe -NoProfile -Command "Clear-DnsClientCache -ErrorAction SilentlyContinue"')

    if (enable) {
      startDistractionWatcher()
      await refreshBlockedBrowserWindows()
    } else {
      stopDistractionWatcher()
    }
    return { ok: true, enabled: enable }
  } catch {
    // Direct write failed (normal when non-admin) - proceed with elevated PowerShell
  }

  // Second attempt: run helper script elevated with Windows UAC prompt
  try {
    const elevatedCmd = `Start-Process powershell.exe -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File "${scriptPath}" -Action ${action}' -Verb RunAs -WindowStyle Hidden -Wait`
    await execAsync(`powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "${elevatedCmd}"`)

    // Verify effect
    const updatedStatus = await isFocusModeActive()
    if (enable && updatedStatus) {
      startDistractionWatcher()
      await refreshBlockedBrowserWindows()
      return { ok: true, enabled: true }
    } else if (!enable && !updatedStatus) {
      stopDistractionWatcher()
      return { ok: true, enabled: false }
    } else {
      return {
        ok: false,
        enabled: updatedStatus,
        error: enable
          ? 'Permission was granted, but the hosts file was not updated.'
          : 'Could not remove the block from hosts file.'
      }
    }
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err)
    const isCancelled =
      errMsg.includes('canceled') ||
      errMsg.includes('cancelled') ||
      errMsg.includes('1223') ||
      errMsg.includes('0x800704C7')

    return {
      ok: false,
      enabled: await isFocusModeActive(),
      error: isCancelled
        ? 'Administrator permission was cancelled. Websites could not be blocked.'
        : `Failed to update focus mode: ${errMsg}`
    }
  }
}

/**
 * Hard-refreshes any open browser windows displaying social media.
 * Sends Ctrl+F5 to bypass browser cache and socket pool, causing the tab
 * to immediately reload into the 0.0.0.0/::1 block without closing the browser.
 */
export async function refreshBlockedBrowserWindows(): Promise<void> {
  if (process.platform !== 'win32') return
  try {
    const script = `
Add-Type -AssemblyName System.Windows.Forms -ErrorAction SilentlyContinue
Add-Type -AssemblyName Microsoft.VisualBasic -ErrorAction SilentlyContinue

$socialPattern = "facebook|tiktok|instagram|messenger|twitter|(\\/|\\b)\\s*X\\s*(\\-|\u2014|\u2013|\\|)|(\\bX\\b.*(Chrome|Edge|Firefox|Brave|Opera|Vivaldi))"
$browserNames = @('chrome', 'msedge', 'firefox', 'brave', 'opera', 'vivaldi')

$targets = Get-Process -ErrorAction SilentlyContinue | Where-Object {
    $_.ProcessName -in $browserNames -and $_.MainWindowTitle -match $socialPattern
}

foreach ($proc in $targets) {
    try {
        [Microsoft.VisualBasic.Interaction]::AppActivate($proc.Id)
        Start-Sleep -Milliseconds 120
        [System.Windows.Forms.SendKeys]::SendWait("^{F5}")
        Start-Sleep -Milliseconds 80
    } catch {
    }
}
`
    await execAsync(`powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "${script.replace(/\r?\n/g, '; ')}"`, {
      timeout: 3000
    })

    // Return focus to BARDHIE window
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        win.show()
        win.focus()
      }
    }
  } catch {
    // Ignore errors during tab refresh
  }
}

/**
 * Real-time watcher: runs every 2s while focus mode is active.
 * Checks for open browser windows with social media titles to alert the student
 * and auto-refresh the tab to prevent viewing previously loaded content.
 */
export function startDistractionWatcher(): void {
  if (watcherInterval) return

  watcherInterval = setInterval(async () => {
    try {
      // Query running window titles for social media
      const psCmd = `Get-Process | Where-Object { $_.MainWindowTitle } | Select-Object -ExpandProperty MainWindowTitle`
      const { stdout } = await execAsync(`powershell.exe -NoProfile -Command "${psCmd}"`, {
        timeout: 2000
      })

      const lines = stdout.split(/\r?\n/)
      for (const title of lines) {
        const trimmed = title.trim()
        if (!trimmed) continue

        let detectedSite: string | null = null
        if (/facebook/i.test(trimmed)) detectedSite = 'Facebook'
        else if (/tiktok/i.test(trimmed)) detectedSite = 'TikTok'
        else if (/instagram/i.test(trimmed)) detectedSite = 'Instagram'
        else if (/messenger/i.test(trimmed)) detectedSite = 'Messenger'
        else if (/\btwitter\b/i.test(trimmed) || /(\/|\b)\s*X\s*(-|—|–|\|)/i.test(trimmed) || /\bX\s*(-|—|\|)\s*(Google Chrome|Microsoft Edge|Firefox|Brave|Opera|Vivaldi)/i.test(trimmed)) {
          detectedSite = 'Twitter / X'
        }

        if (detectedSite) {
          // Auto-refresh the tab so it immediately shows the blocked page
          void refreshBlockedBrowserWindows()

          const now = Date.now()
          if (now - lastAlertTime > 15_000) {
            lastAlertTime = now

            // Notify renderer windows
            for (const win of BrowserWindow.getAllWindows()) {
              if (!win.isDestroyed()) {
                win.webContents.send('focus:distraction-detected', {
                  site: detectedSite,
                  timestamp: now
                })
              }
            }

            // Show OS notification
            if (Notification.isSupported()) {
              new Notification({
                title: '🛡️ BARDHIE Focus Mode Active',
                body: `${detectedSite} was refreshed and blocked during your study session.`,
                silent: false
              }).show()
            }
          }
          break
        }
      }
    } catch {
      // Watcher iteration failed silently
    }
  }, 2000)
}

/**
 * Stops the real-time distraction watcher.
 */
export function stopDistractionWatcher(): void {
  if (watcherInterval) {
    clearInterval(watcherInterval)
    watcherInterval = null
  }
}

/**
 * Cleanup on application exit so the hosts file is never left blocked permanently.
 */
export function cleanupFocusModeSync(): void {
  try {
    stopDistractionWatcher()
    const scriptPath = getHelperScriptPath()
    // Spawn hidden disable process synchronously on quit
    exec(
      `powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Start-Process powershell.exe -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File \\"${scriptPath}\\" -Action disable' -Verb RunAs -WindowStyle Hidden"`
    )
  } catch {
    // Ignore on shutdown
  }
}
