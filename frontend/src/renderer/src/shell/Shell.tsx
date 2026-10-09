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
import {
  SIDEBAR_DEFAULT_WIDTH,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH,
  SIDEBAR_RAIL_WIDTH,
  sidebarWidthAfterToggle
} from './sidebar-width'

function loadSidebarWidth(): number {
  try {
    const n = Number(localStorage.getItem('bardy:sidebar-w'))
    if (n >= SIDEBAR_RAIL_WIDTH && n <= SIDEBAR_MAX_WIDTH) return n
  } catch {
    // fall through to default
  }
  return SIDEBAR_DEFAULT_WIDTH
}

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

  const [sbWidth, setSbWidth] = useState(loadSidebarWidth)
  const [dragging, setDragging] = useState(false)
  const compact = sbWidth <= SIDEBAR_RAIL_WIDTH
  const saveWidth = (w: number): void => {
    try {
      localStorage.setItem('bardy:sidebar-w', String(w))
    } catch {
      // not remembered
    }
  }
  const toggleSidebar = useCallback(() => {
    setSbWidth((w) => {
      const next = sidebarWidthAfterToggle(w)
      saveWidth(next)
      return next
    })
  }, [])
  const startDrag = (e: React.PointerEvent<HTMLDivElement>): void => {
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging(true)
  }
  const onDrag = (e: React.PointerEvent<HTMLDivElement>): void => {
    if (!dragging) return
    const x = e.clientX - e.currentTarget.parentElement!.getBoundingClientRect().left
    // Dragging below the min snaps to the icon rail.
    setSbWidth(
      x < SIDEBAR_MIN_WIDTH - 40
        ? SIDEBAR_RAIL_WIDTH
        : Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, x))
    )
  }
  const endDrag = (): void => {
    if (!dragging) return
    setDragging(false)
    saveWidth(sbWidth)
  }

  // Cmd/Ctrl+Shift+Space while the app is focused. The system-wide shortcut is Phase 1.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if ((event.metaKey || event.ctrlKey) && !event.shiftKey && event.code === 'KeyB') {
        event.preventDefault()
        toggleSidebar()
      }
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.code === 'Space') {
        event.preventDefault()
        setQuickAskOpen(true)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [toggleSidebar])

  return (
    <NavigationProvider openQuickAsk={openQuickAsk}>
      <div className="flex h-full">
        <div
          className="grid min-w-0 flex-1"
          style={{
            gridTemplateColumns: `${sbWidth}px minmax(0,1fr)`,
            transition: dragging ? 'none' : 'grid-template-columns 150ms ease-out'
          }}
        >
          <div className="relative min-h-0 border-r-2 border-border">
            <Sidebar compact={compact} onToggle={toggleSidebar} />
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize sidebar"
              onPointerDown={startDrag}
              onPointerMove={onDrag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onDoubleClick={toggleSidebar}
              className="absolute inset-y-0 -right-1 z-10 w-2 cursor-col-resize hover:bg-link/40 active:bg-link/60"
            />
          </div>
          <main className={`@container min-h-0 overflow-y-auto ${dragging ? 'select-none' : ''}`}>
            <CurrentScreen />
          </main>
        </div>
        <ConversationPanel open={chatOpen} onToggle={toggleChat} />
      </div>
      <QuickAsk open={quickAskOpen} onClose={() => setQuickAskOpen(false)} />
    </NavigationProvider>
  )
}
