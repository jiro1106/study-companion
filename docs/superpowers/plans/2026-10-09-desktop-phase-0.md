# BARDHIE Desktop Phase 0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the smallest secure Electron desktop shell that develops and compiles from one codebase on macOS and Windows.

**Architecture:** Electron's main process owns the native window and lifecycle, a sandboxed preload exposes one typed read-only platform value, and a React renderer displays the Phase 0 placeholder. `electron-vite` coordinates development and production compilation; Tailwind is wired in without introducing a design system.

**Tech Stack:** Node.js 24 LTS, npm, Electron, electron-vite, React, TypeScript, Tailwind CSS, GitHub Actions

**Spec:** `docs/superpowers/specs/2026-10-09-desktop-phase-0-design.md`

## Global Constraints

- Work only on `feature/desktop`; do not commit to `main`.
- Support macOS and Windows from one codebase.
- Use Node.js 24 LTS and npm with a committed `package-lock.json`.
- Use `electron-vite`; do not add Electron Forge, Docker, a server backend, or packaging tools.
- Keep the renderer browser-like: `contextIsolation: true`, `nodeIntegration: false`, and `sandbox: true`.
- Expose only `window.bardhie.platform: string`; do not expose raw Electron, Node.js, or IPC objects.
- Wire Tailwind only; do not create tokens, themes, components, or branding.
- Do not add Ollama, PDFs, persistence, tray, shortcuts, floating behavior, installers, signing, or deployment.
- Use a normal resizable `960 × 640` window titled `BARDHIE`.
- Workers editing the shared checkout must not run Git staging, commit, branch, reset, checkout, clean, or stash commands; the controller owns Git operations.

## Review Focus

- **Renderer privilege leakage:** `tests/window-options.test.ts` must assert all three security flags; Task 5 must run it before accepting the shell.
- **Preload/type-contract drift:** Task 2 types the exposed object as `BardhieAPI`, Task 3 compiles its consumer, and Task 5 manually confirms the displayed platform.
- **Development works but production paths fail:** Task 5 runs the full production build and asserts main, preload, and renderer artifacts exist.
- **Dependency or lockfile drift:** Task 1 creates the lockfile and Task 5 performs a clean `npm ci` before all other final checks.
- **Platform-specific compilation failure:** Task 4 defines both Windows and macOS CI jobs; the README records the real-machine smoke test still required on each OS.

---

## Execution Topology

Use two waves so parallel workers never edit the same files:

```text
Wave 1 — foundation (one worker)
└── Task 1: project configuration and typed API contract

Wave 2 — three parallel worker threads
├── Task 2: Electron main + preload + security test
├── Task 3: React renderer + Tailwind
└── Task 4: GitHub Actions + README

Wave 3 — controller
└── Task 5: integrate, verify, and obtain fresh review
```

Task 1 must finish and be committed before Wave 2 starts. Tasks 2–4 consume only Task 1 outputs and own disjoint files, so they may run simultaneously. After all Wave 2 workers stop editing, the controller reviews their diffs, runs each task's verification, and commits the tasks one at a time. A fresh reviewer examines the combined branch before Task 5 is considered complete.

Requested worker configuration is `gpt-5.6-terra` with medium reasoning. If that model is unavailable in the active subagent pool, execution must pause for an explicit substitute selection rather than silently changing models.

---

### Task 1: Establish the Electron project foundation

**Owner:** Foundation worker; runs alone in Wave 1.

**Files:**
- Create: `.gitignore`
- Create: `.nvmrc`
- Create: `package.json`
- Create: `package-lock.json` via npm
- Create: `electron.vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `tsconfig.web.json`
- Create: `src/preload/index.d.ts`

**Interfaces:**
- Consumes: approved Phase 0 spec and Node.js 24.
- Produces: npm scripts `dev`, `test`, `typecheck:node`, `typecheck:web`, `typecheck`, and `build`; `BardhieAPI` with `readonly platform: string`; Electron/Vite/Tailwind build configuration consumed by Tasks 2–5.

- [ ] **Step 1: Create the package manifest**

Set `private: true`, `version: "0.0.0"`, `main: "out/main/index.js"`, and `engines.node: ">=24 <25"`. Define these scripts exactly:

```json
{
  "dev": "electron-vite dev",
  "test": "node --test tests/window-options.test.ts",
  "typecheck:node": "tsc --noEmit -p tsconfig.node.json --composite false",
  "typecheck:web": "tsc --noEmit -p tsconfig.web.json --composite false",
  "typecheck": "npm run typecheck:node && npm run typecheck:web",
  "build": "npm run typecheck && electron-vite build"
}
```

- [ ] **Step 2: Install only the required dependencies**

Run:

```bash
npm install react react-dom
npm install --save-dev electron electron-vite vite typescript @types/node @types/react @types/react-dom @vitejs/plugin-react tailwindcss @tailwindcss/vite
```

Expected: npm exits 0 and creates `package-lock.json`.

- [ ] **Step 3: Configure compilation boundaries**

`tsconfig.node.json` includes `electron.vite.config.ts`, `src/main/**/*.ts`, `src/preload/**/*.ts`, and `tests/**/*.ts`. `tsconfig.web.json` includes `src/renderer/src/**/*.ts`, `src/renderer/src/**/*.tsx`, and `src/preload/index.d.ts`, with DOM libraries and `jsx: "react-jsx"`. Root `tsconfig.json` references both projects.

`electron.vite.config.ts` uses `externalizeDepsPlugin()` for main and preload, the React Vite plugin for the renderer, and `@tailwindcss/vite` for the renderer. Do not add aliases or options that no Phase 0 file consumes.

- [ ] **Step 4: Define the typed bridge contract**

In `src/preload/index.d.ts`, export:

```ts
export interface BardhieAPI {
  readonly platform: string
}
```

Augment the global `Window` interface with `readonly bardhie: BardhieAPI`.

- [ ] **Step 5: Add environment metadata and ignored outputs**

`.nvmrc` contains `24`. `.gitignore` ignores `node_modules`, `out`, generated logs, and operating-system metadata; it must not ignore source, documentation, or the npm lockfile.

- [ ] **Step 6: Verify the foundation**

Run:

```bash
npm ls --depth=0
npm run typecheck:node
npm run typecheck:web
```

Expected: all commands exit 0; no missing or invalid dependency is reported.

- [ ] **Step 7: Controller review and commit**

The controller reviews the exact dependency set and configuration, then runs:

```bash
git add .gitignore .nvmrc package.json package-lock.json electron.vite.config.ts tsconfig.json tsconfig.node.json tsconfig.web.json src/preload/index.d.ts
git commit -m "chore: scaffold desktop runtime"
```

---

### Task 2: Implement the secure Electron runtime

**Owner:** Desktop-runtime worker; runs in parallel during Wave 2.

**Files:**
- Create: `src/main/window-options.ts`
- Create: `src/main/index.ts`
- Create: `src/preload/index.ts`
- Create: `tests/window-options.test.ts`

**Interfaces:**
- Consumes: `BardhieAPI` from `src/preload/index.d.ts`; Task 1's main/preload compilation and npm test scripts.
- Produces: secure `BrowserWindow` creation, normal Windows/macOS lifecycle behavior, and a frozen `window.bardhie` runtime object matching `BardhieAPI`.

- [ ] **Step 1: Write the failing security contract test**

Create `tests/window-options.test.ts`. Import `windowOptions` from `src/main/window-options.ts` and assert:

```ts
assert.equal(windowOptions.width, 960)
assert.equal(windowOptions.height, 640)
assert.equal(windowOptions.resizable, true)
assert.equal(windowOptions.title, 'BARDHIE')
assert.equal(windowOptions.webPreferences.contextIsolation, true)
assert.equal(windowOptions.webPreferences.nodeIntegration, false)
assert.equal(windowOptions.webPreferences.sandbox, true)
```

- [ ] **Step 2: Run the test and observe RED**

Run: `npm test`

Expected: FAIL because `src/main/window-options.ts` does not exist.

- [ ] **Step 3: Implement the tested window options**

Create and export `windowOptions` from `src/main/window-options.ts` with the exact tested values. Do not put the generated preload path in this pure object; `src/main/index.ts` adds it when creating the window.

- [ ] **Step 4: Implement main-process lifecycle and loading**

In `src/main/index.ts`, implement `createWindow(): Promise<BrowserWindow>` and a startup-error handler that logs `Failed to start BARDHIE` and exits with status 1. The window must:

- merge the tested options with the compiled preload path;
- load `process.env.ELECTRON_RENDERER_URL` in development;
- otherwise load `../renderer/index.html` from the compiled output;
- recreate a window on macOS activation when no windows exist;
- quit after all windows close on non-macOS platforms.

- [ ] **Step 5: Implement the narrow preload API**

In `src/preload/index.ts`, create a `BardhieAPI` value containing only `platform: process.platform`, freeze it, and expose it as `bardhie` using `contextBridge.exposeInMainWorld`. Do not expose `ipcRenderer`, `process`, Electron modules, or Node APIs.

- [ ] **Step 6: Verify GREEN**

Run:

```bash
npm test
npm run typecheck:node
```

Expected: the security contract test passes and node-process type-checking exits 0.

- [ ] **Step 7: Return work without Git operations**

Report the files changed and command results to the controller. Do not stage or commit because Wave 2 workers share the checkout.

- [ ] **Step 8: Controller review and commit**

After all Wave 2 workers stop editing, the controller reviews Task 2 and runs:

```bash
git add src/main/window-options.ts src/main/index.ts src/preload/index.ts tests/window-options.test.ts
git commit -m "feat: add secure electron runtime"
```

---

### Task 3: Implement the Phase 0 renderer

**Owner:** Renderer worker; runs in parallel during Wave 2.

**Files:**
- Create: `src/renderer/index.html`
- Create: `src/renderer/src/App.tsx`
- Create: `src/renderer/src/main.tsx`
- Create: `src/renderer/src/index.css`

**Interfaces:**
- Consumes: global `window.bardhie: BardhieAPI` and Task 1's renderer/Tailwind configuration.
- Produces: a semantic React placeholder that displays the exact Phase 0 copy and platform value.

- [ ] **Step 1: Create the renderer entry document**

Create `src/renderer/index.html` with a `#root` mount point, page title `BARDHIE`, and module entry `/src/main.tsx`.

- [ ] **Step 2: Create the React entry point and stylesheet**

`src/renderer/src/main.tsx` renders `<App />` inside `StrictMode` and imports `index.css`. `index.css` imports Tailwind with `@import "tailwindcss";`; add only minimal base and utility usage needed for readable content.

- [ ] **Step 3: Implement the placeholder**

`App.tsx` returns a semantic `<main>` containing:

- heading text `BARDHIE`;
- body text `Desktop application is running.`;
- a visible label and code-formatted `window.bardhie.platform` value.

Do not introduce reusable components, design tokens, themes, assets, navigation, or application state.

- [ ] **Step 4: Verify renderer compilation**

Run: `npm run typecheck:web`

Expected: exit 0 with no TypeScript errors, proving the renderer consumes the typed bridge contract.

- [ ] **Step 5: Return work without Git operations**

Report the files changed and command result to the controller. Do not stage or commit because Wave 2 workers share the checkout.

- [ ] **Step 6: Controller review and commit**

After all Wave 2 workers stop editing, the controller reviews Task 3 and runs:

```bash
git add src/renderer/index.html src/renderer/src/App.tsx src/renderer/src/main.tsx src/renderer/src/index.css
git commit -m "feat: add desktop phase zero renderer"
```

---

### Task 4: Add cross-platform CI and teammate documentation

**Owner:** Delivery worker; runs in parallel during Wave 2.

**Files:**
- Create: `.github/workflows/desktop-ci.yml`
- Modify: `README.md`

**Interfaces:**
- Consumes: Node.js version and npm scripts produced by Task 1.
- Produces: Windows/macOS compilation checks and repeatable local setup/smoke-test instructions.

- [ ] **Step 1: Add the GitHub Actions matrix**

Create `desktop-ci.yml` for pushes and pull requests with `ubuntu` excluded. Use a matrix containing exactly `windows-latest` and `macos-latest`, `actions/checkout@v4`, and `actions/setup-node@v4` with Node.js 24 and npm caching. Run these commands in order:

```text
npm ci
npm test
npm run typecheck
npm run build
```

- [ ] **Step 2: Replace the placeholder README**

Document:

- Phase 0 purpose and explicit non-goals;
- prerequisites: Git, Node.js 24, and npm;
- `npm install`, `npm run dev`, `npm test`, `npm run typecheck`, and `npm run build`;
- the main/preload/renderer security boundary;
- the six-step Mac and Windows manual smoke test from the spec;
- that installers, signing, Ollama, and the design system are deferred.

- [ ] **Step 3: Verify workflow and documentation contracts**

Run:

```bash
git diff --check
rg -n "windows-latest|macos-latest|npm ci|npm test|npm run typecheck|npm run build" .github/workflows/desktop-ci.yml
rg -n "Node.js 24|npm run dev|window.bardhie|Windows|macOS" README.md
```

Expected: `git diff --check` exits 0; every required workflow command, platform, prerequisite, and architecture term is present.

- [ ] **Step 4: Return work without Git operations**

Report the files changed and command results to the controller. Do not stage or commit because Wave 2 workers share the checkout.

- [ ] **Step 5: Controller review and commit**

After all Wave 2 workers stop editing, the controller reviews Task 4 and runs:

```bash
git add .github/workflows/desktop-ci.yml README.md
git commit -m "ci: verify desktop builds across platforms"
```

---

### Task 5: Integrate and verify Phase 0

**Owner:** Primary controller, followed by a fresh reviewer.

**Files:**
- Modify only files implicated by integration failures or reviewer findings.

**Interfaces:**
- Consumes: all outputs from Tasks 1–4.
- Produces: a verified Phase 0 branch and a precise handoff of checks that require Windows or GitHub.

- [ ] **Step 1: Inspect the integrated change**

Run:

```bash
git status --short
git diff --check
git diff main...HEAD --stat
```

Expected: no unstaged Wave 2 work remains after controller commits, no whitespace errors exist, and the diff contains only Phase 0 files.

- [ ] **Step 2: Prove reproducible installation**

Run: `npm ci`

Expected: exit 0 using the committed lockfile.

- [ ] **Step 3: Run the complete automated verification**

Run:

```bash
npm test
npm run typecheck
npm run build
```

Expected: all commands exit 0. Confirm these files exist afterward:

```text
out/main/index.js
out/preload/index.js
out/renderer/index.html
```

- [ ] **Step 4: Perform the macOS development smoke test**

Run `npm run dev` on the project owner's Mac and confirm:

- a normal resizable window titled `BARDHIE` opens;
- the exact placeholder copy appears;
- platform displays `darwin`;
- changing renderer copy triggers hot reload;
- closing the window follows normal macOS lifecycle behavior;
- stopping the development command leaves no hidden Electron process.

Revert the temporary hot-reload copy edit before continuing.

- [ ] **Step 5: Dispatch a fresh whole-branch review**

Give the reviewer the spec, this plan, and `git diff main...HEAD`. Require findings to be graded Critical, Important, or Minor and focused on correctness, security, cross-platform behavior, scope, and missing verification. Fix Critical or Important findings with a failing check followed by a passing check; record Minor findings for handoff.

- [ ] **Step 6: Re-run final verification after review fixes**

Run:

```bash
npm test
npm run typecheck
npm run build
git diff --check
git status --short --branch
```

Expected: tests, type-checking, and build exit 0; no whitespace errors or uncommitted changes remain; current branch is `feature/desktop`.

- [ ] **Step 7: Hand off external checks without expanding authority**

Report that Windows manual smoke testing and GitHub Actions execution remain unverified until a teammate runs the branch on Windows and the user authorizes a push or pull request. Do not push, publish, package, or open a pull request without explicit user authority.
