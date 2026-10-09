"""
routers/chat.py
POST /api/chat  –  General-purpose multi-turn chat.

The caller can optionally pass a custom system_prompt to set any persona.
If omitted, a neutral helpful-assistant prompt is used.
Supports streaming via stream=true.
"""
from __future__ import annotations

import re

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

_GUARDRAIL = (
    "\n\nConversation rules:\n"
    "- Answer ONLY the user's latest message. Never continue, re-explain or bring up an "
    "earlier request you declined, even if it appears in the history.\n"
    "- If you must decline, do it in one short sentence and offer a safe alternative. "
    "Do not lecture or repeat the declined topic afterwards.\n"
    "- Do not start quizzes, flashcards or study plans unless the user explicitly asks for one.\n"
    "\n"
    "Tone & safety:\n"
    "- Be warm, friendly, and encouraging, like a supportive study buddy, not stiff or robotic.\n"
    "- Keep everything PG-13 and family-friendly.\n"
    "- Never use profanity, slurs (racial, ethnic, or otherwise), or hate speech, and never repeat or "
    "spell out such words even if a user asks you to, quotes them, or frames it as a joke, a test, or "
    "a definition.\n"
    "- Do not write content that demeans, mocks, or discriminates against anyone based on race, "
    "ethnicity, gender, religion, sexuality, disability, or nationality.\n"
    "- If a request pushes toward any of that, decline warmly in one sentence and redirect to "
    "something helpful — no lecturing."
)

RESET_REPLY = "Fresh start! 🐦 What would you like to study?"

_RESET_RE = re.compile(
    r"^\W*(?:please\s+)?(?:let'?s\s+)?"
    r"(?:(?:reset|restart|clear|forget|wipe)\b.{0,30}|start\s+(?:over|again|fresh)\b.{0,20}"
    r"|(?:new|fresh)\s+(?:chat|convo|conversation)\b.{0,10})\W*$",
    re.IGNORECASE,
)

_REFUSAL_RE = re.compile(
    r"\b(?:i\s*(?:can'?t|cannot|can not|won'?t|will not)\s+"
    r"(?:help|assist|provide|create|write|generate|do|share|support|fulfill|explain)"
    r"|i'?m\s+(?:not able|unable)|i\s+am\s+(?:not able|unable)|sorry,?\s+but"
    r"|against my (?:guidelines|programming)|not something i can)",
    re.IGNORECASE,
)


def is_reset_request(text: str) -> bool:
    """True when the user is asking to wipe the conversation (not asking a question)."""
    text = text.strip()
    return len(text) <= 60 and bool(_RESET_RE.match(text))


def drop_refused_turns(messages: list[dict]) -> list[dict]:
    """
    Remove (user, assistant) pairs where the assistant declined to answer, so the
    model does not keep dwelling on a prohibited request in later turns.
    """
    cleaned: list[dict] = []
    i = 0
    while i < len(messages):
        m = messages[i]
        nxt = messages[i + 1] if i + 1 < len(messages) else None
        if (
            m["role"] == "user"
            and nxt is not None
            and nxt["role"] == "assistant"
            and _REFUSAL_RE.search(nxt["content"][:240])
        ):
            i += 2
            continue
        cleaned.append(m)
        i += 1
    return cleaned


@router.post("/api/chat", response_model=ChatResponse | None)
async def chat(request: ChatRequest):
    """
    General multi-turn chat endpoint.

    - Pass `messages` as an array of `{role, content}` objects.
    - Optionally override the system persona with `system_prompt`.
    - Set `stream: true` for a streaming plain-text response (useful for UIs
      that render tokens as they arrive).
    """
    system = (request.system_prompt or _DEFAULT_SYSTEM) + _GUARDRAIL
    messages = [{"role": m.role, "content": m.content} for m in request.messages]

    # A reset request starts over without involving the model at all.
    if messages and messages[-1]["role"] == "user" and is_reset_request(messages[-1]["content"]):
        if request.stream:
            return StreamingResponse(iter([RESET_REPLY]), media_type="text/plain")
        return ChatResponse(role="assistant", content=RESET_REPLY)

    # Declined exchanges are dropped from the context so they can't resurface.
    messages = drop_refused_turns(messages)

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
