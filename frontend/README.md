# BARDHIE Desktop (frontend)

BARDHIE is a cross-platform Electron desktop application. Phase 0 provides a secure development shell that runs from one codebase on macOS and Windows.

## What you need

- Git
- Node.js 24 (npm is included)

Node is pinned in frontend/.nvmrc. With fnm (https://github.com/Schniz/fnm) installed, run fnm install once in frontend/ and it switches automatically.

Verify Node after installing it:

```sh
node --version
```

It must begin with `v24`.

## Get the project

If you already have the repository, switch to the desktop branch:

```sh
git switch feature/desktop-ui
```

For a new clone after the branch is pushed to GitHub:

```sh
git clone <repository-url>
cd study-companion
git switch feature/desktop-ui
```

## Run BARDHIE on macOS

Open Terminal in the project folder and run:

```sh
cd frontend
npm install
npm run dev
```

A native BARDHIE window should open and display `Platform: darwin`. Keep the Terminal process running while using the app; press `Control + C` there to stop it.

## Run BARDHIE on Windows

Open PowerShell in the project folder and run:

```powershell
cd frontend
npm install
npm run dev
```

A native BARDHIE window should open and display `Platform: win32`. Keep PowerShell open while using the app; press `Ctrl + C` to stop it.

## Preview loading and error states

The app runs on sample data until the study engine is connected.

| Command | What you see |
|---|---|
| `npm run dev` | Normal sample data |
| `npm run dev:slow` | Every request takes about 2 seconds, so loading skeletons show |
| `npm run dev:error` | Every request fails, so error states show |

Delete decks or documents in the app to see empty states. Restarting restores the sample data.

## Verify your setup

Run these before sharing changes:

Run these from the frontend folder.

```sh
npm test
npm run typecheck
npm run build
```

`npm run build` produces production bundles in `out/`. It does not yet create a Windows `.exe`, macOS `.app`, or `.dmg` installer.

## Manual smoke test

Test once on a Mac and once on a Windows machine:

1. Run `npm run dev`.
2. Confirm a normal, resizable BARDHIE window opens.
3. Confirm the displayed platform is `darwin` on macOS or `win32` on Windows.
4. Change text in `frontend/src/renderer/src/App.tsx`, save it, and confirm the window hot-reloads.
5. Restore the text before committing.

## Phase 0 boundaries

This phase does not yet include AI/study features, PDF imports, local persistence, tray behavior, global shortcuts, background operation, installers, signing, or deployment. The Electron main process owns native capabilities; the sandboxed React renderer only receives the typed `window.bardhie.platform` value through the preload bridge.
