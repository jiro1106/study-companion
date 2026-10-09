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

export const OFFLINE_MESSAGE = "Couldn't reach Bardy's study engine. Check that it's running, then try again."

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

    ask: async (documentId, question) => {
      const text = question.trim()
      if (!text) throw new ApiError('empty-question', 'Type a question first.')
      if (mode === 'error') throw new ApiError('offline', OFFLINE_MESSAGE)

      const doc = documentId ? db.documents.find((d) => d.id === documentId) : undefined
      const firstPage = doc?.summary?.keyIdeas[0]?.page ?? 1

      // Build context from document
      const docContext = doc
        ? `Document: "${doc.title}" (${doc.fileName}, ${doc.pageCount} pages).\n` +
          `Key ideas:\n${doc.summary?.keyIdeas.map((k) => `- [Page ${k.page}] ${k.text}`).join('\n') || ''}\n` +
          `Exam terms: ${doc.summary?.examTerms.join(', ') || ''}\n` +
          `Excerpt (Page ${doc.summary?.excerpt?.page}): ${doc.summary?.excerpt?.heading || ''} - ${doc.summary?.excerpt?.paragraphs?.join(' ') || ''}`
        : ''

      let aiResponseText = ''
      try {
        const baseUrl = 'http://127.0.0.1:8001'
        const res = await fetch(`${baseUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [
              {
                role: 'system',
                content:
                  'You are BARDHIE, an expert study assistant. Answer questions directly using the document context when provided. Keep answers focused, clear, and structured for studying.' +
                  (docContext ? `\n\nDocument Context:\n${docContext}` : '')
              },
              { role: 'user', content: text }
            ],
            stream: false
          }),
          signal: AbortSignal.timeout(12000)
        })
        if (res.ok) {
          const data = await res.json()
          aiResponseText = data.content || data.response || ''
        }
      } catch {
        // Fallback
      }

      if (!aiResponseText) {
        aiResponseText = doc?.summary?.keyIdeas[0]?.text
          ? `Based on ${doc.title}: ${doc.summary.keyIdeas[0].text}`
          : 'Answers are generated from your local notes and study materials.'
      }

      const reply = message('assistant', aiResponseText, [firstPage])
      if (documentId) {
        ;(db.chats[documentId] ??= []).push(message('user', text, []), reply)
      }
      return reply
    },

    getDueCards: (deckId) => call(() => db.cards.filter((card) => deckId === undefined || card.deckId === deckId)),

    getQuiz: (documentId) =>
      call(() => db.quiz.filter((question) => documentId === undefined || question.documentId === documentId))
  }
}
