export interface FloatingAPI {
  /** Switch the floating window between sleeping and awake layouts. */
  setMode(mode: 'sleeping' | 'awake'): void
  /** Move the floating window by delta pixel coordinates. */
  move(deltaX: number, deltaY: number): void
  /** Open or focus the main application window. */
  maximize(): void
  /** Hide the floating assistant window. */
  hide(): void
}

export interface BardhieAPI {
  readonly platform: string
  /** Floating assistant desktop controls (only available in the floating window). */
  readonly floating?: FloatingAPI
}

declare global {
  interface Window {
    readonly bardhie: BardhieAPI
  }
}
