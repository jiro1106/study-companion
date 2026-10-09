import assert from 'node:assert/strict'
import test from 'node:test'

import {
  DEFAULT_WINDOW_STATE,
  MIN_HEIGHT,
  MIN_WIDTH,
  fitToDisplays,
  parseWindowState,
  serializeWindowState
  // @ts-expect-error Node runs this TypeScript test directly and requires its extension.
} from '../src/main/window-state.ts'

const laptop = { x: 0, y: 0, width: 1440, height: 875 }
const external = { x: 1440, y: 0, width: 2560, height: 1415 }

test('missing file gives the default state', () => {
  assert.deepEqual(parseWindowState(null), DEFAULT_WINDOW_STATE)
})

test('corrupt JSON gives the default state', () => {
  assert.deepEqual(parseWindowState('{"width": 9'), DEFAULT_WINDOW_STATE)
  assert.deepEqual(parseWindowState('"hello"'), DEFAULT_WINDOW_STATE)
  assert.deepEqual(parseWindowState('null'), DEFAULT_WINDOW_STATE)
})

test('sizes below the minimum are raised to the minimum', () => {
  const state = parseWindowState('{"width": 200, "height": -50}')
  assert.equal(state.width, MIN_WIDTH)
  assert.equal(state.height, MIN_HEIGHT)
})

test('non-numeric fields fall back to defaults and flags must be true booleans', () => {
  const state = parseWindowState('{"width": "wide", "height": 800, "isMaximized": "yes", "isFullScreen": true}')
  assert.equal(state.width, DEFAULT_WINDOW_STATE.width)
  assert.equal(state.height, 800)
  assert.equal(state.isMaximized, false)
  assert.equal(state.isFullScreen, true)
})

test('position is kept only when both x and y are numbers', () => {
  assert.equal(parseWindowState('{"x": 10}').x, undefined)
  const state = parseWindowState('{"x": 10.4, "y": 20.6}')
  assert.equal(state.x, 10)
  assert.equal(state.y, 21)
})

test('a position on a connected display is kept', () => {
  const state = fitToDisplays({ ...DEFAULT_WINDOW_STATE, x: 1600, y: 100 }, [laptop, external])
  assert.equal(state.x, 1600)
  assert.equal(state.y, 100)
})

test('a position on an unplugged display is dropped so the window centers', () => {
  const state = fitToDisplays({ ...DEFAULT_WINDOW_STATE, x: 1600, y: 100 }, [laptop])
  assert.equal(state.x, undefined)
  assert.equal(state.y, undefined)
})

test('a window wider than every display shrinks to the largest display', () => {
  const state = fitToDisplays({ ...DEFAULT_WINDOW_STATE, width: 3000, height: 2000 }, [laptop])
  assert.equal(state.width, 1440)
  assert.equal(state.height, 875)
})

test('no displays reported leaves the state untouched', () => {
  const input = { ...DEFAULT_WINDOW_STATE, x: 5, y: 5 }
  assert.deepEqual(fitToDisplays(input, []), input)
})

test('serialize then parse round-trips', () => {
  const input = { width: 1200, height: 800, x: 40, y: 60, isMaximized: true, isFullScreen: false }
  assert.deepEqual(parseWindowState(serializeWindowState(input)), input)
})
