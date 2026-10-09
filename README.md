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
