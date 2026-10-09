"""
routers/planner.py
POST /api/planner  –  Generate a personalised study plan via Ollama.
"""
from __future__ import annotations

import json

from fastapi import APIRouter

from models.schemas import PlannerRequest
from services.ollama import ollama_generate
from services.prompts import load_prompt

router = APIRouter(tags=["Planner"])


def _parse_json_response(raw: str) -> dict:
    try:
        if "```" in raw:
            start = raw.find("{", raw.find("```"))
            end = raw.rfind("}") + 1
            raw = raw[start:end]
        return json.loads(raw)
    except (json.JSONDecodeError, ValueError):
        return {"raw": raw, "error": "Response was not valid JSON; returning raw text."}


@router.post("/api/planner")
async def generate_plan(request: PlannerRequest) -> dict:
    """Generate a day-by-day personalised study plan."""
    system_prompt = load_prompt("planner")

    topics_str = ", ".join(request.topics) if request.topics else "the specified goal"
    user_prompt = (
        f"Create a {request.days}-day study plan for: {request.goal}\n"
        f"Available time: {request.available_hours_per_day} hours per day\n"
        f"Topics to cover: {topics_str}"
    )
    if request.context:
        user_prompt += f"\n\nAdditional context:\n{request.context}"

    raw = await ollama_generate(system_prompt, user_prompt)
    return _parse_json_response(raw)
