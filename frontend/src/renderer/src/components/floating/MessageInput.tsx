/**
 * MessageInput — multiline text input with send & microphone buttons.
 *
 * Microphone flow
 * ---------------
 *  idle  →  (click mic)  →  recording
 *  recording  →  (click stop / max 90 s)  →  transcribing
 *  transcribing  →  (backend reply)  →  idle  (text placed in field)
 *  recording / transcribing  →  (error)  →  idle  (brief error message)
 *
 * Audio is recorded via MediaRecorder and sent to POST /api/transcribe.
 * Nothing is sent to cloud speech services.
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { transcribeAudio } from '../../services/voice'

type MicState = 'idle' | 'recording' | 'transcribing' | 'error'

const ERROR_MESSAGES: Record<string, string> = {
  NotAllowedError: 'Microphone access denied.',
  NotFoundError: 'No microphone found.',
  NotReadableError: 'Microphone is in use by another app.',
}

/** Pick the best audio MIME type the current browser supports. */
function chooseMimeType(): string {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg',
    'audio/mp4',
  ]
  for (const t of types) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) return t
  }
  return ''   // browser will choose
}

const MAX_RECORDING_MS = 90_000  // 90 seconds hard cap

interface MessageInputProps {
  onSend: (text: string) => void
  disabled?: boolean
  /** When provided, the send button becomes a stop button while `disabled` is true. */
  onAbort?: () => void
  onVoiceStart?: () => void
  onVoiceEnd?: () => void
  onTyping?: (isTyping: boolean) => void
}

export default function MessageInput({
  onSend,
  disabled = false,
  onAbort,
  onVoiceStart,
  onVoiceEnd,
  onTyping,
}: MessageInputProps): React.JSX.Element {
  const [text, setText] = useState('')
  const [micState, setMicState] = useState<MicState>('idle')
  const [micError, setMicError] = useState<string>('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const maxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const isVoiceBusy = micState === 'recording' || micState === 'transcribing'
  const canSend = text.trim().length > 0 && !disabled && !isVoiceBusy

  // ── Textarea auto-grow ────────────────────────────────────────────────────

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value
      setText(val)
      onTyping?.(val.length > 0)
      const el = e.target
      el.style.height = 'auto'
      el.style.height = `${Math.min(el.scrollHeight, 100)}px`
    },
    [onTyping],
  )

  // ── Send ──────────────────────────────────────────────────────────────────

  const handleSend = useCallback(() => {
    const trimmed = text.trim()
    if (!trimmed || disabled || isVoiceBusy) return
    onSend(trimmed)
    setText('')
    onTyping?.(false)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.focus()
    }
  }, [text, disabled, isVoiceBusy, onSend, onTyping])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend],
  )

  // ── Release mic resources ─────────────────────────────────────────────────

  const releaseMic = useCallback(() => {
    if (maxTimerRef.current) {
      clearTimeout(maxTimerRef.current)
      maxTimerRef.current = null
    }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try { recorderRef.current.stop() } catch { /* ignore */ }
    }
    recorderRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    chunksRef.current = []
  }, [])

  // ── Stop recording (triggers onstop → transcription) ─────────────────────

  const stopRecording = useCallback(() => {
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop()   // onstop fires async
    }
  }, [])

  // ── Start recording ───────────────────────────────────────────────────────

  const startRecording = useCallback(async () => {
    setMicError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      streamRef.current = stream

      const mimeType = chooseMimeType()
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      recorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        // Always release the mic immediately
        stream.getTracks().forEach((t) => t.stop())
        streamRef.current = null
        onVoiceEnd?.()

        const blob = new Blob(chunksRef.current, {
          type: mimeType || 'audio/webm',
        })
        chunksRef.current = []

        if (blob.size < 800) {
          // Recording too short / silent — nothing to transcribe
          setMicState('idle')
          return
        }

        setMicState('transcribing')
        const ctrl = new AbortController()
        abortRef.current = ctrl

        try {
          const transcript = await transcribeAudio(blob, ctrl.signal)
          if (!ctrl.signal.aborted) {
            // Append to existing text if there is some; otherwise replace
            setText((prev) => {
              const base = prev.trim()
              return base ? `${base} ${transcript}` : transcript
            })
            // Resize the textarea to fit the new text
            requestAnimationFrame(() => {
              const el = textareaRef.current
              if (el) {
                el.style.height = 'auto'
                el.style.height = `${Math.min(el.scrollHeight, 100)}px`
                el.focus()
              }
            })
          }
          setMicState('idle')
        } catch (err: unknown) {
          if (ctrl.signal.aborted) { setMicState('idle'); return }
          const msg =
            err instanceof Error ? err.message : 'Transcription failed.'
          setMicError(msg)
          setMicState('error')
          setTimeout(() => { setMicState('idle'); setMicError('') }, 3000)
        } finally {
          if (abortRef.current === ctrl) abortRef.current = null
        }
      }

      recorder.start(200)   // collect data every 200 ms for reliable onstop
      setMicState('recording')
      onVoiceStart?.()

      // Hard cap: auto-stop after MAX_RECORDING_MS
      maxTimerRef.current = setTimeout(() => {
        stopRecording()
      }, MAX_RECORDING_MS)

    } catch (err: unknown) {
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      const name = err instanceof DOMException ? err.name : ''
      const msg = ERROR_MESSAGES[name] ?? 'Could not access microphone.'
      setMicError(msg)
      setMicState('error')
      setTimeout(() => { setMicState('idle'); setMicError('') }, 3000)
    }
  }, [onVoiceStart, onVoiceEnd, stopRecording])

  // ── Toggle mic button ─────────────────────────────────────────────────────

  const toggleMic = useCallback(() => {
    if (disabled) return
    if (micState === 'recording') {
      stopRecording()
    } else if (micState === 'idle') {
      void startRecording()
    }
    // Clicking while transcribing does nothing (button is in loading state)
  }, [micState, disabled, startRecording, stopRecording])

  // ── Re-focus when bot finishes responding ────────────────────────────────

  const prevDisabledRef = useRef(disabled)
  useEffect(() => {
    const wasDisabled = prevDisabledRef.current
    prevDisabledRef.current = disabled
    // Transition from loading → ready: restore keyboard focus to the input
    if (wasDisabled && !disabled && micState === 'idle') {
      textareaRef.current?.focus()
    }
  }, [disabled, micState])

  // ── Cleanup on unmount ────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      releaseMic()
      abortRef.current?.abort()
    }
  }, [releaseMic])

  // ── Mic button appearance ─────────────────────────────────────────────────

  const micLabel =
    micState === 'recording'
      ? 'Stop recording'
      : micState === 'transcribing'
        ? 'Transcribing…'
        : micState === 'error'
          ? micError || 'Error'
          : 'Start voice input'

  const micTitle =
    micState === 'recording'
      ? 'Recording… click to stop'
      : micState === 'transcribing'
        ? 'Transcribing your speech…'
        : micState === 'error'
          ? micError || 'Microphone error'
          : 'Voice input (local Whisper)'

  const inputPlaceholder =
    micState === 'recording'
      ? 'Recording… click the mic to stop 🎙️'
      : micState === 'transcribing'
        ? 'Transcribing…'
        : micState === 'error'
          ? micError || 'Error — please try again'
          : 'Type a message…'

  return (
    <div className="input-area">
      <textarea
        ref={textareaRef}
        className="input-field"
        placeholder={inputPlaceholder}
        value={text}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        disabled={disabled || micState === 'transcribing'}
        rows={1}
        aria-label="Message input"
      />

      {/* ── Microphone button ── */}
      <button
        type="button"
        className={[
          'mic-btn',
          micState === 'recording' ? 'mic-btn-active' : '',
          micState === 'transcribing' ? 'mic-btn-transcribing' : '',
          micState === 'error' ? 'mic-btn-error' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        onClick={toggleMic}
        disabled={disabled || micState === 'transcribing'}
        aria-label={micLabel}
        title={micTitle}
      >
        {micState === 'transcribing' ? (
          /* Spinner ring */
          <svg
            className="mic-spinner"
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <path d="M12 2a10 10 0 0 1 10 10" />
          </svg>
        ) : micState === 'recording' ? (
          /* Square stop icon while recording */
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <rect x="4" y="4" width="16" height="16" rx="2" />
          </svg>
        ) : (
          /* Default microphone icon */
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="22" />
          </svg>
        )}
      </button>

      {/* ── Send / Stop button ── */}
      {disabled && onAbort ? (
        <button
          className="send-btn send-btn-stop"
          onClick={onAbort}
          aria-label="Stop generating"
          title="Stop generating"
          type="button"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <rect x="4" y="4" width="16" height="16" rx="2" />
          </svg>
        </button>
      ) : (
        <button
          className="send-btn"
          onClick={handleSend}
          disabled={!canSend}
          aria-label="Send message"
          title="Send message"
          type="button"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="19" x2="12" y2="5" />
            <polyline points="5 12 12 5 19 12" />
          </svg>
        </button>
      )}
    </div>
  )
}
