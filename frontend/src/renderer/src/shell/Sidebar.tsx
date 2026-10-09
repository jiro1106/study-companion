import { CircleHelp, FileText, Home, Layers, MessageSquareText, Search } from 'lucide-react'

import { mockMode } from '../data'
import { ICON } from '../ui/icon'
import { Kbd } from '../ui/Kbd'
import { Mascot } from '../ui/Mascot'
import { useNavigation, type ScreenName } from './navigation'

const NAV: Array<{ screen: ScreenName; label: string; Icon: typeof Home }> = [
  { screen: 'today', label: 'Today', Icon: Home },
  { screen: 'library', label: 'Library', Icon: FileText },
  { screen: 'ask', label: 'Ask notes', Icon: MessageSquareText },
  { screen: 'cards', label: 'Flashcards', Icon: Layers },
  { screen: 'quiz', label: 'Quiz', Icon: CircleHelp }
]

const isMac = window.bardhie?.platform === 'darwin'
export const QUICK_ASK_KEYS = isMac ? '⌘ ⇧ Space' : 'Ctrl Shift Space'

export function Sidebar(): React.JSX.Element {
  const { route, navigate, openQuickAsk } = useNavigation()

  return (
    <aside className="flex min-h-0 flex-col gap-5 overflow-y-auto border-r-2 border-border px-3 py-5">
      <div className="flex items-center justify-center gap-2 wide:justify-start wide:px-3">
        <span
          className="font-display text-[28px] leading-none font-black tracking-[-0.02em] text-primary"
          aria-label="bardhie"
        >
          <span className="hidden wide:inline">bardhie</span>
          <span className="wide:hidden">b</span>
        </span>
      </div>

      <nav aria-label="Main" className="grid gap-1">
        {NAV.map(({ screen, label, Icon }) => (
          <button
            key={screen}
            type="button"
            title={label}
            aria-label={label}
            aria-current={route.screen === screen ? 'page' : undefined}
            onClick={() => navigate({ screen })}
            className="flex w-full cursor-pointer items-center justify-center gap-3.5 rounded-control border-2 border-transparent px-3 py-2.5 text-sm font-extrabold tracking-[0.053em] text-fg-muted uppercase hover:bg-surface-2 aria-[current=page]:border-link/55 aria-[current=page]:bg-link/10 aria-[current=page]:text-link wide:justify-start"
          >
            <Icon {...ICON} size={24} className="shrink-0" />
            <span className="hidden wide:inline">{label}</span>
          </button>
        ))}
      </nav>

      <div className="mt-auto grid gap-3">
        <button
          type="button"
          onClick={openQuickAsk}
          title={`Quick ask (${QUICK_ASK_KEYS})`}
          aria-label="Quick ask"
          className="flex cursor-pointer items-center justify-center gap-2 rounded-control border-2 border-b-4 border-border bg-surface px-3 py-2.5 text-sm font-extrabold tracking-[0.053em] text-link uppercase"
        >
          <Search {...ICON} size={18} />
          <span className="hidden wide:inline">Quick ask</span>
          <span className="hidden wide:inline">
            <Kbd>{QUICK_ASK_KEYS}</Kbd>
          </span>
        </button>
        <div className="flex items-center gap-3 rounded-control border-2 border-border p-3 text-[13px]">
          <Mascot awake={false} size={32} />
          <div className="hidden min-w-0 wide:block">
            <b className="block text-sm font-extrabold">Study engine</b>
            <span className="text-fg-muted">
              {mockMode === 'normal'
                ? 'Sample data · AI not connected yet'
                : `Sample data · ${mockMode} mode`}
            </span>
          </div>
        </div>
      </div>
    </aside>
  )
}
