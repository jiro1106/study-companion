import type { ChatMessage, Seed, StudyApi } from './types'

export type MockMode = 'normal' | 'slow' | 'error'
export type ApiErrorKind = 'offline' | 'not-found' | 'empty-question' | 'unknown'

export class ApiError extends Error {
  readonly kind: ApiErrorKind

  constructor(kind: ApiErrorKind, message: string) {
    super(message)
    this.name = 'ApiError'
    this.kind = kind
  }
}

export const OFFLINE_MESSAGE = "Couldn't reach BARDHIE's study engine. Check that it's running, then try again."

export function toApiError(error: unknown): ApiError {
  return error instanceof ApiError ? error : new ApiError('unknown', 'Something went wrong. Try again.')
}

/** `npm run dev:slow` → Vite mode "slow"; `npm run dev:error` → "error"; anything else → normal. */
export function mockModeFrom(viteMode: string): MockMode {
  return viteMode === 'slow' || viteMode === 'error' ? viteMode : 'normal'
}

const DELAY_MS: Record<MockMode, number> = { normal: 250, slow: 2000, error: 250 }

export function createApi(options: {
  mode: MockMode
  seed: Seed
  sleep?: (ms: number) => Promise<void>
}): StudyApi {
  const { mode } = options
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)))
  const db: Seed = structuredClone(options.seed)
  let nextId = 1

  // Every call behaves like a network request: delay, maybe fail, and return a copy.
  async function call<T>(work: () => T): Promise<T> {
    await sleep(DELAY_MS[mode])
    if (mode === 'error') throw new ApiError('offline', OFFLINE_MESSAGE)
    return structuredClone(work())
  }

  function message(role: ChatMessage['role'], text: string, citedPages: number[]): ChatMessage {
    return { id: `m${nextId++}`, role, text, citedPages }
  }

  return {
    getToday: () =>
      call(() => ({
        ...db.today,
        dueCount: db.decks.reduce((sum, deck) => sum + deck.dueCount, 0),
        cardsMade: db.cards.length
      })),

    listDecks: () => call(() => db.decks),

    deleteDeck: (id) =>
      call(() => {
        db.decks = db.decks.filter((deck) => deck.id !== id)
        db.cards = db.cards.filter((card) => card.deckId !== id)
      }),

    listExams: () => call(() => db.exams),

    listDocuments: () => call(() => db.documents),

    deleteDocument: (id) =>
      call(() => {
        const deckIds = new Set(db.decks.filter((deck) => deck.sourceDocumentId === id).map((deck) => deck.id))
        db.documents = db.documents.filter((doc) => doc.id !== id)
        db.decks = db.decks.filter((deck) => !deckIds.has(deck.id))
        db.cards = db.cards.filter((card) => !deckIds.has(card.deckId))
        db.quiz = db.quiz.filter((question) => question.documentId !== id)
        delete db.chats[id]
      }),

    getDocument: (id) =>
      call(() => {
        const doc = db.documents.find((d) => d.id === id)
        if (!doc) throw new ApiError('not-found', 'That document is no longer in your library.')
        return doc
      }),

    listChat: (documentId) => call(() => db.chats[documentId] ?? []),

    ask: (documentId, question) =>
      call(() => {
        const text = question.trim()
        if (!text) throw new ApiError('empty-question', 'Type a question first.')

        if (documentId === null) {
          return message('assistant', 'Glycolysis nets 2 ATP and 2 NADH per glucose. This is a sample answer; the real one will come from your notes.', [8])
        }
        const doc = db.documents.find((d) => d.id === documentId)
        if (!doc) throw new ApiError('not-found', 'That document is no longer in your library.')
        const firstPage = doc.summary?.keyIdeas[0]?.page ?? 1
        const reply = message('assistant', 'This is a sample answer. Once the study engine is connected, replies will come from this document.', [firstPage])
        ;(db.chats[documentId] ??= []).push(message('user', text, []), reply)
        return reply
      }),

    getDueCards: (deckId) => call(() => db.cards.filter((card) => deckId === undefined || card.deckId === deckId)),

    getQuiz: (documentId) =>
      call(() => db.quiz.filter((question) => documentId === undefined || question.documentId === documentId))
  }
}
