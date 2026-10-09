import { join } from 'node:path'
import { app, BrowserWindow, globalShortcut, ipcMain, screen } from 'electron'

import { windowOptions } from './window-options'

// ── Window references ───────────────────────────────────

let mainWindow: BrowserWindow | null = null
let floatingWindow: BrowserWindow | null = null

// ── Floating window dimensions ──────────────────────────

const SLEEPING_SIZE = { width: 110, height: 110 }
const AWAKE_SIZE = { width: 400, height: 520 }

// ── Window creation ─────────────────────────────────────

/**
 * Create the main application window.
 * Called on-demand when the user clicks "maximize" in the popup.
 */
export async function createWindow(): Promise<BrowserWindow> {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show()
    mainWindow.focus()
    return mainWindow
  }

  const window = new BrowserWindow({
    ...windowOptions,
    webPreferences: {
      ...windowOptions.webPreferences,
      preload: join(__dirname, '../preload/index.js')
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    await window.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    await window.loadFile(join(__dirname, '../renderer/index.html'))
  }

  window.on('closed', () => {
    mainWindow = null
  })

  mainWindow = window
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
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    title: 'BARDHIE Assistant',
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

  ipcMain.on('floating:hide', () => {
    if (floatingWindow && !floatingWindow.isDestroyed()) {
      floatingWindow.hide()
    }
  })
}

// ── Global shortcut ─────────────────────────────────────

function registerShortcut(): void {
  const accelerator = 'CommandOrControl+Shift+B'

  const registered = globalShortcut.register(accelerator, () => {
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
      `[BARDHIE] Failed to register global shortcut: ${accelerator}. ` +
      'It may conflict with another application.'
    )
  }
}

// ── Error handling ──────────────────────────────────────

function handleStartupError(error: unknown): void {
  console.error('Failed to start BARDHIE', error)
  app.exit(1)
}

// ── Application lifecycle ───────────────────────────────

app.whenReady()
  .then(async () => {
    setupIPC()

    // Start with the floating mascot (not the main window)
    await createFloatingWindow()

    registerShortcut()

    app.on('activate', () => {
      // macOS: re-create the floating window if nothing is open
      if (BrowserWindow.getAllWindows().length === 0) {
        void createFloatingWindow().catch(handleStartupError)
      }
    })
  })
  .catch(handleStartupError)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})
