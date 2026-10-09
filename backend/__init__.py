"""
backend package initialization.
Ensures backend directory is in sys.path so submodules can be imported smoothly.
"""
import sys
from pathlib import Path

_BACKEND_DIR = str(Path(__file__).resolve().parent)
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)
