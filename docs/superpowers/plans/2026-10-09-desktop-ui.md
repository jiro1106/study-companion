# Bardy Desktop UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Phase 0 placeholder with the Bardy app shell and five working screens (Today, Library, Ask notes, Flashcards, Quiz) plus a Quick ask overlay, running fully offline on in-memory sample data, with the Electron app moved into `frontend/`.

**Architecture:** The Electron app becomes a self-contained npm project in `frontend/`. The main process gains window size/position persistence. The renderer is React + Tailwind v4 using the Bardy design tokens; every screen reads data only through `src/renderer/src/data/`, an async in-memory API whose behavior (`normal`, `slow`, `error`) is chosen by the Vite mode, so the backend can replace it later without touching screens. Navigation is one typed React state value.

**Tech Stack:** Node.js 24, npm, Electron 44, electron-vite 5, React 19, TypeScript 7, Tailwind CSS 4, `@fontsource/nunito`, `@fontsource/nunito-sans`, `lucide-react`, Node's built-in test runner.

**Spec:** `docs/superpowers/specs/2026-10-09-desktop-ui-design.md` (read it first). Visual source of truth: `docs/design/DESIGN.md`. Visual reference: `docs/design/design-system.html` and the UI mockup linked in the spec.

## Global Constraints

- Work on branch `feature/desktop-ui`. Never commit to `main` or `feature/desktop`.
- Node 24 (`.nvmrc` = `24`). Locally, `fnm` switches automatically on `cd`; run `node --version` and confirm `v24` before installing anything.
- All npm commands run inside `frontend/` after Task 1.
- Fully offline: the renderer makes no network requests, loads no remote fonts, scripts, or images.
- Keep Phase 0 security exactly: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`; preload exposes only frozen `window.bardy.platform`. Add no IPC and no preload methods.
- Colors only through design tokens (Tailwind classes such as `bg-primary`, `text-fg-muted`, `border-border`). No raw hex values in components except inside `Mascot.tsx`, whose pixel palette is defined in `DESIGN.md`.
- No shadows, no gradients, 2px borders, 4px bottom "lip" on pressable elements, radius `rounded-control` (12px) for controls and `rounded-card` (16px) for cards.
- Icons only from `lucide-react`, always `strokeWidth={2.4}` and `aria-hidden`.
- Screens never import `data/api.ts` or `data/sample.ts` directly; they import `api` from `data/index.ts`.
- Files executed by `node --test` (everything in `src/main/window-state.ts`, `src/renderer/src/data/api.ts`, `src/renderer/src/data/sample.ts`, `src/renderer/src/data/types.ts`, `src/renderer/src/study/*.ts`) use erasable TypeScript only: no `enum`, no `namespace`, no constructor parameter properties, and only `import type` for relative imports.
- Default window 1100 × 720, minimum 720 × 520. Breakpoints by window width: `mid` = 860px, `wide` = 1000px.
- Copy is short, direct, encouraging, and written from the student's side ("No cards due", "Try again"). Every async failure shows the error message from `ApiError` and a Try again button.
- Tests are logic-only. Do not add Vitest, Testing Library, Playwright, or any other test dependency.

## Review Focus

1. **Corrupt or stale `window-state.json`** (truncated JSON, negative sizes, a monitor that was unplugged): the app must still open, at a sensible size, on a visible screen. Tests in Task 2.
2. **Deleting a document while its deck, cards, quiz, or chat are on another screen**: every screen must fall back to its empty state instead of crashing. Cascade tests in Task 4; manual check in Task 12.
3. **Actions during loading or after an error** (rating a card, checking a quiz, sending chat while the request is pending or after it failed): no double submits and no stuck spinners. Quiz and flashcard state-machine tests in Tasks 9 and 10; chat sending guard in Task 8.
4. **Keyboard shortcuts firing in the wrong place** (Space/1–4 while typing in an input, Cmd/Ctrl+Shift+Space while the dialog is open): shortcuts ignore events from inputs and textareas. Manual checklist in Tasks 9, 10, 11.
5. **Narrow windows at the 720px minimum and huge maximized windows**: no horizontal scrolling, no clipped text, content capped at 1180px. Manual checklist in Task 12.

---

## Execution waves

```text
Wave 1 (in order)      Task 1 → Task 2 ─┐
                                Task 3 ─┼→ Task 5 → Task 6
                                Task 4 ─┘
Wave 2 (parallel)      Task 7 Today · Task 8 Library + Ask notes · Task 9 Flashcards · Task 10 Quiz · Task 11 Quick ask
Wave 3 (in order)      Task 12 integrate, verify, review
```

- Tasks 2, 3, and 4 can run in parallel after Task 1 (they touch different files).
- Wave 2 agents each own their listed files only. They must not edit anything under `ui/`, `shell/`, `data/`, `theme.css`, or `index.css`. If a shared change is needed, report it instead of making it; Task 12 applies it.
- Each Wave 2 agent runs `npm run typecheck` and `npm test` before committing. Commit only its own files.

## File map (after Task 1, paths relative to `frontend/`)

```text
src/main/index.ts                         window creation + state load/save (modify)
src/main/window-options.ts                default/min size (modify)
src/main/window-state.ts                  parse/fit/serialize window state (create)
src/renderer/index.html                   unchanged
src/renderer/src/main.tsx                 font imports (modify)
src/renderer/src/index.css                Tailwind + theme + base (modify)
src/renderer/src/theme.css                design tokens (create, copy of docs/design/theme.css)
src/renderer/src/App.tsx                  providers + shell (replace)
src/renderer/src/data/types.ts            domain types
src/renderer/src/data/api.ts              createApi, ApiError, mock modes
src/renderer/src/data/sample.ts           sample seed
src/renderer/src/data/index.ts            the app's api instance
src/renderer/src/data/use-resource.ts     useResource hook
src/renderer/src/ui/*.tsx                 shared components
src/renderer/src/shell/navigation.tsx     Route type + context
src/renderer/src/shell/Shell.tsx          layout, screen switch, shortcut
src/renderer/src/shell/Sidebar.tsx        nav, mascot, quick ask button
src/renderer/src/shell/QuickAsk.tsx       quick ask dialog (Task 11)
src/renderer/src/screens/*.tsx            one file per screen (+ ChatPanel)
src/renderer/src/study/flashcard-session.ts   flashcard state machine
src/renderer/src/study/quiz-session.ts        quiz state machine
tests/*.test.ts                           logic tests
```

---

### Task 1: Move the Electron app into `frontend/`

**Files:**
- Move: `package.json`, `package-lock.json`, `.nvmrc`, `electron.vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `tsconfig.web.json`, `src/`, `tests/`, `README.md` → `frontend/`
- Create: `README.md` (new root overview)
- Modify: `.github/workflows/desktop-ci.yml`, `frontend/README.md`, `frontend/package.json` (test script only)

**Interfaces:**
- Consumes: Phase 0 project as committed on `feature/desktop-ui`.
- Produces: a working npm project at `frontend/`; every later task runs commands from there.

- [ ] **Step 1: Confirm a clean tree on the right branch and Node 24**

Run from the repository root:

```bash
git status --short
git branch --show-current
node --version
```

Expected: no output from `git status`, branch `feature/desktop-ui`, Node `v24.x`.

- [ ] **Step 2: Move tracked files with `git mv` (no content changes)**

```bash
mkdir frontend
git mv package.json package-lock.json .nvmrc electron.vite.config.ts tsconfig.json tsconfig.node.json tsconfig.web.json src tests README.md frontend/
rm -rf node_modules out
```

- [ ] **Step 3: Verify the moved project still works**

```bash
cd frontend
npm ci
npm test
npm run typecheck
npm run build
```

Expected: all exit 0; `npm test` reports 1 passing test; `frontend/out/main/index.js`, `frontend/out/preload/index.js`, `frontend/out/renderer/index.html` exist.

- [ ] **Step 4: Commit the pure move**

```bash
cd ..
git status --short   # expect only R (renamed) entries, already staged by git mv
git commit -m "refactor: move desktop app into frontend folder"
```

- [ ] **Step 5: Point CI at `frontend/`**

Replace `.github/workflows/desktop-ci.yml` with:

```yaml
name: Desktop CI

on:
  push:
  pull_request:

jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os:
          - windows-latest
          - macos-latest
    defaults:
      run:
        working-directory: frontend

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: frontend/.nvmrc
          cache: npm
          cache-dependency-path: frontend/package-lock.json
      - run: npm ci
      - run: npm test
      - run: npm run typecheck
      - run: npm run build
```

- [ ] **Step 6: Make the test script pick up every test file**

In `frontend/package.json`, change the `test` script to:

```json
"test": "node --test tests/*.test.ts",
```

Run `npm test` in `frontend/`. Expected: 1 passing test.

- [ ] **Step 7: Write the new root README and update the frontend README**

Root `README.md`:

```markdown
# Bardy

Bardy is an offline study companion for macOS and Windows: it reads your PDFs and turns them into summaries, flashcards, and quizzes with a local AI model.

## Repository layout

| Folder | What it holds | Owner |
|---|---|---|
| `frontend/` | Electron desktop app (main, preload, React renderer) | Desktop/UI team |
| `backend/` | Python + FastAPI study engine: AI, PDF extraction | AI/backend team |
| `docs/` | Specs, plans, and the design system (`docs/design/`) | Everyone |

## Run the desktop app

See `frontend/README.md`. In short:

    cd frontend
    npm install
    npm run dev
```

In `frontend/README.md`:
- Change the title to `# Bardy Desktop (frontend)`.
- In "Run Bardy on macOS" and "Run Bardy on Windows", add `cd frontend` as the first command.
- In "Manual smoke test" step 4, change `src/renderer/src/App.tsx` to `frontend/src/renderer/src/App.tsx`.
- In "Verify your setup", add the line `Run these from the frontend folder.` above the code block.
- Under "What you need", add: `Node is pinned in frontend/.nvmrc. With fnm (https://github.com/Schniz/fnm) installed, run fnm install once in frontend/ and it switches automatically.`

- [ ] **Step 8: Commit**

```bash
git add README.md frontend/README.md frontend/package.json .github/workflows/desktop-ci.yml
git commit -m "chore: point CI and docs at frontend folder"
```

---

### Task 2: Window size, minimum size, and remembered window state

**Files:**
- Create: `frontend/src/main/window-state.ts`
- Modify: `frontend/src/main/window-options.ts`, `frontend/src/main/index.ts`, `frontend/tests/window-options.test.ts`, `frontend/tsconfig.node.json`
- Test: `frontend/tests/window-state.test.ts`

**Interfaces:**
- Consumes: Electron `app`, `BrowserWindow`, `screen`.
- Produces: `WindowState`, `Rect`, `MIN_WIDTH`, `MIN_HEIGHT`, `DEFAULT_WINDOW_STATE`, `parseWindowState(raw: string | null): WindowState`, `fitToDisplays(state: WindowState, workAreas: Rect[]): WindowState`, `serializeWindowState(state: WindowState): string`.

- [ ] **Step 1: Turn on erasable-syntax checking for Node-run files**

In `frontend/tsconfig.node.json` add `"erasableSyntaxOnly": true` to `compilerOptions`, and add the renderer files that tests execute to `include`:

```json
{
  "compilerOptions": {
    "composite": true,
    "target": "ES2023",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "skipLibCheck": true,
    "erasableSyntaxOnly": true,
    "types": ["node"]
  },
  "include": [
    "electron.vite.config.ts",
    "src/main/**/*.ts",
    "src/preload/**/*.ts",
    "tests/**/*.ts"
  ]
}
```

Run `npm run typecheck`. Expected: exit 0.

- [ ] **Step 2: Write the failing tests**

Create `frontend/tests/window-state.test.ts`:

```ts
import assert from 'node:assert/strict'
import test from 'node:test'

import {
  DEFAULT_WINDOW_STATE,
  MIN_HEIGHT,
  MIN_WIDTH,
  fitToDisplays,
  parseWindowState,
  serializeWindowState
  // @ts-expect-error Node runs this TypeScript test directly and requires its extension.
} from '../src/main/window-state.ts'

const laptop = { x: 0, y: 0, width: 1440, height: 875 }
const external = { x: 1440, y: 0, width: 2560, height: 1415 }

test('missing file gives the default state', () => {
  assert.deepEqual(parseWindowState(null), DEFAULT_WINDOW_STATE)
})

test('corrupt JSON gives the default state', () => {
  assert.deepEqual(parseWindowState('{"width": 9'), DEFAULT_WINDOW_STATE)
  assert.deepEqual(parseWindowState('"hello"'), DEFAULT_WINDOW_STATE)
  assert.deepEqual(parseWindowState('null'), DEFAULT_WINDOW_STATE)
})

test('sizes below the minimum are raised to the minimum', () => {
  const state = parseWindowState('{"width": 200, "height": -50}')
  assert.equal(state.width, MIN_WIDTH)
  assert.equal(state.height, MIN_HEIGHT)
})

test('non-numeric fields fall back to defaults and flags must be true booleans', () => {
  const state = parseWindowState('{"width": "wide", "height": 800, "isMaximized": "yes", "isFullScreen": true}')
  assert.equal(state.width, DEFAULT_WINDOW_STATE.width)
  assert.equal(state.height, 800)
  assert.equal(state.isMaximized, false)
  assert.equal(state.isFullScreen, true)
})

test('position is kept only when both x and y are numbers', () => {
  assert.equal(parseWindowState('{"x": 10}').x, undefined)
  const state = parseWindowState('{"x": 10.4, "y": 20.6}')
  assert.equal(state.x, 10)
  assert.equal(state.y, 21)
})

test('a position on a connected display is kept', () => {
  const state = fitToDisplays({ ...DEFAULT_WINDOW_STATE, x: 1600, y: 100 }, [laptop, external])
  assert.equal(state.x, 1600)
  assert.equal(state.y, 100)
})

test('a position on an unplugged display is dropped so the window centers', () => {
  const state = fitToDisplays({ ...DEFAULT_WINDOW_STATE, x: 1600, y: 100 }, [laptop])
  assert.equal(state.x, undefined)
  assert.equal(state.y, undefined)
})

test('a window wider than every display shrinks to the largest display', () => {
  const state = fitToDisplays({ ...DEFAULT_WINDOW_STATE, width: 3000, height: 2000 }, [laptop])
  assert.equal(state.width, 1440)
  assert.equal(state.height, 875)
})

test('no displays reported leaves the state untouched', () => {
  const input = { ...DEFAULT_WINDOW_STATE, x: 5, y: 5 }
  assert.deepEqual(fitToDisplays(input, []), input)
})

test('serialize then parse round-trips', () => {
  const input = { width: 1200, height: 800, x: 40, y: 60, isMaximized: true, isFullScreen: false }
  assert.deepEqual(parseWindowState(serializeWindowState(input)), input)
})
```

Update `frontend/tests/window-options.test.ts` to:

```ts
import assert from 'node:assert/strict'
import test from 'node:test'

// @ts-expect-error Node runs this TypeScript test directly and requires its extension.
import { windowOptions } from '../src/main/window-options.ts'
// @ts-expect-error Node runs this TypeScript test directly and requires its extension.
import { MIN_HEIGHT, MIN_WIDTH } from '../src/main/window-state.ts'

test('uses secure desktop window options', () => {
  assert.equal(windowOptions.width, 1100)
  assert.equal(windowOptions.height, 720)
  assert.equal(windowOptions.minWidth, MIN_WIDTH)
  assert.equal(windowOptions.minHeight, MIN_HEIGHT)
  assert.equal(windowOptions.resizable, true)
  assert.equal(windowOptions.title, 'Bardy')
  assert.equal(windowOptions.webPreferences.contextIsolation, true)
  assert.equal(windowOptions.webPreferences.nodeIntegration, false)
  assert.equal(windowOptions.webPreferences.sandbox, true)
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL, cannot find module `../src/main/window-state.ts`.

- [ ] **Step 4: Implement `window-state.ts`**

Create `frontend/src/main/window-state.ts`:

```ts
export interface WindowState {
  width: number
  height: number
  x?: number
  y?: number
  isMaximized: boolean
  isFullScreen: boolean
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export const MIN_WIDTH = 720
export const MIN_HEIGHT = 520

export const DEFAULT_WINDOW_STATE: WindowState = {
  width: 1100,
  height: 720,
  isMaximized: false,
  isFullScreen: false
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function parseWindowState(raw: string | null): WindowState {
  if (raw === null) return { ...DEFAULT_WINDOW_STATE }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ...DEFAULT_WINDOW_STATE }
  }
  if (typeof parsed !== 'object' || parsed === null) return { ...DEFAULT_WINDOW_STATE }

  const saved = parsed as Record<string, unknown>
  const state: WindowState = {
    width: isNumber(saved.width) ? Math.max(MIN_WIDTH, Math.round(saved.width)) : DEFAULT_WINDOW_STATE.width,
    height: isNumber(saved.height) ? Math.max(MIN_HEIGHT, Math.round(saved.height)) : DEFAULT_WINDOW_STATE.height,
    isMaximized: saved.isMaximized === true,
    isFullScreen: saved.isFullScreen === true
  }
  if (isNumber(saved.x) && isNumber(saved.y)) {
    state.x = Math.round(saved.x)
    state.y = Math.round(saved.y)
  }
  return state
}

// The title bar must stay grabbable: at least 100px of its width and 40px of its height on one display.
function titleBarVisible(x: number, y: number, width: number, area: Rect): boolean {
  return (
    x + width - 100 >= area.x &&
    x + 100 <= area.x + area.width &&
    y >= area.y &&
    y + 40 <= area.y + area.height
  )
}

export function fitToDisplays(state: WindowState, workAreas: Rect[]): WindowState {
  if (workAreas.length === 0) return state

  const largest = workAreas.reduce((a, b) => (b.width * b.height > a.width * a.height ? b : a))
  const width = Math.max(MIN_WIDTH, Math.min(state.width, largest.width))
  const height = Math.max(MIN_HEIGHT, Math.min(state.height, largest.height))
  const { x, y, ...rest } = state

  if (x === undefined || y === undefined) return { ...rest, width, height }
  if (!workAreas.some((area) => titleBarVisible(x, y, width, area))) return { ...rest, width, height }
  return { ...rest, width, height, x, y }
}

export function serializeWindowState(state: WindowState): string {
  return JSON.stringify(state)
}
```

- [ ] **Step 5: Update `window-options.ts`**

```ts
import type { BrowserWindowConstructorOptions } from 'electron'

export const windowOptions = {
  width: 1100,
  height: 720,
  minWidth: 720,
  minHeight: 520,
  resizable: true,
  title: 'Bardy',
  webPreferences: {
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true
  }
} satisfies BrowserWindowConstructorOptions
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test`
Expected: PASS, 11 tests.

- [ ] **Step 7: Load and save the state in the main process**

Replace `frontend/src/main/index.ts` with:

```ts
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { app, BrowserWindow, screen } from 'electron'

import { windowOptions } from './window-options'
import { fitToDisplays, parseWindowState, serializeWindowState, type WindowState } from './window-state'

function windowStatePath(): string {
  return join(app.getPath('userData'), 'window-state.json')
}

function loadWindowState(): WindowState {
  let raw: string | null = null
  try {
    raw = readFileSync(windowStatePath(), 'utf8')
  } catch {
    // First launch or unreadable file: use defaults.
  }
  const workAreas = screen.getAllDisplays().map((display) => display.workArea)
  return fitToDisplays(parseWindowState(raw), workAreas)
}

function saveWindowState(window: BrowserWindow): void {
  const bounds = window.getNormalBounds()
  const state: WindowState = {
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    isMaximized: window.isMaximized(),
    isFullScreen: window.isFullScreen()
  }
  try {
    writeFileSync(windowStatePath(), serializeWindowState(state))
  } catch (error) {
    console.error('Could not save Bardy window state', error)
  }
}

export async function createWindow(): Promise<BrowserWindow> {
  const state = loadWindowState()
  const window = new BrowserWindow({
    ...windowOptions,
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    webPreferences: {
      ...windowOptions.webPreferences,
      preload: join(__dirname, '../preload/index.js')
    }
  })

  if (state.isMaximized) window.maximize()
  if (state.isFullScreen) window.setFullScreen(true)
  window.on('close', () => saveWindowState(window))

  if (process.env.ELECTRON_RENDERER_URL) {
    await window.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    await window.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return window
}

function handleStartupError(error: unknown): void {
  console.error('Failed to start Bardy', error)
  app.exit(1)
}

app.whenReady()
  .then(async () => {
    await createWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        void createWindow().catch(handleStartupError)
      }
    })
  })
  .catch(handleStartupError)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
```

- [ ] **Step 8: Verify typecheck, build, and behavior**

```bash
npm run typecheck
npm run build
npm run dev
```

Manual: resize and move the window, quit (Cmd+Q / close on Windows), run `npm run dev` again; the window reopens at the same size and place. Try to shrink below 720 × 520; it stops. Delete the file (macOS: `~/Library/Application Support/bardy/window-state.json`; Windows: `%APPDATA%\bardy\window-state.json`), relaunch; it opens at 1100 × 720. Write `{"width": 9` into the file, relaunch; it opens at 1100 × 720.

- [ ] **Step 9: Commit**

```bash
git add src/main tests tsconfig.node.json
git commit -m "feat: remember window size and position"
```

---

### Task 3: Design tokens, bundled fonts, icons, and offline CSP

**Files:**
- Create: `frontend/src/renderer/src/theme.css`
- Modify: `docs/design/theme.css`, `frontend/src/renderer/src/index.css`, `frontend/src/renderer/src/main.tsx`, `frontend/electron.vite.config.ts`, `frontend/package.json`, `frontend/package-lock.json`

**Interfaces:**
- Consumes: `docs/design/theme.css`.
- Produces: Tailwind utilities for every token (`bg-primary`, `text-fg-muted`, `border-border`, `rounded-control`, `rounded-card`, `font-display`, `font-body`, `text-caption|label|body|sub|heading-sm|heading|display`), breakpoints `mid:` (860px) and `wide:` (1000px), fonts loaded, `lucide-react` installed, CSP in production HTML.

- [ ] **Step 1: Install dependencies**

```bash
npm install @fontsource/nunito @fontsource/nunito-sans lucide-react
```

- [ ] **Step 2: Add breakpoints to the design tokens**

In `docs/design/theme.css`, at the end of the last `@theme { ... }` block (after `--radius-card: 16px;`), add:

```css
  /* Window-width breakpoints for the desktop app. */
  --breakpoint-mid: 860px;
  --breakpoint-wide: 1000px;
```

Then copy the file:

```bash
cp ../docs/design/theme.css src/renderer/src/theme.css
```

- [ ] **Step 3: Write `index.css`**

```css
@import "tailwindcss";
@import "./theme.css";

@layer base {
  html,
  body,
  #root {
    height: 100%;
  }

  body {
    background: var(--bg);
    color: var(--fg);
    font-family: var(--font-body);
    font-weight: 500;
    font-size: 16px;
    line-height: 1.45;
    -webkit-font-smoothing: antialiased;
  }

  :focus-visible {
    outline: 3px solid var(--link);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation: none !important;
      transition: none !important;
    }
  }
}
```

- [ ] **Step 4: Import the fonts in `main.tsx`**

```tsx
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
```

- [ ] **Step 5: Add the production Content-Security-Policy**

Replace `frontend/electron.vite.config.ts` with:

```ts
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import type { Plugin } from 'vite'

// Production only: the dev server needs inline scripts and a websocket for hot reload.
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'"
].join('; ')

const offlineCsp: Plugin = {
  name: 'bardy-offline-csp',
  apply: 'build',
  transformIndexHtml: (html) =>
    html.replace(
      '<head>',
      `<head>\n    <meta http-equiv="Content-Security-Policy" content="${contentSecurityPolicy}" />`
    )
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    plugins: [react(), tailwindcss(), offlineCsp]
  }
})
```

- [ ] **Step 6: Temporarily prove the tokens render**

Replace `App.tsx` for this check only:

```tsx
export default function App(): React.JSX.Element {
  return (
    <main className="grid h-full place-content-center gap-3 p-6 text-center">
      <h1 className="font-display text-heading font-black text-primary-ink">bardy</h1>
      <p className="text-fg-muted">Tokens and fonts loaded.</p>
      <button className="rounded-control border-b-4 border-primary-lip bg-primary px-5 py-3 text-label font-extrabold uppercase text-on-primary">Start session</button>
    </main>
  )
}
```

Run `npm run dev`. Expected: chunky rounded green heading in Nunito, green button with darker bottom edge; switch the OS to dark mode and the background turns `#131f24`.

- [ ] **Step 7: Verify build and CSP**

```bash
npm run typecheck
npm run build
grep -c "Content-Security-Policy" out/renderer/index.html
ls out/renderer/assets | grep -c woff2
```

Expected: build exits 0; grep prints `1`; at least 5 `.woff2` files.

- [ ] **Step 8: Commit**

```bash
git add ../docs/design/theme.css src/renderer/src electron.vite.config.ts package.json package-lock.json
git commit -m "feat: add design tokens, bundled fonts, and offline CSP"
```

---

### Task 4: Data layer: types, sample data, mock API, and `useResource`

**Files:**
- Create: `frontend/src/renderer/src/data/types.ts`, `frontend/src/renderer/src/data/api.ts`, `frontend/src/renderer/src/data/sample.ts`, `frontend/src/renderer/src/data/index.ts`, `frontend/src/renderer/src/data/use-resource.ts`
- Modify: `frontend/package.json` (dev scripts)
- Test: `frontend/tests/data-api.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces (exact names, used by every screen):
  - Types: `Deck`, `DeckTone`, `DeckStatus`, `Flashcard`, `StudyDocument`, `DocumentSummary`, `QuizQuestion`, `ChatMessage`, `TodayStats`, `Exam`, `Seed`, `StudyApi`.
  - `class ApiError extends Error { kind: ApiErrorKind }`, `type ApiErrorKind = 'offline' | 'not-found' | 'empty-question' | 'unknown'`, `toApiError(e: unknown): ApiError`, `OFFLINE_MESSAGE`.
  - `type MockMode = 'normal' | 'slow' | 'error'`, `mockModeFrom(viteMode: string): MockMode`, `createApi(options: { mode: MockMode; seed: Seed; sleep?: (ms: number) => Promise<void> }): StudyApi`.
  - `sampleSeed: Seed`.
  - `api: StudyApi` and `mockMode: MockMode` from `data/index.ts`.
  - `type Resource<T>` and `useResource<T>(load: () => Promise<T>, deps: DependencyList): Resource<T>` from `data/use-resource.ts`.

- [ ] **Step 1: Write the types**

Create `frontend/src/renderer/src/data/types.ts`:

```ts
export type DeckTone = 'brand' | 'link' | 'warning'
export type DeckStatus = 'due' | 'struggling' | 'mastered' | 'new'

export interface Deck {
  id: string
  title: string
  /** Two-letter tile label, e.g. "Bi". */
  subjectCode: string
  tone: DeckTone
  sourceDocumentId: string
  sourceName: string
  cardCount: number
  dueCount: number
  /** 0–1 share of cards mastered. */
  mastery: number
  status: DeckStatus
}

export interface Flashcard {
  id: string
  deckId: string
  term: string
  definition: string
  sourcePage: number
}

export interface DocumentSummary {
  readMinutes: number
  keyIdeas: Array<{ text: string; page: number }>
  examTerms: string[]
  excerpt: {
    page: number
    heading: string
    paragraphs: string[]
    /** Exact substring of one paragraph to highlight. */
    highlight: string
  }
}

export interface StudyDocument {
  id: string
  fileName: string
  title: string
  pageCount: number
  cardCount: number
  /** Set while the PDF is still being read. */
  processing: { currentPage: number } | null
  summary: DocumentSummary | null
}

export interface QuizQuestion {
  id: string
  documentId: string
  prompt: string
  options: string[]
  correctIndex: number
  explanation: string
  sourcePage: number
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  citedPages: number[]
}

export interface TodayStats {
  userName: string
  goalMinutes: number
  minutesToday: number
  streakDays: number
  /** Monday first, 7 entries. */
  weekDone: boolean[]
  /** 0 = Monday. */
  todayIndex: number
  recallPercent: number
  cardsMade: number
  dueCount: number
}

export interface Exam {
  id: string
  title: string
  /** ISO date, e.g. "2026-10-21". */
  date: string
  linkedDecks: number
}

export interface Seed {
  today: Omit<TodayStats, 'cardsMade' | 'dueCount'>
  decks: Deck[]
  cards: Flashcard[]
  documents: StudyDocument[]
  quiz: QuizQuestion[]
  chats: Record<string, ChatMessage[]>
  exams: Exam[]
}

export interface StudyApi {
  getToday(): Promise<TodayStats>
  listDecks(): Promise<Deck[]>
  deleteDeck(id: string): Promise<void>
  listExams(): Promise<Exam[]>
  listDocuments(): Promise<StudyDocument[]>
  deleteDocument(id: string): Promise<void>
  getDocument(id: string): Promise<StudyDocument>
  listChat(documentId: string): Promise<ChatMessage[]>
  /** documentId null = Quick ask across all notes. Returns the assistant reply. */
  ask(documentId: string | null, question: string): Promise<ChatMessage>
  /** No deckId = every card. */
  getDueCards(deckId?: string): Promise<Flashcard[]>
  /** No documentId = every question. */
  getQuiz(documentId?: string): Promise<QuizQuestion[]>
}
```

- [ ] **Step 2: Write the sample seed**

Create `frontend/src/renderer/src/data/sample.ts`:

```ts
import type { Seed } from './types'

export const sampleSeed: Seed = {
  today: {
    userName: 'Jiro',
    goalMinutes: 30,
    minutesToday: 18,
    streakDays: 14,
    weekDone: [true, true, true, false, false, false, false],
    todayIndex: 3,
    recallPercent: 86
  },
  decks: [
    {
      id: 'deck-bio',
      title: 'Cell Biology',
      subjectCode: 'Bi',
      tone: 'brand',
      sourceDocumentId: 'doc-bio',
      sourceName: 'BIO 101 Lecture 6.pdf',
      cardCount: 48,
      dueCount: 12,
      mastery: 0.72,
      status: 'due'
    },
    {
      id: 'deck-chem',
      title: 'Organic Chemistry: Reactions',
      subjectCode: 'Ch',
      tone: 'link',
      sourceDocumentId: 'doc-chem',
      sourceName: 'Ch 7 Substitution Reactions.pdf',
      cardCount: 36,
      dueCount: 0,
      mastery: 0.41,
      status: 'struggling'
    },
    {
      id: 'deck-hist',
      title: 'Philippine History 1898–1946',
      subjectCode: 'Hi',
      tone: 'warning',
      sourceDocumentId: 'doc-hist',
      sourceName: 'HIST 12 Reader.pdf',
      cardCount: 22,
      dueCount: 0,
      mastery: 0.95,
      status: 'mastered'
    }
  ],
  cards: [
    { id: 'c1', deckId: 'deck-bio', term: 'Chemiosmosis', definition: 'ATP production driven by protons flowing back across the inner mitochondrial membrane through ATP synthase.', sourcePage: 14 },
    { id: 'c2', deckId: 'deck-bio', term: 'Glycolysis', definition: 'Splits one glucose into two pyruvate in the cytoplasm, netting 2 ATP and 2 NADH. Needs no oxygen.', sourcePage: 8 },
    { id: 'c3', deckId: 'deck-bio', term: 'Fermentation', definition: 'Regenerates NAD⁺ without oxygen so glycolysis can continue. Yields only 2 ATP per glucose.', sourcePage: 19 },
    { id: 'c4', deckId: 'deck-bio', term: 'Krebs cycle', definition: 'Oxidizes acetyl-CoA in the mitochondrial matrix, producing NADH, FADH₂, CO₂ and 2 ATP per glucose.', sourcePage: 11 },
    { id: 'c5', deckId: 'deck-chem', term: 'SN2 reaction', definition: 'One-step substitution where the nucleophile attacks as the leaving group leaves, inverting the stereocenter.', sourcePage: 6 },
    { id: 'c6', deckId: 'deck-chem', term: 'Leaving group', definition: 'The atom or group that departs with the bonding electrons; weak bases such as I⁻ and Br⁻ leave best.', sourcePage: 4 },
    { id: 'c7', deckId: 'deck-hist', term: 'Treaty of Paris (1898)', definition: 'Ended the Spanish–American War; Spain ceded the Philippines to the United States for $20 million.', sourcePage: 3 },
    { id: 'c8', deckId: 'deck-hist', term: 'Tydings–McDuffie Act', definition: 'The 1934 US law that set up the Commonwealth and promised Philippine independence after ten years.', sourcePage: 41 }
  ],
  documents: [
    {
      id: 'doc-bio',
      fileName: 'BIO 101 Lecture 6 — Cellular Respiration.pdf',
      title: 'Cellular Respiration',
      pageCount: 24,
      cardCount: 48,
      processing: null,
      summary: {
        readMinutes: 2,
        keyIdeas: [
          { text: 'Cellular respiration turns glucose and oxygen into ATP, CO₂ and water.', page: 3 },
          { text: 'It runs in three stages: glycolysis in the cytoplasm, the Krebs cycle in the mitochondrial matrix, and the electron transport chain on the inner membrane.', page: 5 },
          { text: 'Glycolysis nets 2 ATP and 2 NADH per glucose and needs no oxygen.', page: 8 },
          { text: 'The electron transport chain makes about 34 of the roughly 38 ATP, using a proton gradient that drives ATP synthase.', page: 14 },
          { text: 'Without oxygen, cells fall back on fermentation, which regenerates NAD⁺ but yields only 2 ATP.', page: 19 }
        ],
        examTerms: ['ATP synthase', 'Chemiosmosis', 'Pyruvate', 'NADH', 'Oxidative phosphorylation', 'Fermentation'],
        excerpt: {
          page: 14,
          heading: '6.4 The Electron Transport Chain',
          paragraphs: [
            'The final stage of cellular respiration takes place on the inner mitochondrial membrane. NADH and FADH₂ deliver high-energy electrons to a series of protein complexes. As electrons pass along the chain, energy is used to pump protons (H⁺) into the intermembrane space.',
            'The resulting proton gradient drives ATP synthase, producing approximately 34 ATP per glucose molecule. This process is called chemiosmosis. Oxygen serves as the final electron acceptor, combining with electrons and protons to form water.',
            'If oxygen is unavailable, the chain backs up and stops, and NADH can no longer be recycled to NAD⁺.'
          ],
          highlight: 'The resulting proton gradient drives ATP synthase, producing approximately 34 ATP per glucose molecule.'
        }
      }
    },
    {
      id: 'doc-chem',
      fileName: 'Ch 7 Substitution Reactions.pdf',
      title: 'Substitution Reactions',
      pageCount: 31,
      cardCount: 36,
      processing: null,
      summary: {
        readMinutes: 3,
        keyIdeas: [
          { text: 'Substitution swaps a leaving group for a nucleophile on an sp³ carbon.', page: 2 },
          { text: 'SN2 happens in one step with inversion; SN1 goes through a carbocation and gives a mix of products.', page: 6 }
        ],
        examTerms: ['SN1', 'SN2', 'Nucleophile', 'Leaving group', 'Carbocation'],
        excerpt: {
          page: 6,
          heading: '7.3 The SN2 Mechanism',
          paragraphs: ['In an SN2 reaction the nucleophile attacks the carbon from the side opposite the leaving group. Bond forming and bond breaking happen at the same time, so the reaction is a single step.'],
          highlight: 'Bond forming and bond breaking happen at the same time'
        }
      }
    },
    {
      id: 'doc-hist',
      fileName: 'HIST 12 Reader — American Period.pdf',
      title: 'The American Period',
      pageCount: 58,
      cardCount: 22,
      processing: null,
      summary: {
        readMinutes: 4,
        keyIdeas: [
          { text: 'The Treaty of Paris (1898) transferred the Philippines from Spain to the United States.', page: 3 },
          { text: 'The 1935 Commonwealth was a ten-year transition to independence under the Tydings–McDuffie Act.', page: 41 }
        ],
        examTerms: ['Treaty of Paris', 'Commonwealth', 'Tydings–McDuffie Act', 'Jones Law'],
        excerpt: {
          page: 41,
          heading: 'The Road to the Commonwealth',
          paragraphs: ['The Tydings–McDuffie Act of 1934 provided for a constitutional convention and a ten-year Commonwealth period, after which full independence would be granted.'],
          highlight: 'a ten-year Commonwealth period'
        }
      }
    },
    {
      id: 'doc-phys',
      fileName: 'PHYS 71 Problem Set 4.pdf',
      title: 'Problem Set 4',
      pageCount: 14,
      cardCount: 0,
      processing: { currentPage: 9 },
      summary: null
    }
  ],
  quiz: [
    { id: 'q1', documentId: 'doc-bio', prompt: 'Where does the electron transport chain take place?', options: ['Cytoplasm', 'Mitochondrial matrix', 'Inner mitochondrial membrane', 'Outer mitochondrial membrane'], correctIndex: 2, explanation: 'The chain sits on the inner membrane.', sourcePage: 14 },
    { id: 'q2', documentId: 'doc-bio', prompt: 'Which organelle makes most of a cell’s ATP?', options: ['Ribosome', 'Mitochondrion', 'Golgi apparatus', 'Lysosome'], correctIndex: 1, explanation: 'Mitochondria run cellular respiration.', sourcePage: 3 },
    { id: 'q3', documentId: 'doc-bio', prompt: 'How much ATP does glycolysis net per glucose?', options: ['2 ATP', '4 ATP', '34 ATP', '38 ATP'], correctIndex: 0, explanation: 'Glycolysis nets 2 ATP and 2 NADH.', sourcePage: 8 },
    { id: 'q4', documentId: 'doc-chem', prompt: 'What happens to the stereocenter in an SN2 reaction?', options: ['It is kept', 'It is inverted', 'It becomes a racemic mix', 'It is destroyed'], correctIndex: 1, explanation: 'Backside attack inverts the stereocenter.', sourcePage: 6 }
  ],
  chats: {
    'doc-bio': [
      { id: 'm-seed-1', role: 'user', text: 'Why does the electron transport chain stop without oxygen?', citedPages: [] },
      { id: 'm-seed-2', role: 'assistant', text: 'Oxygen is the last stop for electrons in the chain. With no oxygen to accept them, electrons back up, the proton pumps stop, and ATP synthase has no gradient to use. That’s why cells switch to fermentation, which only makes 2 ATP.', citedPages: [14, 19] }
    ]
  },
  exams: [
    { id: 'e1', title: 'BIO 101 Midterm', date: '2026-10-21', linkedDecks: 3 },
    { id: 'e2', title: 'CHEM 23 Quiz 3', date: '2026-10-28', linkedDecks: 1 }
  ]
}
```

- [ ] **Step 3: Write the failing tests**

Create `frontend/tests/data-api.test.ts`:

```ts
import assert from 'node:assert/strict'
import test from 'node:test'

// @ts-expect-error Node runs this TypeScript test directly and requires its extension.
import { ApiError, OFFLINE_MESSAGE, createApi, mockModeFrom, toApiError } from '../src/renderer/src/data/api.ts'
// @ts-expect-error Node runs this TypeScript test directly and requires its extension.
import { sampleSeed } from '../src/renderer/src/data/sample.ts'

function recordingSleep() {
  const waits: number[] = []
  return { waits, sleep: async (ms: number) => { waits.push(ms) } }
}

function normalApi() {
  return createApi({ mode: 'normal', seed: sampleSeed, sleep: async () => {} })
}

test('mockModeFrom maps Vite modes', () => {
  assert.equal(mockModeFrom('development'), 'normal')
  assert.equal(mockModeFrom('production'), 'normal')
  assert.equal(mockModeFrom('slow'), 'slow')
  assert.equal(mockModeFrom('error'), 'error')
})

test('today derives due count and cards made from the decks and cards', async () => {
  const today = await normalApi().getToday()
  assert.equal(today.dueCount, 12)
  assert.equal(today.cardsMade, 8)
})

test('deleting a deck removes it and its cards', async () => {
  const api = normalApi()
  await api.deleteDeck('deck-bio')
  assert.deepEqual((await api.listDecks()).map((d) => d.id), ['deck-chem', 'deck-hist'])
  assert.equal((await api.getDueCards('deck-bio')).length, 0)
  assert.equal((await api.getToday()).dueCount, 0)
})

test('deleting every deck leaves empty lists', async () => {
  const api = normalApi()
  for (const deck of await api.listDecks()) await api.deleteDeck(deck.id)
  assert.equal((await api.listDecks()).length, 0)
  assert.equal((await api.getDueCards()).length, 0)
})

test('deleting a document cascades to its decks, cards, quiz, and chat', async () => {
  const api = normalApi()
  await api.deleteDocument('doc-bio')
  assert.equal((await api.listDocuments()).some((d) => d.id === 'doc-bio'), false)
  assert.equal((await api.listDecks()).some((d) => d.id === 'deck-bio'), false)
  assert.equal((await api.getDueCards('deck-bio')).length, 0)
  assert.equal((await api.getQuiz('doc-bio')).length, 0)
  assert.deepEqual(await api.listChat('doc-bio'), [])
  await assert.rejects(api.getDocument('doc-bio'), (e: unknown) => e instanceof ApiError && e.kind === 'not-found')
})

test('two api instances do not share deletions and never mutate the seed', async () => {
  const first = normalApi()
  await first.deleteDeck('deck-bio')
  assert.equal((await normalApi().listDecks()).length, 3)
  assert.equal(sampleSeed.decks.length, 3)
})

test('returned data cannot be used to mutate the store', async () => {
  const api = normalApi()
  const decks = await api.listDecks()
  decks.pop()
  assert.equal((await api.listDecks()).length, 3)
})

test('ask appends both messages to the document chat', async () => {
  const api = normalApi()
  const before = (await api.listChat('doc-bio')).length
  const reply = await api.ask('doc-bio', '  What is ATP?  ')
  assert.equal(reply.role, 'assistant')
  const chat = await api.listChat('doc-bio')
  assert.equal(chat.length, before + 2)
  assert.equal(chat[before].text, 'What is ATP?')
})

test('quick ask (no document) answers without touching any chat', async () => {
  const api = normalApi()
  const reply = await api.ask(null, 'Net ATP from glycolysis?')
  assert.equal(reply.role, 'assistant')
  assert.ok(reply.citedPages.length > 0)
})

test('an empty question is rejected', async () => {
  await assert.rejects(normalApi().ask('doc-bio', '   '), (e: unknown) => e instanceof ApiError && e.kind === 'empty-question')
})

test('slow mode waits 2 seconds per call, normal mode 250ms', async () => {
  const slow = recordingSleep()
  await createApi({ mode: 'slow', seed: sampleSeed, sleep: slow.sleep }).listDecks()
  assert.deepEqual(slow.waits, [2000])
  const normal = recordingSleep()
  await createApi({ mode: 'normal', seed: sampleSeed, sleep: normal.sleep }).listDecks()
  assert.deepEqual(normal.waits, [250])
})

test('error mode rejects every call with the offline message', async () => {
  const api = createApi({ mode: 'error', seed: sampleSeed, sleep: async () => {} })
  const calls = [() => api.getToday(), () => api.listDecks(), () => api.deleteDeck('deck-bio'), () => api.ask(null, 'hi')]
  for (const call of calls) {
    await assert.rejects(call(), (e: unknown) => e instanceof ApiError && e.kind === 'offline' && e.message === OFFLINE_MESSAGE)
  }
})

test('toApiError keeps ApiErrors and wraps anything else', () => {
  const original = new ApiError('offline', 'x')
  assert.equal(toApiError(original), original)
  assert.equal(toApiError(new TypeError('boom')).kind, 'unknown')
})
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL, cannot find module `../src/renderer/src/data/api.ts`.

- [ ] **Step 5: Implement `api.ts`**

Create `frontend/src/renderer/src/data/api.ts`:

```ts
import type { ChatMessage, Seed, StudyApi } from './types'

export type MockMode = 'normal' | 'slow' | 'error'
export type ApiErrorKind = 'offline' | 'not-found' | 'empty-question' | 'unknown'

export class ApiError extends Error {
  readonly kind: ApiErrorKind

  constructor(kind: ApiErrorKind, message: string) {
    super(message)
    this.name = 'ApiError'
    this.kind = kind
  }
}

export const OFFLINE_MESSAGE = "Couldn't reach Bardy's study engine. Check that it's running, then try again."

export function toApiError(error: unknown): ApiError {
  return error instanceof ApiError ? error : new ApiError('unknown', 'Something went wrong. Try again.')
}

/** `npm run dev:slow` → Vite mode "slow"; `npm run dev:error` → "error"; anything else → normal. */
export function mockModeFrom(viteMode: string): MockMode {
  return viteMode === 'slow' || viteMode === 'error' ? viteMode : 'normal'
}

const DELAY_MS: Record<MockMode, number> = { normal: 250, slow: 2000, error: 250 }

export function createApi(options: {
  mode: MockMode
  seed: Seed
  sleep?: (ms: number) => Promise<void>
}): StudyApi {
  const { mode } = options
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)))
  const db: Seed = structuredClone(options.seed)
  let nextId = 1

  // Every call behaves like a network request: delay, maybe fail, and return a copy.
  async function call<T>(work: () => T): Promise<T> {
    await sleep(DELAY_MS[mode])
    if (mode === 'error') throw new ApiError('offline', OFFLINE_MESSAGE)
    return structuredClone(work())
  }

  function message(role: ChatMessage['role'], text: string, citedPages: number[]): ChatMessage {
    return { id: `m${nextId++}`, role, text, citedPages }
  }

  return {
    getToday: () =>
      call(() => ({
        ...db.today,
        dueCount: db.decks.reduce((sum, deck) => sum + deck.dueCount, 0),
        cardsMade: db.cards.length
      })),

    listDecks: () => call(() => db.decks),

    deleteDeck: (id) =>
      call(() => {
        db.decks = db.decks.filter((deck) => deck.id !== id)
        db.cards = db.cards.filter((card) => card.deckId !== id)
      }),

    listExams: () => call(() => db.exams),

    listDocuments: () => call(() => db.documents),

    deleteDocument: (id) =>
      call(() => {
        const deckIds = new Set(db.decks.filter((deck) => deck.sourceDocumentId === id).map((deck) => deck.id))
        db.documents = db.documents.filter((doc) => doc.id !== id)
        db.decks = db.decks.filter((deck) => !deckIds.has(deck.id))
        db.cards = db.cards.filter((card) => !deckIds.has(card.deckId))
        db.quiz = db.quiz.filter((question) => question.documentId !== id)
        delete db.chats[id]
      }),

    getDocument: (id) =>
      call(() => {
        const doc = db.documents.find((d) => d.id === id)
        if (!doc) throw new ApiError('not-found', 'That document is no longer in your library.')
        return doc
      }),

    listChat: (documentId) => call(() => db.chats[documentId] ?? []),

    ask: (documentId, question) =>
      call(() => {
        const text = question.trim()
        if (!text) throw new ApiError('empty-question', 'Type a question first.')

        if (documentId === null) {
          return message('assistant', 'Glycolysis nets 2 ATP and 2 NADH per glucose. This is a sample answer; the real one will come from your notes.', [8])
        }
        const doc = db.documents.find((d) => d.id === documentId)
        if (!doc) throw new ApiError('not-found', 'That document is no longer in your library.')
        const firstPage = doc.summary?.keyIdeas[0]?.page ?? 1
        const reply = message('assistant', 'This is a sample answer. Once the study engine is connected, replies will come from this document.', [firstPage])
        ;(db.chats[documentId] ??= []).push(message('user', text, []), reply)
        return reply
      }),

    getDueCards: (deckId) => call(() => db.cards.filter((card) => deckId === undefined || card.deckId === deckId)),

    getQuiz: (documentId) =>
      call(() => db.quiz.filter((question) => documentId === undefined || question.documentId === documentId))
  }
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test`
Expected: PASS (all window tests + 13 data tests).

- [ ] **Step 7: Create the app instance and the hook**

`frontend/src/renderer/src/data/index.ts`:

```ts
import { createApi, mockModeFrom } from './api'
import { sampleSeed } from './sample'

export const mockMode = mockModeFrom(import.meta.env.MODE)

/** The only data entry point for screens. Swap this for the real backend client later. */
export const api = createApi({ mode: mockMode, seed: sampleSeed })

export { ApiError, toApiError } from './api'
export type * from './types'
```

`frontend/src/renderer/src/data/use-resource.ts`:

```ts
import { useCallback, useEffect, useState, type DependencyList } from 'react'

import { toApiError, type ApiError } from './api'

type ResourceState<T> =
  | { status: 'loading' }
  | { status: 'error'; error: ApiError }
  | { status: 'ready'; data: T }

export type Resource<T> = ResourceState<T> & { reload: () => void }

/** Runs `load` when deps change or `reload()` is called. Ignores results from stale calls. */
export function useResource<T>(load: () => Promise<T>, deps: DependencyList): Resource<T> {
  const [state, setState] = useState<ResourceState<T>>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let current = true
    setState({ status: 'loading' })
    load().then(
      (data) => current && setState({ status: 'ready', data }),
      (error: unknown) => current && setState({ status: 'error', error: toApiError(error) })
    )
    return () => {
      current = false
    }
    // Callers pass the deps that `load` closes over; `attempt` re-runs it on reload().
  }, [...deps, attempt])

  const reload = useCallback(() => setAttempt((n) => n + 1), [])
  return { ...state, reload }
}
```

- [ ] **Step 8: Add the dev scripts**

In `frontend/package.json` `scripts`, add after `dev`:

```json
"dev:slow": "npm run dev -- --mode slow",
"dev:error": "npm run dev -- --mode error",
```

- [ ] **Step 9: Verify**

```bash
npm test
npm run typecheck
```

Expected: both exit 0.

- [ ] **Step 10: Commit**

```bash
git add src/renderer/src/data tests/data-api.test.ts package.json
git commit -m "feat: add sample data layer with slow and error modes"
```

---

### Task 5: Shared UI components and the stand-in mascot

**Files (all under `frontend/src/renderer/src/ui/`):**
- Create: `Button.tsx`, `Pill.tsx`, `ProgressBar.tsx`, `Card.tsx`, `TextField.tsx`, `Tabs.tsx`, `Kbd.tsx`, `Skeleton.tsx`, `Mascot.tsx`, `EmptyState.tsx`, `ErrorState.tsx`, `ResourceView.tsx`, `ScreenHeader.tsx`, `icon.ts`, `page.ts`

**Interfaces:**
- Consumes: Task 3 tokens and `lucide-react`; Task 4 `Resource<T>`.
- Produces (props are exact):
  - `Button({ variant?: 'primary'|'secondary'|'dark'|'danger'|'ghost'; block?: boolean } & ButtonHTMLAttributes)`
  - `Pill({ tone?: 'brand'|'ok'|'warn'|'bad'|'neutral'; children })`
  - `ProgressBar({ value: number /*0–1*/; label: string; size?: 'sm'|'md'|'lg' })`
  - `Card({ as?: 'section'|'div'|'article'; className?; children })`
  - `TextField({ id: string; label: string; error?: string } & InputHTMLAttributes)`
  - `Tabs<T extends string>({ label: string; items: Array<{ id: T; label: string }>; value: T; onChange: (id: T) => void })`
  - `Kbd({ children })`, `Skeleton({ className })`
  - `Mascot({ awake?: boolean; size?: number /*px width*/ })`
  - `EmptyState({ title: string; body: string; action?: ReactNode; awake?: boolean })`
  - `ErrorState({ message: string; onRetry: () => void })`
  - `ResourceView<T>({ resource: Resource<T>; loading: ReactNode; isEmpty?: (data: T) => boolean; empty?: ReactNode; children: (data: T) => ReactNode })`
  - `ScreenHeader({ eyebrow?: string; title: ReactNode; actions?: ReactNode })`
  - `ICON` constant: `{ strokeWidth: 2.4, 'aria-hidden': true }`
  - `PAGE` class string for normal padded screens, from `ui/page.ts`

- [ ] **Step 1: Write the components**

`icon.ts`:

```ts
/** Spread on every lucide icon: <Home {...ICON} size={22} /> */
export const ICON = { strokeWidth: 2.4, 'aria-hidden': true } as const
```

`page.ts`:

```ts
/** Wrapper for normal (scrolling, padded) screens. Study screens and Ask notes fill the main area instead. */
export const PAGE = 'mx-auto grid w-full max-w-[1180px] gap-6 px-8 pt-7 pb-12'
```

`Button.tsx`:

```tsx
import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'dark' | 'danger' | 'ghost'

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-on-primary border-b-4 border-primary-lip',
  secondary: 'bg-surface text-link border-2 border-border border-b-4',
  dark: 'bg-night text-bg border-b-4 border-night/70',
  danger: 'bg-danger text-white border-b-4 border-danger-lip',
  ghost: 'bg-transparent text-fg-muted'
}

export function Button({
  variant = 'primary',
  block = false,
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; block?: boolean }): React.JSX.Element {
  return (
    <button
      type={type}
      className={`inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-control px-[18px] py-3 text-sm leading-none font-extrabold tracking-[0.053em] uppercase hover:brightness-105 active:translate-y-0.5 active:border-b-2 disabled:translate-y-0 disabled:cursor-not-allowed disabled:border-border disabled:bg-border disabled:text-fg-faint disabled:hover:brightness-100 ${variants[variant]} ${block ? 'w-full' : ''} ${className}`}
      {...props}
    />
  )
}
```

`Pill.tsx`:

```tsx
import type { ReactNode } from 'react'

type Tone = 'brand' | 'ok' | 'warn' | 'bad' | 'neutral'

const tones: Record<Tone, string> = {
  brand: 'bg-primary-wash border-primary text-primary-ink',
  ok: 'bg-success-wash border-success text-fg',
  warn: 'bg-warning-wash border-warning text-fg',
  bad: 'bg-danger-wash border-danger text-fg',
  neutral: 'border-border-strong text-fg-muted'
}

export function Pill({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }): React.JSX.Element {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-[10px] border-2 px-2.5 py-1.5 text-xs leading-none font-extrabold tracking-[0.053em] uppercase ${tones[tone]}`}>
      {children}
    </span>
  )
}
```

`ProgressBar.tsx`:

```tsx
const heights = { sm: 'h-2.5', md: 'h-3.5', lg: 'h-4' }

export function ProgressBar({ value, label, size = 'md' }: { value: number; label: string; size?: keyof typeof heights }): React.JSX.Element {
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 100)
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} className={`overflow-hidden rounded-full bg-border ${heights[size]}`}>
      <div className="relative h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${percent}%` }}>
        <span className="absolute inset-x-2 top-[3px] h-1 rounded-full bg-white/35" />
      </div>
    </div>
  )
}
```

`Card.tsx`:

```tsx
import type { ReactNode } from 'react'

export function Card({ as: Tag = 'section', className = '', children }: { as?: 'section' | 'div' | 'article'; className?: string; children: ReactNode }): React.JSX.Element {
  return <Tag className={`grid min-w-0 content-start gap-3.5 rounded-card border-2 border-border bg-surface p-5 ${className}`}>{children}</Tag>
}
```

`TextField.tsx`:

```tsx
import type { InputHTMLAttributes } from 'react'

export function TextField({ id, label, error, className = '', ...props }: InputHTMLAttributes<HTMLInputElement> & { id: string; label: string; error?: string }): React.JSX.Element {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-caption font-extrabold tracking-[0.053em] text-fg-muted uppercase">{label}</label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`w-full min-w-0 rounded-control border-2 px-3.5 py-3 text-base text-fg placeholder:text-fg-faint focus:outline-none ${error ? 'border-danger bg-danger-wash' : 'border-border bg-surface-2 focus:border-link focus:bg-surface'} ${className}`}
        {...props}
      />
      {error && <span id={`${id}-error`} className="text-caption font-bold text-danger">{error}</span>}
    </div>
  )
}
```

`Tabs.tsx`:

```tsx
export function Tabs<T extends string>({ label, items, value, onChange }: { label: string; items: Array<{ id: T; label: string }>; value: T; onChange: (id: T) => void }): React.JSX.Element {
  return (
    <div role="tablist" aria-label={label} className="flex flex-wrap gap-2">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={item.id === value}
          onClick={() => onChange(item.id)}
          className="cursor-pointer rounded-control border-2 border-border-strong px-3.5 py-2 text-[13px] font-extrabold tracking-[0.053em] text-fg-muted uppercase aria-selected:border-link aria-selected:bg-link/10 aria-selected:text-link"
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
```

`Kbd.tsx`:

```tsx
import type { ReactNode } from 'react'

export function Kbd({ children }: { children: ReactNode }): React.JSX.Element {
  return <kbd className="whitespace-nowrap rounded-md border-2 border-b-[3px] border-border px-1.5 py-0.5 font-mono text-xs font-bold text-fg-muted">{children}</kbd>
}
```

`Skeleton.tsx`:

```tsx
export function Skeleton({ className = '' }: { className?: string }): React.JSX.Element {
  return <div aria-hidden className={`animate-pulse rounded-control bg-surface-2 ${className}`} />
}
```

`Mascot.tsx` (pixel grid and palette copied from `docs/design/DESIGN.md`):

```tsx
// Stand-in until the mascot team delivers art. Replace this file only.
const AWAKE = [
  '......LL.LL.....', '.....LLLSLLL....', '........S.......', '....GGGGGGGG....',
  '..GGGWGGGGGGGG..', '.GGWGGGGGGGGGGG.', '.GGFFFFFFFFFFGG.', 'GGFFFFFFFFFFFFGG',
  'GGFFEEFFFFEEFFGG', 'GGFFEEFFFFEEFFGG', 'GGFFFFFFFFFFFFGG', 'GGFFFFFEEFFFFFGG',
  '.GGFFFFFFFFFFGG.', '.GGGGGGGGGGGGGG.', '..DGGGGGGGGGGD..', '...DDDDDDDDDD...',
  '...GG......GG...', '...DD......DD...'
]
const ASLEEP_ROWS: Record<number, string> = { 8: 'GGFFFFFFFFFFFFGG', 9: 'GGFEEEFFFFEEEFGG' }
const PALETTE: Record<string, string> = { G: '#58cc02', D: '#58a700', L: '#a5ed6e', S: '#58a700', F: '#000437', E: '#a5ed6e', W: '#d7ffb8' }

export function Mascot({ awake = true, size = 64 }: { awake?: boolean; size?: number }): React.JSX.Element {
  const rows = AWAKE.map((row, y) => (awake ? row : (ASLEEP_ROWS[y] ?? row)))
  return (
    <svg viewBox="0 0 16 18" width={size} height={(size * 18) / 16} shapeRendering="crispEdges" role="img" aria-label={awake ? 'Bardy mascot, awake' : 'Bardy mascot, asleep'}>
      {rows.flatMap((row, y) =>
        [...row].map((key, x) => (PALETTE[key] ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={PALETTE[key]} /> : null))
      )}
    </svg>
  )
}
```

`EmptyState.tsx`:

```tsx
import type { ReactNode } from 'react'

import { Mascot } from './Mascot'

export function EmptyState({ title, body, action, awake = true }: { title: string; body: string; action?: ReactNode; awake?: boolean }): React.JSX.Element {
  return (
    <div className="mx-auto grid max-w-md justify-items-center gap-3 py-12 text-center">
      <Mascot awake={awake} size={72} />
      <h2 className="font-display text-2xl font-black text-fg">{title}</h2>
      <p className="text-fg-muted">{body}</p>
      {action}
    </div>
  )
}
```

`ErrorState.tsx`:

```tsx
import { CloudOff } from 'lucide-react'

import { Button } from './Button'
import { ICON } from './icon'

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }): React.JSX.Element {
  return (
    <div role="alert" className="mx-auto grid max-w-md justify-items-center gap-3 rounded-card bg-danger-wash px-6 py-8 text-center">
      <CloudOff {...ICON} size={36} className="text-danger" />
      <h2 className="font-display text-xl font-black text-danger">Couldn’t load this</h2>
      <p className="text-fg">{message}</p>
      <Button variant="secondary" onClick={onRetry}>Try again</Button>
    </div>
  )
}
```

`ResourceView.tsx`:

```tsx
import type { ReactNode } from 'react'

import type { Resource } from '../data/use-resource'
import { ErrorState } from './ErrorState'

export function ResourceView<T>({ resource, loading, isEmpty, empty, children }: {
  resource: Resource<T>
  loading: ReactNode
  isEmpty?: (data: T) => boolean
  empty?: ReactNode
  children: (data: T) => ReactNode
}): React.JSX.Element {
  if (resource.status === 'loading') return <div aria-busy="true">{loading}</div>
  if (resource.status === 'error') return <ErrorState message={resource.error.message} onRetry={resource.reload} />
  if (empty !== undefined && isEmpty?.(resource.data)) return <>{empty}</>
  return <>{children(resource.data)}</>
}
```

`ScreenHeader.tsx`:

```tsx
import type { ReactNode } from 'react'

export function ScreenHeader({ eyebrow, title, actions }: { eyebrow?: string; title: ReactNode; actions?: ReactNode }): React.JSX.Element {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && <div className="text-[13px] font-extrabold tracking-[0.053em] text-fg-muted uppercase">{eyebrow}</div>}
        <h1 className="font-display text-[34px] leading-tight font-black tracking-[-0.02em] text-balance text-fg">{title}</h1>
      </div>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </header>
  )
}
```

- [ ] **Step 2: Verify**

```bash
npm run typecheck
```

Expected: exit 0. (Visual check happens in Task 6 once the shell renders components.)

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/ui
git commit -m "feat: add shared UI components and stand-in mascot"
```

---

### Task 6: App shell, navigation, and screen placeholders

**Files:**
- Create: `frontend/src/renderer/src/shell/navigation.tsx`, `frontend/src/renderer/src/shell/Shell.tsx`, `frontend/src/renderer/src/shell/Sidebar.tsx`, `frontend/src/renderer/src/shell/QuickAsk.tsx` (placeholder), `frontend/src/renderer/src/screens/TodayScreen.tsx`, `LibraryScreen.tsx`, `AskScreen.tsx`, `FlashcardsScreen.tsx`, `QuizScreen.tsx` (placeholders)
- Modify: `frontend/src/renderer/src/App.tsx`

**Interfaces:**
- Consumes: Tasks 3–5.
- Produces:
  - `type Route = { screen: 'today' } | { screen: 'library' } | { screen: 'ask'; documentId?: string } | { screen: 'cards'; deckId?: string } | { screen: 'quiz'; documentId?: string }`
  - `NavigationProvider`, `useNavigation(): { route: Route; navigate: (route: Route) => void; openQuickAsk: () => void }`
  - Screen components, each `export function XScreen(): React.JSX.Element` with no props; they read params from `useNavigation().route`.
  - `QuickAsk({ open: boolean; onClose: () => void })`.
  - Layout contract: normal screens render inside `<div className="mx-auto grid w-full max-w-[1180px] gap-6 px-8 pt-7 pb-12">` (use `PAGE` from `ui/page.ts`); study screens (`cards`, `quiz`) and `ask` fill the main area (`h-full`) and handle their own padding.

- [ ] **Step 1: Navigation**

`shell/navigation.tsx`:

```tsx
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

export type Route =
  | { screen: 'today' }
  | { screen: 'library' }
  | { screen: 'ask'; documentId?: string }
  | { screen: 'cards'; deckId?: string }
  | { screen: 'quiz'; documentId?: string }

export type ScreenName = Route['screen']

interface Navigation {
  route: Route
  navigate: (route: Route) => void
  openQuickAsk: () => void
}

const NavigationContext = createContext<Navigation | null>(null)

export function NavigationProvider({ openQuickAsk, children }: { openQuickAsk: () => void; children: ReactNode }): React.JSX.Element {
  const [route, setRoute] = useState<Route>({ screen: 'today' })
  const value = useMemo(() => ({ route, navigate: setRoute, openQuickAsk }), [route, openQuickAsk])
  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>
}

export function useNavigation(): Navigation {
  const navigation = useContext(NavigationContext)
  if (!navigation) throw new Error('useNavigation must be used inside NavigationProvider')
  return navigation
}
```

- [ ] **Step 2: Sidebar**

`shell/Sidebar.tsx`:

```tsx
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

const isMac = window.bardy.platform === 'darwin'
export const QUICK_ASK_KEYS = isMac ? '⌘ ⇧ Space' : 'Ctrl Shift Space'

export function Sidebar(): React.JSX.Element {
  const { route, navigate, openQuickAsk } = useNavigation()

  return (
    <aside className="flex min-h-0 flex-col gap-5 overflow-y-auto border-r-2 border-border px-3 py-5">
      <div className="flex items-center justify-center gap-2 wide:justify-start wide:px-3">
        <span className="font-display text-[28px] leading-none font-black tracking-[-0.02em] text-primary" aria-label="bardy">
          <span className="hidden wide:inline">bardy</span>
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
            onClick={() => navigate({ screen } as Parameters<typeof navigate>[0])}
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
          <span className="hidden wide:inline"><Kbd>{QUICK_ASK_KEYS}</Kbd></span>
        </button>
        <div className="flex items-center gap-3 rounded-control border-2 border-border p-3 text-[13px]">
          <Mascot awake={false} size={32} />
          <div className="hidden min-w-0 wide:block">
            <b className="block text-sm font-extrabold">Study engine</b>
            <span className="text-fg-muted">{mockMode === 'normal' ? 'Sample data · AI not connected yet' : `Sample data · ${mockMode} mode`}</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
```

- [ ] **Step 3: Placeholder screens and Quick ask**

Create each screen file with this shape (change the name and title per file: `TodayScreen`/"Today", `LibraryScreen`/"Library", `AskScreen`/"Ask notes", `FlashcardsScreen`/"Flashcards", `QuizScreen`/"Quiz"):

```tsx
import { PAGE } from '../ui/page'
import { ScreenHeader } from '../ui/ScreenHeader'

export function TodayScreen(): React.JSX.Element {
  return (
    <div className={PAGE}>
      <ScreenHeader title="Today" eyebrow="Coming in Wave 2" />
    </div>
  )
}
```

`shell/QuickAsk.tsx`:

```tsx
export function QuickAsk({ open, onClose }: { open: boolean; onClose: () => void }): React.JSX.Element | null {
  if (!open) return null
  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 grid place-items-center bg-night/35" onClick={onClose}>
      <p className="rounded-card bg-surface p-6">Quick ask arrives in Task 11.</p>
    </div>
  )
}
```

- [ ] **Step 4: Shell and App**

`shell/Shell.tsx`:

```tsx
import { useCallback, useEffect, useState } from 'react'

import { AskScreen } from '../screens/AskScreen'
import { FlashcardsScreen } from '../screens/FlashcardsScreen'
import { LibraryScreen } from '../screens/LibraryScreen'
import { QuizScreen } from '../screens/QuizScreen'
import { TodayScreen } from '../screens/TodayScreen'
import { NavigationProvider, useNavigation } from './navigation'
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
      <div className="grid h-full grid-cols-[72px_minmax(0,1fr)] wide:grid-cols-[232px_minmax(0,1fr)]">
        <Sidebar />
        <main className="min-h-0 overflow-y-auto">
          <CurrentScreen />
        </main>
      </div>
      <QuickAsk open={quickAskOpen} onClose={() => setQuickAskOpen(false)} />
    </NavigationProvider>
  )
}
```

`App.tsx`:

```tsx
import { Shell } from './shell/Shell'

export default function App(): React.JSX.Element {
  return <Shell />
}
```

- [ ] **Step 5: Verify**

```bash
npm run typecheck
npm test
npm run dev
```

Manual: all five nav items switch the placeholder title; the current item is blue; at window width ≥ 1000px the sidebar shows labels, below it shows icons only with tooltips; the sidebar mascot is asleep; Cmd/Ctrl+Shift+Space and the Quick ask button open the placeholder dialog; clicking the backdrop closes it; `npm run dev:slow` shows "Sample data · slow mode".

- [ ] **Step 6: Commit**

```bash
git add src/renderer/src
git commit -m "feat: add app shell, sidebar, and navigation"
```

---

## Wave 2 rules (Tasks 7–11)

Every Wave 2 task:
- Owns only the files it lists. Imports from `ui/`, `data/` (`api`, types, `toApiError`, `useResource`), and `shell/navigation`, but never edits them.
- Implements loading (`Skeleton` shapes matching the final layout), ready, empty (`EmptyState`), and error (`ResourceView` → `ErrorState`) for every data call.
- After a delete, calls `reload()` on the affected resources.
- Ignores keyboard shortcuts when `event.target` is an `input` or `textarea`. Space and Enter are also ignored when the target is a `button`, because buttons already handle them natively; digit keys still work while a button has focus.
- Runs the manual checklist with `npm run dev`, `npm run dev:slow`, and `npm run dev:error`, in light and dark OS theme, at 1100px, 900px, and 720px window width.
- Ends with `npm run typecheck && npm test` passing and a commit of only its own files.

The UI mockup (linked in the spec) is the visual reference for each screen.

---

### Task 7: Today screen

**Files:**
- Modify: `frontend/src/renderer/src/screens/TodayScreen.tsx`

**Interfaces:**
- Consumes: `api.getToday()`, `api.listDecks()`, `api.deleteDeck(id)`, `api.listExams()`; `navigate({ screen: 'cards', deckId })`, `navigate({ screen: 'library' })`, `navigate({ screen: 'quiz' })`; `PAGE`, `ErrorState`, `ScreenHeader`, `Button`, `Pill`, `ProgressBar`, `Card`, `Kbd`, `Skeleton`, `EmptyState`, `ResourceView`, `Mascot`; `QUICK_ASK_KEYS` from `shell/Sidebar`.
- Produces: `TodayScreen`.

- [ ] **Step 1: Implement**

```tsx
import { Trash2 } from 'lucide-react'
import { useState } from 'react'

import { api, type Deck, type Exam, type TodayStats } from '../data'
import { useResource } from '../data/use-resource'
import { PAGE } from '../ui/page'
import { QUICK_ASK_KEYS } from '../shell/Sidebar'
import { useNavigation } from '../shell/navigation'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { EmptyState } from '../ui/EmptyState'
import { ErrorState } from '../ui/ErrorState'
import { ICON } from '../ui/icon'
import { Kbd } from '../ui/Kbd'
import { Pill } from '../ui/Pill'
import { ProgressBar } from '../ui/ProgressBar'
import { ResourceView } from '../ui/ResourceView'
import { ScreenHeader } from '../ui/ScreenHeader'
import { Skeleton } from '../ui/Skeleton'

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const TILE_TONE: Record<Deck['tone'], string> = {
  brand: 'bg-primary-wash border-primary text-primary-ink',
  link: 'bg-link/15 border-link text-link',
  warning: 'bg-warning-wash border-warning text-fg'
}
const STATUS_PILL: Record<Deck['status'], { tone: 'warn' | 'bad' | 'ok' | 'brand'; label: (deck: Deck) => string }> = {
  due: { tone: 'warn', label: (deck) => `${deck.dueCount} due` },
  struggling: { tone: 'bad', label: () => 'Struggling' },
  mastered: { tone: 'ok', label: () => 'Mastered' },
  new: { tone: 'brand', label: () => 'New' }
}

function greeting(now: Date): string {
  const hour = now.getHours()
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
}

function daysUntil(isoDate: string, now: Date): number {
  const target = new Date(`${isoDate}T00:00:00`)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

function GoalRing({ value }: { value: number }): React.JSX.Element {
  const circumference = 2 * Math.PI * 44
  return (
    <svg viewBox="0 0 108 108" className="size-[108px] shrink-0" role="img" aria-label={`${Math.round(value * 100)}% of daily goal`}>
      <circle cx="54" cy="54" r="44" fill="none" stroke="var(--surface)" strokeWidth="12" />
      <circle cx="54" cy="54" r="44" fill="none" stroke="var(--primary)" strokeWidth="12" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - value)} transform="rotate(-90 54 54)" />
      <text x="54" y="61" textAnchor="middle" fill="var(--fg)" className="font-display text-[20px] font-black">{Math.round(value * 100)}%</text>
    </svg>
  )
}

function DeckRow({ deck, onOpen, onDelete }: { deck: Deck; onOpen: () => void; onDelete: () => Promise<void> }): React.JSX.Element {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const pill = STATUS_PILL[deck.status]

  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3.5 rounded-card border-2 border-b-4 border-border bg-surface px-4 py-3.5">
      <button type="button" onClick={onOpen} className={`grid size-12 cursor-pointer place-items-center rounded-[14px] border-2 font-display text-lg font-black ${TILE_TONE[deck.tone]}`} aria-label={`Study ${deck.title}`}>
        {deck.subjectCode}
      </button>
      <button type="button" onClick={onOpen} className="min-w-0 cursor-pointer text-left">
        <div className="truncate text-[17px] font-extrabold">{deck.title}</div>
        <div className="truncate text-[13px] text-fg-muted">{deck.cardCount} cards · from {deck.sourceName}</div>
        <div className="mt-2"><ProgressBar size="sm" value={deck.mastery} label={`${deck.title} mastery`} /></div>
      </button>
      {confirming ? (
        <div className="flex gap-2">
          <Button variant="danger" disabled={deleting} onClick={async () => { setDeleting(true); await onDelete() }}>Delete</Button>
          <Button variant="ghost" onClick={() => setConfirming(false)}>Cancel</Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Pill tone={pill.tone}>{pill.label(deck)}</Pill>
          <button type="button" onClick={() => setConfirming(true)} aria-label={`Delete ${deck.title}`} className="cursor-pointer rounded-control p-2 text-fg-faint hover:bg-surface-2 hover:text-danger">
            <Trash2 {...ICON} size={18} />
          </button>
        </div>
      )}
    </div>
  )
}

export function TodayScreen(): React.JSX.Element {
  const { navigate } = useNavigation()
  const today = useResource<TodayStats>(() => api.getToday(), [])
  const decks = useResource<Deck[]>(() => api.listDecks(), [])
  const exams = useResource<Exam[]>(() => api.listExams(), [])
  const now = new Date()

  if (today.status === 'error') {
    return (
      <div className={PAGE}>
        <ErrorState message={today.error.message} onRetry={() => { today.reload(); decks.reload(); exams.reload() }} />
      </div>
    )
  }

  async function deleteDeck(id: string): Promise<void> {
    try {
      await api.deleteDeck(id)
    } catch {
      // The reload below surfaces the failure as the screen's error state.
    } finally {
      decks.reload()
      today.reload()
    }
  }

  return (
    <div className={PAGE}>
      <ResourceView resource={today} loading={<Skeleton className="h-20" />}>
        {(stats) => (
          <ScreenHeader
            eyebrow={now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
            title={stats.dueCount > 0 ? <>{greeting(now)}, {stats.userName}. <span className="text-primary-ink">{stats.dueCount} cards</span> are waiting.</> : <>{greeting(now)}, {stats.userName}.</>}
            actions={<Button variant="secondary" onClick={() => navigate({ screen: 'library' })}>+ Add PDF</Button>}
          />
        )}
      </ResourceView>

      <div className="grid items-start gap-6 mid:grid-cols-[minmax(0,1fr)_300px]">
        <div className="grid min-w-0 gap-6">
          <ResourceView resource={today} loading={<Skeleton className="h-40 rounded-[20px]" />}>
            {(stats) => (
              <>
                <div className="grid items-center gap-5 rounded-[20px] border-2 border-b-[6px] border-primary bg-primary-wash p-6 mid:grid-cols-[1fr_auto]">
                  <div className="grid gap-3">
                    <span className="text-[13px] font-extrabold tracking-[0.053em] text-primary-ink uppercase">Daily goal · {stats.goalMinutes} min</span>
                    <h2 className="font-display text-[26px] leading-tight font-black text-fg">
                      {stats.minutesToday >= stats.goalMinutes ? 'Goal reached. Nice work!' : `${stats.minutesToday} of ${stats.goalMinutes} minutes done. One more review gets you there.`}
                    </h2>
                    <div className="flex flex-wrap gap-3">
                      <Button disabled={stats.dueCount === 0} onClick={() => navigate({ screen: 'cards' })}>{stats.dueCount > 0 ? `Review ${stats.dueCount} cards` : 'No cards due'}</Button>
                      <Button variant="ghost" onClick={() => navigate({ screen: 'quiz' })}>Take a quiz</Button>
                    </div>
                  </div>
                  <GoalRing value={Math.min(1, stats.minutesToday / stats.goalMinutes)} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: String(stats.streakDays), label: 'Day streak', color: 'text-streak' },
                    { value: `${stats.recallPercent}%`, label: 'Recall, 7 days', color: 'text-primary-ink' },
                    { value: String(stats.cardsMade), label: 'Cards made', color: 'text-link' }
                  ].map((tile) => (
                    <div key={tile.label} className="grid min-w-0 gap-0.5 rounded-control border-2 border-border p-3.5">
                      <b className={`font-display text-[28px] leading-tight font-black tabular-nums ${tile.color}`}>{tile.value}</b>
                      <span className="text-[11px] font-extrabold tracking-[0.053em] text-fg-muted uppercase">{tile.label}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </ResourceView>

          <section className="grid gap-3" aria-labelledby="decks-heading">
            <div className="flex items-center justify-between">
              <h2 id="decks-heading" className="text-[13px] font-extrabold tracking-[0.053em] text-fg-muted uppercase">Your decks</h2>
              <Button variant="ghost" className="px-1 py-1" onClick={() => navigate({ screen: 'library' })}>See library</Button>
            </div>
            <ResourceView
              resource={decks}
              loading={<div className="grid gap-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-card" />)}</div>}
              isEmpty={(list) => list.length === 0}
              empty={<EmptyState title="No decks yet" body="Add a PDF to your library and Bardy turns it into flashcards and quizzes." action={<Button onClick={() => navigate({ screen: 'library' })}>Go to library</Button>} />}
            >
              {(list) => (
                <div className="grid gap-3">
                  {list.map((deck) => (
                    <DeckRow key={deck.id} deck={deck} onOpen={() => navigate({ screen: 'cards', deckId: deck.id })} onDelete={() => deleteDeck(deck.id)} />
                  ))}
                </div>
              )}
            </ResourceView>
          </section>
        </div>

        <div className="grid min-w-0 gap-4">
          <ResourceView resource={today} loading={<Skeleton className="h-32 rounded-card" />}>
            {(stats) => (
              <Card>
                <span className="text-[13px] font-extrabold tracking-[0.053em] text-fg-muted uppercase">This week</span>
                <ol className="grid grid-cols-7 gap-1.5 text-center">
                  {stats.weekDone.map((done, i) => (
                    <li key={i} className="grid justify-items-center gap-1.5 text-[11px] font-extrabold text-fg-muted">
                      {DAY_LETTERS[i]}
                      <span className={`grid size-[30px] place-items-center rounded-full border-2 ${done ? 'border-streak bg-streak text-white' : i === stats.todayIndex ? 'border-streak text-streak' : 'border-border text-fg-faint'}`}>
                        {done ? '✓' : i === stats.todayIndex ? '!' : ''}
                      </span>
                    </li>
                  ))}
                </ol>
                <p className="text-[13px] text-fg-muted">Finish today’s goal to keep your {stats.streakDays}-day streak.</p>
              </Card>
            )}
          </ResourceView>

          <Card>
            <span className="text-[13px] font-extrabold tracking-[0.053em] text-fg-muted uppercase">Upcoming exams</span>
            <ResourceView resource={exams} loading={<Skeleton className="h-24" />} isEmpty={(list) => list.length === 0} empty={<p className="text-[13px] text-fg-muted">No exams added yet.</p>}>
              {(list) => (
                <ul className="grid gap-3">
                  {list.map((exam) => {
                    const date = new Date(`${exam.date}T00:00:00`)
                    const days = daysUntil(exam.date, now)
                    return (
                      <li key={exam.id} className="grid grid-cols-[auto_1fr] items-center gap-3">
                        <div className="w-12 overflow-hidden rounded-[10px] border-2 border-border text-center">
                          <span className="block bg-danger py-1 text-[10px] leading-none font-extrabold tracking-wider text-white uppercase">{date.toLocaleDateString(undefined, { month: 'short' })}</span>
                          <b className="block font-display text-xl leading-[1.4] font-black">{date.getDate()}</b>
                        </div>
                        <div className="min-w-0">
                          <b className="block truncate">{exam.title}</b>
                          <span className="text-[13px] text-fg-muted">{days > 0 ? `${days} days` : days === 0 ? 'Today' : 'Done'} · {exam.linkedDecks} {exam.linkedDecks === 1 ? 'deck' : 'decks'} linked</span>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </ResourceView>
          </Card>

          <Card className="bg-surface-2">
            <span className="text-[13px] font-extrabold tracking-[0.053em] text-fg-muted uppercase">Tip</span>
            <p className="text-[13px]">Press <Kbd>{QUICK_ASK_KEYS}</Kbd> to ask Bardy about your notes without leaving what you’re doing.</p>
          </Card>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Manual checklist**

- Matches the mockup's Today screen at 1100px; at 720–859px the right column stacks below.
- Delete a deck: Trash → Delete; it disappears and the header count updates. Cancel keeps it. Delete all three: "No decks yet" with the awake mascot; the goal button reads "No cards due" and is disabled.
- `dev:slow`: skeletons in the same shapes for ~2 s. `dev:error`: red error card with the offline message; Try again retries.
- Clicking a deck tile or title opens Flashcards for that deck.

- [ ] **Step 3: Verify and commit**

```bash
npm run typecheck && npm test
git add src/renderer/src/screens/TodayScreen.tsx
git commit -m "feat: build Today screen"
```

---

### Task 8: Library and Ask notes screens

**Files:**
- Modify: `frontend/src/renderer/src/screens/LibraryScreen.tsx`, `frontend/src/renderer/src/screens/AskScreen.tsx`
- Create: `frontend/src/renderer/src/screens/ChatPanel.tsx`

**Interfaces:**
- Consumes: `api.listDocuments()`, `api.deleteDocument(id)`, `api.getDocument(id)`, `api.listChat(id)`, `api.ask(id, question)`; `useNavigation().route` (`{ screen: 'ask'; documentId?: string }`); `navigate({ screen: 'ask', documentId })`, `navigate({ screen: 'cards', deckId })`, `navigate({ screen: 'quiz', documentId })`, `navigate({ screen: 'library' })`.
- Produces: `LibraryScreen`, `AskScreen`, `ChatPanel({ documentId: string; documentTitle: string })`.

- [ ] **Step 1: Implement Library**

```tsx
import { Trash2, Upload } from 'lucide-react'
import { useState } from 'react'

import { api, type StudyDocument } from '../data'
import { useResource } from '../data/use-resource'
import { PAGE } from '../ui/page'
import { useNavigation } from '../shell/navigation'
import { Button } from '../ui/Button'
import { ICON } from '../ui/icon'
import { Pill } from '../ui/Pill'
import { ProgressBar } from '../ui/ProgressBar'
import { ResourceView } from '../ui/ResourceView'
import { ScreenHeader } from '../ui/ScreenHeader'
import { Skeleton } from '../ui/Skeleton'

function DocumentCard({ doc, onOpen, onDelete }: { doc: StudyDocument; onOpen: () => void; onDelete: () => Promise<void> }): React.JSX.Element {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const processing = doc.processing

  return (
    <article className="grid content-start gap-2.5 rounded-card border-2 border-b-4 border-border bg-surface p-4">
      <button type="button" disabled={processing !== null} onClick={onOpen} className="grid cursor-pointer gap-2.5 text-left disabled:cursor-default">
        <div aria-hidden className="grid h-24 content-start gap-1.5 rounded-[10px] border-2 border-border bg-surface-2 p-3">
          <i className="block h-2 w-3/5 rounded bg-fg-faint" />
          <i className="block h-1.5 rounded bg-border" />
          <i className="block h-1.5 w-4/5 rounded bg-border" />
          <i className="block h-1.5 rounded bg-border" />
        </div>
        <div className="font-extrabold leading-tight break-words">{doc.fileName}</div>
      </button>
      {processing ? (
        <>
          <div className="flex items-center gap-2 text-[13px] font-bold text-fg-muted">
            <span className="size-3.5 animate-spin rounded-full border-[3px] border-border border-t-primary" aria-hidden />
            Reading page {processing.currentPage} of {doc.pageCount}…
          </div>
          <ProgressBar size="sm" value={processing.currentPage / doc.pageCount} label={`Reading ${doc.fileName}`} />
        </>
      ) : confirming ? (
        <div className="grid gap-2">
          <p className="text-[13px] text-fg-muted">This also deletes its decks, quiz, and chat.</p>
          <div className="flex gap-2">
            <Button variant="danger" disabled={deleting} onClick={async () => { setDeleting(true); await onDelete() }}>Delete</Button>
            <Button variant="ghost" onClick={() => setConfirming(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Pill tone="brand">{doc.cardCount} cards</Pill>
          <span className="text-[13px] text-fg-muted">{doc.pageCount} pages</span>
          <button type="button" onClick={() => setConfirming(true)} aria-label={`Delete ${doc.fileName}`} className="ml-auto cursor-pointer rounded-control p-2 text-fg-faint hover:bg-surface-2 hover:text-danger">
            <Trash2 {...ICON} size={18} />
          </button>
        </div>
      )}
    </article>
  )
}

export function LibraryScreen(): React.JSX.Element {
  const { navigate } = useNavigation()
  const documents = useResource<StudyDocument[]>(() => api.listDocuments(), [])

  async function deleteDocument(id: string): Promise<void> {
    try {
      await api.deleteDocument(id)
    } catch {
      // The reload below surfaces the failure as the screen's error state.
    } finally {
      documents.reload()
    }
  }

  return (
    <div className={PAGE}>
      <ScreenHeader eyebrow="Library" title="Your study material" />
      <div className="grid justify-items-center gap-2.5 rounded-[20px] border-2 border-dashed border-border-strong bg-surface-2 p-7 text-center">
        <Upload {...ICON} size={44} className="text-primary" />
        <b className="text-lg">Drop a PDF here</b>
        <p className="max-w-[52ch] text-[13px] text-fg-muted">Lecture slides, readings, or your own notes. Bardy reads them on this computer and makes a summary, flashcards, and quizzes.</p>
        <Button disabled title="PDF import arrives with the study engine">Choose file</Button>
        <span className="text-[12px] text-fg-faint">Importing PDFs arrives with the study engine.</span>
      </div>
      <ResourceView
        resource={documents}
        loading={<div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-52 rounded-card" />)}</div>}
        isEmpty={(list) => list.length === 0}
        empty={<p className="text-center text-fg-muted">Your library is empty. PDFs you add show up here.</p>}
      >
        {(list) => (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
            {list.map((doc) => (
              <DocumentCard key={doc.id} doc={doc} onOpen={() => navigate({ screen: 'ask', documentId: doc.id })} onDelete={() => deleteDocument(doc.id)} />
            ))}
          </div>
        )}
      </ResourceView>
    </div>
  )
}
```

- [ ] **Step 2: Implement ChatPanel**

```tsx
import { useEffect, useRef, useState, type FormEvent } from 'react'

import { api, toApiError, type ChatMessage } from '../data'
import { useResource } from '../data/use-resource'
import { Button } from '../ui/Button'
import { ResourceView } from '../ui/ResourceView'
import { Skeleton } from '../ui/Skeleton'

const SUGGESTIONS = ['Explain it simpler', 'Make 5 cards from this', 'What will be on the exam?']

function Citations({ pages }: { pages: number[] }): React.JSX.Element | null {
  if (pages.length === 0) return null
  return (
    <span className="ml-1 inline-flex gap-1">
      {pages.map((page) => (
        <span key={page} className="rounded-md border-2 border-link/50 px-1.5 py-0.5 align-[2px] text-[11px] leading-none font-extrabold whitespace-nowrap text-link">p. {page}</span>
      ))}
    </span>
  )
}

function Bubble({ message }: { message: ChatMessage }): React.JSX.Element {
  return message.role === 'user' ? (
    <div className="max-w-[92%] justify-self-end rounded-2xl rounded-br-sm border-2 border-link/40 bg-link/15 px-3.5 py-3 text-[15px]">{message.text}</div>
  ) : (
    <div className="grid max-w-[92%] gap-2 justify-self-start rounded-2xl rounded-bl-sm border-2 border-border px-3.5 py-3 text-[15px]">
      <span className="text-[12px] font-extrabold tracking-[0.053em] text-primary-ink uppercase">Bardy</span>
      <p>{message.text}<Citations pages={message.citedPages} /></p>
    </div>
  )
}

export function ChatPanel({ documentId, documentTitle }: { documentId: string; documentTitle: string }): React.JSX.Element {
  const history = useResource<ChatMessage[]>(() => api.listChat(documentId), [documentId])
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight })
  }, [history.status, pending])

  async function send(question: string): Promise<void> {
    if (pending !== null || !question.trim()) return
    setPending(question.trim())
    setError(null)
    try {
      await api.ask(documentId, question)
      setDraft('')
      history.reload()
    } catch (e) {
      setError(toApiError(e).message)
    } finally {
      setPending(null)
    }
  }

  function onSubmit(event: FormEvent): void {
    event.preventDefault()
    void send(draft)
  }

  return (
    <aside aria-label="Ask about this PDF" className="grid min-h-[420px] grid-rows-[auto_1fr_auto] border-t-2 border-border mid:min-h-0 mid:border-t-0 mid:border-l-2">
      <div className="grid gap-1 border-b-2 border-border px-5 py-4">
        <b>Ask about this PDF</b>
        <span className="text-[13px] text-fg-muted">Answers come only from your notes, with page numbers.</span>
      </div>
      <div ref={logRef} className="grid content-start gap-3.5 overflow-y-auto p-5" aria-live="polite">
        <ResourceView resource={history} loading={<Skeleton className="h-24" />}>
          {(messages) => (
            <>
              {messages.map((m) => <Bubble key={m.id} message={m} />)}
              {pending !== null && (
                <>
                  <Bubble message={{ id: 'pending-q', role: 'user', text: pending, citedPages: [] }} />
                  <div className="justify-self-start rounded-2xl border-2 border-border px-3.5 py-3 text-[15px] text-fg-muted">Thinking…</div>
                </>
              )}
              {error && <p role="alert" className="rounded-control bg-danger-wash px-3.5 py-2.5 text-[14px] text-fg">{error}</p>}
              {messages.length === 0 && pending === null && <p className="text-[14px] text-fg-muted">Ask anything about {documentTitle}. Try one of these:</p>}
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} type="button" disabled={pending !== null} onClick={() => void send(s)} className="cursor-pointer rounded-[10px] border-2 border-b-[3px] border-border bg-surface px-2.5 py-1.5 text-[13px] font-bold disabled:cursor-not-allowed disabled:text-fg-faint">{s}</button>
                ))}
              </div>
            </>
          )}
        </ResourceView>
      </div>
      <form onSubmit={onSubmit} className="grid gap-2.5 border-t-2 border-border px-4 py-3.5">
        <div className="flex gap-2">
          <label htmlFor="chat-input" className="sr-only">Question</label>
          <input id="chat-input" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={`Ask a question about ${documentTitle}`} autoComplete="off" className="w-full min-w-0 rounded-control border-2 border-border bg-surface-2 px-3.5 py-3 text-base placeholder:text-fg-faint focus:border-link focus:bg-surface focus:outline-none" />
          <Button type="submit" disabled={pending !== null || !draft.trim()}>Ask</Button>
        </div>
        <span className="text-[12px] text-fg-muted">Sample answers until the study engine is connected.</span>
      </form>
    </aside>
  )
}
```

- [ ] **Step 3: Implement Ask notes**

```tsx
import { useState } from 'react'

import { api, type StudyDocument } from '../data'
import { useResource } from '../data/use-resource'
import { useNavigation } from '../shell/navigation'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'
import { Pill } from '../ui/Pill'
import { ResourceView } from '../ui/ResourceView'
import { ScreenHeader } from '../ui/ScreenHeader'
import { Skeleton } from '../ui/Skeleton'
import { Tabs } from '../ui/Tabs'
import { ChatPanel } from './ChatPanel'

type View = 'summary' | 'original'

function Highlighted({ text, highlight }: { text: string; highlight: string }): React.JSX.Element {
  const at = text.indexOf(highlight)
  if (at < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, at)}
      <mark className="rounded-sm border-b-2 border-warning bg-warning-wash px-0.5 text-inherit">{highlight}</mark>
      {text.slice(at + highlight.length)}
    </>
  )
}

function DocumentView({ doc }: { doc: StudyDocument }): React.JSX.Element {
  const { navigate } = useNavigation()
  const [view, setView] = useState<View>('summary')
  const summary = doc.summary
  const deckId = doc.cardCount > 0 ? `deck-${doc.id.replace('doc-', '')}` : undefined

  return (
    <div className="grid min-h-full mid:h-full mid:grid-cols-[minmax(0,1fr)_380px]">
      <div className="grid content-start gap-5 overflow-y-auto px-8 pt-7 pb-12">
        <ScreenHeader
          eyebrow={`${doc.fileName} · ${doc.pageCount} pages`}
          title={doc.title}
          actions={summary && (
            <>
              <Button variant="secondary" onClick={() => navigate({ screen: 'quiz', documentId: doc.id })}>Quiz me</Button>
              <Button disabled={!deckId} onClick={() => navigate({ screen: 'cards', deckId })}>Study {doc.cardCount} cards</Button>
            </>
          )}
        />
        {!summary ? (
          <EmptyState awake={false} title="Still reading this PDF" body={`Bardy is on page ${doc.processing?.currentPage ?? 1} of ${doc.pageCount}. The summary and chat open when it’s done.`} action={<Button variant="secondary" onClick={() => navigate({ screen: 'library' })}>Back to library</Button>} />
        ) : (
          <>
            <Tabs<View> label="Document view" value={view} onChange={setView} items={[{ id: 'summary', label: 'Summary' }, { id: 'original', label: 'Original' }]} />
            {view === 'summary' ? (
              <div className="grid max-w-[72ch] gap-3">
                <p className="text-[13px] text-fg-muted">Generated on this computer from {doc.pageCount} pages · {summary.readMinutes} min read</p>
                <h2 className="font-display text-[22px] font-black">Key ideas</h2>
                <ul className="grid list-disc gap-2 pl-5">
                  {summary.keyIdeas.map((idea) => (
                    <li key={idea.text}>{idea.text} <span className="rounded-md border-2 border-link/50 px-1.5 py-0.5 align-[2px] text-[11px] font-extrabold whitespace-nowrap text-link">p. {idea.page}</span></li>
                  ))}
                </ul>
                <h2 className="font-display text-[22px] font-black">Likely exam terms</h2>
                <div className="flex flex-wrap gap-2">{summary.examTerms.map((term) => <Pill key={term}>{term}</Pill>)}</div>
              </div>
            ) : (
              <article className="grid max-w-[72ch] gap-3.5 rounded-card border-2 border-border p-7 leading-relaxed">
                <span className="text-[13px] font-extrabold tracking-[0.053em] text-fg-muted uppercase">Page {summary.excerpt.page}</span>
                <h2 className="font-display text-[22px] font-black">{summary.excerpt.heading}</h2>
                {summary.excerpt.paragraphs.map((p) => <p key={p}><Highlighted text={p} highlight={summary.excerpt.highlight} /></p>)}
              </article>
            )}
          </>
        )}
      </div>
      {summary && <ChatPanel documentId={doc.id} documentTitle={doc.title} />}
    </div>
  )
}

export function AskScreen(): React.JSX.Element {
  const { route, navigate } = useNavigation()
  const requestedId = route.screen === 'ask' ? route.documentId : undefined
  const documents = useResource<StudyDocument[]>(() => api.listDocuments(), [])

  return (
    <ResourceView
      resource={documents}
      loading={<div className="grid gap-4 px-8 pt-7"><Skeleton className="h-16" /><Skeleton className="h-64 rounded-card" /></div>}
      isEmpty={(list) => list.length === 0}
      empty={<div className="px-8"><EmptyState title="Nothing to ask about yet" body="Add a PDF to your library, then ask Bardy anything about it." action={<Button onClick={() => navigate({ screen: 'library' })}>Go to library</Button>} /></div>}
    >
      {(list) => {
        const doc = list.find((d) => d.id === requestedId) ?? list.find((d) => d.summary !== null) ?? list[0]
        return <DocumentView key={doc.id} doc={doc} />
      }}
    </ResourceView>
  )
}
```

Note: deck ids follow `deck-<suffix>` for `doc-<suffix>` in the sample data. When the backend arrives, replace this with a real document → deck link.

- [ ] **Step 4: Manual checklist**

- Library matches the mockup; the processing PDF shows the spinner and progress and cannot be opened.
- Delete a document (with the cascade warning); go to Today and Flashcards; its deck and cards are gone with no crash.
- Delete all documents: Library shows the empty line; Ask notes shows "Nothing to ask about yet".
- Opening a document goes to Ask notes for that document; Summary/Original tabs switch; the highlight shows on the Original page.
- Chat: Ask is disabled while empty or pending; a reply appears; suggestion chips send; `dev:error` shows the red message inline and the typed question stays in the box.
- At 720–859px the chat sits below the summary; at ≥ 860px it is a 380px right panel and both sides scroll independently.

- [ ] **Step 5: Verify and commit**

```bash
npm run typecheck && npm test
git add src/renderer/src/screens/LibraryScreen.tsx src/renderer/src/screens/AskScreen.tsx src/renderer/src/screens/ChatPanel.tsx
git commit -m "feat: build Library and Ask notes screens"
```

---

### Task 9: Flashcards screen

**Files:**
- Create: `frontend/src/renderer/src/study/flashcard-session.ts`
- Modify: `frontend/src/renderer/src/screens/FlashcardsScreen.tsx`
- Test: `frontend/tests/flashcard-session.test.ts`

**Interfaces:**
- Consumes: `api.getDueCards(deckId?)`; route `{ screen: 'cards'; deckId?: string }`.
- Produces: `type Rating = 'again' | 'hard' | 'good' | 'easy'`, `RATINGS: Rating[]`, `RATING_HINTS: Record<Rating, string>`, `interface FlashcardSession { queue: string[]; total: number; reviewed: number; flipped: boolean }`, `startSession(cardIds: string[]): FlashcardSession`, `flip(s): FlashcardSession`, `rate(s, rating): FlashcardSession`, `currentCardId(s): string | null`, `isComplete(s): boolean`, `progress(s): number`.

- [ ] **Step 1: Write the failing tests**

`frontend/tests/flashcard-session.test.ts`:

```ts
import assert from 'node:assert/strict'
import test from 'node:test'

// @ts-expect-error Node runs this TypeScript test directly and requires its extension.
import { currentCardId, flip, isComplete, progress, rate, startSession } from '../src/renderer/src/study/flashcard-session.ts'

test('a new session shows the first card face down', () => {
  const s = startSession(['a', 'b', 'c'])
  assert.equal(currentCardId(s), 'a')
  assert.equal(s.flipped, false)
  assert.equal(s.total, 3)
  assert.equal(progress(s), 0)
})

test('rating is ignored until the card is flipped', () => {
  const s = startSession(['a', 'b'])
  assert.deepEqual(rate(s, 'good'), s)
})

test('good, hard, and easy finish the card and face the next one down', () => {
  for (const rating of ['hard', 'good', 'easy'] as const) {
    const s = rate(flip(startSession(['a', 'b'])), rating)
    assert.equal(currentCardId(s), 'b')
    assert.equal(s.reviewed, 1)
    assert.equal(s.flipped, false)
  }
})

test('again sends the card to the back of the queue without counting it', () => {
  const s = rate(flip(startSession(['a', 'b'])), 'again')
  assert.deepEqual(s.queue, ['b', 'a'])
  assert.equal(s.reviewed, 0)
})

test('flip toggles', () => {
  const s = flip(flip(startSession(['a'])))
  assert.equal(s.flipped, false)
})

test('the session completes when every card is done', () => {
  let s = startSession(['a', 'b'])
  s = rate(flip(s), 'good')
  s = rate(flip(s), 'again')
  s = rate(flip(s), 'easy')
  assert.equal(isComplete(s), true)
  assert.equal(currentCardId(s), null)
  assert.equal(progress(s), 1)
})

test('an empty deck is complete immediately and flip does nothing', () => {
  const s = startSession([])
  assert.equal(isComplete(s), true)
  assert.deepEqual(flip(s), s)
  assert.equal(progress(s), 1)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL, cannot find module `flashcard-session.ts`.

- [ ] **Step 3: Implement the session**

`frontend/src/renderer/src/study/flashcard-session.ts`:

```ts
export type Rating = 'again' | 'hard' | 'good' | 'easy'

export const RATINGS: Rating[] = ['again', 'hard', 'good', 'easy']

/** Display only until the study engine schedules reviews. */
export const RATING_HINTS: Record<Rating, string> = { again: '< 1 min', hard: '6 min', good: '1 day', easy: '4 days' }

export interface FlashcardSession {
  queue: string[]
  total: number
  reviewed: number
  flipped: boolean
}

export function startSession(cardIds: string[]): FlashcardSession {
  return { queue: [...cardIds], total: cardIds.length, reviewed: 0, flipped: false }
}

export function currentCardId(session: FlashcardSession): string | null {
  return session.queue[0] ?? null
}

export function isComplete(session: FlashcardSession): boolean {
  return session.queue.length === 0
}

export function progress(session: FlashcardSession): number {
  return session.total === 0 ? 1 : session.reviewed / session.total
}

export function flip(session: FlashcardSession): FlashcardSession {
  if (isComplete(session)) return session
  return { ...session, flipped: !session.flipped }
}

export function rate(session: FlashcardSession, rating: Rating): FlashcardSession {
  if (!session.flipped || isComplete(session)) return session
  const [current, ...rest] = session.queue
  if (rating === 'again') return { ...session, queue: [...rest, current], flipped: false }
  return { ...session, queue: rest, reviewed: session.reviewed + 1, flipped: false }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Implement the screen**

```tsx
import { X } from 'lucide-react'
import { useEffect, useState } from 'react'

import { api, type Flashcard } from '../data'
import { useResource } from '../data/use-resource'
import { useNavigation } from '../shell/navigation'
import { RATINGS, RATING_HINTS, currentCardId, flip, isComplete, progress, rate, startSession, type FlashcardSession, type Rating } from '../study/flashcard-session'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'
import { ICON } from '../ui/icon'
import { Kbd } from '../ui/Kbd'
import { ProgressBar } from '../ui/ProgressBar'
import { ResourceView } from '../ui/ResourceView'
import { Skeleton } from '../ui/Skeleton'

const RATING_STYLE: Record<Rating, { variant: 'secondary' | 'primary'; className: string; label: string }> = {
  again: { variant: 'secondary', className: 'text-danger', label: 'Again' },
  hard: { variant: 'secondary', className: 'text-fg-muted', label: 'Hard' },
  good: { variant: 'secondary', className: '', label: 'Good' },
  easy: { variant: 'primary', className: '', label: 'Easy' }
}

function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && target.matches('input, textarea')
}

function isButton(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && target.matches('button')
}

function Session({ cards }: { cards: Flashcard[] }): React.JSX.Element {
  const { navigate } = useNavigation()
  const [session, setSession] = useState<FlashcardSession>(() => startSession(cards.map((c) => c.id)))
  const card = cards.find((c) => c.id === currentCardId(session))

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (isTyping(event.target) || event.metaKey || event.ctrlKey) return
      if (event.code === 'Space') {
        if (isButton(event.target)) return
        event.preventDefault()
        setSession(flip)
      } else if (/^[1-4]$/.test(event.key)) {
        setSession((s) => rate(s, RATINGS[Number(event.key) - 1]))
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div className="grid h-full grid-rows-[auto_1fr_auto]">
      <div className="flex items-center gap-4 px-8 py-5">
        <button type="button" onClick={() => navigate({ screen: 'today' })} aria-label="End session" className="cursor-pointer p-1 text-fg-faint hover:text-fg-muted"><X {...ICON} size={26} /></button>
        <div className="flex-1"><ProgressBar size="lg" value={progress(session)} label="Session progress" /></div>
        <b className="text-streak tabular-nums">{session.reviewed} / {session.total}</b>
      </div>

      <div className="grid place-items-center overflow-y-auto px-8 pt-3 pb-8">
        {!card ? (
          <EmptyState title="Session complete" body={`You reviewed ${session.total} ${session.total === 1 ? 'card' : 'cards'}. Come back tomorrow for the next batch.`} action={<Button onClick={() => navigate({ screen: 'today' })}>Back to Today</Button>} />
        ) : (
          <div className="grid w-full max-w-[640px] gap-5">
            <button type="button" onClick={() => setSession(flip)} aria-label={session.flipped ? 'Show term' : 'Show definition'} className="grid min-h-[280px] w-full cursor-pointer content-center justify-items-center gap-3.5 rounded-3xl border-2 border-b-[6px] border-border bg-surface px-7 py-10 text-center">
              <span className="font-display text-[34px] leading-tight font-black">{card.term}</span>
              {session.flipped && <span className="max-w-[40ch] text-lg text-fg-muted">{card.definition}</span>}
              <span className="text-[12px] font-extrabold tracking-[0.053em] text-link uppercase">{session.flipped ? 'Rate how well you knew it' : 'Click or press Space to flip'}</span>
            </button>
            {session.flipped && (
              <div className="grid grid-cols-2 gap-2.5 mid:grid-cols-4">
                {RATINGS.map((rating, i) => (
                  <Button key={rating} variant={RATING_STYLE[rating].variant} className={`flex-col gap-1.5 ${RATING_STYLE[rating].className}`} onClick={() => setSession((s) => rate(s, rating))}>
                    {RATING_STYLE[rating].label}
                    <small className="text-[11px] font-bold tracking-normal normal-case opacity-80">{i + 1} · {RATING_HINTS[rating]}</small>
                  </Button>
                ))}
              </div>
            )}
            <p className="text-center text-[13px] text-fg-muted">From page {card.sourcePage}</p>
          </div>
        )}
      </div>

      {!isComplete(session) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-border px-8 py-4">
          <span className="text-[13px] text-fg-muted">Keyboard: <Kbd>Space</Kbd> flip · <Kbd>1</Kbd>–<Kbd>4</Kbd> rate</span>
        </div>
      )}
    </div>
  )
}

export function FlashcardsScreen(): React.JSX.Element {
  const { route, navigate } = useNavigation()
  const deckId = route.screen === 'cards' ? route.deckId : undefined
  const cards = useResource<Flashcard[]>(() => api.getDueCards(deckId), [deckId])

  return (
    <ResourceView
      resource={cards}
      loading={<div className="mx-auto grid w-full max-w-[640px] gap-5 px-8 pt-20"><Skeleton className="h-4" /><Skeleton className="h-72 rounded-3xl" /></div>}
      isEmpty={(list) => list.length === 0}
      empty={<div className="px-8"><EmptyState title="No cards due" body="You’re all caught up. Add a PDF to make more cards." action={<Button onClick={() => navigate({ screen: 'today' })}>Back to Today</Button>} /></div>}
    >
      {(list) => <Session cards={list} />}
    </ResourceView>
  )
}
```

- [ ] **Step 6: Manual checklist**

- Space flips; 1–4 rate only after flipping; Again puts the card back at the end and the counter does not move.
- Keyboard does nothing while focus is in another input (open Quick ask and type a space).
- After the last card: "Session complete" with the count and a Back to Today button.
- Opening from a deck on Today shows only that deck's cards; the sidebar Flashcards item shows all cards.
- Empty (delete all decks first): "No cards due". `dev:slow` skeleton; `dev:error` error card.

- [ ] **Step 7: Verify and commit**

```bash
npm run typecheck && npm test
git add src/renderer/src/study/flashcard-session.ts src/renderer/src/screens/FlashcardsScreen.tsx tests/flashcard-session.test.ts
git commit -m "feat: build Flashcards screen"
```

---

### Task 10: Quiz screen

**Files:**
- Create: `frontend/src/renderer/src/study/quiz-session.ts`
- Modify: `frontend/src/renderer/src/screens/QuizScreen.tsx`
- Test: `frontend/tests/quiz-session.test.ts`

**Interfaces:**
- Consumes: `api.getQuiz(documentId?)`; route `{ screen: 'quiz'; documentId?: string }`.
- Produces: `interface QuizSession { index: number; selected: number | null; checked: boolean; correct: number; total: number }`, `startQuiz(total: number): QuizSession`, `select(s, option: number): QuizSession`, `check(s, correctIndex: number): QuizSession`, `next(s): QuizSession`, `isFinished(s): boolean`.

- [ ] **Step 1: Write the failing tests**

`frontend/tests/quiz-session.test.ts`:

```ts
import assert from 'node:assert/strict'
import test from 'node:test'

// @ts-expect-error Node runs this TypeScript test directly and requires its extension.
import { check, isFinished, next, select, startQuiz } from '../src/renderer/src/study/quiz-session.ts'

test('a new quiz starts on question one with nothing selected', () => {
  assert.deepEqual(startQuiz(3), { index: 0, selected: null, checked: false, correct: 0, total: 3 })
})

test('check does nothing until an option is selected', () => {
  const s = startQuiz(3)
  assert.deepEqual(check(s, 1), s)
})

test('a correct answer counts once, even if check is pressed twice', () => {
  const s = check(check(select(startQuiz(3), 2), 2), 2)
  assert.equal(s.checked, true)
  assert.equal(s.correct, 1)
})

test('a wrong answer does not count', () => {
  assert.equal(check(select(startQuiz(3), 0), 2).correct, 0)
})

test('the selection is locked after checking', () => {
  const s = check(select(startQuiz(3), 0), 2)
  assert.equal(select(s, 2).selected, 0)
})

test('next only moves on after checking and resets the selection', () => {
  const unchecked = select(startQuiz(3), 1)
  assert.deepEqual(next(unchecked), unchecked)
  const moved = next(check(unchecked, 1))
  assert.equal(moved.index, 1)
  assert.equal(moved.selected, null)
  assert.equal(moved.checked, false)
})

test('the quiz finishes after the last question', () => {
  let s = startQuiz(2)
  for (let i = 0; i < 2; i++) s = next(check(select(s, 0), 0))
  assert.equal(isFinished(s), true)
  assert.equal(s.correct, 2)
})

test('an empty quiz is finished immediately', () => {
  assert.equal(isFinished(startQuiz(0)), true)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL, cannot find module `quiz-session.ts`.

- [ ] **Step 3: Implement the session**

`frontend/src/renderer/src/study/quiz-session.ts`:

```ts
export interface QuizSession {
  index: number
  selected: number | null
  checked: boolean
  correct: number
  total: number
}

export function startQuiz(total: number): QuizSession {
  return { index: 0, selected: null, checked: false, correct: 0, total }
}

export function isFinished(session: QuizSession): boolean {
  return session.index >= session.total
}

export function select(session: QuizSession, option: number): QuizSession {
  if (session.checked || isFinished(session)) return session
  return { ...session, selected: option }
}

export function check(session: QuizSession, correctIndex: number): QuizSession {
  if (session.checked || session.selected === null) return session
  return { ...session, checked: true, correct: session.correct + (session.selected === correctIndex ? 1 : 0) }
}

export function next(session: QuizSession): QuizSession {
  if (!session.checked) return session
  return { ...session, index: session.index + 1, selected: null, checked: false }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Implement the screen**

```tsx
import { X } from 'lucide-react'
import { useEffect, useState } from 'react'

import { api, type QuizQuestion } from '../data'
import { useResource } from '../data/use-resource'
import { useNavigation } from '../shell/navigation'
import { check, isFinished, next, select, startQuiz, type QuizSession } from '../study/quiz-session'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'
import { ICON } from '../ui/icon'
import { ProgressBar } from '../ui/ProgressBar'
import { ResourceView } from '../ui/ResourceView'
import { Skeleton } from '../ui/Skeleton'

function optionClass(session: QuizSession, i: number, correctIndex: number): string {
  if (session.checked && i === correctIndex) return 'border-success bg-success-wash'
  if (session.checked && i === session.selected) return 'border-danger bg-danger-wash'
  if (i === session.selected) return 'border-link bg-link/10'
  return 'border-border bg-surface'
}

function Quiz({ questions }: { questions: QuizQuestion[] }): React.JSX.Element {
  const { navigate } = useNavigation()
  const [session, setSession] = useState(() => startQuiz(questions.length))
  const question = questions[session.index]
  const right = session.checked && question && session.selected === question.correctIndex

  function advance(): void {
    setSession((s) => (s.checked ? next(s) : check(s, questions[s.index].correctIndex)))
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      const target = event.target instanceof HTMLElement ? event.target : null
      if (target?.matches('input, textarea') || event.metaKey || event.ctrlKey) return
      if (/^[1-4]$/.test(event.key)) setSession((s) => select(s, Number(event.key) - 1))
      if (event.key === 'Enter' && !target?.matches('button')) setSession((s) => (isFinished(s) ? s : s.checked ? next(s) : check(s, questions[s.index].correctIndex)))
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [questions])

  if (!question) {
    return (
      <div className="px-8">
        <EmptyState title={`You got ${session.correct} of ${session.total}`} body={session.correct === session.total ? 'Perfect score. Nice work!' : 'Review the ones you missed with flashcards, then try again.'} action={
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setSession(startQuiz(questions.length))}>Try again</Button>
            <Button onClick={() => navigate({ screen: 'today' })}>Back to Today</Button>
          </div>
        } />
      </div>
    )
  }

  return (
    <div className="grid h-full grid-rows-[auto_1fr_auto]">
      <div className="flex items-center gap-4 px-8 py-5">
        <button type="button" onClick={() => navigate({ screen: 'today' })} aria-label="End quiz" className="cursor-pointer p-1 text-fg-faint hover:text-fg-muted"><X {...ICON} size={26} /></button>
        <div className="flex-1"><ProgressBar size="lg" value={session.index / session.total} label="Quiz progress" /></div>
        <b className="tabular-nums">{session.index + 1} / {session.total}</b>
      </div>

      <div className="grid place-items-center overflow-y-auto px-8 pt-3 pb-8">
        <div className="grid w-full max-w-[640px] gap-5">
          <span className="text-[13px] font-extrabold tracking-[0.053em] text-fg-muted uppercase">Multiple choice</span>
          <h2 className="font-display text-[26px] leading-tight font-black">{question.prompt}</h2>
          <div className="grid gap-2.5" role="group" aria-label="Answers">
            {question.options.map((option, i) => (
              <button key={option} type="button" aria-pressed={session.selected === i} disabled={session.checked} onClick={() => setSession((s) => select(s, i))} className={`flex w-full cursor-pointer items-center gap-3 rounded-control border-2 border-b-4 px-4 py-3.5 text-left text-[17px] font-semibold disabled:cursor-default ${optionClass(session, i, question.correctIndex)}`}>
                <span className="grid size-[30px] shrink-0 place-items-center rounded-lg border-2 border-current/30 text-[13px] font-extrabold text-fg-muted">{i + 1}</span>
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={`flex flex-wrap items-center justify-between gap-3 border-t-2 px-8 py-4 ${!session.checked ? 'border-border' : right ? 'border-transparent bg-success-wash' : 'border-transparent bg-danger-wash'}`} aria-live="polite">
        <div className="min-w-0 flex-1">
          {!session.checked ? (
            <span className="text-[13px] text-fg-muted">Pick an answer, then check it.</span>
          ) : (
            <>
              <div className={`font-display text-[22px] font-black ${right ? 'text-success' : 'text-danger'}`}>{right ? 'Nice work!' : 'Not quite'}</div>
              <span className="text-[13px]">{right ? question.explanation : <>Correct: <b>{question.options[question.correctIndex]}</b>.</>} Page {question.sourcePage}.</span>
            </>
          )}
        </div>
        <Button variant={session.checked && !right ? 'danger' : 'primary'} disabled={session.selected === null} onClick={advance}>
          {session.checked ? 'Continue' : 'Check'}
        </Button>
      </div>
    </div>
  )
}

export function QuizScreen(): React.JSX.Element {
  const { route, navigate } = useNavigation()
  const documentId = route.screen === 'quiz' ? route.documentId : undefined
  const questions = useResource<QuizQuestion[]>(() => api.getQuiz(documentId), [documentId])

  return (
    <ResourceView
      resource={questions}
      loading={<div className="mx-auto grid w-full max-w-[640px] gap-4 px-8 pt-20"><Skeleton className="h-10" />{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}</div>}
      isEmpty={(list) => list.length === 0}
      empty={<div className="px-8"><EmptyState title="No quiz yet" body="Quizzes are made from your PDFs. Add one to your library to get started." action={<Button onClick={() => navigate({ screen: 'library' })}>Go to library</Button>} /></div>}
    >
      {(list) => <Quiz questions={list} />}
    </ResourceView>
  )
}
```

- [ ] **Step 6: Manual checklist**

- 1–4 selects, Enter checks then continues; Check is disabled until an answer is selected; answers lock after checking.
- Correct: green bar "Nice work!" with the explanation; wrong: red bar "Not quite" with the correct answer and a red Continue.
- Final screen shows the score; Try again restarts; Back to Today works.
- "Quiz me" from Ask notes shows only that document's questions.
- Empty (delete all documents): "No quiz yet". `dev:slow` skeleton; `dev:error` error card.

- [ ] **Step 7: Verify and commit**

```bash
npm run typecheck && npm test
git add src/renderer/src/study/quiz-session.ts src/renderer/src/screens/QuizScreen.tsx tests/quiz-session.test.ts
git commit -m "feat: build Quiz screen"
```

---

### Task 11: Quick ask dialog

**Files:**
- Modify: `frontend/src/renderer/src/shell/QuickAsk.tsx`

**Interfaces:**
- Consumes: `api.ask(null, question)`; `QUICK_ASK_KEYS` is not needed here.
- Produces: `QuickAsk({ open: boolean; onClose: () => void })`, same props as the Task 6 placeholder.

- [ ] **Step 1: Implement with a native `<dialog>`**

```tsx
import { useEffect, useRef, useState, type FormEvent } from 'react'

import { api, toApiError, type ChatMessage } from '../data'
import { Button } from '../ui/Button'
import { Kbd } from '../ui/Kbd'

export function QuickAsk({ open, onClose }: { open: boolean; onClose: () => void }): React.JSX.Element {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<ChatMessage | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  async function onSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (pending || !question.trim()) return
    setPending(true)
    setError(null)
    try {
      setAnswer(await api.ask(null, question))
    } catch (e) {
      setError(toApiError(e).message)
    } finally {
      setPending(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(event) => event.target === dialogRef.current && onClose()}
      aria-labelledby="quick-ask-title"
      className="mx-auto mt-[12vh] w-[min(560px,calc(100%-32px))] rounded-[20px] border-2 border-b-[6px] border-border bg-surface p-4 text-fg backdrop:bg-night/35"
    >
      <form onSubmit={onSubmit} className="grid gap-3">
        <div className="flex items-center justify-between gap-2">
          <b id="quick-ask-title">Quick ask</b>
          <Kbd>Esc</Kbd>
        </div>
        <label htmlFor="quick-ask-input" className="sr-only">Question</label>
        <input id="quick-ask-input" autoFocus value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask anything from your notes…" autoComplete="off" className="w-full rounded-control border-2 border-border bg-surface-2 px-3.5 py-3 text-base placeholder:text-fg-faint focus:border-link focus:bg-surface focus:outline-none" />
        {pending && <p className="text-[14px] text-fg-muted" aria-live="polite">Thinking…</p>}
        {error && <p role="alert" className="rounded-control bg-danger-wash px-3.5 py-2.5 text-[14px]">{error}</p>}
        {answer && !pending && (
          <div className="grid gap-2 rounded-2xl border-2 border-border px-3.5 py-3 text-[15px]" aria-live="polite">
            <span className="text-[12px] font-extrabold tracking-[0.053em] text-primary-ink uppercase">Bardy</span>
            <p>{answer.text} {answer.citedPages.map((p) => <span key={p} className="rounded-md border-2 border-link/50 px-1.5 py-0.5 text-[11px] font-extrabold text-link">p. {p}</span>)}</p>
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Close</Button>
          <Button type="submit" disabled={pending || !question.trim()}>Ask</Button>
        </div>
      </form>
    </dialog>
  )
}
```

- [ ] **Step 2: Manual checklist**

- Opens from the sidebar button and from Cmd/Ctrl+Shift+Space on every screen; focus lands in the input.
- Esc, Close, and a backdrop click close it; reopening with the shortcut works after each.
- Space and 1–4 typed in the input do not flip flashcards or select quiz answers behind it.
- Ask is disabled while empty or pending; `dev:error` shows the red message and keeps the question.

- [ ] **Step 3: Verify and commit**

```bash
npm run typecheck && npm test
git add src/renderer/src/shell/QuickAsk.tsx
git commit -m "feat: build Quick ask dialog"
```

---

### Task 12: Integrate, verify, and review

**Files:**
- Modify: only files implicated by failures or review findings; `frontend/README.md` (dev modes section).

**Interfaces:**
- Consumes: everything above.
- Produces: a verified `feature/desktop-ui` branch and a handoff note.

- [ ] **Step 1: Apply shared-file requests from Wave 2**

Read each Wave 2 agent's report. Apply any requested change to `ui/`, `shell/`, `data/`, `theme.css`, or `index.css`, re-run `npm run typecheck && npm test`, and commit as `fix: <what>`.

- [ ] **Step 2: Document dev modes in `frontend/README.md`**

Add a section after "Run Bardy on Windows":

```markdown
## Preview loading and error states

The app runs on sample data until the study engine is connected.

| Command | What you see |
|---|---|
| `npm run dev` | Normal sample data |
| `npm run dev:slow` | Every request takes about 2 seconds, so loading skeletons show |
| `npm run dev:error` | Every request fails, so error states show |

Delete decks or documents in the app to see empty states. Restarting restores the sample data.
```

- [ ] **Step 3: Full verification**

```bash
npm ci
npm test
npm run typecheck
npm run build
grep -c "Content-Security-Policy" out/renderer/index.html
git status --short
```

Expected: tests pass (window-options 1, window-state 10, data-api 13, flashcard 7, quiz 8); typecheck and build exit 0; grep prints `1`; no uncommitted changes.

- [ ] **Step 4: Cross-screen manual pass (Review Focus)**

- Delete document `BIO 101` in Library, then visit Today, Ask notes, Flashcards, Quiz: no crash, correct empty or reduced content.
- Delete everything: every screen shows its empty state.
- With the network off (Wi-Fi off), `npm run build` output still shows fonts and icons (run `npm run dev`; nothing should depend on the network).
- Resize from maximized down to 720 × 520: no horizontal scrollbar on any screen, sidebar switches to icons below 1000px, Today and Ask notes stack below 860px, maximized content stays centered at 1180px.
- Quit and relaunch: same window size and place.
- Light and dark OS theme on every screen.

- [ ] **Step 5: Fresh code review**

Dispatch a reviewer with the spec, this plan, and `git diff feature/desktop...HEAD`. Findings graded Critical / Important / Minor, focused on correctness, the offline and security constraints, design-token usage, and empty/error/loading coverage. Fix Critical and Important findings (logic fixes get a failing test first). Record Minor findings in the handoff.

- [ ] **Step 6: Commit and hand off**

```bash
git add README.md
git commit -m "docs: document sample data modes"
```

Report: what was built, test and build output, remaining Minor findings, and that Windows manual testing and CI on GitHub remain unverified until the branch is pushed with the owner's approval. Do not push, merge, or open a pull request without the owner's explicit approval.

---

## Next tasks (after this plan)

1. **Merge path:** open a PR from `feature/desktop` → `main` first (Phase 0), then `feature/desktop-ui` → `main`, so teammates create `backend/` on top of the new layout.
2. **Backend integration:** when the FastAPI team publishes their endpoints, replace `data/index.ts`'s `createApi(...)` with a client that calls the main process through new narrow preload methods (`window.bardy.study.*`), and the main process calls FastAPI on `localhost`. Screens stay unchanged; map field names in the data folder.
3. **Real PDF import:** a main-process file picker and drag-and-drop exposed through one preload method, replacing the disabled "Choose file" button.
4. **Phase 1 desktop:** tray icon, system-wide Cmd/Ctrl+Shift+Space shortcut, and the floating always-on-top pet window that opens the main window, using the mascot team's final art in place of `ui/Mascot.tsx`.
5. **Study progress persistence:** save card ratings, streaks, and goals (likely in the backend), replacing the display-only `RATING_HINTS`.
6. **Packaging:** unsigned `.dmg` and `.exe` builds for the demo, if time allows.
