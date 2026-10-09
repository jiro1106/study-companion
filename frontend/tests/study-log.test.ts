import assert from 'node:assert/strict'
import test from 'node:test'

// @ts-expect-error Node runs this TypeScript test directly and requires its extension.
import { dayKey, minutesOn, parseStudyLog, streakDays, weekProgress } from '../src/renderer/src/study/study-log.ts'

const sat = new Date(2026, 9, 10, 12) // Saturday 2026-10-10
const log = { '2026-10-10': 1200, '2026-10-09': 1200, '2026-10-08': 1200, '2026-10-06': 1200, '2026-10-05': 300 }

test('day keys use the local date', () => {
  assert.equal(dayKey(sat), '2026-10-10')
  assert.equal(minutesOn(log, sat), 20)
})

test('streak counts consecutive goal-met days and stops at a gap', () => {
  assert.equal(streakDays(log, 20, sat), 3)
})

test('streak holds from yesterday until today is met', () => {
  assert.equal(streakDays({ '2026-10-09': 1200, '2026-10-08': 1200 }, 20, sat), 2)
  assert.equal(streakDays({}, 20, sat), 0)
})

test('week is Monday first and flags goal-met days', () => {
  const { weekDone, todayIndex } = weekProgress(log, 20, sat)
  assert.equal(todayIndex, 5)
  assert.deepEqual(weekDone, [false, true, false, true, true, true, false])
})

test('corrupt or malformed logs parse to what is valid', () => {
  assert.deepEqual(parseStudyLog('nope'), {})
  assert.deepEqual(parseStudyLog('{"2026-10-10":60,"x":5,"2026-10-09":-1}'), { '2026-10-10': 60 })
})
