export interface QuizSession {
  index: number
  selected: number | null
  checked: boolean
  correct: number
  total: number
}

export function startQuiz(total: number): QuizSession {
  return { index: 0, selected: null, checked: false, correct: 0, total }
}

export function isFinished(session: QuizSession): boolean {
  return session.index >= session.total
}

export function select(session: QuizSession, option: number, optionCount = Infinity): QuizSession {
  if (session.checked || isFinished(session) || option >= optionCount) return session
  return { ...session, selected: option }
}

export function check(session: QuizSession, correctIndex: number): QuizSession {
  if (session.checked || session.selected === null) return session
  return { ...session, checked: true, correct: session.correct + (session.selected === correctIndex ? 1 : 0) }
}

export function next(session: QuizSession): QuizSession {
  if (!session.checked) return session
  return { ...session, index: session.index + 1, selected: null, checked: false }
}
