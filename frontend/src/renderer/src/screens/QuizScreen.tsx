import { X } from 'lucide-react'
import { useEffect, useState } from 'react'

import { api, type QuizQuestion } from '../data'
import { useResource } from '../data/use-resource'
import { useNavigation } from '../shell/navigation'
import { check, isFinished, next, select, startQuiz, type QuizSession } from '../study/quiz-session'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'
import { ICON } from '../ui/icon'
import { ProgressBar } from '../ui/ProgressBar'
import { ResourceView } from '../ui/ResourceView'
import { Skeleton } from '../ui/Skeleton'

function optionClass(session: QuizSession, i: number, correctIndex: number): string {
  if (session.checked && i === correctIndex) return 'border-success bg-success-wash'
  if (session.checked && i === session.selected) return 'border-danger bg-danger-wash'
  if (i === session.selected) return 'border-link bg-link/10'
  return 'border-border bg-surface'
}

function Quiz({ questions }: { questions: QuizQuestion[] }): React.JSX.Element {
  const { navigate } = useNavigation()
  const [session, setSession] = useState(() => startQuiz(questions.length))
  const question = questions[session.index]
  const right = session.checked && question && session.selected === question.correctIndex

  function advance(): void {
    setSession((s) => (s.checked ? next(s) : check(s, questions[s.index].correctIndex)))
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      const target = event.target instanceof HTMLElement ? event.target : null
      if (target?.matches('input, textarea') || event.metaKey || event.ctrlKey || document.querySelector('dialog[open]')) return
      if (/^[1-4]$/.test(event.key)) setSession((s) => select(s, Number(event.key) - 1))
      if (event.key === 'Enter' && !target?.matches('button')) setSession((s) => (isFinished(s) ? s : s.checked ? next(s) : check(s, questions[s.index].correctIndex)))
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [questions])

  if (!question) {
    return (
      <div className="px-8">
        <EmptyState title={`You got ${session.correct} of ${session.total}`} body={session.correct === session.total ? 'Perfect score. Nice work!' : 'Review the ones you missed with flashcards, then try again.'} action={
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setSession(startQuiz(questions.length))}>Try again</Button>
            <Button onClick={() => navigate({ screen: 'today' })}>Back to Today</Button>
          </div>
        } />
      </div>
    )
  }

  return (
    <div className="grid h-full grid-rows-[auto_1fr_auto]">
      <div className="flex items-center gap-4 px-8 py-5">
        <button type="button" onClick={() => navigate({ screen: 'today' })} aria-label="End quiz" className="cursor-pointer p-1 text-fg-faint hover:text-fg-muted"><X {...ICON} size={26} /></button>
        <div className="flex-1"><ProgressBar size="lg" value={session.index / session.total} label="Quiz progress" /></div>
        <b className="tabular-nums">{session.index + 1} / {session.total}</b>
      </div>

      <div className="grid place-items-center overflow-y-auto px-8 pt-3 pb-8">
        <div className="grid w-full max-w-[640px] gap-5">
          <span className="text-[13px] font-extrabold tracking-[0.053em] text-fg-muted uppercase">Multiple choice</span>
          <h2 className="font-display text-[26px] leading-tight font-black">{question.prompt}</h2>
          <div className="grid gap-2.5" role="group" aria-label="Answers">
            {question.options.map((option, i) => (
              <button key={option} type="button" aria-pressed={session.selected === i} disabled={session.checked} onClick={() => setSession((s) => select(s, i))} className={`flex w-full cursor-pointer items-center gap-3 rounded-control border-2 border-b-4 px-4 py-3.5 text-left text-[17px] font-semibold disabled:cursor-default ${optionClass(session, i, question.correctIndex)}`}>
                <span className="grid size-[30px] shrink-0 place-items-center rounded-lg border-2 border-current/30 text-[13px] font-extrabold text-fg-muted">{i + 1}</span>
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={`flex flex-wrap items-center justify-between gap-3 border-t-2 px-8 py-4 ${!session.checked ? 'border-border' : right ? 'border-transparent bg-success-wash' : 'border-transparent bg-danger-wash'}`} aria-live="polite">
        <div className="min-w-0 flex-1">
          {!session.checked ? (
            <span className="text-[13px] text-fg-muted">Pick an answer, then check it.</span>
          ) : (
            <>
              <div className={`font-display text-[22px] font-black ${right ? 'text-success' : 'text-danger'}`}>{right ? 'Nice work!' : 'Not quite'}</div>
              <span className="text-[13px]">{right ? question.explanation : <>Correct: <b>{question.options[question.correctIndex]}</b>.</>} Page {question.sourcePage}.</span>
            </>
          )}
        </div>
        <Button variant={session.checked && !right ? 'danger' : 'primary'} disabled={session.selected === null} onClick={(e) => { if (e.detail < 2) advance() }}>
          {session.checked ? 'Continue' : 'Check'}
        </Button>
      </div>
    </div>
  )
}

export function QuizScreen(): React.JSX.Element {
  const { route, navigate } = useNavigation()
  const documentId = route.screen === 'quiz' ? route.documentId : undefined
  const questions = useResource<QuizQuestion[]>(() => api.getQuiz(documentId), [documentId])

  return (
    <ResourceView
      resource={questions}
      loading={<div className="mx-auto grid w-full max-w-[640px] gap-4 px-8 pt-20"><Skeleton className="h-10" />{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}</div>}
      isEmpty={(list) => list.length === 0}
      empty={<div className="px-8"><EmptyState title="No quiz yet" body="Quizzes are made from your PDFs. Add one to your library to get started." action={<Button onClick={() => navigate({ screen: 'library' })}>Go to library</Button>} /></div>}
    >
      {(list) => <Quiz questions={list} />}
    </ResourceView>
  )
}
