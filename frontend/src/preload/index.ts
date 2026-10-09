/// <reference path="./index.d.ts" />

import { contextBridge } from 'electron'

const bardhie: Window['bardhie'] = Object.freeze({
  platform: process.platform
})

contextBridge.exposeInMainWorld('bardhie', bardhie)
