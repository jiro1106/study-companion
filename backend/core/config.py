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

# ── Speech-to-Text (faster-whisper) ───────────────────────────────────────────
# Model size: tiny | base | small | medium | large-v2   (default: base)
WHISPER_MODEL: str = os.getenv("WHISPER_MODEL", "base")
# Device: "cpu" or "cuda"
WHISPER_DEVICE: str = os.getenv("WHISPER_DEVICE", "cpu")
# Compute type: "int8" (CPU-friendly) or "float16" (GPU)
WHISPER_COMPUTE_TYPE: str = os.getenv("WHISPER_COMPUTE_TYPE", "int8")
# Maximum accepted audio upload size in megabytes
MAX_AUDIO_SIZE_MB: float = float(os.getenv("MAX_AUDIO_SIZE_MB", "25"))

# ── Text-to-Speech (Piper TTS) ────────────────────────────────────────────────
# Directory where .onnx + .onnx.json voice model files are stored.
# Download voices from https://huggingface.co/rhasspy/piper-voices
TTS_MODELS_DIR: Path = Path(
    os.getenv("TTS_MODELS_DIR", str(Path(__file__).parent.parent / "tts_models"))
)
# Default voice name (must match the filename stem of the model files)
TTS_DEFAULT_VOICE: str = os.getenv("TTS_VOICE", "en_US-lessac-medium")
# Set to "false" to disable TTS entirely
TTS_ENABLED: bool = os.getenv("TTS_ENABLED", "true").lower() != "false"
