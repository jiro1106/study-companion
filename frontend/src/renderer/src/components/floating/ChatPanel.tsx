/**
 * ChatPanel — scrollable message list with quick suggestion chips,
 * animated typing indicator, markdown formatting, and input bar.
 *
 * Also acts as a drop zone: dragging a file anywhere over the panel attaches
 * it (same as the attach button), ready to send.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Brain, CalendarDays, Hand, Lightbulb, Upload, Zap } from 'lucide-react'
import type { ChatMessage as ChatMessageType } from '../../types/assistant'
import ChatMessage from './ChatMessage'
import MessageInput, { type MessageInputHandle } from './MessageInput'
import PixelMascot from '../mascot/PixelMascot'

const QUICK_PROMPTS = [
  { label: 'Quiz me', icon: Brain, prompt: 'Give me a quick 1-question multiple choice quiz on general biology or science.' },
  { label: 'Explain simply', icon: Lightbulb, prompt: 'Explain the concept of spaced repetition in simple terms for a student.' },
  { label: 'Study tip', icon: Zap, prompt: 'Give me your best 1-sentence tip for staying focused while studying.' },
  { label: 'Plan session', icon: CalendarDays, prompt: 'Help me plan a 2-hour study session with active breaks.' }
]

interface ChatPanelProps {
  messages: ChatMessageType[]
  isLoading: boolean
  onSend: (text: string, attachment?: { name: string; text: string }) => void
  onEdit: (id: string, newText: string) => void
  onAbort?: () => void
  onVoiceStart?: () => void
  onVoiceEnd?: () => void
  onTyping?: (isTyping: boolean) => void
  onNavigate?: (action: { screen: 'quiz' | 'cards'; documentId?: string; deckId?: string }) => void
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
  onNavigate,
}: ChatPanelProps): React.JSX.Element {
  const scrollRef = useRef<HTMLDivElement>(null)
  const messageInputRef = useRef<MessageInputHandle>(null)
  const [isDraggingFile, setIsDraggingFile] = useState(false)
  const dragDepthRef = useRef(0)

  // Auto-scroll to bottom on new messages or loading change
  useEffect(() => {
    const el = scrollRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  }, [messages, isLoading])

  // ── Drag-and-drop: dropping a file anywhere on the panel attaches it ──────

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer?.types.includes('Files')) return
    e.preventDefault()
    dragDepthRef.current += 1
    setIsDraggingFile(true)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer?.types.includes('Files')) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer?.types.includes('Files')) return
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)
    if (dragDepthRef.current === 0) setIsDraggingFile(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    dragDepthRef.current = 0
    setIsDraggingFile(false)
    const file = e.dataTransfer?.files?.[0]
    if (file) messageInputRef.current?.attachFile(file)
  }, [])

  const isEmpty = messages.length === 0
  const lastMessage = messages[messages.length - 1]
  const isThinking = isLoading && (!lastMessage || lastMessage.role === 'user' || (lastMessage.role === 'assistant' && !lastMessage.content))

  return (
    <div
      className="chat-panel-dropzone"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="chat-area" ref={scrollRef}>
        {isEmpty ? (
          <div className="chat-welcome">
            <PixelMascot state="awake" size={56} />
            <p className="chat-welcome-title">Hey there! <Hand size={16} className="inline align-text-bottom" aria-hidden /></p>
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
                  <qp.icon size={13} aria-hidden />
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
                  onNavigate={onNavigate}
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
        ref={messageInputRef}
        onSend={onSend}
        disabled={isLoading}
        onAbort={onAbort}
        onVoiceStart={onVoiceStart}
        onVoiceEnd={onVoiceEnd}
        onTyping={onTyping}
      />

      {isDraggingFile && (
        <div className="chat-drop-overlay" aria-hidden>
          <div className="chat-drop-overlay-card">
            <Upload size={18} aria-hidden />
            <span>Drop file to attach (max 100 MB)</span>
          </div>
        </div>
      )}
    </div>
  )
}
