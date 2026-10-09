/// <reference path="./index.d.ts" />

import { contextBridge, ipcRenderer } from 'electron'

/**
 * Determine whether this renderer instance is the floating
 * assistant window by checking the URL query parameter.
 */
const isFloating = typeof location !== 'undefined' &&
  new URLSearchParams(location.search).has('floating')

const bardhie: Window['bardhie'] = Object.freeze({
  platform: process.platform,

  mascot: Object.freeze({
    get: (): Promise<boolean> => ipcRenderer.invoke('mascot:get'),
    set: (enabled: boolean): Promise<boolean> => ipcRenderer.invoke('mascot:set', enabled),
  }),

  /** Open a URL in the system's default web browser. */
  openExternal: (url: string): void => {
    ipcRenderer.send('shell:open-external', url)
  },

  /** Save text content to a file via a native save dialog. */
  saveFile: (content: string, defaultName: string): Promise<{ saved: boolean; filePath?: string }> =>
    ipcRenderer.invoke('file:save', { content, defaultName }),

  // Only expose the floating API in the floating window
  ...(isFloating
    ? {
        floating: Object.freeze({
          setMode: (mode: 'sleeping' | 'awake') => {
            ipcRenderer.send('floating:set-mode', mode)
          },
          move: (deltaX: number, deltaY: number) => {
            ipcRenderer.send('floating:move', { deltaX, deltaY })
          },
          maximize: () => {
            ipcRenderer.send('floating:maximize')
          },
          hide: () => {
            ipcRenderer.send('floating:hide')
          },
        }),
      }
    : {}),
})

contextBridge.exposeInMainWorld('bardhie', bardhie)
