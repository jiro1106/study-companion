import { useState, useEffect } from 'react'
import type { UseStudyTimerResult } from '../hooks/useStudyTimer'
import { formatTime } from '../hooks/useStudyTimer'

interface Props {
  timer: UseStudyTimerResult
}

const GOAL_PRESETS = [
  { label: '25 min', minutes: 25 },
  { label: '45 min', minutes: 45 },
  { label: '60 min', minutes: 60 },
  { label: '90 min', minutes: 90 }
]

const BLOCKED_SITES = [
  { name: 'Facebook', icon: '📘' },
  { name: 'TikTok', icon: '🎵' },
  { name: 'Instagram', icon: '📸' },
  { name: 'Messenger', icon: '💬' },
  { name: 'Twitter / X', icon: '🐦' }
]

export function TimerPanel({ timer }: Props) {
  const { state, elapsed, goal, reminderLabel, setGoal, setReminderLabel, start, pause, stop, reset } =
    timer

  const [customMinutes, setCustomMinutes] = useState('')
  const [showSettings, setShowSettings] = useState(false)

  // Focus Mode state
  const [focusActive, setFocusActive] = useState(false)
  const [focusLoading, setFocusLoading] = useState(false)
  const [focusError, setFocusError] = useState<string | null>(null)
  const [distractionAlert, setDistractionAlert] = useState<string | null>(null)

  const goalSeconds = goal
  const progress = goalSeconds > 0 ? Math.min(elapsed / goalSeconds, 1) : 0
  const remaining = goalSeconds > 0 ? Math.max(goalSeconds - elapsed, 0) : null

  // Initial sync with OS hosts file state + listen for real-time distraction alerts
  useEffect(() => {
    window.bardhie
      ?.getFocusModeStatus()
      ?.then((res) => {
        setFocusActive(res.enabled)
      })
      ?.catch(() => {})

    const cleanup = window.bardhie?.onDistractionAlert?.((alert) => {
      setDistractionAlert(`⚠️ ${alert.site} was opened. Focus mode is keeping you on task!`)
      setTimeout(() => setDistractionAlert(null), 8000)
    })

    return () => {
      if (cleanup) cleanup()
    }
  }, [])

  const handleGoalPreset = (minutes: number) => {
    setGoal(minutes)
    setCustomMinutes('')
  }

  const handleCustomGoal = () => {
    const m = parseInt(customMinutes, 10)
    if (!isNaN(m) && m > 0 && m <= 480) {
      setGoal(m)
    }
  }

  const handleToggleFocusMode = async () => {
    setFocusError(null)

    if (focusActive) {
      // Disabling Focus Mode
      setFocusLoading(true)
      try {
        const res = await window.bardhie.setFocusMode(false)
        if (res.ok) {
          setFocusActive(false)
        } else {
          setFocusError(res.error || 'Could not unblock websites.')
        }
      } catch (err) {
        setFocusError('Failed to disable focus mode.')
      } finally {
        setFocusLoading(false)
      }
    } else {
      // Enabling Focus Mode
      const confirmed = await window.bardhie.confirmDistractionBlock(
        'Facebook, TikTok, Instagram, Messenger, and Twitter / X'
      )
      if (!confirmed) return

      setFocusLoading(true)
      try {
        const res = await window.bardhie.setFocusMode(true)
        if (res.ok) {
          setFocusActive(true)
        } else {
          setFocusError(res.error || 'Could not enable focus mode.')
        }
      } catch (err) {
        setFocusError('Failed to enable focus mode.')
      } finally {
        setFocusLoading(false)
      }
    }
  }

  const isRunning = state === 'running'
  const isDone = state === 'done'

  return (
    <section
      className="card flex flex-col gap-4"
      aria-label="Study timer"
      id="timer-panel"
    >
      {/* Title */}
      <div className="flex items-center justify-between">
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 900,
            fontSize: '15px',
            color: 'var(--primary-ink)',
            letterSpacing: '0.05em',
            textTransform: 'uppercase'
          }}
        >
          ⏱ Study Timer
        </h2>
        <button
          id="timer-settings-btn"
          className="btn btn-ghost btn-sm"
          onClick={() => setShowSettings((s) => !s)}
          aria-expanded={showSettings}
          aria-label="Timer settings"
        >
          {showSettings ? 'Done' : '⚙ Settings'}
        </button>
      </div>

      {/* Settings drawer */}
      {showSettings && (
        <div
          className="animate-slide-up flex flex-col gap-3"
          style={{
            background: 'var(--surface-2)',
            border: '2px solid var(--border)',
            borderRadius: 'var(--radius-control)',
            padding: '14px 16px'
          }}
        >
          {/* Goal presets */}
          <div>
            <p
              style={{
                margin: '0 0 8px',
                fontSize: 'var(--text-caption)',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--fg-muted)'
              }}
            >
              Session goal
            </p>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {GOAL_PRESETS.map(({ label, minutes }) => (
                <button
                  key={minutes}
                  id={`goal-preset-${minutes}`}
                  className="btn btn-secondary btn-sm"
                  style={{
                    borderColor:
                      goalSeconds === minutes * 60 ? 'var(--link)' : undefined,
                    color: goalSeconds === minutes * 60 ? 'var(--link)' : undefined
                  }}
                  onClick={() => handleGoalPreset(minutes)}
                  disabled={isRunning}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom minutes */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              id="custom-goal-input"
              className="input"
              type="number"
              min="1"
              max="480"
              placeholder="Custom min"
              value={customMinutes}
              onChange={(e) => setCustomMinutes(e.target.value)}
              disabled={isRunning}
              style={{ maxWidth: '120px', fontSize: '14px' }}
            />
            <button
              id="custom-goal-set-btn"
              className="btn btn-secondary btn-sm"
              onClick={handleCustomGoal}
              disabled={isRunning || !customMinutes}
            >
              Set
            </button>
          </div>

          {/* Reminder message input */}
          <div>
            <label
              htmlFor="reminder-label-input"
              style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: 'var(--text-caption)',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--fg-muted)'
              }}
            >
              Reminder message
            </label>
            <input
              id="reminder-label-input"
              className="input"
              type="text"
              value={reminderLabel}
              onChange={(e) => setReminderLabel(e.target.value)}
              placeholder="Your study session has ended!"
              style={{ fontSize: '14px' }}
            />
          </div>
        </div>
      )}

      {/* Done banner */}
      {isDone && (
        <div
          className="animate-fade-in"
          style={{
            background: 'var(--primary-wash)',
            border: '2px solid var(--primary)',
            borderRadius: 'var(--radius-control)',
            padding: '10px 16px',
            textAlign: 'center'
          }}
        >
          <p
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontWeight: 900,
              fontSize: '18px',
              color: 'var(--primary-ink)'
            }}
          >
            🎉 Session complete!
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 'var(--text-caption)', color: 'var(--fg-muted)' }}>
            Great work — you studied for {formatTime(elapsed)}.
          </p>
        </div>
      )}

      {/* Distraction detection alert */}
      {distractionAlert && (
        <div className="distraction-alert-box animate-fade-in" role="alert">
          <span>{distractionAlert}</span>
        </div>
      )}

      {/* Timer display */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <div
          className="timer-digits"
          style={{ fontSize: '48px' }}
          aria-live="polite"
          aria-label={`Elapsed time: ${formatTime(elapsed)}`}
        >
          {formatTime(elapsed)}
        </div>

        {goalSeconds > 0 && (
          <div style={{ width: '100%' }}>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${progress * 100}%` }} />
            </div>
            <p
              style={{
                textAlign: 'center',
                fontSize: 'var(--text-caption)',
                color: 'var(--fg-muted)',
                marginTop: '4px'
              }}
            >
              {remaining !== null && remaining > 0
                ? `${formatTime(remaining)} remaining`
                : isDone
                  ? 'Goal reached!'
                  : ''}
            </p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
        {state === 'idle' || state === 'paused' ? (
          <button
            id="timer-start-btn"
            className="btn btn-primary"
            onClick={start}
          >
            {state === 'paused' ? '▶ Resume' : '▶ Start'}
          </button>
        ) : (
          <button
            id="timer-pause-btn"
            className="btn btn-secondary"
            onClick={pause}
            disabled={isDone}
          >
            ⏸ Pause
          </button>
        )}

        <button
          id="timer-stop-btn"
          className="btn btn-ghost"
          onClick={stop}
          disabled={state === 'idle'}
        >
          ⏹ Stop
        </button>

        {isDone && (
          <button
            id="timer-reset-btn"
            className="btn btn-secondary"
            onClick={reset}
          >
            ↺ Reset
          </button>
        )}
      </div>

      {/* ── Focus Mode: Website & Distraction Blocker ── */}
      <div
        style={{
          borderTop: '2px solid var(--border)',
          paddingTop: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}
      >
        {focusActive ? (
          <div className="focus-card-active animate-fade-in" id="focus-mode-active-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="focus-dot-pulse" />
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 900,
                    fontSize: '13px',
                    color: 'var(--primary-ink)',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase'
                  }}
                >
                  🛡️ Focus Mode Active
                </span>
              </div>
              <button
                id="disable-focus-btn"
                className="btn btn-ghost btn-sm"
                onClick={handleToggleFocusMode}
                disabled={focusLoading}
                style={{ fontSize: '11px', padding: '4px 8px' }}
                title="Turn off Focus Mode and unblock websites"
              >
                {focusLoading ? 'Updating…' : 'Turn off'}
              </button>
            </div>

            <p style={{ margin: 0, fontSize: '11px', color: 'var(--fg-muted)', fontWeight: 600 }}>
              Blocked in all web browsers:
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
              {BLOCKED_SITES.map((site) => (
                <span key={site.name} className="blocked-site-tag">
                  <span>{site.icon}</span>
                  <span>{site.name}</span>
                </span>
              ))}
            </div>

            <p style={{ margin: '4px 0 0', fontSize: '10.5px', color: 'var(--fg-faint)' }}>
              🔒 Dual IPv4 &amp; IPv6 protection active · Open social media tabs are automatically refreshed &amp; blocked.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <button
                id="focus-mode-btn"
                className="btn btn-brand btn-sm"
                onClick={handleToggleFocusMode}
                disabled={focusLoading}
                style={{ flex: 1, justifyContent: 'center' }}
                title="Block social media websites across browsers"
              >
                {focusLoading ? (
                  <span>⏳ Setting up…</span>
                ) : (
                  <span>🛡️ Enable Focus Mode</span>
                )}
              </button>
            </div>

            <p style={{ margin: 0, fontSize: '11px', color: 'var(--fg-faint)', lineHeight: 1.3 }}>
              Blocks Facebook, TikTok, Instagram, Messenger, Twitter & X in browsers while studying.
            </p>
          </div>
        )}

        {/* Inline error feedback if permission was denied or failed */}
        {focusError && (
          <div
            className="animate-fade-in"
            style={{
              background: '#fef2f2',
              border: '1px solid #f87171',
              borderRadius: '8px',
              padding: '6px 10px',
              fontSize: '11px',
              color: '#991b1b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '6px'
            }}
          >
            <span>{focusError}</span>
            <button
              onClick={() => setFocusError(null)}
              style={{
                background: 'none',
                border: 'none',
                color: '#991b1b',
                fontWeight: 800,
                cursor: 'pointer',
                padding: '0 2px'
              }}
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
