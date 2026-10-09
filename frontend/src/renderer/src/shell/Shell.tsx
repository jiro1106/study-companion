import { useCallback, useEffect, useState } from 'react'

import { AskScreen } from '../screens/AskScreen'
import { FlashcardsScreen } from '../screens/FlashcardsScreen'
import { LibraryScreen } from '../screens/LibraryScreen'
import { QuizScreen } from '../screens/QuizScreen'
import { TodayScreen } from '../screens/TodayScreen'
import { NavigationProvider, useNavigation } from './navigation'
import { ConversationPanel } from './ConversationPanel'
import { QuickAsk } from './QuickAsk'
import { Sidebar } from './Sidebar'

function CurrentScreen(): React.JSX.Element {
  const { route } = useNavigation()
  switch (route.screen) {
    case 'today':
      return <TodayScreen />
    case 'library':
      return <LibraryScreen />
    case 'ask':
      return <AskScreen key={route.documentId ?? 'first'} />
    case 'cards':
      return <FlashcardsScreen key={route.deckId ?? 'all'} />
    case 'quiz':
      return <QuizScreen key={route.documentId ?? 'all'} />
  }
}

export function Shell(): React.JSX.Element {
  const [quickAskOpen, setQuickAskOpen] = useState(false)
  const openQuickAsk = useCallback(() => setQuickAskOpen(true), [])
  const [chatOpen, setChatOpen] = useState(() => {
    try {
      return localStorage.getItem('bardy:chat-open') === '1'
    } catch {
      return false
    }
  })
  const toggleChat = useCallback(() => {
    setChatOpen((open) => {
      try {
        localStorage.setItem('bardy:chat-open', open ? '0' : '1')
      } catch {
        // preference just isn't remembered
      }
      return !open
    })
  }, [])

  // Cmd/Ctrl+Shift+Space while the app is focused. The system-wide shortcut is Phase 1.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.code === 'Space') {
        event.preventDefault()
        setQuickAskOpen(true)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <NavigationProvider openQuickAsk={openQuickAsk}>
      <div className="flex h-full">
        <div className="grid min-w-0 flex-1 grid-cols-[72px_minmax(0,1fr)] wide:grid-cols-[232px_minmax(0,1fr)]">
          <Sidebar />
          <main className="@container min-h-0 overflow-y-auto">
            <CurrentScreen />
          </main>
        </div>
        <ConversationPanel open={chatOpen} onToggle={toggleChat} />
      </div>
      <QuickAsk open={quickAskOpen} onClose={() => setQuickAskOpen(false)} />
    </NavigationProvider>
  )
}
