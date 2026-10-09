import { readFileSync, renameSync, writeFile, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { app, BrowserWindow, dialog, type MessageBoxOptions, globalShortcut, ipcMain, powerMonitor, screen, shell } from 'electron'

import { windowOptions } from './window-options'
import { fitToDisplays, parseWindowState, serializeWindowState, type WindowState } from './window-state'
import { cleanupFocusModeSync, isFocusModeActive } from './focus-blocker'
import './ipc-handlers'

let mainWindow: BrowserWindow | null = null
let floatingWindow: BrowserWindow | null = null

const SLEEPING_SIZE = { width: 110, height: 110 }
const AWAKE_SIZE = { width: 400, height: 520 }

// ── Mascot preference (persisted) ───────────────────────

let mascotEnabled = true

function settingsPath(): string {
  return join(app.getPath('userData'), 'settings.json')
}

function loadSettings(): void {
  try {
    const parsed: unknown = JSON.parse(readFileSync(settingsPath(), 'utf8'))
    if (parsed && typeof parsed === 'object' && 'mascotEnabled' in parsed) {
      mascotEnabled = parsed.mascotEnabled !== false
    }
  } catch {
    // First launch or unreadable file: mascot on by default.
  }
}

function saveSettings(): void {
  try {
    writeFileSync(settingsPath(), JSON.stringify({ mascotEnabled }))
  } catch (error) {
    console.error('Could not save Bardy settings', error)
  }
}

/** The mascot shows whenever it is enabled, even with the main window open. */
function syncMascot(): void {
  if (mascotEnabled) {
    if (floatingWindow && !floatingWindow.isDestroyed()) {
      floatingWindow.showInactive()
    } else {
      void createFloatingWindow()
        .then((win) => win.showInactive())
        .catch((err) => console.error('Failed to create floating window:', err))
    }
  } else if (floatingWindow && !floatingWindow.isDestroyed()) {
    floatingWindow.hide()
  }
}

function windowStatePath(): string {
  return join(app.getPath('userData'), 'window-state.json')
}

function loadWindowState(): WindowState {
  let raw: string | null = null
  try {
    raw = readFileSync(windowStatePath(), 'utf8')
  } catch {
    // First launch or unreadable file: use defaults.
  }
  const workAreas = screen.getAllDisplays().map((display) => display.workArea)
  return fitToDisplays(parseWindowState(raw), workAreas)
}

function saveWindowState(window: BrowserWindow): void {
  const bounds = window.getNormalBounds()
  const state: WindowState = {
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    isMaximized: window.isMaximized(),
    isFullScreen: window.isFullScreen()
  }
  try {
    const file = windowStatePath()
    writeFileSync(`${file}.tmp`, serializeWindowState(state))
    renameSync(`${file}.tmp`, file)
  } catch (error) {
    console.error('Could not save Bardy window state', error)
  }
}

/** Create the main window, or focus it if open. Opened from the floating popup. */
export async function createWindow(): Promise<BrowserWindow> {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show()
    mainWindow.focus()
    return mainWindow
  }

  const state = loadWindowState()
  const window = new BrowserWindow({
    ...windowOptions,
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    webPreferences: {
      ...windowOptions.webPreferences,
      preload: join(__dirname, '../preload/index.js')
    }
  })

  mainWindow = window
  window.on('closed', () => {
    mainWindow = null
    if (process.platform !== 'darwin') app.quit()
  })

  if (state.isMaximized) window.maximize()
  if (state.isFullScreen) window.setFullScreen(true)
  window.on('close', () => saveWindowState(window))

  if (process.env.ELECTRON_RENDERER_URL) {
    await window.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    await window.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return window
}

/**
 * Create the floating assistant window.
 * Starts in "sleeping" mode — a tiny transparent always-on-top window.
 */
async function createFloatingWindow(): Promise<BrowserWindow> {
  // Position in the bottom-right of the primary display's work area
  const { workArea } = screen.getPrimaryDisplay()
  const x = workArea.x + workArea.width - SLEEPING_SIZE.width - 24
  const y = workArea.y + workArea.height - SLEEPING_SIZE.height - 24

  const win = new BrowserWindow({
    width: SLEEPING_SIZE.width,
    height: SLEEPING_SIZE.height,
    x,
    y,
    frame: false,
    transparent: true,
    resizable: false,
    show: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    title: 'Bardy Assistant',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: join(__dirname, '../preload/index.js'),
    },
  })

  // Prevent transparent regions from catching mouse events
  win.setIgnoreMouseEvents(false)

  // Load the same renderer with ?floating=true
  if (process.env.ELECTRON_RENDERER_URL) {
    await win.loadURL(`${process.env.ELECTRON_RENDERER_URL}?floating=true`)
  } else {
    await win.loadFile(
      join(__dirname, '../renderer/index.html'),
      { query: { floating: 'true' } }
    )
  }

  win.on('closed', () => {
    floatingWindow = null
  })

  floatingWindow = win
  return win
}

// ── IPC handlers ────────────────────────────────────────

function setupIPC(): void {
  ipcMain.on('floating:set-mode', (_event, mode: string) => {
    if (!floatingWindow || floatingWindow.isDestroyed()) return

    const size = mode === 'awake' ? AWAKE_SIZE : SLEEPING_SIZE

    // Get current position and adjust so the window stays
    // anchored at its bottom-right corner
    const [oldW, oldH] = floatingWindow.getSize()
    const [oldX, oldY] = floatingWindow.getPosition()

    const newX = oldX + oldW - size.width
    const newY = oldY + oldH - size.height

    // Clamp to visible work area
    const { workArea } = screen.getPrimaryDisplay()
    const clampedX = Math.max(workArea.x, Math.min(newX, workArea.x + workArea.width - size.width))
    const clampedY = Math.max(workArea.y, Math.min(newY, workArea.y + workArea.height - size.height))

    floatingWindow.setBounds({
      x: clampedX,
      y: clampedY,
      width: size.width,
      height: size.height,
    })
  })

  ipcMain.on('floating:move', (_event, { deltaX, deltaY }: { deltaX: number; deltaY: number }) => {
    if (!floatingWindow || floatingWindow.isDestroyed()) return
    const [x, y] = floatingWindow.getPosition()
    floatingWindow.setPosition(Math.round(x + deltaX), Math.round(y + deltaY))
  })

  ipcMain.on('floating:maximize', () => {
    void createWindow().catch((err) => {
      console.error('Failed to create main window:', err)
    })
  })

  ipcMain.handle('mascot:get', () => mascotEnabled)

  ipcMain.handle('mascot:set', (_event, enabled: unknown) => {
    mascotEnabled = enabled === true
    saveSettings()
    syncMascot()
    return mascotEnabled
  })

  // The pet's own X button: same as switching the sidebar toggle off.
  ipcMain.on('floating:hide', () => {
    mascotEnabled = false
    saveSettings()
    syncMascot()
  })

  // Open a URL in the system's default browser.
  ipcMain.on('shell:open-external', (_event, url: string) => {
    if (typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))) {
      void shell.openExternal(url)
    }
  })

  // Save text content to a file via native save dialog.
  ipcMain.handle('file:save', async (_event, { content, defaultName }: { content: string; defaultName: string }) => {
    const focusedWin = BrowserWindow.getFocusedWindow() ?? mainWindow ?? undefined
    const result = await dialog.showSaveDialog(focusedWin!, {
      defaultPath: defaultName,
      filters: [
        { name: 'Text files', extensions: ['txt', 'md'] },
        { name: 'All files', extensions: ['*'] },
      ],
    })
    if (result.canceled || !result.filePath) return { saved: false }
    await new Promise<void>((resolve, reject) => {
      writeFile(result.filePath!, content, 'utf8', (err) => (err ? reject(err) : resolve()))
    })
    return { saved: true, filePath: result.filePath }
  })
}

// ── Global shortcut ─────────────────────────────────────

function registerShortcut(): void {
  const accelerator = 'CommandOrControl+Shift+B'

  const registered = globalShortcut.register(accelerator, () => {
    if (!mascotEnabled) return
    if (!floatingWindow || floatingWindow.isDestroyed()) {
      void createFloatingWindow().catch((err) => {
        console.error('Failed to recreate floating window:', err)
      })
      return
    }

    if (floatingWindow.isVisible()) {
      floatingWindow.hide()
    } else {
      floatingWindow.show()
      floatingWindow.focus()
    }
  })

  if (!registered) {
    console.warn(
      `[Bardy] Failed to register global shortcut: ${accelerator}. ` +
      'It may conflict with another application.'
    )
  }
}

function handleStartupError(error: unknown): void {
  console.error('Failed to start Bardy', error)
  app.exit(1)
}

app.whenReady()
  .then(async () => {
    loadSettings()
    setupIPC()

    await createWindow()
    syncMascot()

    registerShortcut()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        void createWindow().catch(handleStartupError)
      }
    })
  })
  .catch(handleStartupError)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// ── Quit confirmation ───────────────────────────────────

let quitConfirmed = false
let confirmingQuit = false

function quitNow(): void {
  quitConfirmed = true
  // Only touch the hosts file (and risk a UAC prompt) if focus mode is actually on.
  void isFocusModeActive().then((active) => {
    if (active) cleanupFocusModeSync()
  })
  app.quit()
}

app.on('before-quit', (event) => {
  if (quitConfirmed) return
  event.preventDefault()
  if (confirmingQuit) return
  confirmingQuit = true

  const parent = mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible() ? mainWindow : undefined
  const options: MessageBoxOptions = {
    type: 'question',
    buttons: ['Quit', 'Cancel'],
    defaultId: 1,
    cancelId: 1,
    message: 'Quit Bardy?',
    detail: 'The mascot will close too.'
  }
  const result = parent ? dialog.showMessageBox(parent, options) : dialog.showMessageBox(options)
  void result.then(({ response }) => {
    confirmingQuit = false
    if (response === 0) quitNow()
  })
})

// Ctrl+C / kill in the terminal and OS shutdown already mean "quit": no prompt.
process.on('SIGINT', quitNow)
process.on('SIGTERM', quitNow)
app.whenReady().then(() => powerMonitor.on('shutdown', () => (quitConfirmed = true)))

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})
