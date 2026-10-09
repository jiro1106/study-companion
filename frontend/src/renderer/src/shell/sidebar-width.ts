export const SIDEBAR_RAIL_WIDTH = 72
export const SIDEBAR_MIN_WIDTH = 200
// Content column never shrinks below this; the sidebar folds to its rail instead.
export const CONTENT_MIN_WIDTH = 560

const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n))

export const sidebarDefaultWidth = (viewportWidth: number): number =>
  clamp(Math.round(viewportWidth * 0.18), SIDEBAR_MIN_WIDTH, 280)

export const sidebarMaxWidth = (viewportWidth: number): number =>
  clamp(Math.round(viewportWidth * 0.24), SIDEBAR_MIN_WIDTH, 400)

export function sidebarWidthAfterToggle(width: number, viewportWidth: number): number {
  return width <= SIDEBAR_RAIL_WIDTH ? sidebarDefaultWidth(viewportWidth) : SIDEBAR_RAIL_WIDTH
}
