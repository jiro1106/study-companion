import assert from 'node:assert/strict'
import test from 'node:test'

// @ts-expect-error Node runs this TypeScript test directly and requires its extension.
import { windowOptions } from '../src/main/window-options.ts'

test('uses secure desktop window options', () => {
  assert.equal(windowOptions.width, 960)
  assert.equal(windowOptions.height, 640)
  assert.equal(windowOptions.resizable, true)
  assert.equal(windowOptions.title, 'BARDHIE')
  assert.equal(windowOptions.webPreferences.contextIsolation, true)
  assert.equal(windowOptions.webPreferences.nodeIntegration, false)
  assert.equal(windowOptions.webPreferences.sandbox, true)
})
