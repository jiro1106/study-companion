# Bardy Desktop Phase 0 Design

**Date:** 2026-10-09

**Status:** Approved for implementation planning

**Branch:** `feature/desktop`

## Purpose

Phase 0 establishes a secure, cross-platform Electron development shell for Bardy. It gives the four-person hackathon team a stable desktop foundation that launches locally on macOS and Windows before any AI, document, study, or background-runtime features are added.

The immediate user-visible outcome is deliberately small: running `npm run dev` opens a normal, resizable native window containing a minimal Bardy placeholder screen and the current operating-system platform reported through the preload bridge.

## Constraints

- The hackathon lasts less than 24 hours.
- One shared codebase must run on macOS and Windows.
- The project uses Node.js 24 LTS and npm.
- The repository currently contains only a README.
- Development must not depend on Docker, cloud services, signing credentials, or an installer.
- Styling and the design system are separate work; Phase 0 only wires Tailwind into the renderer.
- Work is isolated on `feature/desktop`; `main` is not changed directly.

## Selected Approach

Use `electron-vite` with Electron, React, and TypeScript.

This approach provides the smallest maintained setup that coordinates Electron's main and preload processes with a Vite-powered React renderer. Electron Forge was rejected for Phase 0 because its packaging-oriented structure is unnecessary before installers are in scope. A manual Electron and Vite setup was rejected because maintaining development-server and production-build coordination would consume hackathon time without improving the deliverable.

## Phase 0 Scope

Phase 0 includes:

- Electron main, preload, and renderer entry points.
- A normal, resizable `BrowserWindow` titled `Bardy`.
- React rendering and Vite hot reload during development.
- TypeScript configuration for all three Electron process contexts.
- Tailwind installation and renderer integration only.
- A typed `window.bardy` preload API exposing a read-only `platform` string.
- Secure renderer defaults.
- npm scripts for development, type-checking, and production compilation.
- A committed npm lockfile.
- A GitHub Actions build matrix for Windows and macOS.
- README prerequisites, commands, architecture notes, and manual smoke-test instructions.

## Explicit Non-Goals

Phase 0 does not include:

- Design tokens, themes, reusable UI components, or visual polish.
- Ollama installation, model management, AI requests, or chat behavior.
- PDF import or processing.
- Flashcards, quizzes, summaries, or study history.
- File selection or persistence.
- Tray behavior, global shortcuts, background operation, or single-instance handling.
- Floating or always-on-top behavior.
- `.exe`, `.app`, or `.dmg` packaging.
- Code signing, notarization, publishing, or deployment.
- Docker configuration.
- Automated Electron GUI or end-to-end tests.

## Architecture

The application has three process boundaries:

1. **Main process** — owns Electron application lifecycle and creates the native window.
2. **Preload process** — exposes the narrow, typed `window.bardy` API through Electron's context bridge.
3. **React renderer** — owns visible UI and behaves like a sandboxed browser application.

The renderer must not import Node.js or Electron APIs. All future privileged capabilities—including Ollama access, filesystem operations, persistence, tray control, and global shortcuts—must be implemented in the main process and exposed as narrowly scoped preload methods. Raw IPC primitives must never be exposed to the renderer.

Phase 0 contains no IPC messages because the only bridge value is the synchronously available, read-only platform string. This proves that the preload boundary is wired correctly without adding speculative APIs.

## Security Model

The `BrowserWindow` uses:

- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: true`
- The local preload script supplied by the production build

The application loads only the local Vite development URL during development and locally built renderer files in production. It does not load remote web content. The preload exposes a frozen object containing only the current platform string; it does not expose `ipcRenderer`, `process`, filesystem APIs, or Electron modules.

## Window and Lifecycle Behavior

- The first launch creates one `960 × 640` resizable window titled `Bardy`.
- The window behaves like a standard desktop window; it is not floating or always on top.
- Closing all windows quits the application on Windows.
- On macOS, closing the window leaves normal macOS application lifecycle behavior in place, and activating the application recreates the window when none exists.
- Tray-based background behavior and single-instance enforcement are deferred.

## Renderer

The renderer shows a semantic, keyboard-readable placeholder containing:

- The product name `Bardy`.
- The message `Desktop application is running.`
- The platform value provided by `window.bardy.platform`.

Tailwind is connected through its Vite integration and imported from the renderer stylesheet. Only minimal utility classes needed to make the placeholder readable are used. No design-system naming, tokens, component library, dark-mode strategy, or branding decisions are introduced.

## Expected Repository Structure

```text
.github/workflows/desktop-ci.yml
.nvmrc
docs/superpowers/specs/2026-10-09-desktop-phase-0-design.md
docs/superpowers/plans/2026-10-09-desktop-phase-0.md
src/main/index.ts
src/preload/index.ts
src/preload/index.d.ts
src/renderer/index.html
src/renderer/src/App.tsx
src/renderer/src/index.css
src/renderer/src/main.tsx
electron.vite.config.ts
package.json
package-lock.json
tsconfig.json
tsconfig.node.json
tsconfig.web.json
README.md
```

## Commands

The project exposes these required commands:

```text
npm install
npm run dev
npm run typecheck
npm run build
```

`npm run dev` starts the Vite renderer and Electron together. `npm run typecheck` checks the Node-facing and renderer TypeScript projects. `npm run build` creates production main, preload, and renderer bundles but does not package an installer.

## Error Handling

- A startup failure is logged to stderr and causes a non-zero exit rather than leaving a hidden process running.
- TypeScript or bundling failures return non-zero status and fail CI.
- The renderer does not implement recovery UI because Phase 0 performs no network, AI, file, or persistence operations.
- No user data is created or modified in this phase.

## Cross-Platform Verification

GitHub Actions runs on `windows-latest` and `macos-latest`. Each matrix job:

1. Checks out the repository.
2. Installs Node.js 24 with npm caching.
3. Runs `npm ci`.
4. Runs `npm run typecheck`.
5. Runs `npm run build`.

The workflow runs for pushes and pull requests. It does not attempt to launch a graphical Electron window in CI.

Manual smoke testing is required on the project owner's Mac and a teammate's Windows machine:

1. Install Node.js 24 and run `npm install`.
2. Run `npm run dev`.
3. Confirm a normal native Bardy window opens.
4. Confirm the displayed platform is correct (`darwin` or `win32`).
5. Change renderer copy and confirm hot reload updates the window.
6. Close the window and confirm the expected operating-system lifecycle behavior.

## Acceptance Criteria

Phase 0 is accepted when:

- The repository is on `feature/desktop` and `main` remains at its original commit.
- Dependency installation succeeds from the committed lockfile.
- `npm run dev` launches the native application on both macOS and Windows.
- The renderer displays the Bardy placeholder and correct platform.
- The browser renderer cannot access Node.js globals directly.
- `npm run typecheck` exits successfully.
- `npm run build` exits successfully.
- Both GitHub Actions matrix jobs succeed after the branch is pushed or a pull request is opened.
- The README is sufficient for another teammate to repeat the local smoke test.

## Follow-On Work

The design system can begin after the renderer foundation is available, preferably from a branch based on `feature/desktop`. Desktop Phase 1 can then add tray lifecycle and a global shortcut through the existing main/preload boundary. Packaging and unsigned hackathon artifacts remain a later, optional bonus phase.
