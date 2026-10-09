# Backend

The Bardy backend is a FastAPI service that uses a local [Ollama](https://ollama.com/) model for chat and study-content generation.

## Prerequisites

- Python 3.10 or later
- [Ollama](https://ollama.com/) running locally
- The model named by `OLLAMA_MODEL` installed in Ollama (default: `llama3.2`)

## Setup

From the repository root:

```bash
python3.12 -m venv .venv
.venv/bin/python -m pip install -r backend/requirements.txt
test -f backend/.env || cp backend/.env.example backend/.env
```

Replace `python3.12` with the command for any installed Python 3.10+ version.

Edit `backend/.env` only if you need a different Ollama URL, model, or API port.

## Run

From the repository root:

```bash
cd backend
../.venv/bin/python -m uvicorn app:app --reload
```

The API starts at `http://127.0.0.1:8000`. Confirm that both the API and Ollama are available at:

```text
http://127.0.0.1:8000/api/health
```

Interactive API documentation is available at `http://127.0.0.1:8000/docs`.
