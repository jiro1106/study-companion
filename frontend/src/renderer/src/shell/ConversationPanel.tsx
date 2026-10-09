import { MessageCircle, X } from 'lucide-react'

import ChatPanel from '../components/floating/ChatPanel'
import { useSharedChat } from '../components/floating/useSharedChat'
import '../components/floating/FloatingAssistant.css'
import { ICON } from '../ui/icon'

/**
 * Expanding conversation drawer on the right of the main window. It uses the same
 * shared chat as the floating assistant, so both always show the same conversation.
 */
export function ConversationPanel({ open, onToggle }: { open: boolean; onToggle: () => void }): React.JSX.Element {
  const { messages, isLoading, send, edit } = useSharedChat()

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={onToggle}
          title="Open Bardy chat"
          aria-label="Open Bardy chat"
          aria-expanded={false}
          className="fixed top-1/2 right-0 z-10 flex -translate-y-1/2 cursor-pointer items-center gap-2 rounded-l-control border-2 border-r-0 border-b-4 border-border bg-surface px-2.5 py-3 text-link hover:bg-surface-2"
        >
          <MessageCircle {...ICON} size={22} />
        </button>
      )}
      <aside
        aria-label="Bardy conversation"
        aria-hidden={!open}
        inert={!open}
        className={`shrink-0 overflow-hidden transition-[width] duration-200 ease-out ${open ? 'w-[min(380px,45vw)] border-l-2 border-border' : 'w-0'}`}
      >
        <div className="flex h-full w-[min(380px,45vw)] flex-col bg-[#132025]">
          <div className="flex items-center justify-between gap-2 border-b border-[rgba(165,237,110,0.1)] bg-[#192a30] px-4 py-3">
            <b className="font-display text-[15px] font-black text-[#f1f5f9]">Bardy</b>
            <button
              type="button"
              onClick={onToggle}
              title="Collapse chat"
              aria-label="Collapse chat"
              className="flex size-7 cursor-pointer items-center justify-center rounded-lg bg-[rgba(148,163,184,0.12)] text-[#94a3b8] hover:text-[#f1f5f9]"
            >
              <X {...ICON} size={16} />
            </button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col">
            <ChatPanel messages={messages} isLoading={isLoading} onSend={send} onEdit={edit} />
          </div>
        </div>
      </aside>
    </>
  )
}
