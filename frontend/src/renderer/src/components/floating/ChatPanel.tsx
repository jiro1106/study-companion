/**
 * ChatPanel — scrollable message list with quick suggestion chips,
 * animated typing indicator, markdown formatting, and input bar.
 */

import { useEffect, useRef } from 'react'
import type { ChatMessage as ChatMessageType } from '../../types/assistant'
import ChatMessage from './ChatMessage'
import MessageInput from './MessageInput'
import PixelMascot from '../mascot/PixelMascot'

const QUICK_PROMPTS = [
  { label: '🧠 Quiz me', prompt: 'Give me a quick 1-question multiple choice quiz on general biology or science.' },
  { label: '💡 Explain simply', prompt: 'Explain the concept of spaced repetition in simple terms for a student.' },
  { label: '⚡ Study tip', prompt: 'Give me your best 1-sentence tip for staying focused while studying.' },
  { label: '📅 Plan session', prompt: 'Help me plan a 2-hour study session with active breaks.' }
]

interface ChatPanelProps {
  messages: ChatMessageType[]
  isLoading: boolean
  onSend: (text: string) => void
  onEdit: (id: string, newText: string) => void
  onAbort?: () => void
  onVoiceStart?: () => void
  onVoiceEnd?: () => void
  onTyping?: (isTyping: boolean) => void
}

export default function ChatPanel({
  messages,
  isLoading,
  onSend,
  onEdit,
  onAbort,
  onVoiceStart,
  onVoiceEnd,
  onTyping,
}: ChatPanelProps): React.JSX.Element {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages or loading change
  useEffect(() => {
    const el = scrollRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  }, [messages, isLoading])

  const isEmpty = messages.length === 0
  const lastMessage = messages[messages.length - 1]
  const isThinking = isLoading && (!lastMessage || lastMessage.role === 'user' || (lastMessage.role === 'assistant' && !lastMessage.content))

  return (
    <>
      <div className="chat-area" ref={scrollRef}>
        {isEmpty ? (
          <div className="chat-welcome">
            <PixelMascot state="awake" size={56} />
            <p className="chat-welcome-title">Hey there! 👋</p>
            <p className="chat-welcome-subtitle">
              I&rsquo;m Bardy, your AI study companion.<br />
              Ask me anything, or try one of these quick prompts:
            </p>
            <div className="quick-prompts-grid">
              {QUICK_PROMPTS.map((qp) => (
                <button
                  key={qp.label}
                  type="button"
                  className="quick-prompt-btn"
                  onClick={() => onSend(qp.prompt)}
                  disabled={isLoading}
                >
                  {qp.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, index) => {
              // Only consider the last assistant message streaming if loading and it has content
              const isLastAssistant = index === messages.length - 1 && msg.role === 'assistant'
              const isStreaming = isLoading && isLastAssistant && Boolean(msg.content)

              // If it's an empty placeholder and we're showing the thinking indicator, skip rendering empty bubble
              if (isLastAssistant && !msg.content && isLoading) {
                return null
              }

              return (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  isStreaming={isStreaming}
                  disabled={isLoading}
                  showChips={isLastAssistant && !isLoading}
                  onEdit={onEdit}
                  onChipClick={onSend}
                />
              )
            })}
            {isThinking && (
              <div className="thinking-indicator" role="status" aria-live="polite">
                <span className="thinking-label">Bardy is thinking</span>
                <span className="thinking-dot" />
                <span className="thinking-dot" />
                <span className="thinking-dot" />
              </div>
            )}
          </>
        )}
      </div>
      <MessageInput
        onSend={onSend}
        disabled={isLoading}
        onAbort={onAbort}
        onVoiceStart={onVoiceStart}
        onVoiceEnd={onVoiceEnd}
        onTyping={onTyping}
      />
    </>
  )
}
