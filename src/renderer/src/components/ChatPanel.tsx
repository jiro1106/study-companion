import { useState, useRef, useEffect } from 'react'
import type { StudyDocument, ChatMessage } from '../../../shared/types'

interface Props {
  document: StudyDocument | null
}

const BARDHIE_LABEL_STYLE: React.CSSProperties = {
  fontSize: 'var(--text-caption)',
  fontWeight: 800,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  color: 'var(--primary-ink)',
  marginBottom: '4px'
}

function CitationChip({ page }: { page: number }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        border: '2px solid var(--link)',
        borderRadius: '8px',
        padding: '1px 7px',
        fontSize: '11px',
        fontWeight: 800,
        color: 'var(--link)',
        marginLeft: '4px'
      }}
    >
      p. {page}
    </span>
  )
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  if (msg.role === 'user') {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div className="chat-bubble-user animate-fade-in">
          <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{msg.content}</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
      <p style={BARDHIE_LABEL_STYLE}>BARDHIE</p>
      <div className="chat-bubble-ai animate-fade-in">
        <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{msg.content}</p>
        {msg.citations && msg.citations.length > 0 && (
          <div style={{ marginTop: '6px' }}>
            {msg.citations.map((p) => (
              <CitationChip key={p} page={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function ChatPanel({ document }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: document
        ? `I've loaded "${document.name}". Ask me to summarise it, create flashcards, or quiz you on the content.`
        : 'Import a lecture PDF, then ask me to summarise it, create flashcards, or quiz you.'
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Update greeting when document changes
  useEffect(() => {
    if (document) {
      setMessages([
        {
          role: 'assistant',
          content: `I've loaded "${document.name}" (${document.text.split(/\s+/).length.toLocaleString()} words). Ask me to summarise it, create flashcards, or quiz you on the content.`
        }
      ])
    }
  }, [document?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return

    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setLoading(true)

    try {
      const result = await window.bardhie.askAI(text, document?.text)
      if (result.ok) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: result.content, citations: result.citations }
        ])
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: result.error ?? 'Something went wrong. Please try again.'
          }
        ])
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Connection error. Please try again.' }
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void send()
    }
  }

  return (
    <section
      className="card flex flex-col"
      style={{ height: '100%', padding: 0, overflow: 'hidden' }}
      aria-label="AI assistant chat"
      id="chat-panel"
    >
      {/* Header */}
      <div
        style={{
          padding: '14px 20px',
          borderBottom: '2px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 900,
            fontSize: '17px',
            color: 'var(--primary-ink)',
            letterSpacing: '0.03em'
          }}
        >
          BARDHIE
        </span>
        {document && <span className="pill pill-brand">{document.name}</span>}
        {!document && (
          <span className="pill pill-warn">No document</span>
        )}
      </div>

      {/* Message list */}
      <div
        id="chat-messages"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}
      >
        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} />
        ))}

        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <p style={BARDHIE_LABEL_STYLE}>BARDHIE</p>
            <div className="chat-bubble-ai animate-pulse">
              <span style={{ color: 'var(--fg-muted)' }}>Thinking…</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick prompts */}
      {document && (
        <div
          style={{
            padding: '8px 20px',
            display: 'flex',
            gap: '6px',
            flexWrap: 'wrap',
            borderTop: '2px solid var(--border)'
          }}
        >
          {['Summarise this', 'Make flashcards', 'Quiz me'].map((prompt) => (
            <button
              key={prompt}
              id={`quick-prompt-${prompt.toLowerCase().replace(/\s+/g, '-')}`}
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setInput(prompt)
              }}
              disabled={loading}
              style={{ fontSize: '12px', padding: '4px 10px' }}
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '2px solid var(--border)',
          display: 'flex',
          gap: '8px',
          alignItems: 'center'
        }}
      >
        <input
          id="chat-input"
          className="input"
          type="text"
          placeholder={document ? 'Ask about your lecture…' : 'Import a PDF to start…'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          aria-label="Chat message input"
          style={{ flex: 1 }}
        />
        <button
          id="chat-send-btn"
          className="btn btn-primary btn-sm"
          onClick={() => void send()}
          disabled={loading || !input.trim()}
          aria-label="Send message"
        >
          {loading ? (
            <span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
          ) : (
            '↑'
          )}
        </button>
      </div>
    </section>
  )
}
