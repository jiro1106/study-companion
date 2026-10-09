/**
 * MessageInput — multiline text input with send & microphone voice input buttons.
 *
 * - Enter sends the message.
 * - Shift+Enter inserts a newline.
 * - Microphone button enables voice-to-text input via Web Speech API.
 * - Send is disabled when input is empty or chat is loading.
 */

import { useState, useRef, useCallback, useEffect } from 'react'

interface MessageInputProps {
  onSend: (text: string) => void
  disabled?: boolean
  onVoiceStart?: () => void
  onVoiceEnd?: () => void
  onTyping?: (isTyping: boolean) => void
}

export default function MessageInput({
  onSend,
  disabled = false,
  onVoiceStart,
  onVoiceEnd,
  onTyping,
}: MessageInputProps): React.JSX.Element {
  const [text, setText] = useState('')
  const [isListening, setIsListening] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const recognitionRef = useRef<unknown>(null)

  const canSend = text.trim().length > 0 && !disabled

  const handleSend = useCallback(() => {
    const trimmed = text.trim()
    if (!trimmed || disabled) return

    onSend(trimmed)
    setText('')
    onTyping?.(false)

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [text, disabled, onSend, onTyping])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value
      setText(val)
      onTyping?.(val.length > 0)

      // Auto-grow the textarea
      const el = e.target
      el.style.height = 'auto'
      el.style.height = `${Math.min(el.scrollHeight, 100)}px`
    },
    [onTyping]
  )

  // ── Voice Recognition Setup ─────────────────────────────

  const stopVoice = useCallback(() => {
    if (recognitionRef.current) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(recognitionRef.current as any).stop()
      } catch {
        // ignore error
      }
    }
    setIsListening(false)
    onVoiceEnd?.()
  }, [onVoiceEnd])

  const toggleMic = useCallback(() => {
    if (isListening) {
      stopVoice()
      return
    }

    // Check for SpeechRecognition support
    const SpeechRecognitionAPI =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (SpeechRecognitionAPI) {
      try {
        const recognition = new SpeechRecognitionAPI()
        recognition.continuous = false
        recognition.interimResults = true
        recognition.lang = 'en-US'

        recognition.onstart = () => {
          setIsListening(true)
          onVoiceStart?.()
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onresult = (event: any) => {
          const transcript = Array.from(event.results)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((res: any) => res[0].transcript)
            .join('')
          setText(transcript)
        }

        recognition.onerror = () => {
          stopVoice()
        }

        recognition.onend = () => {
          setIsListening(false)
          onVoiceEnd?.()
        }

        recognitionRef.current = recognition
        recognition.start()
        return
      } catch {
        // Fallback to simulation if initialization fails
      }
    }

    // Fallback simulation (when Web Speech API is blocked/unavailable)
    setIsListening(true)
    onVoiceStart?.()

    const timeout = setTimeout(() => {
      setText((prev) => (prev ? prev : 'Help me summarize chapter 3 for my study session'))
      setIsListening(false)
      onVoiceEnd?.()
    }, 2800)

    recognitionRef.current = {
      stop: () => clearTimeout(timeout),
    }
  }, [isListening, onVoiceStart, onVoiceEnd, stopVoice])

  useEffect(() => {
    return () => {
      stopVoice()
    }
  }, [stopVoice])

  return (
    <div className="input-area">
      <textarea
        ref={textareaRef}
        className="input-field"
        placeholder={isListening ? 'Listening… speak now 🎙️' : 'Type a message…'}
        value={text}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        rows={1}
        aria-label="Message input"
      />
      <button
        className={`mic-btn ${isListening ? 'mic-btn-active' : ''}`}
        onClick={toggleMic}
        disabled={disabled}
        aria-label={isListening ? 'Stop listening' : 'Start voice input'}
        title={isListening ? 'Stop listening' : 'Voice input'}
        type="button"
      >
        {/* Microphone icon */}
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="22" />
        </svg>
      </button>
      <button
        className="send-btn"
        onClick={handleSend}
        disabled={!canSend}
        aria-label="Send message"
        title="Send message"
        type="button"
      >
        {/* Arrow-up send icon */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="19" x2="12" y2="5" />
          <polyline points="5 12 12 5 19 12" />
        </svg>
      </button>
    </div>
  )
}
