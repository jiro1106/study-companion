/**
 * FloatingAssistant — the top-level component for the
 * floating desktop companion experience.
 *
 * Connected to the local Ollama AI backend with real-time streaming,
 * dynamic mascot mood sync, and study companion tools.
 */

import { useState, useCallback, useEffect } from 'react'
import type { FloatingMode, MascotState } from '../../types/assistant'
import PixelMascot from '../mascot/PixelMascot'
import ChatPanel from './ChatPanel'
import { checkAiHealth } from '../../services/ai'
import { useSharedChat } from './useSharedChat'
import './FloatingAssistant.css'

export default function FloatingAssistant(): React.JSX.Element {
  const [mode, setMode] = useState<FloatingMode>('sleeping')
  const [mascotState, setMascotState] = useState<MascotState>('sleeping')
  const [aiModel, setAiModel] = useState<string>('Ollama')
  const [aiConnected, setAiConnected] = useState<boolean>(true)

  // Conversation shared (and kept in sync) with the main window
  const { messages, isLoading, send, edit, abort } = useSharedChat({
    onActivity: (activity) =>
      setMascotState(activity === 'idle' ? 'awake' : activity)
  })

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
    window.bardy.floating?.setMode('awake')
  }, [refreshHealth])

  const sleep = useCallback(() => {
    abort()

    setMode('sleeping')
    setMascotState('sleeping')

    // Tell main process to resize to mascot-only dimensions
    window.bardy.floating?.setMode('sleeping')
  }, [abort])

  const maximize = useCallback(() => {
    window.bardy.floating?.maximize()
  }, [])

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
          window.bardy.floating?.move(dx, dy)
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
          title="Wake Bardy"
          aria-label="Wake Bardy assistant"
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
            <span className="floating-header-name">Bardy</span>
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
            onClick={() => window.bardy.floating?.hide()}
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
        onSend={send}
        onEdit={edit}
        onAbort={abort}
        onVoiceStart={handleVoiceStart}
        onVoiceEnd={handleVoiceEnd}
        onTyping={handleTyping}
      />
    </div>
  )
}
