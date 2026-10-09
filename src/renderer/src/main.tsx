/// <reference types="vite/client" />

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

/**
 * Route to either the main app or the floating assistant
 * based on the `?floating` query parameter set by the
 * Electron main process when loading the floating window.
 */
const isFloating = new URLSearchParams(window.location.search).has('floating')

async function mount(): Promise<void> {
  const root = createRoot(document.getElementById('root')!)

  if (isFloating) {
    const { default: FloatingApp } = await import('./FloatingApp')
    root.render(
      <StrictMode>
        <FloatingApp />
      </StrictMode>
    )
  } else {
    const { default: App } = await import('./App')
    root.render(
      <StrictMode>
        <App />
      </StrictMode>
    )
  }
}

void mount()
