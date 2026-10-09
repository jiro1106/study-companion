import assert from 'node:assert/strict'
import test from 'node:test'
import { getDocument } from 'pdfjs-dist'

// @ts-expect-error Node runs this TypeScript test directly and requires its extension.
import { ApiError, OFFLINE_MESSAGE, createApi, mockModeFrom, toApiError } from '../src/renderer/src/data/api.ts'
// @ts-expect-error Node runs this TypeScript test directly and requires its extension.
import { sampleSeed } from '../src/renderer/src/data/sample.ts'

function recordingSleep() {
  const waits: number[] = []
  return { waits, sleep: async (ms: number) => { waits.push(ms) } }
}

function normalApi() {
  return createApi({ mode: 'normal', seed: sampleSeed, sleep: async () => {} })
}

const SIMPLE_PDF = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 37 >>
stream
BT /F1 18 Tf 30 100 Td (Hello PDF) Tj ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000271 00000 n
0000000358 00000 n
trailer
<< /Root 1 0 R /Size 6 >>
startxref
428
%%EOF`

test('PDF.js reads a simple one-page PDF', async () => {
  const pdf = await getDocument({ data: new TextEncoder().encode(SIMPLE_PDF) }).promise
  assert.equal(pdf.numPages, 1)
  const content = await (await pdf.getPage(1)).getTextContent()
  assert.match(content.items.map((item) => ('str' in item ? item.str : '')).join(' '), /Hello PDF/)
})

test('mockModeFrom maps Vite modes', () => {
  assert.equal(mockModeFrom('development'), 'normal')
  assert.equal(mockModeFrom('production'), 'normal')
  assert.equal(mockModeFrom('slow'), 'slow')
  assert.equal(mockModeFrom('error'), 'error')
})

test('today derives due count and cards made from the decks and cards', async () => {
  const today = await normalApi().getToday()
  assert.equal(today.dueCount, 12)
  assert.equal(today.cardsMade, 8)
})

test('deleting a deck removes it and its cards', async () => {
  const api = normalApi()
  await api.deleteDeck('deck-bio')
  assert.deepEqual((await api.listDecks()).map((d) => d.id), ['deck-chem', 'deck-hist'])
  assert.equal((await api.getDueCards('deck-bio')).length, 0)
  assert.equal((await api.getToday()).dueCount, 0)
})

test('deleting every deck leaves empty lists', async () => {
  const api = normalApi()
  for (const deck of await api.listDecks()) await api.deleteDeck(deck.id)
  assert.equal((await api.listDecks()).length, 0)
  assert.equal((await api.getDueCards()).length, 0)
})

test('deleting a document cascades to its decks, cards, quiz, and chat', async () => {
  const api = normalApi()
  await api.deleteDocument('doc-bio')
  assert.equal((await api.listDocuments()).some((d) => d.id === 'doc-bio'), false)
  assert.equal((await api.listDecks()).some((d) => d.id === 'deck-bio'), false)
  assert.equal((await api.getDueCards('deck-bio')).length, 0)
  assert.equal((await api.getQuiz('doc-bio')).length, 0)
  assert.deepEqual(await api.listChat('doc-bio'), [])
  await assert.rejects(api.getDocument('doc-bio'), (e: unknown) => e instanceof ApiError && e.kind === 'not-found')
})

test('two api instances do not share deletions and never mutate the seed', async () => {
  const first = normalApi()
  await first.deleteDeck('deck-bio')
  assert.equal((await normalApi().listDecks()).length, 3)
  assert.equal(sampleSeed.decks.length, 3)
})

test('the demo library has no document left permanently processing', () => {
  assert.equal(sampleSeed.documents.some((document) => document.processing !== null), false)
})

test('returned data cannot be used to mutate the store', async () => {
  const api = normalApi()
  const decks = await api.listDecks()
  decks.pop()
  assert.equal((await api.listDecks()).length, 3)
})

test('ask appends both messages to the document chat', async () => {
  const api = normalApi()
  const before = (await api.listChat('doc-bio')).length
  const reply = await api.ask('doc-bio', '  What is ATP?  ')
  assert.equal(reply.role, 'assistant')
  const chat = await api.listChat('doc-bio')
  assert.equal(chat.length, before + 2)
  assert.equal(chat[before].text, 'What is ATP?')
})

test('quick ask (no document) answers without touching any chat', async () => {
  const api = normalApi()
  const reply = await api.ask(null, 'Net ATP from glycolysis?')
  assert.equal(reply.role, 'assistant')
  assert.ok(reply.citedPages.length > 0)
})

test('an empty question is rejected', async () => {
  await assert.rejects(normalApi().ask('doc-bio', '   '), (e: unknown) => e instanceof ApiError && e.kind === 'empty-question')
})

test('slow mode waits 2 seconds per call, normal mode 250ms', async () => {
  const slow = recordingSleep()
  await createApi({ mode: 'slow', seed: sampleSeed, sleep: slow.sleep }).listDecks()
  assert.deepEqual(slow.waits, [2000])
  const normal = recordingSleep()
  await createApi({ mode: 'normal', seed: sampleSeed, sleep: normal.sleep }).listDecks()
  assert.deepEqual(normal.waits, [250])
})

test('error mode rejects every call with the offline message', async () => {
  const api = createApi({ mode: 'error', seed: sampleSeed, sleep: async () => {} })
  const calls = [() => api.getToday(), () => api.listDecks(), () => api.deleteDeck('deck-bio'), () => api.ask(null, 'hi')]
  for (const call of calls) {
    await assert.rejects(call(), (e: unknown) => e instanceof ApiError && e.kind === 'offline' && e.message === OFFLINE_MESSAGE)
  }
})

test('toApiError keeps ApiErrors and wraps anything else', () => {
  const original = new ApiError('offline', 'x')
  assert.equal(toApiError(original), original)
  assert.equal(toApiError(new TypeError('boom')).kind, 'unknown')
})
