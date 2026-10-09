import { useState } from 'react'

const RANDOM_PROMPTS = [
  'Give me a 1-sentence mind-blowing fun fact about space.',
  'What is a quick 1-sentence memorization technique for students?',
  'Explain quantum physics in 1 simple sentence for a high school student.',
  'Share an inspiring 1-sentence quote for late-night studying.',
  'What is the origin of the word "algorithm" in 1 sentence?',
  'Give me a short, funny study joke in 1 sentence.'
]

interface TestState {
  status: 'idle' | 'loading' | 'success' | 'error'
  prompt?: string
  response?: string
  model?: string
  latencyMs?: number
  error?: string
  backendPort?: number
}

export default function App(): React.JSX.Element {
  const [testState, setTestState] = useState<TestState>({ status: 'idle' })

  const testAIConnection = async (): Promise<void> => {
    const randomPrompt = RANDOM_PROMPTS[Math.floor(Math.random() * RANDOM_PROMPTS.length)]
    setTestState({ status: 'loading', prompt: randomPrompt })
    const startTime = performance.now()

    const ports = [8001, 8000]
    let activePort: number | null = null
    let modelName = 'Ollama'
    let lastError = ''

    for (const port of ports) {
      try {
        const healthRes = await fetch(`http://127.0.0.1:${port}/api/health`, {
          signal: AbortSignal.timeout(4000)
        })
        if (healthRes.ok) {
          const healthData = await healthRes.json()
          activePort = port
          if (healthData?.ollama?.model) {
            modelName = healthData.ollama.model
          }
          break
        }
      } catch (err: any) {
        lastError = err?.message || 'Port unreachable'
      }
    }

    if (!activePort) {
      setTestState({
        status: 'error',
        prompt: randomPrompt,
        error: `Backend unreachable at http://127.0.0.1:8001 or :8000. Please make sure the FastAPI server is running. (${lastError})`
      })
      return
    }

    try {
      const chatRes = await fetch(`http://127.0.0.1:${activePort}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: randomPrompt }],
          stream: false
        })
      })

      if (!chatRes.ok) {
        const errBody = await chatRes.text()
        throw new Error(`Backend returned HTTP ${chatRes.status}: ${errBody}`)
      }

      const chatData = await chatRes.json()
      const endTime = performance.now()

      setTestState({
        status: 'success',
        prompt: randomPrompt,
        response: chatData.content || 'No text content returned.',
        model: modelName,
        latencyMs: Math.round(endTime - startTime),
        backendPort: activePort
      })
    } catch (err: any) {
      setTestState({
        status: 'error',
        prompt: randomPrompt,
        backendPort: activePort,
        error: err.message || 'Error communicating with AI model.'
      })
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-6 text-slate-100 selection:bg-cyan-500 selection:text-slate-950">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl backdrop-blur-xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-cyan-400 animate-pulse" />
              <h1 className="bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent">
                BARDHIE
              </h1>
            </div>
            <p className="mt-1 text-sm text-slate-400">
              Desktop Study Companion &bull; Platform: <code className="font-mono text-cyan-300">{window.bardhie?.platform || 'desktop'}</code>
            </p>
          </div>

          <button
            onClick={testAIConnection}
            disabled={testState.status === 'loading'}
            className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.02] hover:shadow-cyan-500/35 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {testState.status === 'loading' ? (
              <>
                <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>Testing AI...</span>
              </>
            ) : (
              <>
                <svg className="h-4 w-4 transition-transform group-hover:rotate-12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Test AI Connection</span>
              </>
            )}
          </button>
        </div>

        {/* Dynamic Display Area */}
        <div className="mt-6">
          {testState.status === 'idle' && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-950/40 p-8 text-center">
              <div className="rounded-full bg-slate-800/60 p-4 text-cyan-400 mb-3">
                <svg className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19 14.5M9.75 3.104c.251.023.501.05.75.082m-4.5 12.016A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.002" />
                </svg>
              </div>
              <p className="text-base font-medium text-slate-300">Ready to test local AI model</p>
              <p className="mt-1 text-sm text-slate-500">
                Click <strong className="text-cyan-400 font-semibold">Test AI Connection</strong> to send a random study question to Ollama and verify generation.
              </p>
            </div>
          )}

          {testState.status === 'loading' && (
            <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-6 backdrop-blur-sm">
              <div className="flex items-center gap-3 text-indigo-300">
                <div className="h-3 w-3 rounded-full bg-indigo-400 animate-ping" />
                <span className="text-sm font-semibold uppercase tracking-wider">Sending Test Prompt</span>
              </div>
              <p className="mt-3 text-base italic text-slate-300">
                &ldquo;{testState.prompt}&rdquo;
              </p>
              <p className="mt-4 text-xs text-indigo-400/80 animate-pulse">
                Waiting for Ollama to generate response...
              </p>
            </div>
          )}

          {testState.status === 'success' && (
            <div className="space-y-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-6">
              {/* Success Badge Bar */}
              <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
                <div className="flex items-center gap-2 text-emerald-400">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-semibold text-sm">AI Model Online & Responding</span>
                </div>
                <div className="flex items-center gap-3 text-xs font-mono text-emerald-300/80">
                  <span>Model: <strong className="text-emerald-200">{testState.model}</strong></span>
                  <span>&bull;</span>
                  <span>Port: <strong className="text-emerald-200">{testState.backendPort}</strong></span>
                  <span>&bull;</span>
                  <span>Latency: <strong className="text-emerald-200">{testState.latencyMs} ms</strong></span>
                </div>
              </div>

              {/* Prompt Asked */}
              <div>
                <span className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Random Test Prompt</span>
                <p className="mt-1 text-sm font-medium text-slate-300 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                  &ldquo;{testState.prompt}&rdquo;
                </p>
              </div>

              {/* Generated Response */}
              <div>
                <span className="text-xs uppercase font-semibold text-emerald-400 tracking-wider">AI Generated Response</span>
                <div className="mt-1 rounded-lg border border-emerald-500/20 bg-slate-950/80 p-4 text-sm text-slate-100 leading-relaxed shadow-inner">
                  {testState.response}
                </div>
              </div>
            </div>
          )}

          {testState.status === 'error' && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-950/20 p-6">
              <div className="flex items-center gap-2 text-rose-400">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="font-semibold text-sm">Connection / Generation Error</span>
              </div>
              {testState.prompt && (
                <p className="mt-2 text-xs text-slate-400">
                  Test Prompt: &ldquo;{testState.prompt}&rdquo;
                </p>
              )}
              <div className="mt-3 rounded-lg border border-rose-500/20 bg-slate-950/80 p-3 text-xs font-mono text-rose-300">
                {testState.error}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

