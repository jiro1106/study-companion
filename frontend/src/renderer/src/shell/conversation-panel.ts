export const CHAT_MIN_WIDTH = 280

const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n))

export const chatDefaultWidth = (viewportWidth: number): number =>
  clamp(Math.round(viewportWidth * 0.26), CHAT_MIN_WIDTH, 420)

export function clampChatWidth(width: number, viewportWidth: number): number {
  const maxWidth = clamp(Math.floor(viewportWidth * 0.35), CHAT_MIN_WIDTH, 560)
  return clamp(width, CHAT_MIN_WIDTH, maxWidth)
}

export function chatWidthForPointer(pointerX: number, viewportWidth: number): number {
  return clampChatWidth(viewportWidth - pointerX, viewportWidth)
}
