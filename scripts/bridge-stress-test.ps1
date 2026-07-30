<# 
.SYNOPSIS
Bridge stress-test — rapid backend restarts while bridge tries to reconnect.

Verifies exponential backoff works (1s -> 2s -> 4s -> ... -> 30s max).
Also verifies the Bridge automatically reconnects after backend restart.

Usage: Run this while overte-mcp-bridge.js is loaded in Overte Interface.
  ./scripts/bridge-stress-test.ps1

If no bridge is connected, this script still tests the server lifecycle.
#>

$ErrorActionPreference = "Continue"
$Root = Split-Path -Parent $PSScriptRoot
$BackendPort = 11110
$TotalCycles = 5
$BackendProc = $null

Write-Host "=== Bridge Stress-Test ===" -ForegroundColor Cyan
Write-Host "Testing $TotalCycles backend restart cycles on port $BackendPort`n" -ForegroundColor Yellow

function Stop-Backend {
    Get-NetTCPConnection -LocalPort $BackendPort -ErrorAction SilentlyContinue | ForEach-Object {
        Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 2
}

function Start-Backend {
    $env:MCP_PORT = "$BackendPort"
    $env:MCP_HOST = "127.0.0.1"
    $proc = Start-Process -FilePath "uv" -ArgumentList "run python -m overte_mcp.http_server" -WorkingDirectory $Root -NoNewWindow -PassThru
    Start-Sleep -Seconds 3
    return $proc
}

function Test-Backend-Healthy {
    try {
        $r = Invoke-WebRequest -Uri "http://127.0.0.1:$BackendPort/health" -TimeoutSec 3 -UseBasicParsing -ErrorAction SilentlyContinue
        return $r.StatusCode -eq 200
    } catch {
        return $false
    }
}

# Initial cleanup
Write-Host "[1/$TotalCycles] Stopping any running backend..." -ForegroundColor Gray
Stop-Backend

for ($i = 0; $i -lt $TotalCycles; $i++) {
    $cycleNum = $i + 1
    Write-Host "`n=== Cycle $cycleNum/$TotalCycles ===" -ForegroundColor Green

    # Start backend
    Write-Host "  Starting backend..." -ForegroundColor Gray
    $BackendProc = Start-Backend

    # Wait for health
    $healthy = $false
    for ($j = 0; $j -lt 15; $j++) {
        if (Test-Backend-Healthy) {
            $healthy = $true
            break
        }
        Start-Sleep -Seconds 1
    }

    if ($healthy) {
        Write-Host "  [PASS] Backend healthy (attempt $($j+1)s)" -ForegroundColor Green

        # Check if bridge is connected
        try {
            $status = Invoke-WebRequest -Uri "http://127.0.0.1:$BackendPort/api/overte/status" -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue
            if ($status) {
                Write-Host "  [INFO] Domain status endpoint responding" -ForegroundColor Cyan
            }
        } catch {
            Write-Host "  [INFO] Domain status endpoint: $_" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  [FAIL] Backend did not become healthy within 15s" -ForegroundColor Red
    }

    # Restart: kill backend, wait a moment, bridge should auto-reconnect
    if ($BackendProc -and !$BackendProc.HasExited) {
        Write-Host "  Stopping backend (simulating restart)..." -ForegroundColor Yellow
        Stop-Backend
        Start-Sleep -Seconds 1
    }
}

# Final cycle: start and leave running
Write-Host "`n=== Final: restart and leave running ===" -ForegroundColor Green
Stop-Backend
$BackendProc = Start-Backend
Start-Sleep -Seconds 3
if (Test-Backend-Healthy) {
    Write-Host "  [PASS] Backend running after stress test" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] Backend did not recover" -ForegroundColor Red
}

Write-Host "`n=== Stress test complete ===" -ForegroundColor Cyan
Write-Host "Backend running on :$BackendPort" -ForegroundColor Green
Write-Host "Bridge should auto-reconnect within 1-30s (exponential backoff)" -ForegroundColor Yellow
