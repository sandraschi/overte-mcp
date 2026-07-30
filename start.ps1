param(
    [switch]$Headless,
    [switch]$BackendOnly,
    [switch]$FrontendOnly,
    [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"
$ScriptRoot = Split-Path -Parent $PSCommandPath
$BackendPort = 11110
$FrontendPort = 11111
$BackendEntry = Join-Path $ScriptRoot "run_server.py"
$WebRoot = Join-Path $ScriptRoot "webapp"

# --- Port zombie clearing ---
Get-NetTCPConnection -LocalPort $BackendPort -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
Get-NetTCPConnection -LocalPort $FrontendPort -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }

# --- Prereqs ---
if (-not (Get-Command uv -ErrorAction SilentlyContinue)) {
    Write-Host "uv not found. Install: winget install Astral.uv" -ForegroundColor Red
    exit 1
}
if (-not $BackendOnly -and -not (Get-Command bun -ErrorAction SilentlyContinue)) {
    Write-Host "bun not found. Install: winget install Oven-sh.Bun" -ForegroundColor Red
    exit 1
}
if (-not $BackendOnly -and -not (Test-Path (Join-Path $WebRoot "node_modules"))) {
    Push-Location $WebRoot
    bun install
    Pop-Location
}

# --- Start backend ---
if (-not $FrontendOnly) {
    Write-Host "Starting backend on :$BackendPort ..." -ForegroundColor Cyan
    $env:MCP_PORT = "$BackendPort"; $env:MCP_HOST = "127.0.0.1"
    Start-Process powershell -ArgumentList "-NoProfile", "-Command", "uv run python $BackendEntry" -WindowStyle Normal -WorkingDirectory $ScriptRoot

    # Health poll (up to 60s)
    $health = "http://127.0.0.1:$BackendPort/api/health"
    for ($i = 0; $i -lt 60; $i++) {
        try {
            $r = Invoke-WebRequest -Uri $health -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
            if ($r.StatusCode -eq 200) { Write-Host "Backend OK at $health" -ForegroundColor Green; break }
        } catch {}
        Start-Sleep 1
    }
}

# --- Start frontend ---
if (-not $BackendOnly) {
    Write-Host "Starting frontend on :$FrontendPort ..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoProfile", "-Command", "bun run dev" -WindowStyle Normal -WorkingDirectory $WebRoot
}

# --- Open browser ---
if (-not $Headless -and -not $NoBrowser -and -not $BackendOnly) {
    Start-Sleep 3
    Start-Process "http://127.0.0.1:$FrontendPort"
}

Write-Host "=== overte-mcp ===" -ForegroundColor Cyan
if (-not $BackendOnly) { Write-Host "Frontend : http://127.0.0.1:$FrontendPort" }
Write-Host "Backend  : http://127.0.0.1:$BackendPort/api/health"

# --- Keep alive ---
while ($true) {
    Start-Sleep 10
    try {
        $null = Invoke-WebRequest -Uri $health -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
    } catch {
        Write-Host "Backend disconnected. Restarting..." -ForegroundColor Yellow
        Start-Process powershell -ArgumentList "-NoProfile", "-Command", "uv run python $BackendEntry" -WindowStyle Normal -WorkingDirectory $ScriptRoot
    }
}
