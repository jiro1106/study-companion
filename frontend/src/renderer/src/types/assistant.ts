/** The two visual modes of the floating desktop experience. */
export type FloatingMode = 'sleeping' | 'awake'

/**
 * All possible mascot animation states.
 *
 * - `sleeping`  — idle breathing / Zzz animation
 * - `awake`     — alert, ready for input
 * - `listening` — attending to the user
 * - `thinking`  — waiting for a response
 * - `speaking`  — delivering a response
 */
export type MascotState =
  | 'sleeping'
  | 'awake'
  | 'listening'
  | 'thinking'
  | 'speaking'

/** A single message in the chat conversation. */
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  /**
   * A file the user attached to this message. `text` is folded into every
   * subsequent AI request as context (not just the turn it was sent on),
   * but the chat bubble only ever shows `name`/`charCount`.
   */
  attachment?: { name: string; text: string; charCount: number }
  /** A follow-up the assistant is offering, e.g. "open the quiz I just made". */
  action?: { label: string; screen: 'quiz' | 'cards'; documentId?: string; deckId?: string }
}
