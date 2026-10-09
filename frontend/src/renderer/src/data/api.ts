import type { ChatMessage, Deck, Seed, StudyApi, StudyDocument } from './types'
import { extractPdfText } from './pdf-text'

/**
 * Dynamic import (like the pdfjs-dist import below) so this stays resolvable
 * when api.ts is executed directly by Node's test runner, which — unlike
 * Vite — does not resolve bundler-style `.js`-for-`.ts` specifiers.
 */
async function resolveBackendBaseUrl(): Promise<string> {
  const { getBackendBaseUrl } = await import('../services/ai.js')
  return getBackendBaseUrl()
}

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

  // Same contract as `call`, but for work that is itself asynchronous
  // (e.g. a sequence of backend requests) rather than a synchronous read.
  async function callAsync<T>(work: () => Promise<T>): Promise<T> {
    await sleep(DELAY_MS[mode])
    if (mode === 'error') throw new ApiError('offline', OFFLINE_MESSAGE)
    return structuredClone(await work())
  }

  /** Wraps arbitrary text (e.g. a chat attachment) as a lightweight StudyDocument. */
  function buildChatDocument(text: string, title: string): StudyDocument {
    const clean = text.trim()
    const wordCount = clean.split(/\s+/).filter(Boolean).length || 1
    const safeTitle = title.trim() || 'Chat notes'
    const doc: StudyDocument = {
      id: crypto.randomUUID(),
      fileName: `${safeTitle} (from chat)`,
      title: safeTitle,
      pageCount: Math.max(1, Math.ceil(wordCount / 350)),
      cardCount: 0,
      processing: null,
      summary: {
        readMinutes: Math.max(1, Math.ceil(wordCount / 200)),
        keyIdeas: [{ text: clean.replace(/\s+/g, ' ').slice(0, 200).trim() || safeTitle, page: 1 }],
        examTerms: [],
        excerpt: {
          page: 1,
          heading: safeTitle,
          paragraphs: [clean.slice(0, 500) || safeTitle],
          highlight: clean.slice(0, 100) || safeTitle
        }
      },
      text: clean
    }
    db.documents.unshift(doc)
    return doc
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

      // Build context from document — prefer full text, fall back to summary metadata
      const docContext = doc
        ? doc.text
          ? `Document: "${doc.title}" (${doc.fileName}, ${doc.pageCount} pages).\n\nDocument text:\n${doc.text.slice(0, 80_000)}`
          : `Document: "${doc.title}" (${doc.fileName}, ${doc.pageCount} pages).\n` +
            `Key ideas:\n${doc.summary?.keyIdeas.map((k) => `- [Page ${k.page}] ${k.text}`).join('\n') || ''}\n` +
            `Exam terms: ${doc.summary?.examTerms.join(', ') || ''}\n` +
            `Excerpt (Page ${doc.summary?.excerpt?.page}): ${doc.summary?.excerpt?.heading || ''} - ${doc.summary?.excerpt?.paragraphs?.join(' ') || ''}`
        : ''

      let aiResponseText = ''
      try {
        const baseUrl = await resolveBackendBaseUrl()
        const res = await fetch(`${baseUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [
              {
                role: 'system',
                content:
                  'You are Bardy, an expert study assistant. Answer questions directly using the document context when provided. Keep answers focused, clear, and structured for studying.' +
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
      call(() => db.quiz.filter((question) => documentId === undefined || question.documentId === documentId)),

    importDocument: async (): Promise<string | null> => {
      if (typeof window === 'undefined' || !window.bardy?.importPDF) {
        throw new ApiError('unknown', 'PDF import is not available in this environment.')
      }

      const result = await window.bardy.importPDF()
      if (!result.ok) {
        if (result.reason === 'cancelled') return null
        throw new ApiError('unknown', result.message ?? 'Could not import the PDF.')
      }

      const { id, name } = result.document
      const base64 = (result.document as unknown as { _bytes: string })._bytes

      // Decode base64 → Uint8Array
      const binary = atob(base64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)

      // Add document immediately in processing state so the UI can show it
      const doc: StudyDocument = {
        id,
        fileName: name,
        title: name.replace(/\.pdf$/i, '').replace(/[-_]/g, ' '),
        pageCount: 0,
        cardCount: 0,
        processing: { currentPage: 1 },
        summary: null,
        text: ''
      }
      db.documents.unshift(doc)

      // Run extraction + AI generation in the background
      ;(async () => {
        try {
          const { text, pageCount } = await extractPdfText(bytes, (currentPage) => {
            doc.processing = { currentPage }
          })
          doc.pageCount = pageCount
          doc.text = text

          if (!doc.text) {
            // Scanned/image PDF — nothing to extract
            doc.processing = null
            return
          }

          // Generate summary and quiz in parallel
          await Promise.allSettled([
            generateDocSummary(doc),
            generateDocQuiz(doc, db),
            generateDocFlashcards(doc, db)
          ])
        } catch (err) {
          console.error('[importDocument]', err)
        } finally {
          doc.processing = null
        }
      })()

      return id
    },

    createQuizFromChat: (text, title, count) =>
      callAsync(async () => {
        const doc = buildChatDocument(text, title)
        await generateDocQuiz(doc, db, count ?? 5)
        const created = db.quiz.filter((q) => q.documentId === doc.id)
        if (created.length === 0) {
          throw new ApiError(
            'unknown',
            "I couldn't build a quiz from that — the study engine might be offline."
          )
        }
        return { documentId: doc.id, count: created.length }
      }),

    createFlashcardsFromChat: (text, title, count) =>
      callAsync(async () => {
        const doc = buildChatDocument(text, title)
        await generateDocFlashcards(doc, db, count ?? 8)
        const deck = db.decks.find((d) => d.sourceDocumentId === doc.id)
        if (!deck) {
          throw new ApiError(
            'unknown',
            "I couldn't build flashcards from that — the study engine might be offline."
          )
        }
        return { documentId: doc.id, deckId: deck.id, count: deck.cardCount }
      })
  }
}

// ─── Backend helpers ──────────────────────────────────────────────────────────
// These call the real Bardy FastAPI backend (backend/app.py): /api/summarize,
// /api/quiz and /api/flashcards, which in turn call Ollama. If the backend or
// Ollama is unreachable, each helper fails soft so import still finishes.

const AI_TIMEOUT = 90_000
/** Characters of document text sent per request; keeps prompts inside a local model's context window. */
const SUMMARY_CONTEXT_CHARS = 20_000
const GEN_CONTEXT_CHARS = 16_000

async function postJson(path: string, body: unknown): Promise<any> {
  const baseUrl = await resolveBackendBaseUrl()
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(AI_TIMEOUT)
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

async function generateDocSummary(doc: StudyDocument): Promise<void> {
  const text = doc.text!.slice(0, SUMMARY_CONTEXT_CHARS)
  const wordCount = doc.text!.split(/\s+/).length

  try {
    const parsed = await postJson('/api/summarize', { text, title: doc.title })
    if (parsed.error || parsed.raw) throw new Error('Backend returned invalid JSON')

    if (typeof parsed.title === 'string' && parsed.title) doc.title = parsed.title

    const keyIdeas = Array.isArray(parsed.key_ideas)
      ? parsed.key_ideas
          .slice(0, 7)
          .map((k: Record<string, unknown>) => ({ text: String(k.text ?? ''), page: Number(k.page) || 1 }))
          .filter((k: { text: string }) => k.text)
      : []

    const excerptSrc = parsed.excerpt
    doc.summary = {
      readMinutes: typeof parsed.read_minutes === 'number' ? parsed.read_minutes : Math.ceil(wordCount / 200),
      keyIdeas,
      examTerms: Array.isArray(parsed.exam_terms) ? parsed.exam_terms.slice(0, 10).map(String) : [],
      excerpt:
        excerptSrc && typeof excerptSrc === 'object'
          ? {
              page: Number(excerptSrc.page) || 1,
              heading: excerptSrc.heading || doc.title,
              paragraphs:
                Array.isArray(excerptSrc.paragraphs) && excerptSrc.paragraphs.length
                  ? excerptSrc.paragraphs
                  : [doc.text!.slice(0, 400)],
              highlight: excerptSrc.highlight || doc.text!.slice(0, 80)
            }
          : { page: 1, heading: doc.title, paragraphs: [doc.text!.slice(0, 400)], highlight: doc.text!.slice(0, 80) }
    }
  } catch {
    // Backend/Ollama offline or malformed response — fall back to a minimal summary from the raw text
    doc.summary = {
      readMinutes: Math.ceil(wordCount / 200),
      keyIdeas: [{ text: doc.text!.replace(/\[Page \d+\]\s*/g, '').slice(0, 200).trim(), page: 1 }],
      examTerms: [],
      excerpt: {
        page: 1,
        heading: doc.title,
        paragraphs: [doc.text!.slice(0, 500)],
        highlight: doc.text!.slice(0, 100)
      }
    }
  }
}

const OPTION_KEYS = ['A', 'B', 'C', 'D'] as const

async function generateDocQuiz(doc: StudyDocument, db: Seed, count = 5): Promise<void> {
  const context = doc.text!.slice(0, GEN_CONTEXT_CHARS)

  try {
    const parsed = await postJson('/api/quiz', { topic: doc.title, count, context })
    const questions = Array.isArray(parsed.questions) ? parsed.questions : []

    for (const q of questions.slice(0, count)) {
      if (!q.question || !q.options || typeof q.options !== 'object') continue
      const options = OPTION_KEYS.map((k) => q.options[k]).filter((v): v is string => typeof v === 'string')
      if (options.length < 2) continue
      const correctIndex = OPTION_KEYS.indexOf(String(q.correct ?? '').toUpperCase() as typeof OPTION_KEYS[number])

      db.quiz.push({
        id: crypto.randomUUID(),
        documentId: doc.id,
        prompt: q.question,
        options,
        correctIndex: correctIndex >= 0 ? correctIndex : 0,
        explanation: q.explanation || '',
        sourcePage: Number(q.page) || 1
      })
    }
  } catch {
    // Backend/Ollama offline — no quiz for this document
  }
}

const DECK_TONES: Deck['tone'][] = ['brand', 'link', 'warning']
let _deckToneIndex = 0

async function generateDocFlashcards(doc: StudyDocument, db: Seed, count = 8): Promise<void> {
  const context = doc.text!.slice(0, GEN_CONTEXT_CHARS)

  try {
    const parsed = await postJson('/api/flashcards', { topic: doc.title, count, context })
    const cards = Array.isArray(parsed.flashcards)
      ? parsed.flashcards.filter((c: Record<string, unknown>) => c.front && c.back).slice(0, count)
      : []
    if (cards.length === 0) return

    const deckId = crypto.randomUUID()
    const tone = DECK_TONES[_deckToneIndex % DECK_TONES.length]
    _deckToneIndex++

    const titleWords = doc.title.split(/\s+/)
    const subjectCode = titleWords.length >= 2
      ? titleWords[0].slice(0, 1).toUpperCase() + titleWords[1].slice(0, 1).toUpperCase()
      : doc.title.slice(0, 2).toUpperCase()

    db.decks.push({
      id: deckId,
      title: doc.title,
      subjectCode,
      tone,
      sourceDocumentId: doc.id,
      sourceName: doc.fileName,
      cardCount: cards.length,
      dueCount: cards.length,
      mastery: 0,
      status: 'new'
    })

    for (const c of cards) {
      db.cards.push({
        id: crypto.randomUUID(),
        deckId,
        term: c.front,
        definition: c.back,
        sourcePage: Number(c.page) || 1
      })
    }

    doc.cardCount = cards.length
  } catch {
    // Backend/Ollama offline — no flashcards for this document
  }
}
