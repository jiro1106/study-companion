"""
core/config.py
Application-wide configuration loaded from environment variables / .env file.
"""
from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

# Load .env from the backend/ directory (one level up from core/)
load_dotenv(Path(__file__).parent.parent / ".env")

OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "llama3.2")
PORT: int = int(os.getenv("PORT", "8000"))
HOST: str = os.getenv("HOST", "127.0.0.1")

# Absolute path to the prompts directory
PROMPTS_DIR: Path = Path(__file__).parent.parent / "prompts"
