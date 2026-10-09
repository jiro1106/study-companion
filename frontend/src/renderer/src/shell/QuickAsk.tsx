import { useEffect, useRef, useState, type FormEvent } from 'react'

import { api, toApiError, type ChatMessage } from '../data'
import { Button } from '../ui/Button'
import { Kbd } from '../ui/Kbd'

export function QuickAsk({ open, onClose }: { open: boolean; onClose: () => void }): React.JSX.Element {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<ChatMessage | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  async function onSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (pending || !question.trim()) return
    setPending(true)
    setError(null)
    try {
      setAnswer(await api.ask(null, question))
    } catch (e) {
      setError(toApiError(e).message)
    } finally {
      setPending(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(event) => event.target === dialogRef.current && onClose()}
      aria-labelledby="quick-ask-title"
      className="mx-auto mt-[12vh] w-[min(560px,calc(100%-32px))] rounded-[20px] border-2 border-b-[6px] border-border bg-surface text-fg backdrop:bg-night/35"
    >
      <form onSubmit={onSubmit} className="grid gap-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <b id="quick-ask-title">Quick ask</b>
          <Kbd>Esc</Kbd>
        </div>
        <label htmlFor="quick-ask-input" className="sr-only">Question</label>
        <input id="quick-ask-input" autoFocus value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask anything from your notes…" autoComplete="off" className="w-full rounded-control border-2 border-border bg-surface-2 px-3.5 py-3 text-base placeholder:text-fg-faint focus:border-link focus:bg-surface focus:outline-none" />
        {pending && <p className="text-[14px] text-fg-muted" aria-live="polite">Thinking…</p>}
        {error && <p role="alert" className="rounded-control bg-danger-wash px-3.5 py-2.5 text-[14px]">{error}</p>}
        {answer && !pending && (
          <div className="grid gap-2 rounded-2xl border-2 border-border px-3.5 py-3 text-[15px]" aria-live="polite">
            <span className="text-[12px] font-extrabold tracking-[0.053em] text-primary-ink uppercase">Bardhie</span>
            <p>{answer.text} {answer.citedPages.map((p) => <span key={p} className="rounded-md border-2 border-link/50 px-1.5 py-0.5 text-[11px] font-extrabold text-link">p. {p}</span>)}</p>
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Close</Button>
          <Button type="submit" disabled={pending || !question.trim()}>Ask</Button>
        </div>
      </form>
    </dialog>
  )
}
