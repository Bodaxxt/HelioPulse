#!/usr/bin/env pwsh
# ============================================================
# HelioPulse — Start All Services (Development Mode)
# Usage: .\start_dev.ps1
# ============================================================

Write-Host ""
Write-Host "  ☀  HelioPulse Development Startup" -ForegroundColor Yellow
Write-Host "  ══════════════════════════════════" -ForegroundColor DarkGray
Write-Host ""

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

# ── 1. Check Python ──────────────────────────────────────────────────────────
$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) {
    Write-Host "  ✗ Python not found. Install Python 3.11+ and try again." -ForegroundColor Red
    exit 1
}
Write-Host "  ✓ Python: $((python --version))" -ForegroundColor Green

# ── 2. Check Node ────────────────────────────────────────────────────────────
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Host "  ✗ Node.js not found. Install Node 20+ and try again." -ForegroundColor Red
    exit 1
}
Write-Host "  ✓ Node:   $((node --version))" -ForegroundColor Green

# ── 3. Create snapshots dir ──────────────────────────────────────────────────
New-Item -ItemType Directory -Force -Path "$root\snapshots" | Out-Null
Write-Host "  ✓ Snapshots directory ready" -ForegroundColor Green

Write-Host ""
Write-Host "  Starting backend  → http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host "  Starting frontend → http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Press Ctrl+C in each terminal to stop." -ForegroundColor DarkGray
Write-Host ""

# ── 4. Launch backend in a new terminal window ───────────────────────────────
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "Set-Location '$root'; Write-Host '  [Backend] Starting FastAPI...' -ForegroundColor Yellow; python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
)

# Small delay so backend has a head start
Start-Sleep -Seconds 2

# ── 5. Launch frontend in a new terminal window ──────────────────────────────
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "Set-Location '$root\frontend'; Write-Host '  [Frontend] Starting Next.js...' -ForegroundColor Yellow; npm run dev"
)

Write-Host "  Both services launched in separate terminals." -ForegroundColor Green
Write-Host "  Open http://localhost:3000 in your browser." -ForegroundColor Cyan

