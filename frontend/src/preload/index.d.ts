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

export interface MascotAPI {
  /** Whether the floating mascot is enabled. */
  get(): Promise<boolean>
  /** Enable or disable the floating mascot; resolves to the saved value. */
  set(enabled: boolean): Promise<boolean>
}

export type ImportPDFResult =
  | { ok: false; reason: 'cancelled' | 'too-large' | 'invalid-type'; message?: string }
  | { ok: true; document: { id: string; name: string; _bytes: string; pageCount: number } }

export interface BardhieAPI {
  readonly platform: string
  readonly mascot: MascotAPI
  /** Floating assistant desktop controls (only available in the floating window). */
  readonly floating?: FloatingAPI
  /** Open the native file picker and return the chosen PDF as base64 bytes. */
  importPDF(): Promise<ImportPDFResult>
}

declare global {
  interface Window {
    readonly bardhie: BardhieAPI
  }
}
