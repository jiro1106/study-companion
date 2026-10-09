/**
 * pending-nav — hands a navigation target from the floating window to the
 * main window.
 *
 * The floating window has no NavigationProvider of its own, so when a chat
 * action there (e.g. "Take the quiz") needs to open a screen in the main
 * window, it writes the target here and asks the main window to focus/open;
 * the main window consumes it on mount and on regaining focus.
 */

import type { Route } from './navigation'

const KEY = 'bardy:pending-nav'
const TTL_MS = 15_000

interface Pending {
  route: Route
  ts: number
}

export function writePendingNav(route: Route): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ route, ts: Date.now() } satisfies Pending))
  } catch {
    // Storage unavailable: the main window just won't auto-navigate.
  }
}

/** Reads and clears the pending target if it exists and hasn't expired. */
export function readAndClearPendingNav(): Route | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    localStorage.removeItem(KEY)
    const parsed = JSON.parse(raw) as Partial<Pending>
    if (!parsed.route || typeof parsed.ts !== 'number') return null
    if (Date.now() - parsed.ts > TTL_MS) return null
    return parsed.route
  } catch {
    return null
  }
}
