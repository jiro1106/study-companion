import type { BrowserWindowConstructorOptions } from 'electron'

export const windowOptions = {
  width: 960,
  height: 640,
  resizable: true,
  title: 'BARDHIE',
  webPreferences: {
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true
  }
} satisfies BrowserWindowConstructorOptions
