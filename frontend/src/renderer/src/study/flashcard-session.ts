export type Rating = 'again' | 'hard' | 'good' | 'easy'

export const RATINGS: Rating[] = ['again', 'hard', 'good', 'easy']

/** Display only until the study engine schedules reviews. */
export const RATING_HINTS: Record<Rating, string> = { again: '< 1 min', hard: '6 min', good: '1 day', easy: '4 days' }

export interface FlashcardSession {
  queue: string[]
  total: number
  reviewed: number
  flipped: boolean
}

export function startSession(cardIds: string[]): FlashcardSession {
  return { queue: [...cardIds], total: cardIds.length, reviewed: 0, flipped: false }
}

export function currentCardId(session: FlashcardSession): string | null {
  return session.queue[0] ?? null
}

export function isComplete(session: FlashcardSession): boolean {
  return session.queue.length === 0
}

export function progress(session: FlashcardSession): number {
  return session.total === 0 ? 1 : session.reviewed / session.total
}

export function flip(session: FlashcardSession): FlashcardSession {
  if (isComplete(session)) return session
  return { ...session, flipped: !session.flipped }
}

export function rate(session: FlashcardSession, rating: Rating): FlashcardSession {
  if (!session.flipped || isComplete(session)) return session
  const [current, ...rest] = session.queue
  if (rating === 'again') return { ...session, queue: [...rest, current], flipped: false }
  return { ...session, queue: rest, reviewed: session.reviewed + 1, flipped: false }
}
