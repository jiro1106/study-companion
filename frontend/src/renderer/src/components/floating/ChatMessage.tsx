/**
 * ChatMessage — renders a single user or assistant message bubble with markdown support,
 * a copy action, inline edit for user messages, and option chips on assistant messages.
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import type { ChatMessage as ChatMessageType } from '../../types/assistant'
import MarkdownView from '../ui/MarkdownView'

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
  { label: '🧠 Quiz me on this', send: 'Quiz me on what you just explained.' }
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
  // Need at least two to count as a set of choices
  return chips.length >= 2 ? chips.slice(0, 6) : []
}

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

export default function ChatMessage({
  message,
  isStreaming = false,
  disabled = false,
  showChips = false,
  onEdit,
  onChipClick
}: ChatMessageProps): React.JSX.Element {
  const isUser = message.role === 'user'
  const [copied, setCopied] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(message.content)
  const editRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editing && editRef.current) {
      const el = editRef.current
      el.focus()
      el.setSelectionRange(el.value.length, el.value.length)
    }
  }, [editing])

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

  const actions = message.content ? (
    <div className={`chat-msg-actions ${isUser ? 'chat-msg-actions-user' : ''}`}>
      <button
        type="button"
        className="chat-action-btn"
        onClick={handleCopy}
        title={copied ? 'Copied!' : 'Copy message'}
        aria-label="Copy message"
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
      </button>
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
    </div>
  ) : null

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

  const chips = showChips && message.content && !isStreaming
    ? (() => {
        const options = extractOptions(message.content)
        return options.length > 0 ? options : FOLLOW_UP_CHIPS
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
