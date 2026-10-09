import { createContext, useContext } from 'react'

export const PROFILE_KEY = 'bardy:profile:v1'

export const ROLES = {
  student: 'Student',
  professional: 'Working professional',
  'self-learner': 'Self-learner',
  teacher: 'Teacher'
} as const
export type Role = keyof typeof ROLES

export const USES = ['School', 'Exam prep', 'Work', 'Personal learning'] as const
export const GOALS = [10, 20, 30, 45] as const
export const NAME_MAX = 40

export interface Profile {
  name: string
  role: Role
  uses: string[]
  goalMinutes: number
}

/** Validates a stored profile; anything missing or malformed means "first run". */
export function parseProfile(raw: string | null): Profile | null {
  try {
    const p = JSON.parse(raw ?? 'null')
    if (
      typeof p?.name === 'string' &&
      p.name.trim() &&
      Object.hasOwn(ROLES, p.role) &&
      Array.isArray(p.uses) &&
      GOALS.includes(p.goalMinutes)
    ) {
      return {
        name: p.name.trim().slice(0, NAME_MAX),
        role: p.role,
        uses: p.uses.filter((u: unknown) => typeof u === 'string'),
        goalMinutes: p.goalMinutes
      }
    }
  } catch {
    // corrupt JSON: treat as first run
  }
  return null
}

export function loadProfile(): Profile | null {
  try {
    return parseProfile(localStorage.getItem(PROFILE_KEY))
  } catch {
    return null
  }
}

export function saveProfile(profile: Profile): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
  } catch {
    // not remembered; onboarding shows again next launch
  }
}

/** One sentence for the AI system prompt so answers match the learner. */
export function describeLearner(p: Profile): string {
  const uses = p.uses.length ? ` for ${p.uses.join(', ').toLowerCase()}` : ''
  return `The learner's name is ${p.name}. They are a ${ROLES[p.role].toLowerCase()} using Bardy${uses}. Match explanations and examples to that.`
}

export const ProfileContext = createContext<{
  profile: Profile
  setProfile: (profile: Profile) => void
} | null>(null)

export function useProfile(): { profile: Profile; setProfile: (profile: Profile) => void } {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error('useProfile outside ProfileContext')
  return ctx
}
