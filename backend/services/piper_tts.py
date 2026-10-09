"""
services/piper_tts.py
Local text-to-speech adapter using Piper TTS (ONNX runtime, CPU-first).

Quick setup — three steps
--------------------------
1.  Install the Python package:
        pip install piper-tts

2.  Download a voice model (the example uses an English US voice):

        mkdir -p backend/tts_models

        # Download with curl (Linux/macOS/Git-Bash on Windows):
        curl -L -o backend/tts_models/en_US-lessac-medium.onnx \
            https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx

        curl -L -o backend/tts_models/en_US-lessac-medium.onnx.json \
            https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json

    Or browse all voices at:
        https://huggingface.co/rhasspy/piper-voices/tree/main

    You need exactly two files per voice in tts_models/:
        <voice>.onnx          (the neural network weights)
        <voice>.onnx.json     (sample-rate, phoneme map, etc.)

3.  Set the voice in .env (optional — defaults to en_US-lessac-medium):
        TTS_VOICE=en_US-lessac-medium
        TTS_MODELS_DIR=backend/tts_models    # default; change if needed

Important: do NOT commit model files to git.
    Add  tts_models/  to .gitignore.

Enabling GPU acceleration
--------------------------
Piper uses onnxruntime internally.  To use GPU:
    pip install onnxruntime-gpu    # instead of onnxruntime
No code changes needed — onnxruntime detects the GPU build automatically.

Replacing this adapter
-----------------------
Implement any class / module with:
    async def speak(text: str, voice: str | None = None) -> bytes  →  WAV bytes

Then import it in backend/routers/speak.py instead.
"""
from __future__ import annotations

import asyncio
import io
import logging
import re
import wave
from functools import lru_cache
from pathlib import Path

from core.config import TTS_DEFAULT_VOICE, TTS_ENABLED, TTS_MODELS_DIR

log = logging.getLogger(__name__)

# ── Markdown / formatting cleaner ────────────────────────────────────────────

_RE_CODE_BLOCK = re.compile(r"```.*?```", re.DOTALL)
_RE_INLINE_CODE = re.compile(r"`([^`]+)`")
_RE_BOLD_ITALIC = re.compile(r"\*{1,3}(.+?)\*{1,3}", re.DOTALL)
_RE_HEADING = re.compile(r"^#{1,6}\s+", re.MULTILINE)
_RE_LINK = re.compile(r"\[([^\]]+)\]\([^\)]+\)")
_RE_IMAGE = re.compile(r"!\[[^\]]*\]\([^\)]+\)")
_RE_BULLET = re.compile(r"^\s*[-*+]\s+", re.MULTILINE)
_RE_NUMBERED = re.compile(r"^\s*\d+\.\s+", re.MULTILINE)
_RE_BLOCKQUOTE = re.compile(r"^>\s*", re.MULTILINE)
_RE_HR = re.compile(r"^[-_*]{3,}\s*$", re.MULTILINE)
_RE_MULTI_SPACE = re.compile(r"  +")
_RE_MULTI_NEWLINE = re.compile(r"\n{3,}")


def clean_for_tts(text: str) -> str:
    """
    Strip Markdown formatting so TTS does not read raw syntax aloud.
    Code blocks are replaced with a spoken label; inline code content is kept.
    """
    text = _RE_IMAGE.sub("", text)
    text = _RE_CODE_BLOCK.sub(" (code block) ", text)
    text = _RE_INLINE_CODE.sub(r"\1", text)       # keep inner text, drop back-ticks
    text = _RE_BOLD_ITALIC.sub(r"\1", text)
    text = _RE_HEADING.sub("", text)
    text = _RE_LINK.sub(r"\1", text)
    text = _RE_BULLET.sub("", text)
    text = _RE_NUMBERED.sub("", text)
    text = _RE_BLOCKQUOTE.sub("", text)
    text = _RE_HR.sub("", text)
    text = _RE_MULTI_SPACE.sub(" ", text)
    text = _RE_MULTI_NEWLINE.sub("\n\n", text)
    return text.strip()


# ── Voice loader (lazy, cached) ───────────────────────────────────────────────

@lru_cache(maxsize=4)
def _load_voice(model_path: str, config_path: str):
    """Load and cache a Piper voice on first use."""
    try:
        from piper.voice import PiperVoice  # type: ignore[import]
    except ImportError as exc:
        raise RuntimeError(
            "piper-tts is not installed.\n"
            "Run:  pip install piper-tts\n"
            "Then download a voice model — see backend/services/piper_tts.py."
        ) from exc

    log.info("Loading Piper voice from %s …", model_path)
    return PiperVoice.load(model_path, config_path=config_path)


def _resolve_model_paths(voice: str) -> tuple[Path, Path]:
    onnx = TTS_MODELS_DIR / f"{voice}.onnx"
    cfg = TTS_MODELS_DIR / f"{voice}.onnx.json"
    if not onnx.exists():
        raise FileNotFoundError(
            f"TTS model not found: {onnx}\n"
            f"Download it from https://huggingface.co/rhasspy/piper-voices and "
            f"place both .onnx and .onnx.json files in {TTS_MODELS_DIR}/"
        )
    if not cfg.exists():
        raise FileNotFoundError(
            f"TTS config not found: {cfg}\n"
            "The .onnx.json config file must be alongside the .onnx model."
        )
    return onnx, cfg


def _synthesize_sync(text: str, voice: str) -> bytes:
    """Synthesize speech and return WAV bytes (runs in a thread pool)."""
    onnx, cfg = _resolve_model_paths(voice)
    piper_voice = _load_voice(str(onnx), str(cfg))

    buf = io.BytesIO()
    with wave.open(buf, "wb") as wav:
        # piper-tts >= 1.3 renamed the direct-to-wave-file API to synthesize_wav().
        piper_voice.synthesize_wav(text, wav)
    return buf.getvalue()


# ── Public API ────────────────────────────────────────────────────────────────

async def speak(text: str, voice: str | None = None) -> bytes:
    """
    Generate WAV audio bytes for *text* using the configured Piper voice.

    Raises
    ------
    RuntimeError   – piper-tts not installed or TTS disabled.
    FileNotFoundError – voice model files missing.
    """
    if not TTS_ENABLED:
        raise RuntimeError("TTS is disabled (set TTS_ENABLED=true in .env to enable).")

    clean = clean_for_tts(text)
    if not clean:
        # Return a minimal valid silent WAV (44-byte header, 0 data bytes)
        return _empty_wav()

    selected_voice = voice or TTS_DEFAULT_VOICE
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, _synthesize_sync, clean, selected_voice)


def _empty_wav() -> bytes:
    """Return a minimal valid 0-sample WAV so callers never get an empty response."""
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)       # 16-bit
        wav.setframerate(22050)
        wav.writeframes(b"")
    return buf.getvalue()
