import assert from 'node:assert/strict'
import test from 'node:test'

// @ts-expect-error Node runs this TypeScript test directly and requires its extension.
import { check, isFinished, next, select, startQuiz } from '../src/renderer/src/study/quiz-session.ts'

test('a new quiz starts on question one with nothing selected', () => {
  assert.deepEqual(startQuiz(3), { index: 0, selected: null, checked: false, correct: 0, total: 3 })
})

test('check does nothing until an option is selected', () => {
  const s = startQuiz(3)
  assert.deepEqual(check(s, 1), s)
})

test('a correct answer counts once, even if check is pressed twice', () => {
  const s = check(check(select(startQuiz(3), 2), 2), 2)
  assert.equal(s.checked, true)
  assert.equal(s.correct, 1)
})

test('a wrong answer does not count', () => {
  assert.equal(check(select(startQuiz(3), 0), 2).correct, 0)
})

test('the selection is locked after checking', () => {
  const s = check(select(startQuiz(3), 0), 2)
  assert.equal(select(s, 2).selected, 0)
})

test('next only moves on after checking and resets the selection', () => {
  const unchecked = select(startQuiz(3), 1)
  assert.deepEqual(next(unchecked), unchecked)
  const moved = next(check(unchecked, 1))
  assert.equal(moved.index, 1)
  assert.equal(moved.selected, null)
  assert.equal(moved.checked, false)
})

test('the quiz finishes after the last question', () => {
  let s = startQuiz(2)
  for (let i = 0; i < 2; i++) s = next(check(select(s, 0), 0))
  assert.equal(isFinished(s), true)
  assert.equal(s.correct, 2)
})

test('an empty quiz is finished immediately', () => {
  assert.equal(isFinished(startQuiz(0)), true)
})
