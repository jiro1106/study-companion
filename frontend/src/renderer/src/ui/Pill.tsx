import type { ReactNode } from 'react'

type Tone = 'brand' | 'ok' | 'warn' | 'bad' | 'neutral'

const tones: Record<Tone, string> = {
  brand: 'bg-primary-wash border-primary text-primary-ink',
  ok: 'bg-success-wash border-success text-fg',
  warn: 'bg-warning-wash border-warning text-fg',
  bad: 'bg-danger-wash border-danger text-fg',
  neutral: 'border-border-strong text-fg-muted'
}

export function Pill({
  tone = 'neutral',
  children
}: {
  tone?: Tone
  children: ReactNode
}): React.JSX.Element {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-[10px] border-2 px-2.5 py-1.5 text-xs leading-none font-extrabold tracking-[0.053em] uppercase ${tones[tone]}`}
    >
      {children}
    </span>
  )
}
