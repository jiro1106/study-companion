import { ipcMain, dialog, Notification } from 'electron'
import { readFile } from 'node:fs/promises'
import { basename } from 'node:path'
import { v4 as uuidv4 } from 'uuid'
import type { ImportResult, AIResponse, FocusModeResult, FocusModeStatus } from '../shared/types'
import { getFocusModeStatus, setFocusMode } from './focus-blocker'

/** Maximum document size that will be passed to the AI (characters). */
const MAX_DOC_CHARS = 120_000

// ─── PDF import ──────────────────────────────────────────────────────────────

ipcMain.handle('pdf:import', async (): Promise<ImportResult> => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Import lecture PDF',
    filters: [{ name: 'PDF Documents', extensions: ['pdf'] }],
    properties: ['openFile']
  })

  if (canceled || filePaths.length === 0) {
    return { ok: false, reason: 'cancelled' }
  }

  const filePath = filePaths[0]
  const name = basename(filePath)

  // Size guard (50 MB)
  const { stat } = await import('node:fs/promises')
  const stats = await stat(filePath)
  if (stats.size > 50 * 1024 * 1024) {
    return {
      ok: false,
      reason: 'too-large',
      message: `"${name}" is ${(stats.size / 1_048_576).toFixed(1)} MB. Please use a file under 50 MB.`
    }
  }

  const buffer = await readFile(filePath)
  const uint8 = new Uint8Array(buffer)

  // Basic PDF magic-bytes check
  const magic = String.fromCharCode(...uint8.slice(0, 5))
  if (magic !== '%PDF-') {
    return { ok: false, reason: 'invalid-type', message: `"${name}" is not a valid PDF file.` }
  }

  // Delegate extraction to renderer via IPC reply — the renderer runs PDF.js
  // (which needs a browser context). We pass the raw bytes and let the renderer
  // do extraction, then call back to us via `pdf:extracted`.
  // For the main-process handler we just return the buffer info; the actual
  // extraction happens in the renderer process (see usePDFImport hook).
  // This handler exists so that the file-picker is shown from main (required
  // for sandboxed renderers) and the bytes are forwarded securely.
  return {
    ok: true,
    document: {
      id: uuidv4(),
      name,
      // text is filled by the renderer after PDF.js extraction
      text: '',
      pageCount: 0,
      // We smuggle the base64 bytes inside the document temporarily.
      // The renderer strips this field before storing.
      // @ts-expect-error: _bytes is a transport-only field
      _bytes: buffer.toString('base64')
    }
  }
})

// ─── AI service ──────────────────────────────────────────────────────────────

ipcMain.handle(
  'ai:ask',
  async (_event, prompt: string, documentText?: string): Promise<AIResponse> => {
    // Truncate long documents for the MVP
    const context =
      documentText && documentText.length > MAX_DOC_CHARS
        ? documentText.slice(0, MAX_DOC_CHARS) + '\n\n[Document truncated for length]'
        : documentText

    // For the MVP we use a stub that echoes context awareness.
    // Replace this block with a real LLM call (Ollama, OpenAI, etc.)
    try {
      const response = await stubAICall(prompt, context)
      return response
    } catch (err) {
      return {
        ok: false,
        content: '',
        error: err instanceof Error ? err.message : 'Unknown AI error'
      }
    }
  }
)

async function stubAICall(prompt: string, context?: string): Promise<AIResponse> {
  // Simulate a short network delay
  await new Promise((r) => setTimeout(r, 600))

  const hasDoc = context && context.trim().length > 0
  const wordCount = hasDoc ? context!.split(/\s+/).length : 0

  if (!hasDoc) {
    return {
      ok: true,
      content:
        'I don\'t have a document to reference yet. Import a lecture PDF first, then ask me to summarise it, create flashcards, or quiz you on the content.',
      citations: []
    }
  }

  // Very naive "summarise" response
  if (/summar/i.test(prompt)) {
    return {
      ok: true,
      content: `Here's a summary based on the imported document (${wordCount.toLocaleString()} words extracted):\n\n${context!.slice(0, 400).replace(/\s+/g, ' ').trim()}…\n\n*(This is a stub response. Connect a real LLM to get accurate summaries.)*`,
      citations: [1]
    }
  }

  if (/flashcard/i.test(prompt)) {
    return {
      ok: true,
      content:
        '**Flashcard 1**\n**Q:** What is the main topic of this document?\n**A:** ' +
        context!.slice(0, 100).replace(/\s+/g, ' ').trim() +
        '…\n\n*(Stub response — connect a real LLM for full flashcard generation.)*',
      citations: [1, 2]
    }
  }

  return {
    ok: true,
    content: `I found your document (${wordCount.toLocaleString()} words). You asked: "${prompt}"\n\nThis is a stub response. Wire up an LLM to get real answers grounded in your lecture notes.`,
    citations: []
  }
}

// ─── Reminders ───────────────────────────────────────────────────────────────

ipcMain.handle('reminder:schedule', async (_event, label: string, delayMs: number): Promise<void> => {
  if (!Notification.isSupported()) return
  setTimeout(() => {
    new Notification({
      title: 'BARDHIE – Study reminder',
      body: label,
      silent: false
    }).show()
  }, delayMs)
})

// ─── Focus Mode & Distraction blocking ───────────────────────────────────────

ipcMain.handle('focus:status', async (): Promise<FocusModeStatus> => {
  return getFocusModeStatus()
})

ipcMain.handle('focus:set', async (_event, enable: boolean): Promise<FocusModeResult> => {
  return setFocusMode(enable)
})

ipcMain.handle('block:confirm', async (_event, targetDesc?: string): Promise<boolean> => {
  const { response } = await dialog.showMessageBox({
    type: 'question',
    title: 'Enable Focus Mode?',
    message: 'Block social media websites in browsers?',
    detail: `BARDHIE will block access to ${targetDesc || 'Facebook, TikTok, Instagram, Messenger, and Twitter / X'} across all web browsers during your study session.\n\nA Windows administrator prompt may appear to update network protection. You can disable focus mode at any time.`,
    buttons: ['Enable Focus Mode', 'Cancel'],
    defaultId: 0,
    cancelId: 1
  })
  return response === 0
})
