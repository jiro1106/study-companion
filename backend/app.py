"""
BARDHIE Study Companion – Backend API
======================================
A FastAPI server that powers the study companion features:
  - /api/tutor    – conversational AI tutor
  - /api/quiz     – quiz question generation
  - /api/flashcards – flashcard generation
  - /api/planner  – study plan generation
  - /api/health   – health check

Uses Ollama for local AI inference. Prompts are loaded from the prompts/ directory.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import AsyncGenerator

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

load_dotenv()

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2")
PROMPTS_DIR = Path(__file__).parent / "prompts"

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(
    title="BARDHIE Study Companion API",
    description="Backend API for the BARDHIE desktop study companion application.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Electron renderer and local dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Prompt loader
# ---------------------------------------------------------------------------


def load_prompt(name: str) -> str:
    """Load a system prompt from the prompts directory."""
    path = PROMPTS_DIR / f"{name}.md"
    if not path.exists():
        raise FileNotFoundError(f"Prompt file not found: {path}")
    return path.read_text(encoding="utf-8").strip()


# ---------------------------------------------------------------------------
# Ollama client helpers
# ---------------------------------------------------------------------------


async def ollama_chat(
    system_prompt: str,
    messages: list[dict],
    stream: bool = False,
) -> dict | AsyncGenerator[str, None]:
    """Send a chat request to Ollama."""
    payload = {
        "model": OLLAMA_MODEL,
        "messages": [{"role": "system", "content": system_prompt}, *messages],
        "stream": stream,
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        if stream:
            async def generate() -> AsyncGenerator[str, None]:
                async with client.stream(
                    "POST",
                    f"{OLLAMA_BASE_URL}/api/chat",
                    json=payload,
                ) as response:
                    response.raise_for_status()
                    async for line in response.aiter_lines():
                        if line:
                            try:
                                chunk = json.loads(line)
                                content = chunk.get("message", {}).get("content", "")
                                if content:
                                    yield content
                            except json.JSONDecodeError:
                                pass
            return generate()

        response = await client.post(
            f"{OLLAMA_BASE_URL}/api/chat",
            json=payload,
        )
        response.raise_for_status()
        return response.json()


async def ollama_generate(system_prompt: str, user_prompt: str) -> str:
    """Send a single generate request and return the full response text."""
    payload = {
        "model": OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "stream": False,
    }
    async with httpx.AsyncClient(timeout=180.0) as client:
        try:
            response = await client.post(
                f"{OLLAMA_BASE_URL}/api/chat",
                json=payload,
            )
            response.raise_for_status()
            data = response.json()
            return data.get("message", {}).get("content", "")
        except httpx.ConnectError as exc:
            raise HTTPException(
                status_code=503,
                detail=f"Cannot connect to Ollama at {OLLAMA_BASE_URL}. Is Ollama running?",
            ) from exc
        except httpx.HTTPStatusError as exc:
            raise HTTPException(
                status_code=502,
                detail=f"Ollama returned an error: {exc.response.text}",
            ) from exc


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------


class Message(BaseModel):
    role: str = Field(..., pattern=r"^(user|assistant)$")
    content: str


class TutorRequest(BaseModel):
    messages: list[Message]
    stream: bool = False


class QuizRequest(BaseModel):
    topic: str
    count: int = Field(default=5, ge=1, le=20)
    context: str | None = None  # Optional source text


class FlashcardsRequest(BaseModel):
    topic: str
    count: int = Field(default=10, ge=1, le=50)
    context: str | None = None  # Optional source text


class PlannerRequest(BaseModel):
    goal: str
    available_hours_per_day: float = Field(default=2.0, ge=0.5, le=16.0)
    days: int = Field(default=7, ge=1, le=90)
    topics: list[str] = Field(default_factory=list)
    context: str | None = None


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@app.get("/api/health")
async def health() -> dict:
    """Check API health and Ollama connectivity."""
    ollama_ok = False
    ollama_models: list[str] = []
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
            if response.status_code == 200:
                ollama_ok = True
                data = response.json()
                ollama_models = [m["name"] for m in data.get("models", [])]
    except (httpx.ConnectError, httpx.TimeoutException):
        pass

    return {
        "status": "ok",
        "ollama": {
            "connected": ollama_ok,
            "base_url": OLLAMA_BASE_URL,
            "model": OLLAMA_MODEL,
            "available_models": ollama_models,
        },
    }


@app.post("/api/tutor")
async def tutor(request: TutorRequest):
    """
    Conversational AI tutor endpoint.
    Supports streaming responses when stream=True.
    """
    try:
        system_prompt = load_prompt("tutor")
    except FileNotFoundError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    messages = [{"role": m.role, "content": m.content} for m in request.messages]

    if request.stream:
        try:
            generator = await ollama_chat(system_prompt, messages, stream=True)
        except httpx.ConnectError as exc:
            raise HTTPException(
                status_code=503,
                detail=f"Cannot connect to Ollama at {OLLAMA_BASE_URL}. Is Ollama running?",
            ) from exc

        return StreamingResponse(
            generator,
            media_type="text/plain",
            headers={"X-Content-Type-Options": "nosniff"},
        )

    try:
        result = await ollama_chat(system_prompt, messages, stream=False)
    except httpx.ConnectError as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Cannot connect to Ollama at {OLLAMA_BASE_URL}. Is Ollama running?",
        ) from exc
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    content = result.get("message", {}).get("content", "")
    return {"role": "assistant", "content": content}


@app.post("/api/quiz")
async def generate_quiz(request: QuizRequest) -> dict:
    """Generate quiz questions on a given topic."""
    try:
        system_prompt = load_prompt("quiz")
    except FileNotFoundError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    user_prompt = f"Generate {request.count} quiz questions about: {request.topic}"
    if request.context:
        user_prompt += f"\n\nSource material:\n{request.context}"

    raw = await ollama_generate(system_prompt, user_prompt)

    # Try to extract JSON from the response
    try:
        # Find the JSON block if wrapped in markdown code fences
        if "```" in raw:
            start = raw.find("{", raw.find("```"))
            end = raw.rfind("}") + 1
            raw = raw[start:end]
        data = json.loads(raw)
        return data
    except (json.JSONDecodeError, ValueError):
        # Return raw text if JSON parsing fails
        return {"raw": raw, "error": "Response was not valid JSON; returning raw text."}


@app.post("/api/flashcards")
async def generate_flashcards(request: FlashcardsRequest) -> dict:
    """Generate flashcards on a given topic."""
    try:
        system_prompt = load_prompt("flashcards")
    except FileNotFoundError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    user_prompt = f"Generate {request.count} flashcards about: {request.topic}"
    if request.context:
        user_prompt += f"\n\nSource material:\n{request.context}"

    raw = await ollama_generate(system_prompt, user_prompt)

    try:
        if "```" in raw:
            start = raw.find("{", raw.find("```"))
            end = raw.rfind("}") + 1
            raw = raw[start:end]
        data = json.loads(raw)
        return data
    except (json.JSONDecodeError, ValueError):
        return {"raw": raw, "error": "Response was not valid JSON; returning raw text."}


@app.post("/api/planner")
async def generate_plan(request: PlannerRequest) -> dict:
    """Generate a personalised study plan."""
    try:
        system_prompt = load_prompt("planner")
    except FileNotFoundError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    topics_str = ", ".join(request.topics) if request.topics else "the specified goal"
    user_prompt = (
        f"Create a {request.days}-day study plan for: {request.goal}\n"
        f"Available time: {request.available_hours_per_day} hours per day\n"
        f"Topics to cover: {topics_str}"
    )
    if request.context:
        user_prompt += f"\n\nAdditional context:\n{request.context}"

    raw = await ollama_generate(system_prompt, user_prompt)

    try:
        if "```" in raw:
            start = raw.find("{", raw.find("```"))
            end = raw.rfind("}") + 1
            raw = raw[start:end]
        data = json.loads(raw)
        return data
    except (json.JSONDecodeError, ValueError):
        return {"raw": raw, "error": "Response was not valid JSON; returning raw text."}


# ---------------------------------------------------------------------------
# Dev entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app:app",
        host="127.0.0.1",
        port=int(os.getenv("PORT", "8000")),
        reload=True,
    )
