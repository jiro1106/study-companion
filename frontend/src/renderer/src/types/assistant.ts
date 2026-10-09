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
}
