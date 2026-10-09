/**
 * useSharedChat — the single source of truth for the Bardy conversation.
 *
 * The floating window and the main window are separate renderers on the same
 * origin, so the conversation is persisted in localStorage and kept in sync
 * through the `storage` event (which fires in every *other* window on write).
 * A `busyAt` timestamp is shared too, so one window shows the other's streaming
 * reply and stays disabled until it finishes.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChatMessage } from '../../types/assistant'
import { describeLearner, loadProfile } from '../../profile'
import { sendAiChat, type AiMessage } from '../../services/ai'
import { api, toApiError } from '../../data'

export const STORAGE_KEY = 'bardy:chat:v1'
/** A remote "busy" flag older than this is treated as stale (e.g. its window closed). */
const BUSY_TTL_MS = 20000

const SYSTEM_PROMPT =
  'You are Bardy, a warm, friendly, ultra-knowledgeable desktop study companion bird. ' +
  'Talk like an encouraging study buddy, not a formal assistant. ' +
  'Help the user with active recall, concise explanations, study tips, flashcards, and motivation. ' +
  'Keep replies engaging, clear, and appropriately concise for a desktop widget. ' +
  'Keep everything PG-13 and family-friendly — no profanity, slurs, or hate speech, ever.'

/** Read at send time so profile edits apply in both windows without a reload. */
function systemPrompt(): string {
  const profile = loadProfile()
  return profile ? `${SYSTEM_PROMPT} ${describeLearner(profile)}` : SYSTEM_PROMPT
}

const RESET_RE =
  /^\W*(?:please\s+)?(?:let'?s\s+)?(?:(?:reset|restart|clear|forget|wipe)\b.{0,30}|start\s+(?:over|again|fresh)\b.{0,20}|(?:new|fresh)\s+(?:chat|convo|conversation)\b.{0,10})\W*$/i

// "Agent" intent: let the user command Bardy to actually build a quiz or
// flashcard deck, instead of just talking about one.
const QUIZ_INTENT_RE =
  /\bquiz\s+me\b|\b(?:make|create|generate|build|turn\s+(?:this|it|that)?\s*into)\b[^.!?\n]{0,30}\bquiz\b/i
const FLASHCARD_INTENT_RE =
  /\b(?:make|create|generate|build|turn\s+(?:this|it|that)?\s*into)\b[^.!?\n]{0,30}\bflash\s*cards?\b/i

const QUIZ_COUNT_BOUNDS = { fallback: 5, min: 3, max: 12 }
const FLASHCARD_COUNT_BOUNDS = { fallback: 8, min: 3, max: 20 }

function extractCount(text: string, bounds: { fallback: number; min: number; max: number }): number {
  const m = text.match(/\b(\d{1,2})\b/)
  const n = m ? Number(m[1]) : NaN
  return Number.isFinite(n) ? Math.min(bounds.max, Math.max(bounds.min, n)) : bounds.fallback
}

function titleFromFileName(name: string): string {
  return name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim() || 'Chat attachment'
}

/** Folds an attachment's text into the content sent to the AI, so it stays in context on every later turn. */
function toAiContent(m: ChatMessage): string {
  if (!m.attachment?.text) return m.content
  return `[Attached file: ${m.attachment.name}]\n"""\n${m.attachment.text}\n"""\n\n${m.content}`.trim()
}

/** Source material for an agent action: this message's attachment, else the most recent one in history, else recent chat. */
function findSourceText(
  currentAttachment: ChatMessage['attachment'] | undefined,
  base: ChatMessage[]
): { text: string; title: string } | null {
  if (currentAttachment?.text) {
    return { text: currentAttachment.text, title: titleFromFileName(currentAttachment.name) }
  }
  for (let i = base.length - 1; i >= 0; i--) {
    const att = base[i].attachment
    if (att?.text) return { text: att.text, title: titleFromFileName(att.name) }
  }
  const recent = base
    .slice(-8)
    .map((m) => `${m.role === 'user' ? 'User' : 'Bardy'}: ${m.content}`)
    .filter(Boolean)
    .join('\n')
  return recent.trim() ? { text: recent, title: 'Chat notes' } : null
}

interface Stored {
  messages: ChatMessage[]
  busyAt: number
}

function msgId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function parse(raw: string | null): Stored {
  if (!raw) return { messages: [], busyAt: 0 }
  try {
    const data = JSON.parse(raw) as Partial<Stored>
    return {
      messages: Array.isArray(data.messages) ? data.messages : [],
      busyAt: typeof data.busyAt === 'number' ? data.busyAt : 0
    }
  } catch {
    return { messages: [], busyAt: 0 }
  }
}

function load(): Stored {
  try {
    const stored = parse(localStorage.getItem(STORAGE_KEY))
    // Clear a stale busyAt from a previous crashed session so we don't
    // open stuck in "loading" state.
    if (stored.busyAt > 0 && Date.now() - stored.busyAt >= BUSY_TTL_MS) {
      stored.busyAt = 0
    }
    return stored
  } catch {
    return { messages: [], busyAt: 0 }
  }
}

function persist(state: Stored): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage unavailable: chat still works, just without cross-window sync.
  }
}

export type BotActivity = 'thinking' | 'speaking' | 'idle'

interface Options {
  /** Mirrors reply progress so the floating mascot can animate. */
  onActivity?: (activity: BotActivity) => void
}

export interface SharedChat {
  messages: ChatMessage[]
  isLoading: boolean
  /** `attachment` folds a file's text into context and shows a small chip on the message. */
  send: (text: string, attachment?: { name: string; text: string }) => Promise<void>
  /** Edit a user message: drop it and everything after, then resend the new text. */
  edit: (id: string, newText: string) => Promise<void>
  /** Stop any in-flight reply started from this window. */
  abort: () => void
  /** Wipe the entire conversation (aborts first if a reply is streaming). */
  clear: () => void
}

export function useSharedChat({ onActivity }: Options = {}): SharedChat {
  const initial = useRef<Stored>(load())
  const [messages, setMessages] = useState<ChatMessage[]>(initial.current.messages)
  const [busyAt, setBusyAt] = useState(initial.current.busyAt)
  const [localLoading, setLocalLoading] = useState(false)

  const messagesRef = useRef(messages)
  const controllerRef = useRef<AbortController | null>(null)
  const activityRef = useRef(onActivity)
  activityRef.current = onActivity

  const commit = useCallback((next: ChatMessage[], busy: boolean) => {
    messagesRef.current = next
    const stamp = busy ? Date.now() : 0
    setMessages(next)
    setBusyAt(stamp)
    persist({ messages: next, busyAt: stamp })
  }, [])

  // Pick up writes made by the other window.
  useEffect(() => {
    const onStorage = (e: StorageEvent): void => {
      if (e.key !== STORAGE_KEY && e.key !== null) return
      const next = parse(e.newValue)
      messagesRef.current = next.messages
      setMessages(next.messages)
      setBusyAt(next.busyAt)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // Drop a remote busy flag that never got cleared.
  useEffect(() => {
    if (!busyAt || localLoading) return
    const remaining = BUSY_TTL_MS - (Date.now() - busyAt)
    const timer = setTimeout(() => setBusyAt(0), Math.max(remaining, 0))
    return () => clearTimeout(timer)
  }, [busyAt, localLoading])

  const isLoading = localLoading || (busyAt > 0 && Date.now() - busyAt < BUSY_TTL_MS)

  const run = useCallback(
    async (text: string, base: ChatMessage[], attachment?: { name: string; text: string }): Promise<void> => {
      const trimmed = text.trim()
      if (!trimmed && !attachment) return

      // "Reset the convo" is handled locally: wipe everything, no model call.
      if (!attachment && RESET_RE.test(trimmed) && trimmed.length <= 60) {
        commit([], false)
        activityRef.current?.('idle')
        return
      }

      const userMsg: ChatMessage = {
        id: msgId(),
        role: 'user',
        content: trimmed || `Attached ${attachment!.name}`,
        timestamp: Date.now(),
        attachment: attachment
          ? { name: attachment.name, text: attachment.text, charCount: attachment.text.length }
          : undefined
      }

      // ── Agent intent: "quiz me on this" / "make flashcards from this" ──────
      // Bypasses the conversational model entirely and actually builds the
      // quiz/deck via the real generation + persistence pipeline.
      const wantsQuiz = QUIZ_INTENT_RE.test(trimmed)
      const wantsFlashcards = !wantsQuiz && FLASHCARD_INTENT_RE.test(trimmed)

      if (wantsQuiz || wantsFlashcards) {
        const source = findSourceText(userMsg.attachment, base)
        const workingId = msgId()
        const working: ChatMessage = {
          id: workingId,
          role: 'assistant',
          content: wantsQuiz ? 'Building a quiz from that…' : 'Building flashcards from that…',
          timestamp: Date.now()
        }
        commit([...base, userMsg, working], true)
        setLocalLoading(true)
        activityRef.current?.('thinking')

        if (!source) {
          commit(
            [
              ...base,
              userMsg,
              { ...working, content: "I don't have anything to build from yet — attach a file or tell me the topic first." }
            ],
            false
          )
          setLocalLoading(false)
          activityRef.current?.('idle')
          return
        }

        try {
          if (wantsQuiz) {
            const count = extractCount(trimmed, QUIZ_COUNT_BOUNDS)
            const result = await api.createQuizFromChat(source.text, source.title, count)
            commit(
              [
                ...base,
                userMsg,
                {
                  ...working,
                  content: `Done! I made a **${result.count}-question quiz** on *${source.title}*. Want to take it now?`,
                  action: { label: 'Take the quiz', screen: 'quiz', documentId: result.documentId }
                }
              ],
              false
            )
          } else {
            const count = extractCount(trimmed, FLASHCARD_COUNT_BOUNDS)
            const result = await api.createFlashcardsFromChat(source.text, source.title, count)
            commit(
              [
                ...base,
                userMsg,
                {
                  ...working,
                  content: `Done! I made **${result.count} flashcards** on *${source.title}*. Ready to study them?`,
                  action: { label: 'Study flashcards', screen: 'cards', deckId: result.deckId }
                }
              ],
              false
            )
          }
          activityRef.current?.('speaking')
          setTimeout(() => activityRef.current?.('idle'), 1200)
        } catch (err) {
          commit([...base, userMsg, { ...working, content: toApiError(err).message }], false)
          activityRef.current?.('idle')
        } finally {
          setLocalLoading(false)
        }
        return
      }

      // ── Normal conversational turn ───────────────────────────────────────
      const assistantId = msgId()
      const placeholder: ChatMessage = { id: assistantId, role: 'assistant', content: '', timestamp: Date.now() }

      commit([...base, userMsg, placeholder], true)
      setLocalLoading(true)
      activityRef.current?.('thinking')

      const controller = new AbortController()
      controllerRef.current = controller

      const history: AiMessage[] = [
        ...base.map((m) => ({ role: m.role, content: toAiContent(m) })),
        { role: 'user', content: toAiContent(userMsg) }
      ]

      /**
       * Commit a reply update ONLY when the controller is still live.
       * Without this guard, a late `onChunk` fired after `abort()` would
       * reset `busyAt` to now — leaving `isLoading` stuck true for 20 s.
       */
      const setReply = (content: string, busy: boolean): void => {
        if (controller.signal.aborted) return
        commit(
          messagesRef.current.map((m) => (m.id === assistantId ? { ...m, content } : m)),
          busy
        )
      }

      let speaking = false
      try {
        const full = await sendAiChat({
          messages: history,
          systemPrompt: systemPrompt(),
          stream: true,
          signal: controller.signal,
          onChunk: (_chunk, fullText) => {
            if (!speaking) {
              speaking = true
              activityRef.current?.('speaking')
            }
            setReply(fullText, true)
          }
        })

        // Non-streamed or fallback replies arrive only as the return value.
        const current = messagesRef.current.find((m) => m.id === assistantId)
        setReply(current?.content || full, false)
        activityRef.current?.('speaking')
        setTimeout(() => activityRef.current?.('idle'), 1200)
      } catch (err) {
        // AbortError means abort() already cleaned up — nothing else to do.
        if ((err as Error).name === 'AbortError') return
        setReply(
          'Sorry, I had trouble reaching the AI server. Please make sure Ollama and the backend are running on http://127.0.0.1:8001.',
          false
        )
        activityRef.current?.('idle')
      } finally {
        if (controllerRef.current === controller) controllerRef.current = null
        setLocalLoading(false)
      }
    },
    [commit]
  )

  const send = useCallback(
    async (text: string, attachment?: { name: string; text: string }) => {
      if (isLoading) return
      await run(text, messagesRef.current, attachment)
    },
    [isLoading, run]
  )

  const edit = useCallback(
    async (id: string, newText: string) => {
      if (isLoading) return
      const index = messagesRef.current.findIndex((m) => m.id === id)
      if (index === -1) return
      await run(newText, messagesRef.current.slice(0, index))
    },
    [isLoading, run]
  )

  const abort = useCallback(() => {
    if (!controllerRef.current) return
    controllerRef.current.abort()
    controllerRef.current = null
    setLocalLoading(false)
    // Keep what was streamed so far; drop only an empty placeholder bubble.
    const kept = messagesRef.current.filter(
      (m, i, all) => !(m.role === 'assistant' && !m.content && i === all.length - 1)
    )
    commit(kept, false)
    activityRef.current?.('idle')
  }, [commit])

  const clear = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.abort()
      controllerRef.current = null
    }
    setLocalLoading(false)
    commit([], false)
    activityRef.current?.('idle')
  }, [commit])

  return { messages, isLoading, send, edit, abort, clear }
}
