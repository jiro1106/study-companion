import assert from 'node:assert/strict'
import test from 'node:test'

// @ts-expect-error Node runs this TypeScript test directly and requires its extension.
import { describeLearner, parseProfile } from '../src/renderer/src/profile.ts'

const valid = { name: '  Ana ', role: 'student', uses: ['School', 7], goalMinutes: 20 }

test('missing or broken profile means first run', () => {
  assert.equal(parseProfile(null), null)
  assert.equal(parseProfile('{oops'), null)
  assert.equal(parseProfile(JSON.stringify({ ...valid, name: '   ' })), null)
  assert.equal(parseProfile(JSON.stringify({ ...valid, role: 'wizard' })), null)
  assert.equal(parseProfile(JSON.stringify({ ...valid, goalMinutes: 999 })), null)
})

test('valid profile is cleaned up', () => {
  assert.deepEqual(parseProfile(JSON.stringify(valid)), {
    name: 'Ana',
    role: 'student',
    uses: ['School'],
    goalMinutes: 20
  })
})

test('learner description feeds the system prompt', () => {
  assert.match(describeLearner(parseProfile(JSON.stringify(valid))!), /Ana.*student using Bardy for school/)
})
