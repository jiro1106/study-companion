/**
 * ChatPanel — scrollable message list with input bar.
 */

import { useEffect, useRef } from 'react'
import type { ChatMessage as ChatMessageType } from '../../types/assistant'
import ChatMessage from './ChatMessage'
import MessageInput from './MessageInput'
import PixelMascot from '../mascot/PixelMascot'

interface ChatPanelProps {
  messages: ChatMessageType[]
  isLoading: boolean
  onSend: (text: string) => void
  onVoiceStart?: () => void
  onVoiceEnd?: () => void
  onTyping?: (isTyping: boolean) => void
}

export default function ChatPanel({
  messages,
  isLoading,
  onSend,
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
  }, [messages.length, isLoading])

  const isEmpty = messages.length === 0 && !isLoading

  return (
    <>
      <div className="chat-area" ref={scrollRef}>
        {isEmpty ? (
          <div className="chat-welcome">
            <PixelMascot state="awake" size={56} />
            <p className="chat-welcome-title">Hey there! 👋</p>
            <p className="chat-welcome-subtitle">
              I&rsquo;m BARDHIE, your study companion.<br />
              Type or speak a message to get started.
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            {isLoading && (
              <div className="thinking-indicator">
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
        onVoiceStart={onVoiceStart}
        onVoiceEnd={onVoiceEnd}
        onTyping={onTyping}
      />
    </>
  )
}
