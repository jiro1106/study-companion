export type ImportResult =
  | { ok: false; reason: 'cancelled' | 'too-large' | 'invalid-type'; message?: string }
  | { ok: true; document: { id: string; name: string; text: string; pageCount: number; _bytes: string } }

export interface AIResponse {
  ok: boolean
  content: string
  citations?: number[]
  error?: string
}

export interface FocusModeResult {
  ok: boolean
  enabled: boolean
  error?: string
}

export interface FocusModeStatus {
  enabled: boolean
  blockedSites: string[]
}
