"""
services/ollama.py
Low-level Ollama HTTP client helpers used by all routers.
"""
from __future__ import annotations

import json
from typing import AsyncGenerator

import httpx
from fastapi import HTTPException

from core.config import OLLAMA_BASE_URL, OLLAMA_MODEL


async def ollama_chat(
    system_prompt: str,
    messages: list[dict],
    stream: bool = False,
) -> dict | AsyncGenerator[str, None]:
    """
    Send a chat request to Ollama.

    When stream=False returns the parsed JSON response dict.
    When stream=True returns an async generator that yields text chunks.
    """
    payload = {
        "model": OLLAMA_MODEL,
        "messages": [{"role": "system", "content": system_prompt}, *messages],
        "stream": stream,
    }

    if stream:
        # Caller is responsible for consuming the generator before the client closes.
        # We open the client outside the generator and pass it in so it stays alive.
        client = httpx.AsyncClient(timeout=120.0)

        async def generate() -> AsyncGenerator[str, None]:
            try:
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
            finally:
                await client.aclose()

        return generate()

    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            response = await client.post(
                f"{OLLAMA_BASE_URL}/api/chat",
                json=payload,
            )
            response.raise_for_status()
            return response.json()
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


async def ollama_generate(system_prompt: str, user_prompt: str) -> str:
    """
    Send a single user message and return the full assistant reply as a string.
    Intended for structured-output endpoints (quiz, flashcards, planner).
    """
    result = await ollama_chat(
        system_prompt=system_prompt,
        messages=[{"role": "user", "content": user_prompt}],
        stream=False,
    )
    return result.get("message", {}).get("content", "")  # type: ignore[union-attr]


async def check_ollama_health() -> tuple[bool, list[str]]:
    """Return (is_connected, list_of_model_names)."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
            if response.status_code == 200:
                data = response.json()
                models = [m["name"] for m in data.get("models", [])]
                return True, models
    except (httpx.ConnectError, httpx.TimeoutException):
        pass
    return False, []
