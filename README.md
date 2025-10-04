# pdf-extraction-playground

This repository contains a Next.js frontend and a FastAPI backend for experimenting with PDF extraction pipelines (born-digital extraction, OCR fallback, figure extraction, and Markdown export).

This patch aims to make the project easy to run after cloning on Windows, macOS or Linux.

## Quick start (recommended, Windows PowerShell)

1. Clone the repo and change into the project folder:

```powershell
git clone https://github.com/v-s-v-i-s-h-w-a-s/pdf-ML.git
cd pdf-ML
```

2. Create and activate a Python virtual environment, then install backend dev deps:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install --upgrade pip
pip install -r backend/requirements-dev.txt
```

3. Install Node dependencies for the frontend and copy example env file:

```powershell
cd frontend
npm install
copy .env.local.example .env.local
cd ..
```

4. Start the backend and frontend in two terminals:

Terminal A (backend):
```powershell
.\.venv\Scripts\Activate.ps1
uvicorn backend.simple_app:app --reload --host 0.0.0.0 --port 8000
```

Terminal B (frontend):
```powershell
cd frontend
npm run dev
```

Open http://localhost:3000 in your browser.

## Notes and requirements

- The lightweight backend used for local development is `backend/simple_app.py` (FastAPI). It implements extraction endpoints (born-digital with `pdfminer.six`, OCR fallback via `pytesseract`, and server-side page rendering with `pdf2image`).
- For OCR and image rendering you need system binaries installed on your machine:
	- Tesseract OCR (add to PATH) — required for OCR. On Windows, install from UB Mannheim builds or Tesseract official installer.
	- Poppler (for `pdf2image`) — required for PDF → image rendering. On Windows, install and add `bin/` to PATH.
- If you prefer not to install system binaries, the born-digital extractor (pdfminer) still works for many PDFs.
- The frontend uses `NEXT_PUBLIC_API_BASE_URL` (copy `frontend/.env.local.example` to `frontend/.env.local` if you need to change it).

### Installing Tesseract (Windows)

1. Download and install Tesseract from: https://github.com/UB-Mannheim/tesseract/wiki
2. Add the Tesseract `bin` folder to your PATH environment variable.

### Installing Poppler (Windows)

1. Download Poppler for Windows (e.g., from https://github.com/oschwartz10612/poppler-windows/releases)
2. Extract and add the `bin` folder to your PATH.

### Quick endpoint test (PowerShell)

Upload a PDF and request a download of the generated Markdown (replace path):

```powershell
Invoke-WebRequest -Uri 'http://localhost:8000/extract/surya?download=true' -Method Post -Form @{ file = Get-Item 'C:\path\to\your.pdf' } -OutFile 'extracted.md'
```


## CI and contributions

There is a GitHub Actions workflow included (`.github/workflows/ci.yml`) that runs a minimal backend Python check and installs frontend dependencies. See `CONTRIBUTING.md` for more.

## Pushing this repository to GitHub

If you'd like to push your local copy to the GitHub URL used above (you must have push permissions), set the remote and push:

```powershell
git remote add origin https://github.com/v-s-v-i-s-h-w-a-s/pdf-ML.git
git branch -M main
git push -u origin main
```

If you prefer automated helper scripts, see `scripts/git_push_to_remote.ps1` (Windows PowerShell) included in this repo.

## Further improvements

- Convert detected tables to proper Markdown tables (currently tables are preserved in fenced blocks).
- Store extracted images as files instead of base64 if you need smaller Markdown payloads.
- Add background job processing for long OCR jobs (e.g., Celery, RQ, or a cloud task queue).

Enjoy exploring PDF extraction!