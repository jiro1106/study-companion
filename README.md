# BARDHIE Desktop

BARDHIE Desktop Phase 0 is a secure, cross-platform Electron development shell for macOS and Windows. It establishes the main, preload, and React renderer processes and displays a minimal placeholder with the current operating-system platform.

Phase 0 deliberately does not include AI or study features, file handling, persistence, tray behavior, global shortcuts, background operation, or automated GUI tests. Installers, packaging, signing, notarization, publishing, Ollama integration, and the design system are deferred.

## Prerequisites

- Git
- Node.js 24
- npm (included with Node.js)

## Setup and commands

Install dependencies:

```sh
npm install
```

Start the development app with hot reload:

```sh
npm run dev
```

Run the security contract test:

```sh
npm test
```

Check the main, preload, and renderer TypeScript projects:

```sh
npm run typecheck
```

Compile the production bundles without creating an installer:

```sh
npm run build
```

## Security boundary

The Electron main process owns the application lifecycle, native window, and all privileged capabilities. The sandboxed preload process exposes only the typed, read-only `window.bardhie.platform` value through the context bridge. The React renderer is browser-like: it must not import Node.js or Electron APIs, and any future privileged behavior must be implemented in the main process and exposed through a narrow preload API rather than raw IPC.

## Manual smoke test

Run all six steps on the project owner's Mac and a teammate's Windows machine:

1. Install Node.js 24 and run `npm install`.
2. Run `npm run dev`.
3. Confirm a normal native BARDHIE window opens.
4. Confirm the displayed platform is correct: `darwin` on macOS or `win32` on Windows.
5. Change renderer copy and confirm hot reload updates the window.
6. Close the window and confirm the expected operating-system lifecycle behavior.
