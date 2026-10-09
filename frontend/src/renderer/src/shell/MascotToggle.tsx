import { Eye, EyeOff } from 'lucide-react'
import { useEffect, useState } from 'react'

import { ICON } from '../ui/icon'

/** Shows or hides the floating mascot that appears when the main window is minimized. */
export function MascotToggle(): React.JSX.Element | null {
  const [enabled, setEnabled] = useState(true)
  const mascot = window.bardhie?.mascot

  // Re-read on focus: the pet's X button can switch it off from outside this window.
  useEffect(() => {
    const sync = (): void => void mascot?.get().then(setEnabled)
    sync()
    window.addEventListener('focus', sync)
    return () => window.removeEventListener('focus', sync)
  }, [mascot])

  if (!mascot) return null // plain browser, no desktop shell

  const Icon = enabled ? Eye : EyeOff
  const title = enabled ? 'Floating pet is on. Click to hide it.' : 'Floating pet is off. Click to show it.'

  return (
    <button
      type="button"
      onClick={() => void mascot.set(!enabled).then(setEnabled)}
      title={title}
      aria-label="Show floating pet"
      aria-pressed={enabled}
      className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-control px-3 py-2 text-[13px] font-extrabold text-fg-muted hover:bg-surface-2 aria-pressed:text-link wide:justify-start"
    >
      <Icon {...ICON} size={18} className="shrink-0" />
      <span className="hidden wide:inline">Show floating pet</span>
    </button>
  )
}
