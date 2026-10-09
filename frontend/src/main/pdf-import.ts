/** Reject files whose extension says PDF but whose bytes do not. */
export function hasPdfMagicBytes(bytes: Uint8Array): boolean {
  return bytes.length >= 5 && String.fromCharCode(...bytes.subarray(0, 5)) === '%PDF-'
}
