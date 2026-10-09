/// <reference types="vite/client" />

import '@fontsource/nunito/800.css'
import '@fontsource/nunito/900.css'
import '@fontsource/nunito-sans/500.css'
import '@fontsource/nunito-sans/700.css'
import '@fontsource/nunito-sans/800.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
