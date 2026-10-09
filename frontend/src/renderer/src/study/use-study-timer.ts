import { useEffect, useRef, useState } from 'react'

import { useProfile } from '../profile'
import { addStudySeconds, loadStudyLog, minutesOn } from './study-log'

export const IDLE_CUTOFF_MS = 60_000

export interface StudyTimer {
  /** Minutes studied today, including earlier sessions. */
  minutes: number
  /** True once this session pushes today past the daily goal. */
  goalReached: boolean
  /** Not counting right now: window unfocused, or no input for a minute. */
  paused: boolean
}

/** Counts a second of study time per tick while `active`, the window is focused and the learner is interacting. */
export function useStudyTimer(active: boolean): StudyTimer {
  const { profile } = useProfile()
  const [minutes, setMinutes] = useState(() => minutesOn(loadStudyLog(), new Date()))
  const [goalReached, setGoalReached] = useState(false)
  const [paused, setPaused] = useState(false)
  const lastInput = useRef(Date.now())

  useEffect(() => {
    if (!active) return
    const touch = (): void => {
      lastInput.current = Date.now()
    }
    const events = ['keydown', 'pointerdown', 'pointermove', 'wheel'] as const
    events.forEach((e) => window.addEventListener(e, touch, { passive: true }))
    touch()

    const id = setInterval(() => {
      const counting = document.visibilityState === 'visible' && document.hasFocus() && Date.now() - lastInput.current < IDLE_CUTOFF_MS
      setPaused(!counting)
      if (!counting) return
      const now = new Date()
      const total = minutesOn(addStudySeconds(1, now), now)
      setMinutes(total)
      if (total >= profile.goalMinutes) setGoalReached(true)
    }, 1000)
    return () => {
      clearInterval(id)
      events.forEach((e) => window.removeEventListener(e, touch))
    }
  }, [active, profile.goalMinutes])

  return { minutes, goalReached, paused }
}
