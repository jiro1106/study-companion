"""
models/schemas.py
All Pydantic request / response schemas used across the API.
"""
from __future__ import annotations

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Shared
# ---------------------------------------------------------------------------


class Message(BaseModel):
    """A single chat turn."""
    role: str = Field(..., pattern=r"^(user|assistant)$")
    content: str


# ---------------------------------------------------------------------------
# /api/chat  (general multi-turn chat with any model / persona)
# ---------------------------------------------------------------------------


class ChatRequest(BaseModel):
    messages: list[Message]
    system_prompt: str | None = None  # Optional override; defaults to a neutral assistant
    stream: bool = False


class ChatResponse(BaseModel):
    role: str = "assistant"
    content: str


# ---------------------------------------------------------------------------
# /api/tutor
# ---------------------------------------------------------------------------


class TutorRequest(BaseModel):
    messages: list[Message]
    stream: bool = False


# ---------------------------------------------------------------------------
# /api/quiz
# ---------------------------------------------------------------------------


class QuizRequest(BaseModel):
    topic: str
    count: int = Field(default=5, ge=1, le=20)
    context: str | None = None  # Optional source text to base questions on


# ---------------------------------------------------------------------------
# /api/flashcards
# ---------------------------------------------------------------------------


class FlashcardsRequest(BaseModel):
    topic: str
    count: int = Field(default=10, ge=1, le=50)
    context: str | None = None


# ---------------------------------------------------------------------------
# /api/planner
# ---------------------------------------------------------------------------


class PlannerRequest(BaseModel):
    goal: str
    available_hours_per_day: float = Field(default=2.0, ge=0.5, le=16.0)
    days: int = Field(default=7, ge=1, le=90)
    topics: list[str] = Field(default_factory=list)
    context: str | None = None
