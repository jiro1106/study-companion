"""
services/whisper_stt.py
Local speech-to-text using faster-whisper (CTranslate2 runtime).

Model sizes and recommended use cases
--------------------------------------
  tiny    – fastest, lowest accuracy; good for quick demos
  base    – good balance of speed / accuracy on CPU  ← default
  small   – noticeably better accuracy, ~2× slower than base
  medium  – high accuracy, slow on CPU
  large-v2 – highest accuracy, very slow on CPU

Configuration (environment variables / .env)
--------------------------------------------
  WHISPER_MODEL        = base          # model size
  WHISPER_DEVICE       = cpu           # "cpu" or "cuda"
  WHISPER_COMPUTE_TYPE = int8          # "int8" (CPU-friendly) or "float16" (GPU)

Enabling GPU acceleration
--------------------------
1. Make sure CUDA is installed on the host.
2. pip install onnxruntime-gpu  (replaces the CPU onnxruntime)
3. Set in .env:
       WHISPER_DEVICE=cuda
       WHISPER_COMPUTE_TYPE=float16
No code changes required – CTranslate2 picks up the GPU build automatically.

Language support
----------------
English is detected by default.  faster-whisper auto-detects language from the
first 30 s of audio.  For multi-language support no changes are needed here.
"""
from __future__ import annotations

import asyncio
import logging
from functools import lru_cache
from pathlib import Path

from core.config import WHISPER_MODEL, WHISPER_DEVICE, WHISPER_COMPUTE_TYPE

log = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def _load_model():
    """Load (and cache) the Whisper model once on first use."""
    try:
        from faster_whisper import WhisperModel  # type: ignore[import]
    except ImportError as exc:
        raise RuntimeError(
            "faster-whisper is not installed.\n"
            "Run:  pip install faster-whisper\n"
            "Then restart the backend."
        ) from exc

    log.info(
        "Loading Whisper model '%s' on %s (compute_type=%s) …",
        WHISPER_MODEL,
        WHISPER_DEVICE,
        WHISPER_COMPUTE_TYPE,
    )
    return WhisperModel(
        WHISPER_MODEL,
        device=WHISPER_DEVICE,
        compute_type=WHISPER_COMPUTE_TYPE,
    )


async def transcribe(audio_path: str | Path) -> str:
    """
    Transcribe an audio file to text.

    Runs the CPU-bound inference in a thread pool executor so the event loop
    stays unblocked while the model processes audio.
    """

    def _run() -> str:
        model = _load_model()
        segments, info = model.transcribe(
            str(audio_path),
            beam_size=5,
            vad_filter=True,  # skip silent regions automatically
        )
        log.debug(
            "Detected language: %s (%.0f%% confidence)",
            info.language,
            info.language_probability * 100,
        )
        return " ".join(seg.text.strip() for seg in segments).strip()

    return await asyncio.get_running_loop().run_in_executor(None, _run)
