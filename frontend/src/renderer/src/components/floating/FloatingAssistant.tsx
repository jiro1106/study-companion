/**
 * FloatingAssistant — the top-level component for the
 * floating desktop companion experience.
 *
 * Manages the two visual modes:
 *   - Sleeping: compact mascot-only view
 *   - Awake: popup with chat, controls, and animated mascot
 */

import { useState, useCallback } from 'react'
import type { FloatingMode, MascotState, ChatMessage } from '../../types/assistant'
import PixelMascot from '../mascot/PixelMascot'
import ChatPanel from './ChatPanel'
import { getMockResponse } from './mockResponder'
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

  // ── Mode transitions ──────────────────────────────────

  const wake = useCallback(() => {
    setMode('awake')
    setMascotState('awake')

    // Tell main process to resize to popup dimensions
    window.bardhie.floating?.setMode('awake')
  }, [])

  const sleep = useCallback(() => {
    setMode('sleeping')
    setMascotState('sleeping')

    // Tell main process to resize to mascot-only dimensions
    window.bardhie.floating?.setMode('sleeping')
  }, [])

  const maximize = useCallback(() => {
    window.bardhie.floating?.maximize()
  }, [])

  // ── Chat ──────────────────────────────────────────────

  const handleSend = useCallback(
    async (text: string) => {
      // 1. Add user message
      const userMsg: ChatMessage = {
        id: msgId(),
        role: 'user',
        content: text,
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, userMsg])

      // 2. Thinking state
      setMascotState('thinking')
      setIsLoading(true)

      try {
        // 3. Get mock response
        const reply = await getMockResponse(text)

        // 4. Speaking state
        setMascotState('speaking')

        // 5. Add assistant message
        const assistantMsg: ChatMessage = {
          id: msgId(),
          role: 'assistant',
          content: reply,
          timestamp: Date.now(),
        }
        setMessages((prev) => [...prev, assistantMsg])
        setIsLoading(false)

        // 6. Hold speaking animation, then return to awake
        setTimeout(() => {
          setMascotState('awake')
        }, 1800)
      } catch {
        setIsLoading(false)
        setMascotState('awake')
      }
    },
    []
  )

  // ── Listen for shortcut toggle from main process ──────
  // (handled via the preload bridge event listener set up in FloatingApp)

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
          <span className="floating-header-name">BARDHIE</span>
          <span className="floating-header-status">
            <span className="status-dot" />
            {mascotState === 'thinking'
              ? 'Thinking…'
              : mascotState === 'speaking'
                ? 'Speaking…'
                : mascotState === 'listening'
                  ? 'Listening…'
                  : 'Online'}
          </span>
        </div>
        <div className="floating-controls">
          <button
            className="floating-btn floating-btn-maximize"
            onClick={maximize}
            title="Open Bardy"
            aria-label="Open Bardy"
          >
            {/* Open-in-app icon (arrow out of a box), not a fullscreen glyph */}
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
            {/* Minimize/collapse icon */}
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
