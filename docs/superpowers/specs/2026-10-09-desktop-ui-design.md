# Bardy Desktop UI Design

**Date:** 2026-10-09

**Status:** Approved for implementation planning

**Branch:** `feature/desktop-ui` (from `feature/desktop`)

**Owner scope:** desktop app, frontend, and design only. AI logic, PDF extraction, the backend (Python + FastAPI), and the final mascot art belong to teammates.

## Purpose

Replace the Phase 0 placeholder with the first real Bardy interface: an app shell and five working screens built from the approved design system and UI mockup, running on in-memory sample data until the backend exists.

## References

- `docs/design/DESIGN.md` — tokens, type, components, rules, mascot pixel grid. Source of truth for visuals.
- `docs/design/theme.css` — the same tokens as CSS variables plus a Tailwind v4 `@theme`.
- `docs/design/design-system.html` — visual reference for tokens and components.
- UI mockup: https://claude.ai/artifact/JQh9roiFcsM7fJEkb7z6au — layout and behavior reference for every screen (private link; ask the owner for access).
- `docs/superpowers/specs/2026-10-09-desktop-phase-0-design.md` — security model this work must keep.

## Decisions

### Repository layout

The whole Electron app moves into `frontend/` as a self-contained npm project. `docs/`, `.github/`, `.gitignore`, and the root `README.md` stay at the root. `backend/` is created later by the backend team, not by this work. The move is its own commit with no content changes.

### Screens

Five screens plus one overlay, all in this build:

1. **Today** — greeting, daily-goal ring, streak / recall / cards stats, deck list, week streak, upcoming exams, shortcut tip.
2. **Library** — PDF drop zone (visual only), document grid, one document shown mid-processing.
3. **Ask notes** — document summary with page citations, "Original" excerpt tab, chat panel answering from the document.
4. **Flashcards** — flip card, Again / Hard / Good / Easy rating, progress, keyboard (Space flips, 1–4 rate).
5. **Quiz** — four options, Check, correct / wrong feedback bar, Continue, keyboard (1–4 select, Enter checks).
6. **Quick ask** — modal opened by a sidebar button and by Cmd/Ctrl+Shift+Space while the app is focused.

### Navigation

Plain React state holding a typed route. No router library.

### Data

- All screen data comes from one module, `frontend/src/renderer/src/data/`. When the backend arrives, only that folder changes.
- Sample data is realistic: about three items per list, taken from the mockup.
- Delete works in memory (decks, documents). Deleting everything shows the empty states. Restarting the app restores the sample data.
- Every data call is async and behaves like a network call: `npm run dev` uses a short delay, `npm run dev:slow` uses a 2 s delay to show loading states, `npm run dev:error` makes every call fail to show error states.
- No API contract with the backend is written now; the frontend adapts to theirs later.

### States

Every screen that loads data has four designed states: loading (skeleton), ready, empty (mascot + what to do next), and error (plain explanation + Try again).

### Window

- Default size 1100 × 720, minimum 720 × 520.
- Size, position, maximized, and full-screen state are saved on close and restored on launch, in a JSON file in Electron's `userData` folder. A saved position that is not on any connected display is dropped so the window opens centered.
- Responsive by window width: ≥ 1000px full sidebar with labels; 860–999px icon-only sidebar (72px); 720–859px icon sidebar, Today's side column stacks below, Ask notes chat moves below the summary.
- Content max width about 1180px, centered, when maximized or full screen.

### Offline

The app is fully offline. Fonts are bundled with Fontsource (Nunito 800/900, Nunito Sans 500/700/800). Icons come from `lucide-react` (bundled), stroke width 2.4. Production builds carry a Content-Security-Policy that allows only the app's own files. The renderer never makes network requests.

### Mascot

A stand-in `<Mascot />` component draws the pixel sprout from `DESIGN.md` (awake and asleep). It appears in the sidebar and in empty states. Real art replaces this one component later. The floating pet window is Phase 1.

### Testing

Logic tests only, with Node's built-in test runner: window-state parsing and display fitting, the sample-data API (delete, cascade, slow and error modes), the flashcard session, and the quiz state machine. Screens are checked by hand against the mockup with a written checklist. No component or end-to-end tests.

### Toolchain

Node 24 (`.nvmrc`), managed locally with fnm. CI keeps testing Node 24 on macOS and Windows.

## Non-goals

- Floating pet window, tray, global (system-wide) shortcut, background operation — Phase 1.
- Real PDF import, file pickers, AI calls, persistence of study data — backend integration.
- Installers, signing, packaging.
- Component, screenshot, or end-to-end tests.
- Light/dark manual toggle in settings (the app follows the OS theme).

## Security

The Phase 0 model stays: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, preload exposes only a frozen `window.bardy` with `platform`. This build adds no preload methods and no IPC.
