import { Moon, Sun } from 'lucide-react'
import { useState } from 'react'

import { ICON } from '../ui/icon'

type Theme = 'light' | 'dark'

const META = {
  light: { label: 'Light', Icon: Sun },
  dark: { label: 'Dark', Icon: Moon }
} as const

// Saved choice wins; otherwise start from the OS setting.
function load(): Theme {
  try {
    const saved = localStorage.getItem('theme')
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // storage unavailable: fall through to the OS setting
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function apply(theme: Theme): void {
  document.documentElement.dataset.theme = theme
}

// Runs at import so the theme is set before the first render.
apply(load())

export function ThemeToggle(): React.JSX.Element {
  const [theme, setTheme] = useState<Theme>(load)
  const { label, Icon } = META[theme]

  function next(): void {
    const t: Theme = theme === 'light' ? 'dark' : 'light'
    apply(t)
    try {
      localStorage.setItem('theme', t)
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
