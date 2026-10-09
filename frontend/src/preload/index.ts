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
