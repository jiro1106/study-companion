import { app, Notification, BrowserWindow } from 'electron'
import { readFile } from 'node:fs/promises'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import type { FocusModeResult, FocusModeStatus } from '../shared/types'
import {
  BLOCK_START_MARKER,
  BLOCK_END_MARKER,
  DISPLAY_BLOCKED_SITES,
  BLOCKED_DOMAINS,
  FIREWALL_RULE_PREFIX,
  isBlockedBrowserTitle
} from '../shared/focus-config'

const execAsync = promisify(exec)

const HOSTS_PATH = 'C:\\Windows\\System32\\drivers\\etc\\hosts'
const BACKUP_PATH = 'C:\\Windows\\System32\\drivers\\etc\\hosts.bardy.bak'

export {
  BLOCK_START_MARKER,
  BLOCK_END_MARKER,
  DISPLAY_BLOCKED_SITES,
  BLOCKED_DOMAINS,
  FIREWALL_RULE_PREFIX,
  isBlockedBrowserTitle
}

let watcherInterval: NodeJS.Timeout | null = null
let lastAlertTime = 0
let closingTabs = false

/**
 * Checks if the Bardy focus block is currently present in the Windows hosts file.
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

function userDataScript(name: string, content: string): string {
  const dir = app.getPath('userData')
  const scriptPath = join(dir, name)
  writeFileSync(scriptPath, content, 'utf8')
  return scriptPath
}

function psFileCommand(scriptPath: string, extraArgs = ''): string {
  const args = extraArgs ? ` ${extraArgs}` : ''
  return `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}"${args}`
}

/**
 * Ensures the PowerShell helper script exists in the user data directory.
 * On enable it snapshots live IPs, writes hosts, blocks those IPs in the
 * firewall (so already-open sockets die), and flushes DNS.
 */
function getHelperScriptPath(): string {
  const domainLiteral = BLOCKED_DOMAINS.map((d) => `        '${d}'`).join('\r\n')

  const scriptContent = `param(
    [string]$Action = "enable"
)

$hostsPath = "${HOSTS_PATH.replace(/\\/g, '\\\\')}"
$backupPath = "${BACKUP_PATH.replace(/\\/g, '\\\\')}"
$rulePrefix = "${FIREWALL_RULE_PREFIX}"
$domains = @(
${domainLiteral}
)

function Get-BlockedIps {
    $ips = New-Object System.Collections.Generic.HashSet[string]
    foreach ($domain in $domains) {
        try {
            $addrs = [System.Net.Dns]::GetHostAddresses($domain)
            foreach ($addr in $addrs) {
                $text = $addr.IPAddressToString
                if ($text -and $text -ne '0.0.0.0' -and $text -ne '127.0.0.1' -and $text -ne '::1' -and $text -ne '::') {
                    [void]$ips.Add($text)
                }
            }
        } catch {}
    }
    return @($ips)
}

function Set-BardyFirewall {
    param([bool]$Enable, [string[]]$Ips)
    Get-NetFirewallRule -ErrorAction SilentlyContinue |
        Where-Object { $_.DisplayName -like "$rulePrefix*" } |
        Remove-NetFirewallRule -ErrorAction SilentlyContinue
    if (-not $Enable -or $null -eq $Ips -or $Ips.Count -eq 0) { return }
    $chunkSize = 200
    for ($i = 0; $i -lt $Ips.Count; $i += $chunkSize) {
        $end = [Math]::Min($i + $chunkSize - 1, $Ips.Count - 1)
        $chunk = $Ips[$i..$end]
        New-NetFirewallRule -DisplayName "$rulePrefix $i" -Direction Outbound -Action Block -RemoteAddress $chunk -Profile Any -Enabled True -ErrorAction SilentlyContinue | Out-Null
    }
}

try {
    if (-not (Test-Path $backupPath)) {
        Copy-Item -Path $hostsPath -Destination $backupPath -Force -ErrorAction SilentlyContinue
    }

    $existing = ""
    if (Test-Path $hostsPath) {
        $existing = [System.IO.File]::ReadAllText($hostsPath, [System.Text.Encoding]::UTF8)
    }

    $pattern = "(?s)\\r?\\n?# === BARDY FOCUS BLOCK START ===.*?# === BARDY FOCUS BLOCK END ===\\r?\\n?"
    $cleaned = [System.Text.RegularExpressions.Regex]::Replace($existing, $pattern, "").TrimEnd()

    if ($Action -eq "enable") {
        $ips = Get-BlockedIps
        $block = @"
${buildBlockContent()}
"@
        $final = if ([string]::IsNullOrWhiteSpace($cleaned)) { $block } else { $cleaned + "\`r\`n\`r\`n" + $block + "\`r\`n" }
        Set-ItemProperty -Path $hostsPath -Name IsReadOnly -Value $false -ErrorAction SilentlyContinue
        [System.IO.File]::WriteAllText($hostsPath, $final, [System.Text.Encoding]::UTF8)
        Set-BardyFirewall -Enable $true -Ips $ips
    } else {
        $final = if ([string]::IsNullOrWhiteSpace($cleaned)) { "" } else { $cleaned + "\`r\`n" }
        Set-ItemProperty -Path $hostsPath -Name IsReadOnly -Value $false -ErrorAction SilentlyContinue
        [System.IO.File]::WriteAllText($hostsPath, $final, [System.Text.Encoding]::UTF8)
        Set-BardyFirewall -Enable $false -Ips @()
    }

    ipconfig /flushdns | Out-Null
    Clear-DnsClientCache -ErrorAction SilentlyContinue | Out-Null
    netsh interface ip delete arpcache -ErrorAction SilentlyContinue | Out-Null
    exit 0
} catch {
    exit 1
}
`
  return userDataScript('bardy-focus-manager.ps1', scriptContent)
}

async function runFocusHelper(enable: boolean): Promise<void> {
  const scriptPath = getHelperScriptPath()
  const action = enable ? 'enable' : 'disable'

  try {
    await execAsync(psFileCommand(scriptPath, `-Action ${action}`), {
      timeout: 60_000,
      windowsHide: true
    })
    return
  } catch {
    // Not elevated — prompt for administrator permission.
  }

  const elevatedCmd = `Start-Process powershell.exe -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File "${scriptPath}" -Action ${action}' -Verb RunAs -WindowStyle Hidden -Wait`
  await execAsync(`powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "${elevatedCmd}"`, {
    timeout: 120_000,
    windowsHide: true
  })
}

function getNetworkInterruptScriptPath(): string {
  const scriptContent = `$browserExes = @('chrome.exe','msedge.exe','firefox.exe','brave.exe','opera.exe','vivaldi.exe')
Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
  Where-Object {
    $_.Name -in $browserExes -and $_.CommandLine -and (
      $_.CommandLine -match 'network\\.mojom\\.NetworkService' -or
      ($_.Name -eq 'firefox.exe' -and $_.CommandLine -match '(^|\\s)socket(\\s|$)')
    )
  } |
  ForEach-Object {
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
  }
`
  return userDataScript('bardy-interrupt-browser-network.ps1', scriptContent)
}

/**
 * Drops live browser sockets without closing the browser.
 * Chromium keeps DNS cache and HTTP/2 connections in the Network Service
 * process; Firefox uses a dedicated socket process. Restarting those
 * subprocesses forces the next request through the updated hosts file.
 */
export async function interruptBrowserNetwork(): Promise<void> {
  if (process.platform !== 'win32') return
  try {
    await execAsync(psFileCommand(getNetworkInterruptScriptPath()), {
      timeout: 15_000,
      windowsHide: true
    })
  } catch {
    // Ignore — tab closing still runs afterwards.
  }
}

function getCloseBlockedTabsScriptPath(): string {
  const scriptContent = `Add-Type -AssemblyName UIAutomationClient -ErrorAction SilentlyContinue
Add-Type -AssemblyName UIAutomationTypes -ErrorAction SilentlyContinue
Add-Type -AssemblyName System.Windows.Forms -ErrorAction SilentlyContinue
Add-Type -AssemblyName Microsoft.VisualBasic -ErrorAction SilentlyContinue

function Test-BlockedTitle([string]$title) {
  if ([string]::IsNullOrWhiteSpace($title)) { return $false }
  if ($title -match 'facebook') { return $true }
  if ($title -match 'tiktok') { return $true }
  if ($title -match 'instagram') { return $true }
  if ($title -match 'messenger') { return $true }
  if ($title -match 'youtube') { return $true }
  if ($title -match '\\btwitter\\b') { return $true }
  if ($title -match '\\bX\\s*[-–—|]\\s*(Google Chrome|Microsoft Edge|Firefox|Brave|Opera|Vivaldi|Mozilla Firefox)') { return $true }
  if ($title -match '/\\s*X(\\s*[-–—|]|\\s*$)') { return $true }
  if ($title -match '^(\\(\\d+\\)\\s*)?X(\\s*[-–—|]|\\s*$)') { return $true }
  return $false
}

$browserNames = @('chrome','msedge','firefox','brave','opera','vivaldi')

function Close-SocialTabsByCycling {
  $procs = Get-Process -ErrorAction SilentlyContinue | Where-Object {
    $_.ProcessName -in $browserNames -and $_.MainWindowHandle -ne 0
  }
  foreach ($proc in $procs) {
    try {
      [Microsoft.VisualBasic.Interaction]::AppActivate($proc.Id) | Out-Null
      Start-Sleep -Milliseconds 150
      $seen = New-Object 'System.Collections.Generic.HashSet[string]'
      for ($i = 0; $i -lt 24; $i++) {
        $fresh = Get-Process -Id $proc.Id -ErrorAction SilentlyContinue
        if (-not $fresh) { break }
        $title = $fresh.MainWindowTitle
        if (Test-BlockedTitle $title) {
          [System.Windows.Forms.SendKeys]::SendWait("^w")
          Start-Sleep -Milliseconds 120
          continue
        }
        if (-not [string]::IsNullOrWhiteSpace($title)) {
          if (-not $seen.Add($title)) { break }
        }
        [System.Windows.Forms.SendKeys]::SendWait("^{TAB}")
        Start-Sleep -Milliseconds 90
      }
    } catch {}
  }
}

# Fast path: cycle tabs so background social tabs are closed even if they are not focused.
Close-SocialTabsByCycling

# Also close via UI Automation when the accessibility tree exposes tab names.
try {
  $root = [System.Windows.Automation.AutomationElement]::RootElement
  $windowCond = New-Object System.Windows.Automation.PropertyCondition(
    [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
    [System.Windows.Automation.ControlType]::Window
  )
  $windows = $root.FindAll([System.Windows.Automation.TreeScope]::Children, $windowCond)
  $tabCond = New-Object System.Windows.Automation.PropertyCondition(
    [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
    [System.Windows.Automation.ControlType]::TabItem
  )
  $buttonCond = New-Object System.Windows.Automation.PropertyCondition(
    [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
    [System.Windows.Automation.ControlType]::Button
  )

  foreach ($win in $windows) {
    try {
      $procId = $win.Current.ProcessId
      $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
      if (-not $proc -or $proc.ProcessName -notin $browserNames) { continue }

      $tabs = $win.FindAll([System.Windows.Automation.TreeScope]::Descendants, $tabCond)
      foreach ($tab in $tabs) {
        $tabName = $tab.Current.Name
        if (-not (Test-BlockedTitle $tabName)) { continue }
        $closed = $false
        $buttons = $tab.FindAll([System.Windows.Automation.TreeScope]::Children, $buttonCond)
        foreach ($btn in $buttons) {
          if ($btn.Current.Name -match 'Close') {
            $invoke = $btn.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern)
            $invoke.Invoke()
            $closed = $true
            break
          }
        }
        if (-not $closed) {
          try {
            $sel = $tab.GetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern)
            $sel.Select()
            Start-Sleep -Milliseconds 80
            [Microsoft.VisualBasic.Interaction]::AppActivate($procId)
            Start-Sleep -Milliseconds 80
            [System.Windows.Forms.SendKeys]::SendWait("^w")
          } catch {}
        }
      }
    } catch {}
  }
} catch {}
`
  return userDataScript('bardy-close-blocked-tabs.ps1', scriptContent)
}

function focusBardyWindows(): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.show()
      win.focus()
    }
  }
}

/**
 * Closes already-open social media tabs, including background tabs, without
 * quitting the browser. Existing loaded pages would otherwise stay usable
 * because hosts-file DNS blocking does not apply to live connections.
 */
export async function closeBlockedBrowserTabs(): Promise<void> {
  if (process.platform !== 'win32') return
  if (closingTabs) return
  closingTabs = true
  try {
    await execAsync(psFileCommand(getCloseBlockedTabsScriptPath()), {
      timeout: 25_000,
      windowsHide: true
    })
  } catch {
    // Ignore errors during tab close
  } finally {
    closingTabs = false
    focusBardyWindows()
  }
}

/**
 * Makes Focus Mode apply to already-open browser sessions: drop live sockets,
 * then close social tabs (foreground and background).
 */
export async function applyFocusModeToOpenBrowsers(): Promise<void> {
  await interruptBrowserNetwork()
  await closeBlockedBrowserTabs()
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
    await applyFocusModeToOpenBrowsers()
    return { ok: true, enabled: true }
  }
  if (!enable && !currentlyActive) {
    stopDistractionWatcher()
    return { ok: true, enabled: false }
  }

  try {
    await runFocusHelper(enable)

    const updatedStatus = await isFocusModeActive()
    if (enable && updatedStatus) {
      startDistractionWatcher()
      await applyFocusModeToOpenBrowsers()
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

function detectSiteFromTitle(title: string): string | null {
  if (/facebook/i.test(title)) return 'Facebook'
  if (/tiktok/i.test(title)) return 'TikTok'
  if (/instagram/i.test(title)) return 'Instagram'
  if (/messenger/i.test(title)) return 'Messenger'
  if (/youtube/i.test(title)) return 'YouTube'
  if (/\btwitter\b/i.test(title)) return 'Twitter / X'
  if (isBlockedBrowserTitle(title)) return 'Twitter / X'
  return null
}

/**
 * Real-time watcher: runs every 2s while focus mode is active.
 * If a social tab is still open (or is reopened), drop its connections and close it.
 */
export function startDistractionWatcher(): void {
  if (watcherInterval) return

  watcherInterval = setInterval(async () => {
    try {
      const psCmd = `Get-Process | Where-Object { $_.MainWindowTitle } | Select-Object -ExpandProperty MainWindowTitle`
      const { stdout } = await execAsync(`powershell.exe -NoProfile -Command "${psCmd}"`, {
        timeout: 2000,
        windowsHide: true
      })

      const lines = stdout.split(/\r?\n/)
      for (const title of lines) {
        const trimmed = title.trim()
        if (!trimmed) continue

        const detectedSite = detectSiteFromTitle(trimmed)
        if (!detectedSite) continue

        void closeBlockedBrowserTabs()

        const now = Date.now()
        if (now - lastAlertTime > 15_000) {
          lastAlertTime = now

          for (const win of BrowserWindow.getAllWindows()) {
            if (!win.isDestroyed()) {
              win.webContents.send('focus:distraction-detected', {
                site: detectedSite,
                timestamp: now
              })
            }
          }

          if (Notification.isSupported()) {
            new Notification({
              title: '🛡️ Bardy Focus Mode Active',
              body: `${detectedSite} was closed and blocked during your study session.`,
              silent: false
            }).show()
          }
        }
        break
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
    exec(
      `powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Start-Process powershell.exe -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File \\"${scriptPath}\\" -Action disable' -Verb RunAs -WindowStyle Hidden"`
    )
  } catch {
    // Ignore on shutdown
  }
}
