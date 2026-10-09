import { Monitor, Moon, Sun } from 'lucide-react'
import { useState } from 'react'

import { ICON } from '../ui/icon'

type Theme = 'system' | 'light' | 'dark'

const ORDER: Theme[] = ['system', 'light', 'dark']
const META = {
  system: { label: 'System', Icon: Monitor },
  light: { label: 'Light', Icon: Sun },
  dark: { label: 'Dark', Icon: Moon }
} as const

function load(): Theme {
  try {
    const saved = localStorage.getItem('theme')
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // storage unavailable: follow the OS
  }
  return 'system'
}

function apply(theme: Theme): void {
  if (theme === 'system') document.documentElement.removeAttribute('data-theme')
  else document.documentElement.dataset.theme = theme
}

// Runs at import so the saved theme is set before the first render.
apply(load())

export function ThemeToggle(): React.JSX.Element {
  const [theme, setTheme] = useState<Theme>(load)
  const { label, Icon } = META[theme]

  function next(): void {
    const t = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length]
    apply(t)
    try {
      if (t === 'system') localStorage.removeItem('theme')
      else localStorage.setItem('theme', t)
    } catch {
      // not persisted; still applies for this session
    }
    setTheme(t)
  }

  return (
    <button
      type="button"
      onClick={next}
      title={`Theme: ${label}. Click to change.`}
      aria-label={`Theme: ${label}. Click to change.`}
      className="cursor-pointer rounded-control p-2 text-fg-muted hover:bg-surface-2"
    >
      <Icon {...ICON} size={18} />
    </button>
  )
}
