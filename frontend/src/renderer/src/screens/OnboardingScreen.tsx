import { Briefcase, Compass, GraduationCap, Presentation } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'

import { GOALS, NAME_MAX, ROLES, USES, type Profile, type Role } from '../profile'
import { Button } from '../ui/Button'
import { ICON } from '../ui/icon'
import PixelMascot from '../components/mascot/PixelMascot'
import { ProgressBar } from '../ui/ProgressBar'

// Full class names so Tailwind can see them. Text stays fg; only icon, border and wash take the color.
const ROLE_STYLE: Record<Role, { Icon: typeof GraduationCap; icon: string; selected: string }> = {
  student: {
    Icon: GraduationCap,
    icon: 'text-link',
    selected: 'aria-pressed:border-link aria-pressed:bg-link/10'
  },
  professional: {
    Icon: Briefcase,
    icon: 'text-streak',
    selected: 'aria-pressed:border-streak aria-pressed:bg-streak/10'
  },
  'self-learner': {
    Icon: Compass,
    icon: 'text-primary',
    selected: 'aria-pressed:border-primary aria-pressed:bg-primary/10'
  },
  teacher: {
    Icon: Presentation,
    icon: 'text-danger',
    selected: 'aria-pressed:border-danger aria-pressed:bg-danger/10'
  }
}

const SELECTED_DEFAULT = 'aria-pressed:border-link/55 aria-pressed:bg-link/10 aria-pressed:text-link'

// Bardy talks on the welcome step and flaps on the last one, in short bursts:
// lively for LIVELY_MS, then sits until the next CYCLE_MS. Held still if the OS asks for less motion.
const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const CYCLE_MS = 5000
const LIVELY_MS = 1500

function useLivelyBursts(): boolean {
  const [lively, setLively] = useState(!reduceMotion)
  useEffect(() => {
    if (reduceMotion) return
    let calm: ReturnType<typeof setTimeout>
    const burst = (): void => {
      setLively(true)
      calm = setTimeout(() => setLively(false), LIVELY_MS)
    }
    burst()
    const timer = setInterval(burst, CYCLE_MS)
    return () => {
      clearInterval(timer)
      clearTimeout(calm)
    }
  }, [])
  return lively
}

const LABEL = 'text-[13px] font-extrabold tracking-[0.053em] text-fg-muted uppercase'

function Choice({
  selected,
  onClick,
  selectedClass = SELECTED_DEFAULT,
  children
}: {
  selected: boolean
  onClick: () => void
  selectedClass?: string
  children: ReactNode
}): React.JSX.Element {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`flex cursor-pointer items-center gap-3 rounded-control border-2 border-b-4 border-border bg-surface px-4 py-3 text-left text-[15px] font-extrabold text-fg hover:bg-surface-2 ${selectedClass}`}
    >
      {children}
    </button>
  )
}

export function NameField({
  value,
  onChange,
  autoFocus
}: {
  value: string
  onChange: (name: string) => void
  autoFocus?: boolean
}): React.JSX.Element {
  return (
    <label className="grid gap-2">
      <span className={LABEL}>Your name</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={NAME_MAX}
        autoFocus={autoFocus}
        placeholder="What should Bardy call you?"
        className="rounded-control border-2 border-border bg-surface px-4 py-3 text-[15px] text-fg outline-none placeholder:text-fg-faint focus:border-link"
      />
    </label>
  )
}

export function RolePicker({
  value,
  onChange
}: {
  value: Role | null
  onChange: (role: Role) => void
}): React.JSX.Element {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {(Object.keys(ROLES) as Role[]).map((role) => {
        const { Icon, icon, selected } = ROLE_STYLE[role]
        return (
          <Choice
            key={role}
            selected={value === role}
            selectedClass={selected}
            onClick={() => onChange(role)}
          >
            <Icon {...ICON} size={22} className={`shrink-0 ${icon}`} />
            {ROLES[role]}
          </Choice>
        )
      })}
    </div>
  )
}

export function UsePicker({
  value,
  onChange
}: {
  value: string[]
  onChange: (uses: string[]) => void
}): React.JSX.Element {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {USES.map((use) => (
        <Choice
          key={use}
          selected={value.includes(use)}
          onClick={() =>
            onChange(value.includes(use) ? value.filter((u) => u !== use) : [...value, use])
          }
        >
          {use}
        </Choice>
      ))}
    </div>
  )
}

export function GoalPicker({
  value,
  onChange
}: {
  value: number
  onChange: (minutes: number) => void
}): React.JSX.Element {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {GOALS.map((minutes) => (
        <Choice key={minutes} selected={value === minutes} onClick={() => onChange(minutes)}>
          <span className="w-full text-center">{minutes} min</span>
        </Choice>
      ))}
    </div>
  )
}

export function OnboardingScreen({ onDone }: { onDone: (profile: Profile) => void }): React.JSX.Element {
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [role, setRole] = useState<Role | null>(null)
  const [uses, setUses] = useState<string[]>([])
  const [goalMinutes, setGoalMinutes] = useState(20)
  const trimmed = name.trim()
  const lively = useLivelyBursts()

  const steps: Array<{ title: ReactNode; hint?: string; body?: ReactNode; ok: boolean }> = [
    {
      title: "Hi, I'm Bardy!",
      hint: "I'll help you turn your notes into flashcards and quizzes. A few quick questions so I can fit how you study.",
      ok: true
    },
    {
      title: 'What should I call you?',
      body: <NameField value={name} onChange={setName} autoFocus />,
      ok: trimmed.length > 0
    },
    {
      title: 'Which describes you best?',
      hint: 'I use this to pitch explanations at the right level.',
      body: <RolePicker value={role} onChange={setRole} />,
      ok: role !== null
    },
    {
      title: 'Where will you use Bardy?',
      hint: 'Pick any that fit.',
      body: <UsePicker value={uses} onChange={setUses} />,
      ok: uses.length > 0
    },
    {
      title: 'How long do you want to study each day?',
      hint: 'You can change this later in Settings.',
      body: <GoalPicker value={goalMinutes} onChange={setGoalMinutes} />,
      ok: true
    },
    {
      title: <>You're all set, {trimmed}!</>,
      hint: `Daily goal: ${goalMinutes} minutes. Add a PDF and I'll start making cards.`,
      ok: true
    }
  ]
  const last = step === steps.length - 1
  const current = steps[step]

  function next(): void {
    if (!current.ok) return
    if (last) onDone({ name: trimmed, role: role!, uses, goalMinutes })
    else setStep(step + 1)
  }

  return (
    <div className="grid h-full place-items-center overflow-y-auto bg-bg p-6">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          next()
        }}
        className="grid w-full max-w-[560px] gap-6"
      >
        {/* Extra space below so the bar reads as the step's header, not part of the question. */}
        <div className="mb-4 flex items-center gap-4">
          <div className="flex-1">
            <ProgressBar value={step / (steps.length - 1)} label="Setup progress" size="lg" />
          </div>
          <span className={`${LABEL} shrink-0`}>
            {step + 1} of {steps.length}
          </span>
        </div>

        {(step === 0 || last) && (
          <div className="justify-self-center">
            <PixelMascot
              state={!lively ? 'awake' : step === 0 ? 'speaking' : 'thinking'}
              size={112}
            />
          </div>
        )}

        <div className={`grid gap-2 ${step === 0 || last ? 'text-center' : ''}`}>
          <h1 className="font-display text-[30px] leading-tight font-black tracking-[-0.02em] text-balance text-fg">
            {current.title}
          </h1>
          {current.hint && <p className="text-[15px] text-fg-muted">{current.hint}</p>}
        </div>

        {current.body}

        {/* Welcome and finish are centered moments: one centered button, no Back. */}
        <div className={`flex gap-3 ${step === 0 || last ? 'justify-center' : 'justify-between'}`}>
          {step > 0 && !last && (
            <Button variant="ghost" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          )}
          <Button type="submit" disabled={!current.ok}>
            {step === 0 ? 'Get started' : last ? 'Start studying' : 'Continue'}
          </Button>
        </div>
      </form>
    </div>
  )
}
