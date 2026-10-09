export interface WindowState {
  width: number
  height: number
  x?: number
  y?: number
  isMaximized: boolean
  isFullScreen: boolean
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export const MIN_WIDTH = 720
export const MIN_HEIGHT = 520

export const DEFAULT_WINDOW_STATE: WindowState = {
  width: 1100,
  height: 720,
  isMaximized: false,
  isFullScreen: false
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function parseWindowState(raw: string | null): WindowState {
  if (raw === null) return { ...DEFAULT_WINDOW_STATE }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ...DEFAULT_WINDOW_STATE }
  }
  if (typeof parsed !== 'object' || parsed === null) return { ...DEFAULT_WINDOW_STATE }

  const saved = parsed as Record<string, unknown>
  const state: WindowState = {
    width: isNumber(saved.width) ? Math.max(MIN_WIDTH, Math.round(saved.width)) : DEFAULT_WINDOW_STATE.width,
    height: isNumber(saved.height) ? Math.max(MIN_HEIGHT, Math.round(saved.height)) : DEFAULT_WINDOW_STATE.height,
    isMaximized: saved.isMaximized === true,
    isFullScreen: saved.isFullScreen === true
  }
  if (isNumber(saved.x) && isNumber(saved.y)) {
    state.x = Math.round(saved.x)
    state.y = Math.round(saved.y)
  }
  return state
}

// The title bar must stay grabbable: at least 100px of its width and 40px of its height on one display.
function titleBarVisible(x: number, y: number, width: number, area: Rect): boolean {
  return (
    x + width - 100 >= area.x &&
    x + 100 <= area.x + area.width &&
    y >= area.y &&
    y + 40 <= area.y + area.height
  )
}

export function fitToDisplays(state: WindowState, workAreas: Rect[]): WindowState {
  if (workAreas.length === 0) return state

  const largest = workAreas.reduce((a, b) => (b.width * b.height > a.width * a.height ? b : a))
  const width = Math.max(MIN_WIDTH, Math.min(state.width, largest.width))
  const height = Math.max(MIN_HEIGHT, Math.min(state.height, largest.height))
  const { x, y, ...rest } = state

  if (x === undefined || y === undefined) return { ...rest, width, height }
  if (!workAreas.some((area) => titleBarVisible(x, y, width, area))) return { ...rest, width, height }
  return { ...rest, width, height, x, y }
}

export function serializeWindowState(state: WindowState): string {
  return JSON.stringify(state)
}
