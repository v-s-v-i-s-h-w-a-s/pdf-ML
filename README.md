# pdf-extraction-playground

This repository contains a Next.js frontend and a FastAPI backend for experimenting with PDF extraction pipelines.

Quick start (dev):

1. Start a Python virtual environment and install minimal backend dev deps:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements-dev.txt
```

2. Start the lightweight local backend (mocked) and frontend:

```powershell
# Run the helper (starts uvicorn backend and Next.js dev server)
.\run_local.ps1
```

3. Open the frontend at http://localhost:3000. The frontend expects an env var `NEXT_PUBLIC_API_BASE_URL`.
Copy `frontend/.env.local.example` to `frontend/.env.local` if you need to customize the API URL.

Full backend (optional):

If you want the full feature set, install the heavy dependencies listed in `backend/requirements.txt` (this includes `torch`, `layoutparser`, and `modal`), then run `uvicorn backend.modal_app:web_app --reload --port 8000`.

Notes:

- The frontend uses `NEXT_PUBLIC_API_BASE_URL` to find the backend. The example file `frontend/.env.local.example` points to http://localhost:8000 by default.
- The local `backend/simple_app.py` is a lightweight mock that implements the same endpoints and is intended for quick development without installing heavy ML dependencies.

Enjoy exploring PDF extraction!