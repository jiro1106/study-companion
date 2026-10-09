"""
routers/summarize.py
POST /api/summarize  –  Generate a structured study summary via Ollama.
"""
from __future__ import annotations

import json

from fastapi import APIRouter

from models.schemas import SummarizeRequest
from services.ollama import ollama_generate
from services.prompts import load_prompt

router = APIRouter(tags=["Summarize"])


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


@router.post("/api/summarize")
async def summarize(request: SummarizeRequest) -> dict:
    """Generate a structured summary (title, key ideas, exam terms, excerpt) from document text."""
    system_prompt = load_prompt("summarize")

    user_prompt = (
        f'Summarize this document titled "{request.title}":\n\n{request.text}'
        if request.title
        else f"Summarize this document:\n\n{request.text}"
    )

    raw = await ollama_generate(system_prompt, user_prompt)
    return _parse_json_response(raw)
