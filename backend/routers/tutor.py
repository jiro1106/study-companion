"""
routers/tutor.py
POST /api/tutor  –  Conversational AI tutor with study-focused system prompt.
"""
from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from models.schemas import TutorRequest
from services.ollama import ollama_chat
from services.prompts import load_prompt

router = APIRouter(tags=["Tutor"])


@router.post("/api/tutor")
async def tutor(request: TutorRequest):
    """
    Conversational AI tutor endpoint.
    Uses the tutor system prompt from prompts/tutor.md.
    Supports streaming responses when stream=True.
    """
    system_prompt = load_prompt("tutor")
    messages = [{"role": m.role, "content": m.content} for m in request.messages]

    if request.stream:
        generator = await ollama_chat(system_prompt, messages, stream=True)
        return StreamingResponse(
            generator,
            media_type="text/plain",
            headers={"X-Content-Type-Options": "nosniff"},
        )

    result = await ollama_chat(system_prompt, messages, stream=False)
    content = result.get("message", {}).get("content", "")  # type: ignore[union-attr]
    return {"role": "assistant", "content": content}
