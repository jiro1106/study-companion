import { Eye, EyeOff } from 'lucide-react'
import { useEffect, useState } from 'react'

import { ICON } from '../ui/icon'

/** Shows or hides the floating mascot that appears when the main window is minimized. */
export function MascotToggle({ compact }: { compact: boolean }): React.JSX.Element | null {
  const [enabled, setEnabled] = useState(true)
  const mascot = window.bardy?.mascot

  // Re-read on focus: the pet's X button can switch it off from outside this window.
  useEffect(() => {
    const sync = (): void => void mascot?.get().then(setEnabled)
    sync()
    window.addEventListener('focus', sync)
    return () => window.removeEventListener('focus', sync)
  }, [mascot])

  if (!mascot) return null // plain browser, no desktop shell

  const Icon = enabled ? Eye : EyeOff
  const title = enabled
    ? 'Floating pet is on. Click to hide it.'
    : 'Floating pet is off. Click to show it.'

  return (
    <button
      type="button"
      onClick={() => void mascot.set(!enabled).then(setEnabled)}
      title={title}
      aria-label="Show floating pet"
      aria-pressed={enabled}
      className={`flex w-full cursor-pointer items-center gap-2 rounded-control py-2 text-[13px] font-extrabold text-fg-muted hover:bg-surface-2 aria-pressed:text-link ${compact ? 'justify-center px-0' : 'px-3'}`}
    >
      <Icon {...ICON} size={18} className="shrink-0" />
      {!compact && <span className="truncate">Show floating pet</span>}
    </button>
  )
}
