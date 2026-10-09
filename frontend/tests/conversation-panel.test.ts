import assert from 'node:assert/strict'
import test from 'node:test'

// @ts-expect-error Node runs this TypeScript test directly and requires its extension.
import { chatDefaultWidth, chatWidthForPointer, clampChatWidth } from '../src/renderer/src/shell/conversation-panel.ts'
// @ts-expect-error Node runs this TypeScript test directly and requires its extension.
import { sidebarDefaultWidth, sidebarMaxWidth, sidebarWidthAfterToggle } from '../src/renderer/src/shell/sidebar-width.ts'

test('chat panel width follows its left-edge drag within the allowed range', () => {
  assert.equal(chatWidthForPointer(700, 1000), 300)
  assert.equal(chatWidthForPointer(100, 1000), 350)
  assert.equal(chatWidthForPointer(900, 1000), 280)
})

test('chat and sidebar widths scale with the viewport', () => {
  assert.equal(clampChatWidth(900, 1000), 350)
  assert.equal(clampChatWidth(100, 1000), 280)
  assert.equal(chatDefaultWidth(1224), 318)
  assert.equal(chatDefaultWidth(3000), 420)
  assert.equal(sidebarDefaultWidth(1224), 220)
  assert.equal(sidebarMaxWidth(1224), 294)
  assert.equal(sidebarMaxWidth(3000), 400)
})

test('reopening the sidebar restores its viewport-relative default width', () => {
  assert.equal(sidebarWidthAfterToggle(72, 1224), 220)
  assert.equal(sidebarWidthAfterToggle(300, 1224), 72)
})
