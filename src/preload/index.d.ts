import type { ImportResult, AIResponse, FocusModeStatus, FocusModeResult, DistractionAlert } from '../shared/types'

export interface BardhieAPI {
  readonly platform: string

  /** Open the native file picker filtered to PDFs and extract the text. */
  importPDF(): Promise<ImportResult>

  /** Send a chat message to the AI, optionally grounded by a document. */
  askAI(prompt: string, documentText?: string): Promise<AIResponse>

  /**
   * Request the OS reminder notification.
   * @param label  Short description shown in the notification.
   * @param delayMs  Milliseconds from now until the notification fires.
   */
  scheduleReminder(label: string, delayMs: number): Promise<void>

  /** Show a native dialog asking the user to confirm a distraction-blocking action. */
  confirmDistractionBlock(appName?: string): Promise<boolean>

  /** Get current Focus Mode status and list of blocked sites. */
  getFocusModeStatus(): Promise<FocusModeStatus>

  /** Enable or disable Focus Mode website blocking across browsers. */
  setFocusMode(enable: boolean): Promise<FocusModeResult>

  /** Listen for distraction events detected by the background guardian. */
  onDistractionAlert(callback: (alert: DistractionAlert) => void): () => void
}

declare global {
  interface Window {
    readonly bardhie: BardhieAPI
  }
}
