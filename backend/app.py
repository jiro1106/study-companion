"""
app.py  –  BARDHIE Study Companion API entry point.

Registers all routers and middleware; contains no business logic.
Run with:
    uvicorn app:app --host 127.0.0.1 --port 8000 --reload
"""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import HOST, PORT
from routers import chat, flashcards, health, planner, quiz, summarize, tutor

app = FastAPI(
    title="BARDHIE Study Companion API",
    description=(
        "Backend API for the BARDHIE desktop study companion.\n\n"
        "| Route | Purpose |\n"
        "|---|---|\n"
        "| GET  /api/health     | Ollama connectivity check |\n"
        "| POST /api/chat       | General-purpose multi-turn chat |\n"
        "| POST /api/tutor      | AI study tutor (streaming supported) |\n"
        "| POST /api/summarize  | Summarize a document into key ideas + exam terms |\n"
        "| POST /api/quiz       | Generate MCQ quiz questions |\n"
        "| POST /api/flashcards | Generate study flashcards |\n"
        "| POST /api/planner    | Generate a day-by-day study plan |\n"
    ),
    version="0.2.0",
)

# ---------------------------------------------------------------------------
# Middleware
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Electron renderer + local dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

app.include_router(health.router)
app.include_router(chat.router)
app.include_router(tutor.router)
app.include_router(summarize.router)
app.include_router(quiz.router)
app.include_router(flashcards.router)
app.include_router(planner.router)

# ---------------------------------------------------------------------------
# Dev entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host=HOST, port=PORT, reload=True)
