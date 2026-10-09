import { useEffect, useRef, useState, type FormEvent } from 'react'

import { api, toApiError, type ChatMessage } from '../data'
import { useResource } from '../data/use-resource'
import { Button } from '../ui/Button'
import { ResourceView } from '../ui/ResourceView'
import { Skeleton } from '../ui/Skeleton'

const SUGGESTIONS = ['Explain it simpler', 'Make 5 cards from this', 'What will be on the exam?']

function Citations({ pages }: { pages: number[] }): React.JSX.Element | null {
  if (pages.length === 0) return null
  return (
    <span className="ml-1 inline-flex gap-1">
      {pages.map((page) => (
        <span key={page} className="rounded-md border-2 border-link/50 px-1.5 py-0.5 align-[2px] text-[11px] leading-none font-extrabold whitespace-nowrap text-link">p. {page}</span>
      ))}
    </span>
  )
}

function Bubble({ message }: { message: ChatMessage }): React.JSX.Element {
  return message.role === 'user' ? (
    <div className="max-w-[92%] justify-self-end rounded-2xl rounded-br-sm border-2 border-link/40 bg-link/15 px-3.5 py-3 text-[15px]">{message.text}</div>
  ) : (
    <div className="grid max-w-[92%] gap-2 justify-self-start rounded-2xl rounded-bl-sm border-2 border-border px-3.5 py-3 text-[15px]">
      <span className="text-[12px] font-extrabold tracking-[0.053em] text-primary-ink uppercase">Bardhie</span>
      <p>{message.text}<Citations pages={message.citedPages} /></p>
    </div>
  )
}

export function ChatPanel({ documentId, documentTitle }: { documentId: string; documentTitle: string }): React.JSX.Element {
  const history = useResource<ChatMessage[]>(() => api.listChat(documentId), [documentId])
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [failed, setFailed] = useState('')
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight })
  }, [history.status, pending])

  async function send(question: string): Promise<void> {
    if (pending !== null || !question.trim()) return
    setPending(question.trim())
    setError(null)
    try {
      await api.ask(documentId, question)
      setDraft('')
      history.reload()
    } catch (e) {
      setError(toApiError(e).message)
      setFailed(question)
    } finally {
      setPending(null)
    }
  }

  function onSubmit(event: FormEvent): void {
    event.preventDefault()
    void send(draft)
  }

  return (
    <aside aria-label="Ask about this PDF" className="grid min-h-[420px] grid-rows-[auto_1fr_auto] border-t-2 border-border mid:min-h-0 mid:border-t-0 mid:border-l-2">
      <div className="grid gap-1 border-b-2 border-border px-5 py-4">
        <b>Ask about this PDF</b>
        <span className="text-[13px] text-fg-muted">Answers come only from your notes, with page numbers.</span>
      </div>
      <div ref={logRef} className="grid content-start gap-3.5 overflow-y-auto p-5" aria-live="polite">
        <ResourceView resource={history} loading={<Skeleton className="h-24" />}>
          {(messages) => (
            <>
              {messages.map((m) => <Bubble key={m.id} message={m} />)}
              {pending !== null && (
                <>
                  <Bubble message={{ id: 'pending-q', role: 'user', text: pending, citedPages: [] }} />
                  <div className="justify-self-start rounded-2xl border-2 border-border px-3.5 py-3 text-[15px] text-fg-muted">Thinking…</div>
                </>
              )}
              {error && (
                <div role="alert" className="flex items-center justify-between gap-3 rounded-control bg-danger-wash px-3.5 py-2.5 text-[14px] text-fg">
                  <span>{error}</span>
                  <Button variant="secondary" onClick={() => void send(failed)} disabled={pending !== null}>Try again</Button>
                </div>
              )}
              {messages.length === 0 && pending === null && <p className="text-[14px] text-fg-muted">Ask anything about {documentTitle}. Try one of these:</p>}
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} type="button" disabled={pending !== null} onClick={() => void send(s)} className="cursor-pointer rounded-[10px] border-2 border-b-[3px] border-border bg-surface px-2.5 py-1.5 text-[13px] font-bold disabled:cursor-not-allowed disabled:text-fg-faint">{s}</button>
                ))}
              </div>
            </>
          )}
        </ResourceView>
      </div>
      <form onSubmit={onSubmit} className="grid gap-2.5 border-t-2 border-border px-4 py-3.5">
        <div className="flex gap-2">
          <label htmlFor="chat-input" className="sr-only">Question</label>
          <input id="chat-input" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={`Ask a question about ${documentTitle}`} autoComplete="off" className="w-full min-w-0 rounded-control border-2 border-border bg-surface-2 px-3.5 py-3 text-base placeholder:text-fg-faint focus:border-link focus:bg-surface focus:outline-none" />
          <Button type="submit" disabled={pending !== null || !draft.trim()}>Ask</Button>
        </div>
        <span className="text-[12px] text-fg-muted">Sample answers until the study engine is connected.</span>
      </form>
    </aside>
  )
}
