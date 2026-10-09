import { useEffect, useRef } from 'react'

import { Button } from './Button'

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = 'Delete',
  busy = false,
  onConfirm,
  onCancel
}: {
  open: boolean
  title: string
  body: string
  confirmLabel?: string
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}): React.JSX.Element {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onCancel}
      onClick={(event) => event.target === ref.current && !busy && onCancel()}
      aria-labelledby="confirm-title"
      className="m-auto w-[min(420px,calc(100%-32px))] rounded-[20px] border-2 border-b-[6px] border-border bg-surface text-fg backdrop:bg-scrim"
    >
      <div className="grid gap-4 p-5">
        <h2 id="confirm-title" className="font-display text-xl font-black break-words">{title}</h2>
        <p className="text-[15px] text-fg-muted">{body}</p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" disabled={busy} onClick={onCancel} autoFocus>Cancel</Button>
          <Button variant="danger" disabled={busy} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </dialog>
  )
}
