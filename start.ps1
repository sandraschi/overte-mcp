# Overte MCP stack launcher (naked-PC: requires uv + npm/bun)
$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot

function Require-Command([string]$Name) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Missing required command: $Name"
    }
}

Require-Command "uv"
Require-Command "npm"

Set-Location $Root
Write-Host "uv sync..."
uv sync

Write-Host "Starting backend on 11110..."
Start-Process -FilePath "uv" -ArgumentList @("run", "python", "-m", "overte_mcp.http_server") -WorkingDirectory $Root

$web = Join-Path $Root "webapp"
if (-not (Test-Path (Join-Path $web "node_modules"))) {
    Write-Host "npm install (webapp)..."
    Set-Location $web
    npm install
}
Write-Host "Starting frontend on 11111..."
Start-Process -FilePath "npm" -ArgumentList @("run", "dev") -WorkingDirectory $web

Write-Host "Dashboard: http://localhost:11111"
Write-Host "API:       http://localhost:11110/api/health"
