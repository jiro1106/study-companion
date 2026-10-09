import { CloudOff } from 'lucide-react'

import { Button } from './Button'
import { ICON } from './icon'

export function ErrorState({
  message,
  onRetry
}: {
  message: string
  onRetry: () => void
}): React.JSX.Element {
  return (
    <div
      role="alert"
      className="mx-auto grid max-w-md justify-items-center gap-3 rounded-card bg-danger-wash px-6 py-8 text-center"
    >
      <CloudOff {...ICON} size={36} className="text-danger" />
      <h2 className="font-display text-xl font-black text-danger">Couldn’t load this</h2>
      <p className="text-fg">{message}</p>
      <Button variant="secondary" onClick={onRetry}>
        Try again
      </Button>
    </div>
  )
}
