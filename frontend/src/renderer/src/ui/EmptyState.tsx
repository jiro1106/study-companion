import type { ReactNode } from 'react'

import { Mascot } from './Mascot'

export function EmptyState({
  title,
  body,
  action,
  awake = true
}: {
  title: string
  body: string
  action?: ReactNode
  awake?: boolean
}): React.JSX.Element {
  return (
    <div className="mx-auto grid max-w-md justify-items-center gap-3 py-12 text-center">
      <Mascot awake={awake} size={72} />
      <h2 className="font-display text-2xl font-black text-fg">{title}</h2>
      <p className="text-fg-muted">{body}</p>
      {action}
    </div>
  )
}
