import assert from 'node:assert/strict'
import test from 'node:test'

// @ts-expect-error Node runs this TypeScript test directly and requires its extension.
import { hasPdfMagicBytes } from '../src/main/pdf-import.ts'

test('accepts a simple PDF header', () => {
  assert.equal(hasPdfMagicBytes(new TextEncoder().encode('%PDF-1.4\n% simple one-page PDF')), true)
})

test('rejects JPEG bytes even when the picker supplied a .pdf filename', () => {
  assert.equal(hasPdfMagicBytes(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])), false)
})
