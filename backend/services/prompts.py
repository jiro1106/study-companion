"""
services/prompts.py
Loads system prompt files from the prompts/ directory.
"""
from __future__ import annotations


from fastapi import HTTPException

from core.config import PROMPTS_DIR


def load_prompt(name: str) -> str:
    """
    Load and return the contents of prompts/<name>.md.
    Raises HTTP 500 if the file is missing.
    """
    path = PROMPTS_DIR / f"{name}.md"
    if not path.exists():
        raise HTTPException(
            status_code=500,
            detail=f"Prompt file not found: {path}",
        )
    return path.read_text(encoding="utf-8").strip()
