/**
 * FloatingApp — entry component for the floating assistant window.
 *
 * This is rendered instead of the main App when the renderer
 * is loaded with `?floating=true`.
 */

import { useEffect } from 'react'
import FloatingAssistant from './components/floating/FloatingAssistant'

export default function FloatingApp(): React.JSX.Element {
  // Make the document background transparent so the
  // frameless Electron window shows through.
  useEffect(() => {
    document.documentElement.style.background = 'transparent'
    document.body.style.background = 'transparent'

    return () => {
      document.documentElement.style.background = ''
      document.body.style.background = ''
    }
  }, [])

  return <FloatingAssistant />
}
