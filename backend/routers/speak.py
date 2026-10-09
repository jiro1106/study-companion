"""
routers/speak.py
POST /api/speak  –  Local text-to-speech via Piper TTS.

Accepts:  application/json   {"text": "...", "voice": "en_US-lessac-medium"}
Returns:  audio/wav  (raw WAV bytes)

The 'voice' field is optional and defaults to the TTS_VOICE environment variable
(or "en_US-lessac-medium" if unset).

See backend/services/piper_tts.py for voice model download instructions.
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from models.schemas import SpeakRequest
from services.piper_tts import speak

router = APIRouter(tags=["Voice"])
log = logging.getLogger(__name__)


@router.post("/api/speak")
async def synthesize_speech(request: SpeakRequest):
    """
    Generate speech from text using a local Piper TTS voice model.

    Returns audio/wav bytes ready for playback in Electron/browser Audio API.
    Markdown formatting is stripped on the server before synthesis.
    """
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text must not be blank.")

    try:
        wav_bytes = await speak(request.text, request.voice)
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=503,
            detail=(
                "TTS voice model not found. "
                "See backend/services/piper_tts.py for download instructions.\n"
                f"Details: {exc}"
            ),
        ) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        log.exception("TTS synthesis error")
        raise HTTPException(
            status_code=500,
            detail=f"Speech synthesis failed: {exc}",
        ) from exc

    return Response(
        content=wav_bytes,
        media_type="audio/wav",
        headers={
            "Cache-Control": "no-store",
            "Content-Length": str(len(wav_bytes)),
        },
    )
