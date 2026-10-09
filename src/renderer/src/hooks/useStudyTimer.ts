import { useState, useEffect, useRef, useCallback } from 'react'

export type TimerState = 'idle' | 'running' | 'paused' | 'done'

export interface UseStudyTimerResult {
  state: TimerState
  elapsed: number       // seconds elapsed
  goal: number          // seconds the user wants to study (0 = no limit)
  reminderLabel: string
  setGoal: (minutes: number) => void
  setReminderLabel: (label: string) => void
  start: () => void
  pause: () => void
  stop: () => void
  reset: () => void
}

/**
 * Study timer with start / pause / stop controls.
 * When `goal > 0` and the timer reaches the goal, it schedules
 * an OS notification via window.bardhie.scheduleReminder.
 */
export function useStudyTimer(): UseStudyTimerResult {
  const [state, setState] = useState<TimerState>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [goal, setGoalRaw] = useState(25 * 60)  // default 25 min
  const [reminderLabel, setReminderLabel] = useState('Your study session has ended!')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const reminderScheduled = useRef(false)

  const clearTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  // Schedule reminder when goal is set and timer starts
  const scheduleReminderIfNeeded = useCallback(
    (currentElapsed: number) => {
      if (goal <= 0 || reminderScheduled.current) return
      const remaining = (goal - currentElapsed) * 1000
      if (remaining <= 0) return
      reminderScheduled.current = true
      void window.bardhie.scheduleReminder(reminderLabel, remaining)
    },
    [goal, reminderLabel]
  )

  const start = useCallback(() => {
    setState('running')
    scheduleReminderIfNeeded(elapsed)
    intervalRef.current = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1
        if (goal > 0 && next >= goal) {
          clearTimer()
          setState('done')
        }
        return next
      })
    }, 1000)
  }, [elapsed, goal, scheduleReminderIfNeeded])

  const pause = useCallback(() => {
    clearTimer()
    setState('paused')
  }, [])

  const stop = useCallback(() => {
    clearTimer()
    setState('idle')
    setElapsed(0)
    reminderScheduled.current = false
  }, [])

  const reset = useCallback(() => {
    clearTimer()
    setState('idle')
    setElapsed(0)
    reminderScheduled.current = false
  }, [])

  const setGoal = useCallback((minutes: number) => {
    setGoalRaw(minutes * 60)
    reminderScheduled.current = false
  }, [])

  // Cleanup on unmount
  useEffect(() => () => clearTimer(), [])

  return {
    state,
    elapsed,
    goal,
    reminderLabel,
    setGoal,
    setReminderLabel,
    start,
    pause,
    stop,
    reset
  }
}

/** Format seconds as MM:SS */
export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
