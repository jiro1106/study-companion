/**
 * FloatingAssistant — the top-level component for the
 * floating desktop companion experience.
 *
 * Connected to the local Ollama AI backend with real-time streaming,
 * dynamic mascot mood sync, and study companion tools.
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import type { FloatingMode, MascotState, ChatMessage } from '../../types/assistant'
import PixelMascot from '../mascot/PixelMascot'
import ChatPanel from './ChatPanel'
import { sendAiChat, checkAiHealth, type AiMessage } from '../../services/ai'
import './FloatingAssistant.css'

/** Generate a unique message ID. */
function msgId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export default function FloatingAssistant(): React.JSX.Element {
  const [mode, setMode] = useState<FloatingMode>('sleeping')
  const [mascotState, setMascotState] = useState<MascotState>('sleeping')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [aiModel, setAiModel] = useState<string>('Ollama')
  const [aiConnected, setAiConnected] = useState<boolean>(true)
  const abortControllerRef = useRef<AbortController | null>(null)

  // ── Health Check ───────────────────────────────────────
  const refreshHealth = useCallback(async () => {
    try {
      const health = await checkAiHealth()
      setAiConnected(health.connected)
      if (health.model && health.model !== 'Offline') {
        setAiModel(health.model)
      }
    } catch {
      setAiConnected(false)
    }
  }, [])

  useEffect(() => {
    refreshHealth()
    const interval = setInterval(refreshHealth, 15000)
    return () => clearInterval(interval)
  }, [refreshHealth])

  // ── Mode transitions ──────────────────────────────────
  const wake = useCallback(() => {
    setMode('awake')
    setMascotState('awake')
    refreshHealth()

    // Tell main process to resize to popup dimensions
    window.bardhie.floating?.setMode('awake')
  }, [refreshHealth])

  const sleep = useCallback(() => {
    // Abort any ongoing stream
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }

    setMode('sleeping')
    setMascotState('sleeping')
    setIsLoading(false)

    // Tell main process to resize to mascot-only dimensions
    window.bardhie.floating?.setMode('sleeping')
  }, [])

  const maximize = useCallback(() => {
    window.bardhie.floating?.maximize()
  }, [])

  const handleClearChat = useCallback(() => {
    if (isLoading) return
    setMessages([])
  }, [isLoading])

  // ── Chat with Real-Time Streaming ─────────────────────
  const handleSend = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || isLoading) return

      // 1. Add user message
      const userMsg: ChatMessage = {
        id: msgId(),
        role: 'user',
        content: trimmed,
        timestamp: Date.now(),
      }

      const assistantMsgId = msgId()
      const assistantPlaceholder: ChatMessage = {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
      }

      setMessages((prev) => [...prev, userMsg, assistantPlaceholder])

      // 2. Set thinking state
      setMascotState('thinking')
      setIsLoading(true)

      const controller = new AbortController()
      abortControllerRef.current = controller

      // Prepare conversation history
      const historyPayload: AiMessage[] = [
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: trimmed }
      ]

      let hasStartedSpeaking = false

      try {
        await sendAiChat({
          messages: historyPayload,
          systemPrompt:
            'You are BARDHIE, a friendly, ultra-knowledgeable desktop study companion bird. ' +
            'Help the user with active recall, concise explanations, study tips, flashcards, and motivation. ' +
            'Keep replies engaging, clear, and appropriately concise for a desktop widget.',
          stream: true,
          signal: controller.signal,
          onChunk: (_chunk, fullText) => {
            if (!hasStartedSpeaking) {
              hasStartedSpeaking = true
              setMascotState('speaking')
            }
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId ? { ...m, content: fullText } : m
              )
            )
          }
        })

        // If not streaming or finished instantly
        setMascotState('speaking')
        setIsLoading(false)

        setTimeout(() => {
          setMascotState('awake')
        }, 1200)
      } catch (err: any) {
        if (err.name === 'AbortError') return

        setIsLoading(false)
        setMascotState('awake')
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  content:
                    'Sorry, I had trouble reaching the AI server. Please make sure Ollama and the backend are running on http://127.0.0.1:8001.'
                }
              : m
          )
        )
      } finally {
        abortControllerRef.current = null
      }
    },
    [messages, isLoading]
  )

  // ── Drag & Mascot Mouse Interactions ──────────────────
  const handleMascotMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return // Left click only
      let startX = e.screenX
      let startY = e.screenY
      let hasDragged = false

      const handleMouseMove = (moveEvt: MouseEvent) => {
        const dx = moveEvt.screenX - startX
        const dy = moveEvt.screenY - startY

        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
          hasDragged = true
        }

        if (hasDragged && (dx !== 0 || dy !== 0)) {
          window.bardhie.floating?.move(dx, dy)
          startX = moveEvt.screenX
          startY = moveEvt.screenY
        }
      }

      const handleMouseUp = () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)

        if (!hasDragged) {
          wake()
        }
      }

      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    },
    [wake]
  )

  const handleVoiceStart = useCallback(() => {
    setMascotState('listening')
  }, [])

  const handleVoiceEnd = useCallback(() => {
    setMascotState('awake')
  }, [])

  const handleTyping = useCallback((isTyping: boolean) => {
    setMascotState((prev) => {
      if (prev === 'thinking' || prev === 'speaking') return prev
      return isTyping ? 'listening' : 'awake'
    })
  }, [])

  // ── Render ────────────────────────────────────────────
  if (mode === 'sleeping') {
    return (
      <div className="floating-sleeping" title="Drag mascot anywhere to move • Click Wake button to open">
        <PixelMascot
          state="sleeping"
          size={76}
          isDragRegion={true}
          onMouseDown={handleMascotMouseDown}
        />
        <button
          className="wake-pill-btn"
          onClick={wake}
          title="Wake BARDHIE"
          aria-label="Wake BARDHIE assistant"
        >
          <span className="wake-pill-dot" />
          <span>Wake</span>
        </button>
      </div>
    )
  }

  return (
    <div className="floating-popup">
      {/* Header */}
      <div className="floating-header">
        <PixelMascot state={mascotState} size={36} className="header-mascot" />
        <div className="floating-header-info">
          <div className="flex items-center gap-2">
            <span className="floating-header-name">BARDHIE</span>
            <span className="floating-model-pill" title={`Active LLM: ${aiModel}`}>
              {aiModel}
            </span>
          </div>
          <span className="floating-header-status">
            <span className={`status-dot ${!aiConnected ? 'status-dot-offline' : ''}`} />
            {mascotState === 'thinking'
              ? 'Thinking…'
              : mascotState === 'speaking'
                ? 'Speaking…'
                : mascotState === 'listening'
                  ? 'Listening…'
                  : aiConnected
                    ? 'Online'
                    : 'Offline (Local)'}
          </span>
        </div>
        <div className="floating-controls">
          {messages.length > 0 && (
            <button
              className="floating-btn"
              onClick={handleClearChat}
              title="Clear chat history"
              aria-label="Clear chat history"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
            </button>
          )}
          <button
            className="floating-btn floating-btn-maximize"
            onClick={maximize}
            title="Open Main Window"
            aria-label="Open Main Window"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h6v6" />
              <path d="M10 14 21 3" />
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            </svg>
          </button>
          <button
            className="floating-btn floating-btn-minimize"
            onClick={sleep}
            title="Minimize to mascot"
            aria-label="Minimize to sleeping mascot"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <button
            className="floating-btn floating-btn-close"
            onClick={() => window.bardhie.floating?.hide()}
            title="Hide mascot"
            aria-label="Hide mascot"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Chat */}
      <ChatPanel
        messages={messages}
        isLoading={isLoading}
        onSend={handleSend}
        onVoiceStart={handleVoiceStart}
        onVoiceEnd={handleVoiceEnd}
        onTyping={handleTyping}
      />
    </div>
  )
}
