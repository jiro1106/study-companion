import assert from 'node:assert/strict'
import test from 'node:test'

// @ts-expect-error Node runs this TypeScript test directly and requires its extension.
import { chatWidthForPointer, clampChatWidth } from '../src/renderer/src/shell/conversation-panel.ts'
// @ts-expect-error Node runs this TypeScript test directly and requires its extension.
import { sidebarWidthAfterToggle } from '../src/renderer/src/shell/sidebar-width.ts'

test('chat panel width follows its left-edge drag within the allowed range', () => {
  assert.equal(chatWidthForPointer(600, 900), 300)
  assert.equal(chatWidthForPointer(100, 600), 360)
  assert.equal(chatWidthForPointer(500, 600), 280)
})

test('saved chat widths stay within the allowed range', () => {
  assert.equal(clampChatWidth(900, 900), 540)
  assert.equal(clampChatWidth(100, 900), 280)
})

test('reopening the sidebar restores its default width', () => {
  assert.equal(sidebarWidthAfterToggle(72), 248)
  assert.equal(sidebarWidthAfterToggle(300), 72)
})
