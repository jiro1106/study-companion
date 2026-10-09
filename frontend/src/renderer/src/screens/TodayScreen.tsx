import { Brain, Flame, Sparkles, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { useProfile } from '../profile'
import { api, toApiError, type Deck, type TodayStats } from '../data'
import { useResource } from '../data/use-resource'
import { PAGE } from '../ui/page'
import { QUICK_ASK_KEYS } from '../shell/Sidebar'
import { useNavigation } from '../shell/navigation'
import { loadStudyLog, minutesOn, streakDays, weekProgress } from '../study/study-log'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { Card } from '../ui/Card'
import { EmptyState } from '../ui/EmptyState'
import { ErrorState } from '../ui/ErrorState'
import { ICON } from '../ui/icon'
import { Kbd } from '../ui/Kbd'
import { Pill } from '../ui/Pill'
import { ProgressBar } from '../ui/ProgressBar'
import { ResourceView } from '../ui/ResourceView'
import { ScreenHeader } from '../ui/ScreenHeader'
import { Skeleton } from '../ui/Skeleton'

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const TILE_TONE: Record<Deck['tone'], string> = {
  brand: 'bg-primary-wash border-primary text-primary-ink',
  link: 'bg-link/15 border-link text-link',
  warning: 'bg-warning-wash border-warning text-fg'
}
const STATUS_PILL: Record<Deck['status'], { tone: 'warn' | 'bad' | 'ok' | 'brand'; label: (deck: Deck) => string }> = {
  due: { tone: 'warn', label: (deck) => `${deck.dueCount} due` },
  struggling: { tone: 'bad', label: () => 'Struggling' },
  mastered: { tone: 'ok', label: () => 'Mastered' },
  new: { tone: 'brand', label: () => 'New' }
}

function greeting(now: Date): string {
  const hour = now.getHours()
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
}

function GoalRing({ value }: { value: number }): React.JSX.Element {
  const circumference = 2 * Math.PI * 44
  return (
    <svg viewBox="0 0 108 108" className="size-[92px] shrink-0" role="img" aria-label={`${Math.round(value * 100)}% of daily goal`}>
      <circle cx="54" cy="54" r="44" fill="none" stroke="var(--surface)" strokeWidth="12" />
      <circle cx="54" cy="54" r="44" fill="none" stroke="var(--primary)" strokeWidth="12" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - value)} transform="rotate(-90 54 54)" />
      <text x="54" y="61" textAnchor="middle" fill="var(--fg)" className="font-display text-[20px] font-black">{Math.round(value * 100)}%</text>
    </svg>
  )
}

function DeckRow({ deck, onOpen, onDelete }: { deck: Deck; onOpen: () => void; onDelete: () => Promise<void> }): React.JSX.Element {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const pill = STATUS_PILL[deck.status]

  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3.5 rounded-card border-2 border-b-4 border-border bg-surface px-4 py-3.5 transition-colors duration-150 ease-out hover:border-border-strong hover:bg-surface-2">
      <button type="button" onClick={onOpen} className={`grid size-12 cursor-pointer place-items-center rounded-[14px] border-2 font-display text-lg font-black ${TILE_TONE[deck.tone]}`} aria-label={`Study ${deck.title}`}>
        {deck.subjectCode}
      </button>
      <button type="button" onClick={onOpen} className="min-w-0 cursor-pointer text-left">
        <div className="truncate text-[17px] font-extrabold">{deck.title}</div>
        <div className="truncate text-[13px] text-fg-muted">{deck.cardCount} cards · from {deck.sourceName}</div>
        <div className="mt-2"><ProgressBar size="sm" value={deck.mastery} label={`${deck.title} mastery`} /></div>
      </button>
      <div className="flex items-center gap-2">
        <Pill tone={pill.tone}>{pill.label(deck)}</Pill>
        <button type="button" onClick={() => setConfirming(true)} aria-label={`Delete ${deck.title}`} className="cursor-pointer rounded-control p-2 text-fg-faint hover:bg-surface-2 hover:text-danger">
          <Trash2 {...ICON} size={18} />
        </button>
      </div>
      <ConfirmDialog
        open={confirming}
        title={`Delete ${deck.title}?`}
        body="This also deletes its cards and quiz progress."
        busy={deleting}
        onCancel={() => setConfirming(false)}
        onConfirm={async () => { setDeleting(true); await onDelete() }}
      />
    </div>
  )
}

export function TodayScreen(): React.JSX.Element {
  const { navigate } = useNavigation()
  const { profile } = useProfile()
  const todayApi = useResource<TodayStats>(() => api.getToday(), [])
  // Study time, streak and the week come from the local study log, not the mock API.
  const now = new Date()
  const log = loadStudyLog()
  const today = todayApi.status === 'ready'
    ? { ...todayApi, data: { ...todayApi.data, minutesToday: minutesOn(log, now), streakDays: streakDays(log, profile.goalMinutes, now), ...weekProgress(log, profile.goalMinutes, now) } }
    : todayApi
  const decks = useResource<Deck[]>(() => api.listDecks(), [])
  const [deleteError, setDeleteError] = useState<string | null>(null)

  if (today.status === 'error') {
    return (
      <div className={PAGE}>
        <ErrorState message={today.error.message} onRetry={() => { today.reload(); decks.reload() }} />
      </div>
    )
  }

  async function deleteDeck(id: string): Promise<void> {
    setDeleteError(null)
    try {
      await api.deleteDeck(id)
    } catch (e) {
      setDeleteError(toApiError(e).message)
    } finally {
      decks.reload()
      today.reload()
    }
  }

  return (
    <div className={PAGE}>
      <ResourceView resource={today} loading={<Skeleton className="h-20" />}>
        {(stats) => (
          <ScreenHeader
            eyebrow={now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
            title={stats.dueCount > 0 ? <>{greeting(now)}, {profile.name}. <span className="text-primary-ink">{stats.dueCount} cards</span> are waiting.</> : <>{greeting(now)}, {profile.name}.</>}
            actions={<Button onClick={() => navigate({ screen: 'library' })}>+ Add PDF</Button>}
          />
        )}
      </ResourceView>

      <div className="grid items-start gap-6 @min-[860px]:grid-cols-[minmax(0,1fr)_300px]">
        <div className="grid min-w-0 gap-6">
          <ResourceView resource={today} loading={<Skeleton className="h-40 rounded-[20px]" />}>
            {(stats) => (
              <>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-4 rounded-[20px] border-2 border-b-[6px] border-primary bg-primary-wash p-5">
                  <GoalRing value={Math.min(1, stats.minutesToday / profile.goalMinutes)} />
                  <div className="grid min-w-[220px] flex-1 gap-3">
                    <span className="text-[13px] font-extrabold text-primary-ink">Daily goal · {profile.goalMinutes} min</span>
                    <h2 className="font-display text-[22px] leading-tight font-black text-fg">
                      {stats.minutesToday >= profile.goalMinutes ? 'Goal reached. Nice work!' : `${Math.floor(stats.minutesToday)} of ${profile.goalMinutes} minutes done. ${Math.ceil(profile.goalMinutes - stats.minutesToday)} more to go.`}
                    </h2>
                    <div className="flex flex-wrap gap-3">
                      <Button disabled={stats.dueCount === 0} onClick={() => navigate({ screen: 'cards' })}>{stats.dueCount > 0 ? `Review ${stats.dueCount} cards` : 'No cards due'}</Button>
                      <Button variant="ghost" onClick={() => navigate({ screen: 'quiz' })}>Take a quiz</Button>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: String(stats.streakDays), label: 'Day streak', color: 'text-streak', Icon: Flame },
                    { value: `${stats.recallPercent}%`, label: 'Recall, 7 days', color: 'text-primary-ink', Icon: Brain },
                    { value: String(stats.cardsMade), label: 'Cards made', color: 'text-link', Icon: Sparkles }
                  ].map((tile) => (
                    <div key={tile.label} className={`flex min-w-0 items-center gap-3.5 rounded-control border-2 border-border p-3.5 ${tile.color}`}>
                      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-current/15">
                        <tile.Icon aria-hidden className="size-5" />
                      </span>
                      <div className="grid min-w-0 gap-0.5">
                        <b className="font-display text-[28px] leading-none font-black tabular-nums">{tile.value}</b>
                        <span className="truncate text-[11px] font-extrabold text-fg-muted">{tile.label}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </ResourceView>

          <section className="grid gap-3" aria-labelledby="decks-heading">
            <div className="flex items-center justify-between">
              <h2 id="decks-heading" className="text-[13px] font-extrabold text-fg-muted">Your decks</h2>
              <Button variant="ghost" className="px-1 py-1" onClick={() => navigate({ screen: 'library' })}>See library</Button>
            </div>
            {deleteError && <p role="alert" className="rounded-control bg-danger-wash px-3.5 py-2.5 text-[14px]">{deleteError}</p>}
            <ResourceView
              resource={decks}
              loading={<div className="grid gap-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-card" />)}</div>}
              isEmpty={(list) => list.length === 0}
              empty={<EmptyState title="No decks yet" body="Add a PDF to your library and Bardy turns it into flashcards and quizzes." action={<Button onClick={() => navigate({ screen: 'library' })}>Go to library</Button>} />}
            >
              {(list) => (
                <div className="grid gap-3">
                  {list.map((deck) => (
                    <DeckRow key={deck.id} deck={deck} onOpen={() => navigate({ screen: 'cards', deckId: deck.id })} onDelete={() => deleteDeck(deck.id)} />
                  ))}
                </div>
              )}
            </ResourceView>
          </section>
        </div>

        <div className="grid min-w-0 gap-4">
          <ResourceView resource={today} loading={<Skeleton className="h-32 rounded-card" />}>
            {(stats) => (
              <Card>
                <span className="text-[13px] font-extrabold text-fg-muted">This week</span>
                <ol className="grid grid-cols-7 gap-1.5 text-center">
                  {stats.weekDone.map((done, i) => (
                    <li key={i} className="grid justify-items-center gap-1.5 text-[11px] font-extrabold text-fg-muted">
                      {DAY_LETTERS[i]}
                      <span className={`grid size-[30px] place-items-center rounded-full border-2 ${done ? 'border-streak bg-streak text-on-primary' : i === stats.todayIndex ? 'border-streak text-streak' : 'border-border text-fg-faint'}`}>
                        {done ? '✓' : i === stats.todayIndex ? '!' : ''}
                      </span>
                    </li>
                  ))}
                </ol>
                <p className="text-[13px] text-fg-muted">{stats.minutesToday >= profile.goalMinutes ? `Goal met. Your streak is ${stats.streakDays} ${stats.streakDays === 1 ? 'day' : 'days'}.` : `Finish today’s goal to keep your ${stats.streakDays}-day streak.`}</p>
              </Card>
            )}
          </ResourceView>

          <Card className="bg-surface-2">
            <span className="text-[13px] font-extrabold text-fg-muted">Tip</span>
            <p className="text-[13px] leading-relaxed">Press <Kbd>{QUICK_ASK_KEYS}</Kbd> to ask Bardy about your notes without leaving what you’re doing.</p>
          </Card>
        </div>
      </div>
    </div>
  )
}
