export const SIDEBAR_RAIL_WIDTH = 72
export const SIDEBAR_MIN_WIDTH = 200
export const SIDEBAR_MAX_WIDTH = 400
export const SIDEBAR_DEFAULT_WIDTH = 248

export function sidebarWidthAfterToggle(width: number): number {
  return width <= SIDEBAR_RAIL_WIDTH ? SIDEBAR_DEFAULT_WIDTH : SIDEBAR_RAIL_WIDTH
}
