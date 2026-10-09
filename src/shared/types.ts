/**
 * Shared contract between main, preload, and renderer.
 * This is the single source of truth for cross-process data shapes.
 */

/** A text-extracted PDF document ready for the AI. */
export interface StudyDocument {
  /** Stable UUID generated at import time. */
  id: string
  /** Original filename without the path. */
  name: string
  /** Full extracted text, cleaned of excessive whitespace. */
  text: string
  /** Number of PDF pages (0 when not yet extracted). */
  pageCount: number
}

/** Outcomes returned after attempting to open and extract a PDF. */
export type ImportResult =
  | { ok: true; document: StudyDocument }
  | { ok: false; reason: 'cancelled' | 'invalid-type' | 'empty' | 'too-large' | 'error'; message?: string }

/** A single message in the AI chat thread. */
export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  /** Page numbers cited by the assistant, e.g. [3, 14]. */
  citations?: number[]
}

/** Result from the AI service. */
export interface AIResponse {
  ok: boolean
  content: string
  citations?: number[]
  error?: string
}

/** Status of Focus Mode distraction blocking. */
export interface FocusModeStatus {
  enabled: boolean
  blockedSites: string[]
  error?: string
}

/** Result from toggling Focus Mode. */
export interface FocusModeResult {
  ok: boolean
  enabled: boolean
  error?: string
}

/** Distraction detection alert event payload. */
export interface DistractionAlert {
  site: string
  timestamp: number
}
