/**
 * AI Service for BARDHIE
 *
 * Connects to the local FastAPI backend (Ollama integration) with support for:
 * - Dynamic port detection (8001 / 8000)
 * - Multi-turn conversation
 * - Real-time streaming responses
 * - Specialized routes (/api/chat, /api/tutor, /api/quiz, /api/flashcards, /api/planner)
 * - Graceful fallback when the local AI server is offline
 */

export interface AiMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface AiHealth {
  connected: boolean
  model: string
  baseUrl?: string
  availableModels?: string[]
}

const BACKEND_PORTS = [8001, 8000]
let cachedBaseUrl: string | null = null

/**
 * Discovers the active backend URL by checking health endpoints.
 */
export async function getBackendBaseUrl(): Promise<string> {
  if (cachedBaseUrl) {
    try {
      const res = await fetch(`${cachedBaseUrl}/api/health`, {
        signal: AbortSignal.timeout(1500)
      })
      if (res.ok) return cachedBaseUrl
    } catch {
      cachedBaseUrl = null
    }
  }

  for (const port of BACKEND_PORTS) {
    const url = `http://127.0.0.1:${port}`
    try {
      const res = await fetch(`${url}/api/health`, {
        signal: AbortSignal.timeout(2000)
      })
      if (res.ok) {
        cachedBaseUrl = url
        return url
      }
    } catch {
      // try next port
    }
  }

  // Default to 8001
  return 'http://127.0.0.1:8001'
}

/**
 * Checks connection health of backend and local Ollama model.
 */
export async function checkAiHealth(): Promise<AiHealth> {
  try {
    const baseUrl = await getBackendBaseUrl()
    const res = await fetch(`${baseUrl}/api/health`, {
      signal: AbortSignal.timeout(3000)
    })
    if (!res.ok) {
      return { connected: false, model: 'Unknown' }
    }
    const data = await res.json()
    return {
      connected: !!data?.ollama?.connected,
      model: data?.ollama?.model || 'llama3.2',
      baseUrl: data?.ollama?.base_url,
      availableModels: data?.ollama?.available_models || []
    }
  } catch {
    return { connected: false, model: 'Offline' }
  }
}

/**
 * Sends a chat request with optional streaming text callback.
 */
export async function sendAiChat({
  messages,
  systemPrompt,
  stream = true,
  onChunk,
  signal
}: {
  messages: AiMessage[]
  systemPrompt?: string
  stream?: boolean
  onChunk?: (chunk: string, fullText: string) => void
  signal?: AbortSignal
}): Promise<string> {
  const baseUrl = await getBackendBaseUrl()

  try {
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        system_prompt: systemPrompt,
        stream: Boolean(stream && onChunk)
      }),
      signal
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      throw new Error(`AI Backend Error (${res.status}): ${errText || res.statusText}`)
    }

    if (stream && onChunk && res.body) {
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const text = decoder.decode(value, { stream: true })
        fullText += text
        onChunk(text, fullText)
      }

      return fullText
    }

    const data = await res.json()
    const text = data.content || data.response || ''
    if (onChunk) onChunk(text, text)
    return text
  } catch (err: any) {
    if (err.name === 'AbortError') throw err

    // If backend is down, provide friendly fallback
    return getFallbackAiResponse(messages[messages.length - 1]?.content || '')
  }
}

/**
 * Calls the dedicated tutor route (/api/tutor) for contextual study assistance.
 */
export async function askAiTutor({
  message,
  history = [],
  stream = true,
  onChunk,
  signal
}: {
  message: string
  history?: AiMessage[]
  stream?: boolean
  onChunk?: (chunk: string, fullText: string) => void
  signal?: AbortSignal
}): Promise<string> {
  const baseUrl = await getBackendBaseUrl()

  try {
    const res = await fetch(`${baseUrl}/api/tutor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        history: history.map((h) => ({ role: h.role, content: h.content })),
        stream: Boolean(stream && onChunk)
      }),
      signal
    })

    if (!res.ok) {
      // Fallback to general chat endpoint if tutor is unavailable
      return sendAiChat({
        messages: [...history, { role: 'user', content: message }],
        stream,
        onChunk,
        signal
      })
    }

    if (stream && onChunk && res.body) {
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const text = decoder.decode(value, { stream: true })
        fullText += text
        onChunk(text, fullText)
      }

      return fullText
    }

    const data = await res.json()
    const text = data.response || data.content || ''
    if (onChunk) onChunk(text, text)
    return text
  } catch {
    return sendAiChat({
      messages: [...history, { role: 'user', content: message }],
      stream,
      onChunk,
      signal
    })
  }
}

/**
 * Generates interactive quiz questions via Ollama backend.
 */
export async function generateAiQuiz(topic: string, count = 3, difficulty = 'medium') {
  const baseUrl = await getBackendBaseUrl()
  const res = await fetch(`${baseUrl}/api/quiz`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic, count, difficulty }),
    signal: AbortSignal.timeout(20000)
  })
  if (!res.ok) throw new Error(`Failed to generate quiz: ${res.statusText}`)
  return res.json()
}

/**
 * Generates flashcards on a topic via Ollama backend.
 */
export async function generateAiFlashcards(topic: string, count = 5) {
  const baseUrl = await getBackendBaseUrl()
  const res = await fetch(`${baseUrl}/api/flashcards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic, count }),
    signal: AbortSignal.timeout(20000)
  })
  if (!res.ok) throw new Error(`Failed to generate flashcards: ${res.statusText}`)
  return res.json()
}

/**
 * Generates a structured study plan via Ollama backend.
 */
export async function generateAiPlanner(goal: string, days = 5, hoursPerDay = 2) {
  const baseUrl = await getBackendBaseUrl()
  const res = await fetch(`${baseUrl}/api/planner`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ goal, days, hours_per_day: hoursPerDay }),
    signal: AbortSignal.timeout(20000)
  })
  if (!res.ok) throw new Error(`Failed to generate study plan: ${res.statusText}`)
  return res.json()
}

/**
 * Local fallback responses in case Ollama or FastAPI server is temporarily offline.
 */
function getFallbackAiResponse(userPrompt: string): string {
  const lower = userPrompt.toLowerCase()

  if (lower.includes('quiz') || lower.includes('test')) {
    return "Here's a quick knowledge check! 🧠 Question: What is the main difference between active recall and passive reading? (Tip: Active recall forces your brain to retrieve knowledge without looking at the answer!)"
  }
  if (lower.includes('plan') || lower.includes('schedule') || lower.includes('time')) {
    return "Let's structure your study time! 📅 Try the 50/10 rule: 50 minutes of deep, distraction-free focus, followed by a 10-minute break away from screens."
  }
  if (lower.includes('card') || lower.includes('flashcard') || lower.includes('memorize')) {
    return "For best memorization, use spaced repetition! Review new cards today, then in 2 days, then next week. Your brain consolidates memory during sleep 🌙"
  }

  return `I'm BARDHIE! 🐦 I received your message: "${userPrompt}". To enable full local AI reasoning, ensure the backend server and Ollama are active on http://127.0.0.1:8001.`
}
