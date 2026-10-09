/// <reference path="./index.d.ts" />

import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'
import type { ImportResult, AIResponse, FocusModeResult, FocusModeStatus, DistractionAlert } from '../shared/types'

const bardhie: Window['bardhie'] = Object.freeze({
  platform: process.platform,

  importPDF(): Promise<ImportResult> {
    return ipcRenderer.invoke('pdf:import')
  },

  askAI(prompt: string, documentText?: string): Promise<AIResponse> {
    return ipcRenderer.invoke('ai:ask', prompt, documentText)
  },

  scheduleReminder(label: string, delayMs: number): Promise<void> {
    return ipcRenderer.invoke('reminder:schedule', label, delayMs)
  },

  confirmDistractionBlock(appName?: string): Promise<boolean> {
    return ipcRenderer.invoke('block:confirm', appName)
  },

  getFocusModeStatus(): Promise<FocusModeStatus> {
    return ipcRenderer.invoke('focus:status')
  },

  setFocusMode(enable: boolean): Promise<FocusModeResult> {
    return ipcRenderer.invoke('focus:set', enable)
  },

  onDistractionAlert(callback: (alert: DistractionAlert) => void): () => void {
    const handler = (_event: IpcRendererEvent, data: DistractionAlert) => {
      callback(data)
    }
    ipcRenderer.on('focus:distraction-detected', handler)
    return () => {
      ipcRenderer.removeListener('focus:distraction-detected', handler)
    }
  }
})

contextBridge.exposeInMainWorld('bardhie', bardhie)
