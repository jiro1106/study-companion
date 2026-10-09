export type DeckTone = 'brand' | 'link' | 'warning'
export type DeckStatus = 'due' | 'struggling' | 'mastered' | 'new'

export interface Deck {
  id: string
  title: string
  /** Two-letter tile label, e.g. "Bi". */
  subjectCode: string
  tone: DeckTone
  sourceDocumentId: string
  sourceName: string
  cardCount: number
  dueCount: number
  /** 0–1 share of cards mastered. */
  mastery: number
  status: DeckStatus
}

export interface Flashcard {
  id: string
  deckId: string
  term: string
  definition: string
  sourcePage: number
}

export interface DocumentSummary {
  readMinutes: number
  keyIdeas: Array<{ text: string; page: number }>
  examTerms: string[]
  excerpt: {
    page: number
    heading: string
    paragraphs: string[]
    /** Exact substring of one paragraph to highlight. */
    highlight: string
  }
}

export interface StudyDocument {
  id: string
  fileName: string
  title: string
  pageCount: number
  cardCount: number
  /** Set while the PDF is still being read. */
  processing: { currentPage: number } | null
  summary: DocumentSummary | null
  /** Full extracted text from the PDF (available after import). */
  text?: string
}

export interface QuizQuestion {
  id: string
  documentId: string
  prompt: string
  options: string[]
  correctIndex: number
  explanation: string
  sourcePage: number
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  citedPages: number[]
}

export interface TodayStats {
  userName: string
  goalMinutes: number
  minutesToday: number
  streakDays: number
  /** Monday first, 7 entries. */
  weekDone: boolean[]
  /** 0 = Monday. */
  todayIndex: number
  recallPercent: number
  cardsMade: number
  dueCount: number
}

export interface Exam {
  id: string
  title: string
  /** ISO date, e.g. "2026-10-21". */
  date: string
  linkedDecks: number
}

export interface Seed {
  today: Omit<TodayStats, 'cardsMade' | 'dueCount'>
  decks: Deck[]
  cards: Flashcard[]
  documents: StudyDocument[]
  quiz: QuizQuestion[]
  chats: Record<string, ChatMessage[]>
  exams: Exam[]
}

export interface StudyApi {
  getToday(): Promise<TodayStats>
  listDecks(): Promise<Deck[]>
  deleteDeck(id: string): Promise<void>
  listExams(): Promise<Exam[]>
  listDocuments(): Promise<StudyDocument[]>
  deleteDocument(id: string): Promise<void>
  getDocument(id: string): Promise<StudyDocument>
  listChat(documentId: string): Promise<ChatMessage[]>
  /** documentId null = Quick ask across all notes. Returns the assistant reply. */
  ask(documentId: string | null, question: string): Promise<ChatMessage>
  /** No deckId = every card. */
  getDueCards(deckId?: string): Promise<Flashcard[]>
  /** No documentId = every question. */
  getQuiz(documentId?: string): Promise<QuizQuestion[]>
  /**
   * Open the native file picker, import a PDF, extract text, and
   * generate a summary + quiz via the backend.
   * Returns the new document id, or null if the user cancelled.
   * The document is added immediately in a processing state; the
   * caller should poll listDocuments() until processing is null.
   */
  importDocument(): Promise<string | null>
  /**
   * Wraps arbitrary text (e.g. a chat attachment, or recent conversation) as a
   * lightweight document and generates a quiz from it via the backend.
   * `count` defaults to 5. Throws if nothing could be generated.
   */
  createQuizFromChat(text: string, title: string, count?: number): Promise<{ documentId: string; count: number }>
  /**
   * Same as `createQuizFromChat`, but generates a flashcard deck instead.
   * `count` defaults to 8. Throws if nothing could be generated.
   */
  createFlashcardsFromChat(
    text: string,
    title: string,
    count?: number
  ): Promise<{ documentId: string; deckId: string; count: number }>
}
