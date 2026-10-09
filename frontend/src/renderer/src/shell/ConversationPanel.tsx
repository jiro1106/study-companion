import { useEffect, useState } from "react";
import { MessageCircle, X, PenSquare } from "lucide-react";

import ChatPanel from "../components/floating/ChatPanel";
import { useSharedChat } from "../components/floating/useSharedChat";
import "../components/floating/FloatingAssistant.css";
import { ICON } from "../ui/icon";
import {
  chatDefaultWidth,
  chatWidthForPointer,
  clampChatWidth,
} from "./conversation-panel";

/**
 * Expanding conversation drawer on the right of the main window. It uses the same
 * shared chat as the floating assistant, so both always show the same conversation.
 */
export function ConversationPanel({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}): React.JSX.Element {
  const { messages, isLoading, send, edit, abort, clear } = useSharedChat();
  const [width, setWidth] = useState(() => {
    try {
      const savedWidth = Number(localStorage.getItem("bardy:chat-w"));
      return clampChatWidth(
        savedWidth > 0 ? savedWidth : chatDefaultWidth(window.innerWidth),
        window.innerWidth,
      );
    } catch {
      return chatDefaultWidth(window.innerWidth);
    }
  });
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!open) setWidth(chatDefaultWidth(window.innerWidth));
  }, [open]);

  // Keep the width inside its viewport-relative bounds when the window resizes.
  useEffect(() => {
    const onResize = (): void =>
      setWidth((w) => clampChatWidth(w, window.innerWidth));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const startDrag = (event: React.PointerEvent<HTMLDivElement>): void => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  };
  const resize = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (dragging)
      setWidth(chatWidthForPointer(event.clientX, window.innerWidth));
  };
  const endDrag = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (!dragging) return;
    const nextWidth = chatWidthForPointer(event.clientX, window.innerWidth);
    setDragging(false);
    setWidth(nextWidth);
    try {
      localStorage.setItem("bardy:chat-w", String(nextWidth));
    } catch {
      // preference just isn't remembered
    }
  };

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
        style={{
          width: open ? width : 0,
          transition: dragging ? "none" : "width 200ms ease-out",
        }}
        className={`relative shrink-0 ${open ? "overflow-visible border-l-2 border-border" : "overflow-hidden"}`}
      >
        {open && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize chat panel"
            onPointerDown={startDrag}
            onPointerMove={resize}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            className="absolute inset-y-0 -left-1 z-10 w-2 cursor-col-resize hover:bg-link/40 active:bg-link/60"
          />
        )}
        <div
          style={{ width }}
          className="flex h-full flex-col overflow-hidden bg-[#132025]"
        >
          <div className="flex items-center justify-between gap-2 border-b border-[rgba(165,237,110,0.1)] bg-[#192a30] px-4 py-3">
            <b className="font-display text-[15px] font-black text-[#f1f5f9]">
              Bardy
            </b>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={clear}
                title="New chat"
                aria-label="New chat"
                disabled={messages.length === 0 && !isLoading}
                className="flex size-7 cursor-pointer items-center justify-center rounded-lg bg-[rgba(148,163,184,0.12)] text-[#94a3b8] hover:text-[#f1f5f9] disabled:opacity-40 disabled:cursor-default"
              >
                <PenSquare {...ICON} size={14} />
              </button>
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
          </div>
          <div className="flex min-h-0 flex-1 flex-col">
            <ChatPanel
              messages={messages}
              isLoading={isLoading}
              onSend={send}
              onEdit={edit}
              onAbort={abort}
            />
          </div>
        </div>
      </aside>
    </>
  );
}
