param(
    [switch]$Headless,
    [switch]$BackendOnly,
    [switch]$FrontendOnly,
    [switch]$NoBrowser
)

# --- SOTA Fleet Start.ps1 for overte-mcp ---
# Required features:
#   1. Port zombie kill before binding
#   2. Health poll after backend start
#   3. Browser auto-open when ready
#   4. Headless mode for CI/probes
#   5. Require-Command prereq checks
#   6. Bun integration

# Per-repo config
$RepoName = "overte-mcp"
$BackendPort = 11110
$FrontendPort = 11111
$HealthEndpoint = "http://127.0.0.1:$BackendPort/api/health"
$BackendPackage = "src.overte_mcp.http_server"
$WebRoot = Join-Path $PSScriptRoot "webapp"

$ErrorActionPreference = "Stop"

# --- Headless mode ---
if ($Headless -and ($Host.UI.RawUI.WindowTitle -notmatch 'Hidden')) {
    Start-Process pwsh -ArgumentList '-NoProfile', '-File', $PSCommandPath, '-Headless' -WindowStyle Hidden
    exit
}
$WindowStyle = if ($Headless) { 'Hidden' } else { 'Normal' }

# --- Require-Command prereq ---
function Require-Command {
    param([string]$Cmd, [string]$WingetId, [string]$Label)
    if (Get-Command $Cmd -ErrorAction SilentlyContinue) { return }
    Write-Host "  $Label not found - installing via winget..." -ForegroundColor Yellow
    if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
        Write-Host "ERROR: winget unavailable. Install $Label manually ($WingetId)." -ForegroundColor Red
        exit 1
    }
    winget install --id $WingetId --silent --accept-source-agreements --accept-package-agreements
    $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" +
                [System.Environment]::GetEnvironmentVariable("PATH","User")
    if (-not (Get-Command $Cmd -ErrorAction SilentlyContinue)) {
        Write-Host "Installed $Label but '$Cmd' still not in PATH. Reopen PowerShell and retry." -ForegroundColor Yellow
        exit 1
    }
}

# --- Port zombie kill ---
function Clear-Port {
    param([int]$Port)
    Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | ForEach-Object {
        Write-Host "  Killing zombie on :$Port (PID $($_.OwningProcess))" -ForegroundColor Yellow
        Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
    }
}

# --- Prereq sync ---
Write-Host "=== $RepoName ===" -ForegroundColor Cyan

# Install Python tools via uv if missing (Steve guard)
Require-Command "uv" "Astral.uv" "uv (Python package manager)"

if (-not $BackendOnly) {
    Write-Host "Checking frontend deps..." -ForegroundColor DarkGray
    Require-Command "bun" "Oven-sh.Bun" "Bun (JS package manager and runtime)"
    $nodeModules = Join-Path $WebRoot "node_modules"
    if (-not (Test-Path $nodeModules)) {
        Push-Location $WebRoot
        bun install
        if ($LASTEXITCODE -ne 0) { Write-Host "bun install failed" -ForegroundColor Red; Pop-Location; exit 1 }
        Pop-Location
    }
}

# --- Kill zombies ---
Clear-Port -Port $BackendPort
Clear-Port -Port $FrontendPort
Start-Sleep -Milliseconds 500

# --- Start backend ---
$backendProc = $null
if (-not $FrontendOnly) {
    Write-Host "Starting backend on :$BackendPort ..." -ForegroundColor Cyan
    $uvExe = (Get-Command uv).Source
    $backendProc = Start-Process $uvExe -NoNewWindow -PassThru -ArgumentList @(
        "run", "python", "-m", $BackendPackage
    ) -WorkingDirectory $PSScriptRoot

    # Health poll (up to 60s)
    $ok = $false
    for ($i = 0; $i -lt 60; $i++) {
        try {
            $r = Invoke-WebRequest -Uri $HealthEndpoint -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
            if ($r.StatusCode -eq 200) { $ok = $true; break }
        } catch {}
        Start-Sleep 1
    }
    if (-not $ok) {
        Write-Host "WARN: backend health not ready after 60s - continuing." -ForegroundColor Yellow
    } else {
        Write-Host "Backend OK at $HealthEndpoint" -ForegroundColor Green
    }
}

# --- Start frontend ---
$frontendProc = $null
if (-not $BackendOnly) {
    Write-Host "Starting frontend on :$FrontendPort ..." -ForegroundColor Cyan
    $frontendProc = Start-Process pwsh -NoNewWindow -PassThru -ArgumentList @(
        "-NoProfile", "-Command", "bun run dev"
    ) -WorkingDirectory $WebRoot
}

# --- Open browser ---
if (-not $Headless -and -not $NoBrowser -and -not $BackendOnly) {
    $frontendUrl = "http://127.0.0.1:$FrontendPort"
    Start-Sleep -Seconds 3
    try {
        Start-Process $frontendUrl
        Write-Host "Opened $frontendUrl" -ForegroundColor Gray
    } catch {
        Write-Host "Frontend at $frontendUrl" -ForegroundColor Gray
    }
}

Write-Host "=== $RepoName running ===" -ForegroundColor Cyan
if (-not $BackendOnly) { Write-Host "Frontend : http://127.0.0.1:$FrontendPort" }
Write-Host "Backend  : $HealthEndpoint"

# --- Keep alive ---
if ($Headless) {
    while ($true) {
        if ($null -ne $backendProc -and $backendProc.HasExited) { break }
        Start-Sleep 5
    }
}
