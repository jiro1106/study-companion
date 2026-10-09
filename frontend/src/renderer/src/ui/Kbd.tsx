import type { ReactNode } from 'react'

export function Kbd({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <kbd className="whitespace-nowrap rounded-md border-2 border-b-[3px] border-border px-1.5 py-0.5 font-mono text-xs font-bold text-fg-muted">
      {children}
    </kbd>
  )
}
