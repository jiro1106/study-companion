export function QuickAsk({
  open,
  onClose
}: {
  open: boolean
  onClose: () => void
}): React.JSX.Element | null {
  if (!open) return null
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 grid place-items-center bg-night/35"
      onClick={onClose}
    >
      <p className="rounded-card bg-surface p-6">Quick ask arrives in Task 11.</p>
    </div>
  )
}
