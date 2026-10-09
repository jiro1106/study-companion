import assert from 'node:assert/strict'
import test from 'node:test'

// @ts-expect-error Node runs this TypeScript test directly and requires its extension.
import { windowOptions } from '../src/main/window-options.ts'
// @ts-expect-error Node runs this TypeScript test directly and requires its extension.
import { MIN_HEIGHT, MIN_WIDTH } from '../src/main/window-state.ts'

test('uses secure desktop window options', () => {
  assert.equal(windowOptions.width, 1100)
  assert.equal(windowOptions.height, 720)
  assert.equal(windowOptions.minWidth, MIN_WIDTH)
  assert.equal(windowOptions.minHeight, MIN_HEIGHT)
  assert.equal(windowOptions.resizable, true)
  assert.equal(windowOptions.title, 'BARDHIE')
  assert.equal(windowOptions.webPreferences.contextIsolation, true)
  assert.equal(windowOptions.webPreferences.nodeIntegration, false)
  assert.equal(windowOptions.webPreferences.sandbox, true)
})
