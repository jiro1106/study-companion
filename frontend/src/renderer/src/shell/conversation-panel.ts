const CHAT_MIN_WIDTH = 280
const CHAT_MAX_WIDTH = 560

export function clampChatWidth(width: number, viewportWidth: number): number {
  const maxWidth = Math.max(CHAT_MIN_WIDTH, Math.min(CHAT_MAX_WIDTH, Math.floor(viewportWidth * 0.6)))
  return Math.min(maxWidth, Math.max(CHAT_MIN_WIDTH, width))
}

export function chatWidthForPointer(pointerX: number, viewportWidth: number): number {
  return clampChatWidth(viewportWidth - pointerX, viewportWidth)
}
