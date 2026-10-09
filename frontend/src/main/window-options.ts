import type { BrowserWindowConstructorOptions } from 'electron'

export const windowOptions = {
  width: 1100,
  height: 720,
  minWidth: 720,
  minHeight: 520,
  resizable: true,
  title: 'Bardy',
  webPreferences: {
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true
  }
} satisfies BrowserWindowConstructorOptions
