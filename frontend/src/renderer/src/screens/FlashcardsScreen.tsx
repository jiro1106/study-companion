import { X } from 'lucide-react'
import { useEffect, useState } from 'react'

import { api, type Flashcard } from '../data'
import { useResource } from '../data/use-resource'
import { useNavigation } from '../shell/navigation'
import { useStudyTimer } from '../study/use-study-timer'
import { RATINGS, currentCardId, flip, isComplete, progress, rate, startSession, type FlashcardSession, type Rating } from '../study/flashcard-session'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'
import { ICON } from '../ui/icon'
import { Kbd } from '../ui/Kbd'
import { Pill } from '../ui/Pill'
import { ProgressBar } from '../ui/ProgressBar'
import { ResourceView } from '../ui/ResourceView'
import { Skeleton } from '../ui/Skeleton'
import { StudyTime } from '../ui/StudyTime'

const RATING_STYLE: Record<Rating, { className: string; label: string }> = {
  again: { className: 'text-danger', label: 'Forgot' },
  hard: { className: 'text-fg-muted', label: 'Hard' },
  good: { className: 'text-fg', label: 'Good' },
  easy: { className: 'text-success', label: 'Easy' }
}

const FACE = 'col-start-1 row-start-1 grid content-center justify-items-center gap-3.5 rounded-3xl border-2 border-b-[6px] border-border bg-surface px-7 py-10 text-center backface-hidden'

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
  const timer = useStudyTimer(!isComplete(session))

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (isTyping(event.target) || event.metaKey || event.ctrlKey || event.repeat || document.querySelector('dialog[open]')) return
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
        {timer.goalReached && <Pill tone="ok">Daily goal reached</Pill>}
        <b className="text-streak tabular-nums">{session.reviewed} / {session.total}</b>
        <StudyTime timer={timer} />
      </div>

      <div className="grid place-items-center overflow-y-auto px-8 pt-3 pb-8">
        {!card ? (
          <EmptyState title="Session complete" body={`You reviewed ${session.total} ${session.total === 1 ? 'card' : 'cards'}. Come back tomorrow for the next batch.`} action={<Button onClick={() => navigate({ screen: 'today' })}>Back to Today</Button>} />
        ) : (
          <div className="grid w-full max-w-[640px] gap-5">
            {/* key remounts per card so the reset to front doesn't animate back (would reveal next definition) */}
            <button key={card.id} type="button" onClick={() => setSession(flip)} aria-label={session.flipped ? 'Show term' : 'Show definition'} className="perspective-distant grid min-h-[280px] w-full cursor-pointer">
              <span className={`grid transform-3d transition-transform duration-500 ease-out ${session.flipped ? 'rotate-y-180' : ''}`}>
                <span aria-hidden={session.flipped} className={`${FACE} font-display text-[34px] leading-tight font-black`}>
                  {card.term}
                  <span className="inline-flex items-center font-body text-[13px] font-bold text-link">Click or press <Kbd>Space</Kbd> to flip</span>
                </span>
                <span aria-hidden={!session.flipped} className={`${FACE} rotate-y-180`}>
                  <span className="font-display text-[34px] leading-tight font-black">{card.term}</span>
                  <span className="max-w-[40ch] text-lg text-fg-muted">{card.definition}</span>
                </span>
              </span>
            </button>
            {session.flipped && (
              <div className="grid gap-3">
                <p className="text-center text-[15px] font-bold text-fg-muted">How well did you know it?</p>
                <div className="grid grid-cols-2 gap-2.5 @min-[860px]:grid-cols-4">
                  {RATINGS.map((rating, i) => (
                    <Button key={rating} variant="secondary" className={`flex-col gap-2 ${RATING_STYLE[rating].className}`} onClick={() => setSession((s) => rate(s, rating))}>
                      {RATING_STYLE[rating].label}
                      <Kbd>{i + 1}</Kbd>
                    </Button>
                  ))}
                </div>
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
