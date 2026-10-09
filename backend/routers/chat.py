"""
routers/chat.py
POST /api/chat  –  General-purpose multi-turn chat.

The caller can optionally pass a custom system_prompt to set any persona.
If omitted, a neutral helpful-assistant prompt is used.
Supports streaming via stream=true.
"""
from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from models.schemas import ChatRequest, ChatResponse
from services.ollama import ollama_chat

router = APIRouter(tags=["Chat"])

_DEFAULT_SYSTEM = (
    "You are a helpful, knowledgeable assistant. "
    "Answer clearly and concisely. "
    "If you are uncertain about something, say so."
)


@router.post("/api/chat", response_model=ChatResponse | None)
async def chat(request: ChatRequest):
    """
    General multi-turn chat endpoint.

    - Pass `messages` as an array of `{role, content}` objects.
    - Optionally override the system persona with `system_prompt`.
    - Set `stream: true` for a streaming plain-text response (useful for UIs
      that render tokens as they arrive).
    """
    system = request.system_prompt or _DEFAULT_SYSTEM
    messages = [{"role": m.role, "content": m.content} for m in request.messages]

    if request.stream:
        generator = await ollama_chat(system, messages, stream=True)
        return StreamingResponse(
            generator,
            media_type="text/plain",
            headers={"X-Content-Type-Options": "nosniff"},
        )

    result = await ollama_chat(system, messages, stream=False)
    content = result.get("message", {}).get("content", "")  # type: ignore[union-attr]
    return ChatResponse(role="assistant", content=content)
