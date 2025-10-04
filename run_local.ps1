# PowerShell helper to run the dev backend and frontend
# Usage: .\run_local.ps1

# Start backend in a new terminal
Write-Host "Starting backend (uvicorn) on http://localhost:8000"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd $(Resolve-Path .).Path; .\.venv\Scripts\Activate.ps1; pip install -r backend\requirements-dev.txt; uvicorn backend.simple_app:app --reload --host 0.0.0.0 --port 8000"

# Start frontend in current terminal after installing deps
Write-Host "Install frontend deps and start Next.js dev server on http://localhost:3000"
cd .\frontend
if (-not (Test-Path -Path .\.venv_frontend)) {
    Write-Host "Installing frontend dependencies..."
}
npm install
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd $(Resolve-Path ..).Path; cd frontend; npm run dev"
