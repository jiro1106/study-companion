"""
routers/health.py
GET /api/health  –  Ollama connectivity + available model list.
"""
from __future__ import annotations

from fastapi import APIRouter

from core.config import OLLAMA_BASE_URL, OLLAMA_MODEL
from services.ollama import check_ollama_health

router = APIRouter(tags=["Health"])


@router.get("/api/health")
async def health() -> dict:
    """Check API health and Ollama connectivity."""
    connected, models = await check_ollama_health()
    return {
        "status": "ok",
        "ollama": {
            "connected": connected,
            "base_url": OLLAMA_BASE_URL,
            "model": OLLAMA_MODEL,
            "available_models": models,
        },
    }
