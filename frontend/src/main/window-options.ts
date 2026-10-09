import { join } from 'node:path'
import type { BrowserWindowConstructorOptions } from 'electron'

export const windowOptions = {
  width: 1100,
  height: 720,
  minWidth: 720,
  minHeight: 520,
  resizable: true,
  title: 'Bardy',
  icon: join(__dirname, '../../resources/icon.png'), // window/taskbar icon on Windows + Linux
  webPreferences: {
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true
  }
} satisfies BrowserWindowConstructorOptions
