/**
 * ChatMessage — renders a single user or assistant message bubble with markdown support.
 */

import type { ChatMessage as ChatMessageType } from '../../types/assistant'
import MarkdownView from '../ui/MarkdownView'

interface ChatMessageProps {
  message: ChatMessageType
  isStreaming?: boolean
}

export default function ChatMessage({ message, isStreaming = false }: ChatMessageProps): React.JSX.Element {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div className="chat-msg chat-msg-user">
        {message.content}
      </div>
    )
  }

  return (
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
  )
}
