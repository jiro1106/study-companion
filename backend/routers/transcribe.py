"""
routers/transcribe.py
POST /api/transcribe  –  Local speech-to-text via faster-whisper.

Accepts:  multipart/form-data   field name: "audio"
Returns:  {"text": "<transcription>"}

Supported audio formats
-----------------------
Any format that ffmpeg can decode, including the browser-native outputs:
  audio/webm;codecs=opus   (Chrome / Electron default)
  audio/ogg;codecs=opus    (Firefox default)
  audio/wav
  audio/mp4 / audio/mpeg

Note: ffmpeg must be installed and on PATH for non-WAV formats.
On Windows you can add it from https://www.gyan.dev/ffmpeg/builds/
"""
from __future__ import annotations

import logging
import os
import tempfile
import uuid

from fastapi import APIRouter, File, HTTPException, UploadFile

from core.config import MAX_AUDIO_SIZE_MB
from models.schemas import TranscribeResponse
from services.whisper_stt import transcribe

router = APIRouter(tags=["Voice"])
log = logging.getLogger(__name__)

_MAX_BYTES = int(MAX_AUDIO_SIZE_MB * 1024 * 1024)

# Accepted MIME type prefixes (browsers may append codec parameters)
_ALLOWED_PREFIXES = (
    "audio/",
    "application/octet-stream",  # some recorders omit the MIME type
)


@router.post("/api/transcribe", response_model=TranscribeResponse)
async def transcribe_audio(audio: UploadFile = File(...)):
    """
    Transcribe uploaded audio to text using a local Whisper model.

    The audio file is written to a temporary location, processed, then deleted.
    The microphone is released by the client before this endpoint is called.
    """
    # Lenient MIME-type check — browsers can send unusual values
    ct = (audio.content_type or "").lower().split(";")[0].strip()
    if ct and not any(ct.startswith(p) for p in _ALLOWED_PREFIXES):
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported audio type '{audio.content_type}'. "
                   "Expected audio/webm, audio/ogg, audio/wav, or audio/mp4.",
        )

    data = await audio.read()

    if not data:
        raise HTTPException(status_code=400, detail="Empty audio file received.")

    if len(data) > _MAX_BYTES:
        raise HTTPException(
            status_code=413,
            detail=(
                f"Audio file too large ({len(data) // 1024} KB). "
                f"Maximum: {MAX_AUDIO_SIZE_MB:.0f} MB."
            ),
        )

    # Write to a named temp file; faster-whisper needs a file path
    tmp_path = os.path.join(
        tempfile.gettempdir(),
        f"bardy_rec_{uuid.uuid4().hex}.webm",
    )
    try:
        with open(tmp_path, "wb") as fh:
            fh.write(data)

        text = await transcribe(tmp_path)

    except RuntimeError as exc:
        log.warning("Transcription service error: %s", exc)
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    except Exception as exc:  # noqa: BLE001
        log.exception("Unexpected transcription error")
        raise HTTPException(
            status_code=500,
            detail=f"Transcription failed: {exc}",
        ) from exc

    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass

    if not text:
        raise HTTPException(
            status_code=422,
            detail="No speech detected in the recording. Please try again.",
        )

    return TranscribeResponse(text=text)
