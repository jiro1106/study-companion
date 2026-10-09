"""
routers/quiz.py
POST /api/quiz  –  Generate multiple-choice quiz questions via Ollama.
"""
from __future__ import annotations

import json

from fastapi import APIRouter

from models.schemas import QuizRequest
from services.ollama import ollama_generate
from services.prompts import load_prompt

router = APIRouter(tags=["Quiz"])


def _parse_json_response(raw: str) -> dict:
    """Extract and parse a JSON object from a raw LLM response string."""
    try:
        if "```" in raw:
            start = raw.find("{", raw.find("```"))
            end = raw.rfind("}") + 1
            raw = raw[start:end]
        return json.loads(raw)
    except (json.JSONDecodeError, ValueError):
        return {"raw": raw, "error": "Response was not valid JSON; returning raw text."}


@router.post("/api/quiz")
async def generate_quiz(request: QuizRequest) -> dict:
    """Generate multiple-choice quiz questions on a given topic."""
    system_prompt = load_prompt("quiz")

    user_prompt = f"Generate {request.count} quiz questions about: {request.topic}"
    if request.context:
        user_prompt += f"\n\nSource material:\n{request.context}"

    raw = await ollama_generate(system_prompt, user_prompt)
    return _parse_json_response(raw)
