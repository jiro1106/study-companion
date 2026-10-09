import {
  CircleHelp,
  FileText,
  Home,
  Layers,
  MessageSquareText,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
} from "lucide-react";
import { useState } from "react";

import { ICON } from "../ui/icon";
import { Kbd } from "../ui/Kbd";
import { useNavigation, type ScreenName } from "./navigation";
import { FocusModeToggle } from "./FocusModeToggle";
import { MascotToggle } from "./MascotToggle";
import { SettingsDialog } from "./SettingsDialog";
import { ThemeToggle } from "./ThemeToggle";

const NAV: Array<{ screen: ScreenName; label: string; Icon: typeof Home }> = [
  { screen: "today", label: "Today", Icon: Home },
  { screen: "library", label: "Library", Icon: FileText },
  { screen: "ask", label: "Ask notes", Icon: MessageSquareText },
  { screen: "cards", label: "Flashcards", Icon: Layers },
  { screen: "quiz", label: "Quiz", Icon: CircleHelp },
];

const isMac = window.bardhie?.platform === "darwin";
export const QUICK_ASK_KEYS = isMac ? "⌘ K" : "Ctrl K";

export function Sidebar({
  compact,
  onToggle,
}: {
  compact: boolean;
  onToggle: () => void;
}): React.JSX.Element {
  const { route, navigate, openQuickAsk } = useNavigation();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <aside
      className={`flex h-full min-h-0 min-w-0 flex-col gap-5 overflow-x-hidden overflow-y-auto py-5 ${compact ? "px-2" : "px-3"}`}
    >
      <div
        className={
          compact
            ? "flex flex-col items-center gap-2"
            : "flex items-center justify-between pl-3"
        }
      >
        <span
          className="font-display text-[28px] leading-none font-black tracking-[-0.02em] text-primary"
          aria-label="Bardy"
        >
          {compact ? "b" : "Bardy"}
        </span>
        <div className={`flex items-center ${compact ? "flex-col" : ""}`}>
          <ThemeToggle />
          <button
            type="button"
            onClick={onToggle}
            title={`${compact ? "Expand" : "Collapse"} sidebar (${isMac ? "⌘" : "Ctrl"}B)`}
            aria-label={compact ? "Expand sidebar" : "Collapse sidebar"}
            className="cursor-pointer rounded-control p-2 text-fg-muted hover:bg-surface-2"
          >
            {compact ? (
              <PanelLeftOpen {...ICON} size={18} />
            ) : (
              <PanelLeftClose {...ICON} size={18} />
            )}
          </button>
        </div>
      </div>

      <nav aria-label="Main" className="grid gap-1">
        {NAV.map(({ screen, label, Icon }) => (
          <button
            key={screen}
            type="button"
            title={label}
            aria-label={label}
            aria-current={route.screen === screen ? "page" : undefined}
            onClick={() => navigate({ screen })}
            className={`flex w-full cursor-pointer items-center gap-3.5 rounded-control border-2 border-transparent py-2.5 ${compact ? "px-0" : "px-3"} text-sm font-extrabold text-fg-muted hover:bg-surface-2 aria-[current=page]:border-link/55 aria-[current=page]:bg-link/10 aria-[current=page]:text-link ${compact ? "justify-center" : ""}`}
          >
            <Icon {...ICON} size={24} className="shrink-0" />
            {!compact && <span className="truncate">{label}</span>}
          </button>
        ))}
      </nav>

      <div className="mt-auto grid gap-3">
        <FocusModeToggle />
        <MascotToggle compact={compact} />
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          title="Settings"
          aria-label="Settings"
          className={`flex w-full cursor-pointer items-center gap-2 rounded-control py-2 text-[13px] font-extrabold text-fg-muted hover:bg-surface-2 ${compact ? "justify-center px-0" : "px-3"}`}
        >
          <Settings {...ICON} size={18} className="shrink-0" />
          {!compact && <span className="truncate">Settings</span>}
        </button>
        <button
          type="button"
          onClick={openQuickAsk}
          title={`Quick ask (${QUICK_ASK_KEYS})`}
          aria-label="Quick ask"
          className={`flex cursor-pointer flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-control border-2 border-b-4 border-border bg-surface py-2.5 text-sm font-extrabold whitespace-nowrap text-link ${compact ? "px-0" : "px-3"}`}
        >
          <Search {...ICON} size={18} />
          {!compact && <span>Quick ask</span>}
          {!compact && <Kbd>{QUICK_ASK_KEYS}</Kbd>}
        </button>
      </div>
      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </aside>
  );
}
