import { readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { app, BrowserWindow, screen } from 'electron'

import { windowOptions } from './window-options'
import { fitToDisplays, parseWindowState, serializeWindowState, type WindowState } from './window-state'

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
    console.error('Could not save BARDHIE window state', error)
  }
}

export async function createWindow(): Promise<BrowserWindow> {
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

function handleStartupError(error: unknown): void {
  console.error('Failed to start BARDHIE', error)
  app.exit(1)
}

app.whenReady()
  .then(async () => {
    await createWindow()

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
