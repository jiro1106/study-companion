/**
 * voice.ts — Voice API client for the Bardy study companion.
 *
 * Provides:
 *  - transcribeAudio(blob)    → POST /api/transcribe  (Whisper STT)
 *  - speakText(text, ...)     → POST /api/speak       (Piper TTS)
 *  - stopCurrentSpeech()      → stops any in-progress playback globally
 *
 * All processing happens on the local FastAPI backend; nothing is sent to
 * external cloud services.
 */

import { getBackendBaseUrl } from './ai'

// ── STT ───────────────────────────────────────────────────────────────────────

/**
 * Upload an audio Blob to /api/transcribe and return the transcript text.
 * Throws an Error with a user-readable message on failure.
 */
export async function transcribeAudio(
  audioBlob: Blob,
  signal?: AbortSignal,
): Promise<string> {
  const baseUrl = await getBackendBaseUrl()

  const form = new FormData()
  form.append('audio', audioBlob, 'recording.webm')

  const res = await fetch(`${baseUrl}/api/transcribe`, {
    method: 'POST',
    body: form,
    signal: signal ?? AbortSignal.timeout(45000),
  })

  if (!res.ok) {
    const data: Record<string, unknown> = await res.json().catch(() => ({}))
    throw new Error(
      typeof data.detail === 'string'
        ? data.detail
        : `Transcription failed (${res.status})`,
    )
  }

  const data = await res.json()
  const text = data.text
  if (typeof text !== 'string' || !text.trim()) {
    throw new Error('No speech detected in the recording.')
  }
  return text
}

// ── TTS ───────────────────────────────────────────────────────────────────────

export type TtsState = 'idle' | 'loading' | 'playing' | 'error'

/** Global singleton — only one Bardy voice plays at a time. */
let _currentAudio: HTMLAudioElement | null = null
let _currentObjectUrl: string | null = null
let _currentAbort: AbortController | null = null

/**
 * Stop any in-progress or queued TTS playback globally.
 * Safe to call even when nothing is playing.
 */
export function stopCurrentSpeech(): void {
  _currentAbort?.abort()
  _currentAbort = null
  if (_currentAudio) {
    _currentAudio.pause()
    _currentAudio.src = ''
    _currentAudio = null
  }
  if (_currentObjectUrl) {
    URL.revokeObjectURL(_currentObjectUrl)
    _currentObjectUrl = null
  }
}

/**
 * Request speech synthesis from /api/speak and play the returned WAV audio.
 * Automatically stops any currently playing audio first.
 *
 * @param text         – raw text (Markdown will be stripped server-side)
 * @param onState      – called whenever the playback state changes
 * @param outerSignal  – optional AbortSignal to cancel from outside
 */
export async function speakText(
  text: string,
  onState: (s: TtsState) => void,
  outerSignal?: AbortSignal,
): Promise<void> {
  // Stop anything currently playing before starting a new one.
  stopCurrentSpeech()

  const controller = new AbortController()
  _currentAbort = controller

  // Forward an outer signal into the internal controller.
  if (outerSignal) {
    if (outerSignal.aborted) {
      onState('idle')
      return
    }
    outerSignal.addEventListener('abort', () => controller.abort(), { once: true })
  }

  onState('loading')

  try {
    const baseUrl = await getBackendBaseUrl()
    const res = await fetch(`${baseUrl}/api/speak`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    })

    if (controller.signal.aborted) { onState('idle'); return }

    if (!res.ok) {
      const data: Record<string, unknown> = await res.json().catch(() => ({}))
      throw new Error(
        typeof data.detail === 'string'
          ? data.detail
          : `TTS failed (${res.status})`,
      )
    }

    const audioBlob = await res.blob()
    if (controller.signal.aborted) { onState('idle'); return }

    const objectUrl = URL.createObjectURL(audioBlob)
    _currentObjectUrl = objectUrl
    const audio = new Audio(objectUrl)
    _currentAudio = audio

    onState('playing')

    await new Promise<void>((resolve, reject) => {
      audio.onended = (): void => {
        URL.revokeObjectURL(objectUrl)
        if (_currentObjectUrl === objectUrl) _currentObjectUrl = null
        if (_currentAudio === audio) _currentAudio = null
        resolve()
      }
      audio.onerror = (): void => {
        URL.revokeObjectURL(objectUrl)
        if (_currentObjectUrl === objectUrl) _currentObjectUrl = null
        if (_currentAudio === audio) _currentAudio = null
        reject(new Error('Audio playback error'))
      }
      // Stop also triggered by an abort
      controller.signal.addEventListener('abort', () => {
        audio.pause()
        URL.revokeObjectURL(objectUrl)
        if (_currentObjectUrl === objectUrl) _currentObjectUrl = null
        if (_currentAudio === audio) _currentAudio = null
        resolve()
      }, { once: true })

      audio.play().catch(reject)
    })

    onState(controller.signal.aborted ? 'idle' : 'idle')
  } catch (err: unknown) {
    stopCurrentSpeech()
    if (controller.signal.aborted || (err instanceof Error && err.name === 'AbortError')) {
      onState('idle')
      return
    }
    onState('error')
    throw err
  } finally {
    if (_currentAbort === controller) _currentAbort = null
  }
}
