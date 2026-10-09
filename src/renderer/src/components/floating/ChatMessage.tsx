/**
 * ChatMessage — renders a single user or assistant message bubble.
 */

import type { ChatMessage as ChatMessageType } from '../../types/assistant'

interface ChatMessageProps {
  message: ChatMessageType
}

export default function ChatMessage({ message }: ChatMessageProps): React.JSX.Element {
  const isUser = message.role === 'user'

  return (
    <div className={`chat-msg ${isUser ? 'chat-msg-user' : 'chat-msg-assistant'}`}>
      {message.content}
    </div>
  )
}
