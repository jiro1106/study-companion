"""
routers/flashcards.py
POST /api/flashcards  –  Generate study flashcards via Ollama.
"""
from __future__ import annotations

import json

from fastapi import APIRouter

from models.schemas import FlashcardsRequest
from services.ollama import ollama_generate
from services.prompts import load_prompt

router = APIRouter(tags=["Flashcards"])


def _parse_json_response(raw: str) -> dict:
    try:
        if "```" in raw:
            start = raw.find("{", raw.find("```"))
            end = raw.rfind("}") + 1
            raw = raw[start:end]
        return json.loads(raw)
    except (json.JSONDecodeError, ValueError):
        return {"raw": raw, "error": "Response was not valid JSON; returning raw text."}


@router.post("/api/flashcards")
async def generate_flashcards(request: FlashcardsRequest) -> dict:
    """Generate front/back study flashcards on a given topic."""
    system_prompt = load_prompt("flashcards")

    user_prompt = f"Generate {request.count} flashcards about: {request.topic}"
    if request.context:
        user_prompt += f"\n\nSource material:\n{request.context}"

    raw = await ollama_generate(system_prompt, user_prompt)
    return _parse_json_response(raw)
