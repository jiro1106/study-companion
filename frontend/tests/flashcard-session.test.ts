import assert from 'node:assert/strict'
import test from 'node:test'

// @ts-expect-error Node runs this TypeScript test directly and requires its extension.
import { currentCardId, flip, isComplete, progress, rate, startSession } from '../src/renderer/src/study/flashcard-session.ts'

test('a new session shows the first card face down', () => {
  const s = startSession(['a', 'b', 'c'])
  assert.equal(currentCardId(s), 'a')
  assert.equal(s.flipped, false)
  assert.equal(s.total, 3)
  assert.equal(progress(s), 0)
})

test('rating is ignored until the card is flipped', () => {
  const s = startSession(['a', 'b'])
  assert.deepEqual(rate(s, 'good'), s)
})

test('good, hard, and easy finish the card and face the next one down', () => {
  for (const rating of ['hard', 'good', 'easy'] as const) {
    const s = rate(flip(startSession(['a', 'b'])), rating)
    assert.equal(currentCardId(s), 'b')
    assert.equal(s.reviewed, 1)
    assert.equal(s.flipped, false)
  }
})

test('again sends the card to the back of the queue without counting it', () => {
  const s = rate(flip(startSession(['a', 'b'])), 'again')
  assert.deepEqual(s.queue, ['b', 'a'])
  assert.equal(s.reviewed, 0)
})

test('flip toggles', () => {
  const s = flip(flip(startSession(['a'])))
  assert.equal(s.flipped, false)
})

test('the session completes when every card is done', () => {
  let s = startSession(['a', 'b'])
  s = rate(flip(s), 'good')
  s = rate(flip(s), 'again')
  s = rate(flip(s), 'easy')
  assert.equal(isComplete(s), true)
  assert.equal(currentCardId(s), null)
  assert.equal(progress(s), 1)
})

test('an empty deck is complete immediately and flip does nothing', () => {
  const s = startSession([])
  assert.equal(isComplete(s), true)
  assert.deepEqual(flip(s), s)
  assert.equal(progress(s), 1)
})
