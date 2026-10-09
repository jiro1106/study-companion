/** Seconds studied per local day, e.g. { "2026-10-10": 540 }. Lives in localStorage. */
export type StudyLog = Record<string, number>

export const STUDY_LOG_KEY = 'bardy:study-log:v1'

export function dayKey(date: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function daysAgo(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() - n)
  return d
}

export function parseStudyLog(raw: string | null): StudyLog {
  try {
    const parsed = JSON.parse(raw ?? '{}')
    const log: StudyLog = {}
    for (const [day, secs] of Object.entries(parsed ?? {})) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(day) && typeof secs === 'number' && secs > 0) log[day] = secs
    }
    return log
  } catch {
    return {}
  }
}

export function loadStudyLog(): StudyLog {
  try {
    return parseStudyLog(localStorage.getItem(STUDY_LOG_KEY))
  } catch {
    return {}
  }
}

export function addStudySeconds(seconds: number, now = new Date()): StudyLog {
  const log = loadStudyLog()
  const key = dayKey(now)
  log[key] = (log[key] ?? 0) + seconds
  try {
    localStorage.setItem(STUDY_LOG_KEY, JSON.stringify(log))
  } catch {
    // time just isn't remembered
  }
  return log
}

export const minutesOn = (log: StudyLog, date: Date): number => (log[dayKey(date)] ?? 0) / 60

/** Consecutive goal-met days. Today only counts once met; until then the streak holds from yesterday. */
export function streakDays(log: StudyLog, goalMinutes: number, now = new Date()): number {
  let day = minutesOn(log, now) >= goalMinutes ? 0 : 1
  let streak = 0
  while (minutesOn(log, daysAgo(now, day)) >= goalMinutes) {
    streak++
    day++
  }
  return streak
}

/** Monday-first week with goal-met flags, plus today's index. */
export function weekProgress(log: StudyLog, goalMinutes: number, now = new Date()): { weekDone: boolean[]; todayIndex: number } {
  const todayIndex = (now.getDay() + 6) % 7
  const weekDone = Array.from({ length: 7 }, (_, i) => minutesOn(log, daysAgo(now, todayIndex - i)) >= goalMinutes)
  return { weekDone, todayIndex }
}
