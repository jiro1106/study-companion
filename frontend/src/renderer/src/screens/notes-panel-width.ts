export const NOTES_MIN_WIDTH = 320
/** Below this document-view width, Notes stacks under the content instead of beside it. */
export const NOTES_SPLIT_THRESHOLD = 860

const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n))

export const notesDefaultWidth = (containerWidth: number): number =>
  clamp(Math.round(containerWidth * 0.32), NOTES_MIN_WIDTH, 480)

export function clampNotesWidth(width: number, containerWidth: number): number {
  const maxWidth = clamp(Math.floor(containerWidth * 0.5), NOTES_MIN_WIDTH, 640)
  return clamp(width, NOTES_MIN_WIDTH, maxWidth)
}

/** Width implied by a drag handle positioned at pointerX, panel anchored to the right edge. */
export function notesWidthForPointer(pointerX: number, containerWidth: number): number {
  return clampNotesWidth(containerWidth - pointerX, containerWidth)
}
