/**
 * ChatMessage — renders a single user or assistant message bubble with:
 *  - Markdown rendering (assistant messages)
 *  - Copy button (both roles)
 *  - Edit button + inline edit box (user messages)
 *  - Speak / stop button with local Piper TTS (assistant messages)
 *  - Inline option chips / follow-up chips (assistant messages)
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import type { ChatMessage as ChatMessageType } from '../../types/assistant'
import MarkdownView from '../ui/MarkdownView'
import { speakText, stopCurrentSpeech, type TtsState } from '../../services/voice'

interface ChatMessageProps {
  message: ChatMessageType
  isStreaming?: boolean
  /** Disable edit / chip actions (e.g. while a reply is loading). */
  disabled?: boolean
  /** Show option chips under this (assistant) message. */
  showChips?: boolean
  onEdit?: (id: string, newText: string) => void
  onChipClick?: (text: string) => void
}

interface Chip {
  label: string
  send: string
}

const FOLLOW_UP_CHIPS: Chip[] = [
  { label: '💡 Explain more', send: 'Can you explain that in more detail?' },
  { label: '📝 Give an example', send: 'Can you give me an example?' },
  { label: '🧠 Quiz me on this', send: 'Quiz me on what you just explained.' },
]

/** Extract lettered/numbered options ("A) foo", "B. bar", "1) baz") from a bot message. */
function extractOptions(content: string): Chip[] {
  const re = /^\s*(?:[-*]\s*)?(?:\*\*)?\(?([A-Da-d]|[1-5])[).:](?:\*\*)?\s+(.+?)\s*$/
  const chips: Chip[] = []
  for (const line of content.split('\n')) {
    const m = line.match(re)
    if (!m) continue
    const key = m[1].toUpperCase()
    const text = m[2].replace(/\*\*/g, '').trim()
    const short = text.length > 40 ? `${text.slice(0, 39)}…` : text
    chips.push({ label: `${key}. ${short}`, send: `${key}) ${text}` })
  }
  return chips.length >= 2 ? chips.slice(0, 6) : []
}

// ── SVG icon helpers ──────────────────────────────────────────────────────────

function CopyIcon(): React.JSX.Element {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

function CheckIcon(): React.JSX.Element {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function EditIcon(): React.JSX.Element {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  )
}

function SpeakerIcon(): React.JSX.Element {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  )
}

function StopSpeakerIcon(): React.JSX.Element {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  )
}

function SpinnerIcon(): React.JSX.Element {
  return (
    <svg className="speak-spinner" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M12 2a10 10 0 0 1 10 10" />
    </svg>
  )
}

function SaveIcon(): React.JSX.Element {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ChatMessage({
  message,
  isStreaming = false,
  disabled = false,
  showChips = false,
  onEdit,
  onChipClick,
}: ChatMessageProps): React.JSX.Element {
  const isUser = message.role === 'user'

  // Copy state
  const [copied, setCopied] = useState(false)

  // Inline-edit state (user messages)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(message.content)
  const editRef = useRef<HTMLTextAreaElement>(null)

  // Save state (assistant messages)
  const [saveState, setSaveState] = useState<'idle' | 'saved' | 'error'>('idle')

  // TTS state (assistant messages)
  const [speakState, setSpeakState] = useState<TtsState>('idle')
  const ttsAbortRef = useRef<AbortController | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      // Cancel any in-flight TTS for this message
      ttsAbortRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    if (editing && editRef.current) {
      const el = editRef.current
      el.focus()
      el.setSelectionRange(el.value.length, el.value.length)
    }
  }, [editing])

  // ── Copy ──────────────────────────────────────────────────────────────────

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(message.content)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = message.content
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1400)
  }, [message.content])

  // ── Edit ──────────────────────────────────────────────────────────────────

  const startEdit = (): void => {
    setDraft(message.content)
    setEditing(true)
  }

  const submitEdit = (): void => {
    const trimmed = draft.trim()
    setEditing(false)
    if (!trimmed || trimmed === message.content) return
    onEdit?.(message.id, trimmed)
  }

  // ── Save as file ──────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!window.bardhie?.saveFile) return
    const timestamp = new Date().toISOString().slice(0, 10)
    const result = await window.bardhie.saveFile(message.content, `bardy-note-${timestamp}.txt`)
    if (result.saved) {
      setSaveState('saved')
      setTimeout(() => setSaveState('idle'), 1800)
    }
  }, [message.content])

  // ── Speak ─────────────────────────────────────────────────────────────────

  const handleSpeak = useCallback(async () => {
    // Clicking while playing/loading → stop
    if (speakState === 'playing' || speakState === 'loading') {
      ttsAbortRef.current?.abort()
      stopCurrentSpeech()
      if (mountedRef.current) setSpeakState('idle')
      return
    }

    const ctrl = new AbortController()
    ttsAbortRef.current = ctrl

    const safeSpeakState = (s: TtsState): void => {
      if (mountedRef.current) setSpeakState(s)
    }

    try {
      await speakText(message.content, safeSpeakState, ctrl.signal)
    } catch {
      // Error state already applied inside speakText
      if (mountedRef.current) {
        setTimeout(() => { if (mountedRef.current) setSpeakState('idle') }, 2500)
      }
    } finally {
      if (ttsAbortRef.current === ctrl) ttsAbortRef.current = null
    }
  }, [message.content, speakState])

  // ── Action bar ────────────────────────────────────────────────────────────

  const actions = message.content ? (
    <div className={`chat-msg-actions ${isUser ? 'chat-msg-actions-user' : ''}`}>
      {/* Copy */}
      <button
        type="button"
        className="chat-action-btn"
        onClick={handleCopy}
        title={copied ? 'Copied!' : 'Copy message'}
        aria-label="Copy message"
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
      </button>

      {/* Edit (user only) */}
      {isUser && onEdit && (
        <button
          type="button"
          className="chat-action-btn"
          onClick={startEdit}
          disabled={disabled}
          title="Edit message & restart conversation from here"
          aria-label="Edit message"
        >
          <EditIcon />
        </button>
      )}

      {/* Save as file (assistant only, not while streaming) */}
      {!isUser && !isStreaming && typeof window.bardhie?.saveFile === 'function' && (
        <button
          type="button"
          className="chat-action-btn"
          onClick={() => void handleSave()}
          title={saveState === 'saved' ? 'Saved!' : 'Save as file'}
          aria-label="Save message as file"
        >
          {saveState === 'saved' ? <CheckIcon /> : <SaveIcon />}
        </button>
      )}

      {/* Speak (assistant only, not while streaming) */}
      {!isUser && !isStreaming && (
        <button
          type="button"
          className={[
            'chat-action-btn',
            speakState === 'playing' ? 'speak-btn-playing' : '',
            speakState === 'loading' ? 'speak-btn-loading' : '',
            speakState === 'error' ? 'speak-btn-error' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          onClick={handleSpeak}
          disabled={disabled && speakState === 'idle'}
          aria-label={
            speakState === 'playing'
              ? 'Stop speaking'
              : speakState === 'loading'
                ? 'Generating speech…'
                : 'Read aloud'
          }
          title={
            speakState === 'playing'
              ? 'Stop speaking'
              : speakState === 'loading'
                ? 'Generating speech…'
                : speakState === 'error'
                  ? 'Speech unavailable — is the backend running with Piper?'
                  : 'Read aloud (local TTS)'
          }
        >
          {speakState === 'loading' ? (
            <SpinnerIcon />
          ) : speakState === 'playing' ? (
            <StopSpeakerIcon />
          ) : (
            <SpeakerIcon />
          )}
        </button>
      )}
    </div>
  ) : null

  // ── User message (with optional inline edit) ──────────────────────────────

  if (isUser) {
    if (editing) {
      return (
        <div className="chat-msg-row chat-msg-row-user">
          <div className="chat-edit-box">
            <textarea
              ref={editRef}
              className="chat-edit-input"
              value={draft}
              rows={Math.min(5, Math.max(2, draft.split('\n').length))}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  submitEdit()
                } else if (e.key === 'Escape') {
                  setEditing(false)
                }
              }}
              aria-label="Edit message"
            />
            <p className="chat-edit-hint">Sending resets the chat from this message.</p>
            <div className="chat-edit-buttons">
              <button type="button" className="chat-edit-cancel" onClick={() => setEditing(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="chat-edit-save"
                onClick={submitEdit}
                disabled={!draft.trim()}
              >
                Save &amp; resend
              </button>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="chat-msg-row chat-msg-row-user">
        <div className="chat-msg chat-msg-user">{message.content}</div>
        {actions}
      </div>
    )
  }

  // ── Assistant message (with chips) ────────────────────────────────────────

  const chips =
    showChips && message.content && !isStreaming
      ? (() => {
          const opts = extractOptions(message.content)
          return opts.length > 0 ? opts : FOLLOW_UP_CHIPS
        })()
      : []

  return (
    <div className="chat-msg-row chat-msg-row-assistant">
      <div className="chat-msg chat-msg-assistant">
        {message.content ? (
          <MarkdownView content={message.content} isStreaming={isStreaming} />
        ) : isStreaming ? (
          <div className="thinking-indicator inline-indicator">
            <span className="thinking-dot" />
            <span className="thinking-dot" />
            <span className="thinking-dot" />
          </div>
        ) : null}
      </div>

      {actions}

      {chips.length > 0 && (
        <div className="chat-chips" role="group" aria-label="Quick replies">
          {chips.map((chip) => (
            <button
              key={chip.label}
              type="button"
              className="chat-chip"
              disabled={disabled}
              onClick={() => onChipClick?.(chip.send)}
              title={chip.send}
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
