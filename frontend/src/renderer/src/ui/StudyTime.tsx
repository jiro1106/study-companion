import { Info } from 'lucide-react'

import { useProfile } from '../profile'
import type { StudyTimer } from '../study/use-study-timer'

/** Today's study minutes against the goal, with an info tip on what counts. Dims while the timer is paused. */
export function StudyTime({ timer }: { timer: StudyTimer }): React.JSX.Element {
  const { profile } = useProfile()
  return (
    <span className={`group relative flex items-center gap-1.5 text-[13px] text-fg-muted tabular-nums`}>
      <span className={timer.paused ? 'opacity-50' : ''}>{Math.floor(timer.minutes)} / {profile.goalMinutes} min today</span>
      <span tabIndex={0} role="img" aria-label="Study time counts while you are in a flashcard session or quiz." className="rounded-full text-fg-faint outline-none hover:text-fg-muted focus-visible:text-fg-muted">
        <Info aria-hidden className="size-4" />
      </span>
      <span role="tooltip" className="pointer-events-none absolute top-full right-0 z-20 mt-2 hidden w-56 rounded-control border-2 border-border bg-surface p-3 text-[13px] leading-snug whitespace-normal text-fg shadow-lg group-focus-within:block group-hover:block">
        Counts time while you’re in a flashcard session or quiz. Pauses when you’re idle for a minute or leave the window.
      </span>
    </span>
  )
}
