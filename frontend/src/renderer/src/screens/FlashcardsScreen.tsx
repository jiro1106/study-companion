import { X } from 'lucide-react'
import { useEffect, useState } from 'react'

import { api, type Flashcard } from '../data'
import { useResource } from '../data/use-resource'
import { useNavigation } from '../shell/navigation'
import { RATINGS, RATING_HINTS, currentCardId, flip, isComplete, progress, rate, startSession, type FlashcardSession, type Rating } from '../study/flashcard-session'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'
import { ICON } from '../ui/icon'
import { Kbd } from '../ui/Kbd'
import { ProgressBar } from '../ui/ProgressBar'
import { ResourceView } from '../ui/ResourceView'
import { Skeleton } from '../ui/Skeleton'

const RATING_STYLE: Record<Rating, { variant: 'secondary' | 'primary'; className: string; label: string }> = {
  again: { variant: 'secondary', className: 'text-danger', label: 'Again' },
  hard: { variant: 'secondary', className: 'text-fg-muted', label: 'Hard' },
  good: { variant: 'secondary', className: '', label: 'Good' },
  easy: { variant: 'primary', className: '', label: 'Easy' }
}

function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && target.matches('input, textarea')
}

function isButton(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && target.matches('button')
}

function Session({ cards }: { cards: Flashcard[] }): React.JSX.Element {
  const { navigate } = useNavigation()
  const [session, setSession] = useState<FlashcardSession>(() => startSession(cards.map((c) => c.id)))
  const card = cards.find((c) => c.id === currentCardId(session))

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (isTyping(event.target) || event.metaKey || event.ctrlKey || document.querySelector('dialog[open]')) return
      if (event.code === 'Space') {
        if (isButton(event.target)) return
        event.preventDefault()
        setSession(flip)
      } else if (/^[1-4]$/.test(event.key)) {
        setSession((s) => rate(s, RATINGS[Number(event.key) - 1]))
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div className="grid h-full grid-rows-[auto_1fr_auto]">
      <div className="flex items-center gap-4 px-8 py-5">
        <button type="button" onClick={() => navigate({ screen: 'today' })} aria-label="End session" className="cursor-pointer p-1 text-fg-faint hover:text-fg-muted"><X {...ICON} size={26} /></button>
        <div className="flex-1"><ProgressBar size="lg" value={progress(session)} label="Session progress" /></div>
        <b className="text-streak tabular-nums">{session.reviewed} / {session.total}</b>
      </div>

      <div className="grid place-items-center overflow-y-auto px-8 pt-3 pb-8">
        {!card ? (
          <EmptyState title="Session complete" body={`You reviewed ${session.total} ${session.total === 1 ? 'card' : 'cards'}. Come back tomorrow for the next batch.`} action={<Button onClick={() => navigate({ screen: 'today' })}>Back to Today</Button>} />
        ) : (
          <div className="grid w-full max-w-[640px] gap-5">
            <button type="button" onClick={() => setSession(flip)} aria-label={session.flipped ? 'Show term' : 'Show definition'} className="grid min-h-[280px] w-full cursor-pointer content-center justify-items-center gap-3.5 rounded-3xl border-2 border-b-[6px] border-border bg-surface px-7 py-10 text-center">
              <span className="font-display text-[34px] leading-tight font-black">{card.term}</span>
              {session.flipped && <span className="max-w-[40ch] text-lg text-fg-muted">{card.definition}</span>}
              <span className="text-[12px] font-extrabold tracking-[0.053em] text-link uppercase">{session.flipped ? 'Rate how well you knew it' : 'Click or press Space to flip'}</span>
            </button>
            {session.flipped && (
              <div className="grid grid-cols-2 gap-2.5 mid:grid-cols-4">
                {RATINGS.map((rating, i) => (
                  <Button key={rating} variant={RATING_STYLE[rating].variant} className={`flex-col gap-1.5 ${RATING_STYLE[rating].className}`} onClick={() => setSession((s) => rate(s, rating))}>
                    {RATING_STYLE[rating].label}
                    <small className="text-[11px] font-bold tracking-normal normal-case opacity-80">{i + 1} · {RATING_HINTS[rating]}</small>
                  </Button>
                ))}
              </div>
            )}
            <p className="text-center text-[13px] text-fg-muted">From page {card.sourcePage}</p>
          </div>
        )}
      </div>

      {!isComplete(session) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-border px-8 py-4">
          <span className="text-[13px] text-fg-muted">Keyboard: <Kbd>Space</Kbd> flip · <Kbd>1</Kbd>–<Kbd>4</Kbd> rate</span>
        </div>
      )}
    </div>
  )
}

export function FlashcardsScreen(): React.JSX.Element {
  const { route, navigate } = useNavigation()
  const deckId = route.screen === 'cards' ? route.deckId : undefined
  const cards = useResource<Flashcard[]>(() => api.getDueCards(deckId), [deckId])

  return (
    <ResourceView
      resource={cards}
      loading={<div className="mx-auto grid w-full max-w-[640px] gap-5 px-8 pt-20"><Skeleton className="h-4" /><Skeleton className="h-72 rounded-3xl" /></div>}
      isEmpty={(list) => list.length === 0}
      empty={<div className="px-8"><EmptyState title="No cards due" body="You’re all caught up. Add a PDF to make more cards." action={<Button onClick={() => navigate({ screen: 'today' })}>Back to Today</Button>} /></div>}
    >
      {(list) => <Session cards={list} />}
    </ResourceView>
  )
}
