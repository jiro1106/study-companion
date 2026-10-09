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

export interface FocusModeStatus {
  enabled: boolean
  blockedSites: string[]
}

export interface FocusModeResult {
  ok: boolean
  enabled: boolean
  error?: string
}

export interface FocusAPI {
  /** Current block status and the list of sites it covers. */
  getStatus(): Promise<FocusModeStatus>
  /** Enable or disable the website block. May trigger a Windows admin prompt. */
  set(enable: boolean): Promise<FocusModeResult>
  /** Subscribe to "a blocked site was just closed" events; returns an unsubscribe function. */
  onDistraction(callback: (detail: { site: string; timestamp: number }) => void): () => void
}

export interface BlockAPI {
  /** Shows the native "Enable Focus Mode?" confirmation dialog. Resolves true if the user accepted. */
  confirm(targetDesc?: string): Promise<boolean>
}

export interface BardyAPI {
  readonly platform: string
  readonly mascot: MascotAPI
  /** Open a URL in the system's default web browser. */
  openExternal(url: string): void
  /** Save text content to a file via a native save dialog. Returns whether it was saved. */
  saveFile(content: string, defaultName: string): Promise<{ saved: boolean; filePath?: string }>
  /** Floating assistant desktop controls (only available in the floating window). */
  readonly floating?: FloatingAPI
  /** Open the native file picker and return the chosen PDF as base64 bytes. */
  importPDF(): Promise<ImportPDFResult>
  readonly focus: FocusAPI
  readonly block: BlockAPI
}

declare global {
  interface Window {
    readonly bardy: BardyAPI
  }
}
