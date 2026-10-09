import { join } from 'node:path'
import { app, BrowserWindow } from 'electron'

import { windowOptions } from './window-options'
import './ipc-handlers'
import { cleanupFocusModeSync } from './focus-blocker'

// Suppress the "Unable to move the cache / Gpu Cache Creation failed" noise
// that Chromium emits on Windows when multiple dev restarts happen in quick
// succession and the previous process hasn't released the cache lock yet.
// This flag is safe for development and has no effect on functionality.
if (process.platform === 'win32') {
  app.commandLine.appendSwitch('disable-gpu-shader-disk-cache')
}

export async function createWindow(): Promise<BrowserWindow> {
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

app.on('before-quit', () => {
  cleanupFocusModeSync()
})
