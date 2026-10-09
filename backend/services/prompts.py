"""
services/prompts.py
Loads system prompt files from the prompts/ directory.
"""
from __future__ import annotations


from fastapi import HTTPException

from core.config import PROMPTS_DIR

# Appended to every loaded system prompt so tone and content rules hold no
# matter which route (tutor, quiz, flashcards, planner, summarize) is used.
_TONE_AND_SAFETY = (
    "\n\n---\n"
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


def load_prompt(name: str) -> str:
    """
    Load the contents of prompts/<name>.md, with the shared tone/safety
    rules appended. Raises HTTP 500 if the file is missing.
    """
    path = PROMPTS_DIR / f"{name}.md"
    if not path.exists():
        raise HTTPException(
            status_code=500,
            detail=f"Prompt file not found: {path}",
        )
    return path.read_text(encoding="utf-8").strip() + _TONE_AND_SAFETY
