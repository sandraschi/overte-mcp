#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Build MCPB package for overte-mcp (fleet MCPB_PACKAGING_STANDARDS).

.DESCRIPTION
    Syncs src/overte_mcp into mcpb/src/overte_mcp, validates manifest.json,
    packs from mcpb/ into dist/overte-mcp.mcpb. Never uses mcpb init/create.

.PARAMETER OutputDir
    Output directory under repo root (default: dist)
#>

param(
    [string]$OutputDir = "dist"
)

$ErrorActionPreference = "Stop"

function Write-Step([string]$Message) { Write-Host "`n[STEP] $Message" -ForegroundColor Cyan }
function Write-Ok([string]$Message) { Write-Host "[OK] $Message" -ForegroundColor Green }
function Write-Fail([string]$Message) { Write-Host "[ERROR] $Message" -ForegroundColor Red }

$RepoRoot = Split-Path $PSScriptRoot -Parent
Set-Location $RepoRoot

Write-Host "=== overte-mcp MCPB builder ===" -ForegroundColor Cyan
Write-Host "Standard: mcp-central-docs MCPB_PACKAGING_STANDARDS.md" -ForegroundColor Cyan

Write-Step "Checking mcpb CLI..."
$mcpbCmd = Get-Command mcpb -ErrorAction SilentlyContinue
if (-not $mcpbCmd) {
    $npmMcpb = Join-Path $env:APPDATA "npm\mcpb.ps1"
    if (Test-Path $npmMcpb) {
        $mcpbCmd = $npmMcpb
    }
}
if (-not $mcpbCmd) {
    Write-Host "mcpb not on PATH; using bunx @anthropic-ai/mcpb" -ForegroundColor Yellow
    $useBunx = $true
} else {
    $useBunx = $false
    $ver = (& $mcpbCmd --version 2>&1 | Out-String).Trim()
    Write-Ok "mcpb $ver"
}

Write-Step "Syncing src\overte_mcp -> mcpb\src\overte_mcp..."
$srcPkg = Join-Path $RepoRoot "src\overte_mcp"
$dstPkg = Join-Path $RepoRoot "mcpb\src\overte_mcp"
if (-not (Test-Path $srcPkg)) {
    Write-Fail "Source not found: $srcPkg"
    exit 1
}
if (Test-Path $dstPkg) {
    Remove-Item $dstPkg -Recurse -Force
}
Copy-Item -Path $srcPkg -Destination $dstPkg -Recurse -Force
Get-ChildItem -Path $dstPkg -Recurse -Directory -Filter "__pycache__" -ErrorAction SilentlyContinue |
    ForEach-Object { Remove-Item $_.FullName -Recurse -Force -ErrorAction SilentlyContinue }
Get-ChildItem -Path $dstPkg -Recurse -File -Filter "*.pyc" -ErrorAction SilentlyContinue |
    ForEach-Object { Remove-Item $_.FullName -Force -ErrorAction SilentlyContinue }
Write-Ok "Synced overte_mcp package tree"

$mcpbManifest = Join-Path $RepoRoot "mcpb\manifest.json"
if (-not (Test-Path $mcpbManifest)) {
    Write-Fail "mcpb\manifest.json not found"
    exit 1
}

$mcpbIgnore = Join-Path $RepoRoot "mcpb\.mcpbignore"
if (Test-Path $mcpbIgnore) {
    Write-Ok "Ignore file: mcpb\.mcpbignore"
} else {
    Write-Host "[WARN] mcpb\.mcpbignore missing" -ForegroundColor Yellow
}

Write-Step "Validating mcpb\manifest.json..."
if ($useBunx) {
    $validateOutput = bunx --bun @anthropic-ai/mcpb validate $mcpbManifest 2>&1
    $validateOk = $LASTEXITCODE -eq 0
} else {
    $validateOutput = & $mcpbCmd validate $mcpbManifest 2>&1
    $validateOk = $?
}
if (-not $validateOk) {
    Write-Fail "Manifest validation failed:"
    Write-Host ($validateOutput | Out-String) -ForegroundColor Red
    exit 1
}
Write-Ok "Manifest validation passed"

Write-Step "Preparing output directory..."
$distDir = Join-Path $RepoRoot $OutputDir
if (-not (Test-Path $distDir)) {
    New-Item -ItemType Directory -Path $distDir -Force | Out-Null
}
$packagePath = Join-Path $distDir "overte-mcp.mcpb"
if (Test-Path $packagePath) {
    Remove-Item $packagePath -Force
}

Write-Step "Packing from mcpb/ ..."
$mcpbDir = Join-Path $RepoRoot "mcpb"
Push-Location $mcpbDir
try {
    $relOut = Join-Path ".." $OutputDir
    $outRel = Join-Path $relOut "overte-mcp.mcpb"
    if ($useBunx) {
        bunx --bun @anthropic-ai/mcpb pack . $outRel
        $packOk = $LASTEXITCODE -eq 0
    } else {
        & $mcpbCmd pack . $outRel
        $packOk = $?
    }
} finally {
    Pop-Location
}

if (-not $packOk) {
    Write-Fail "MCPB pack failed"
    exit 1
}

if (-not (Test-Path $packagePath)) {
    Write-Fail "Expected package missing: $packagePath"
    exit 1
}

$sizeMB = [math]::Round((Get-Item $packagePath).Length / 1MB, 3)
Write-Ok "Built $packagePath ($sizeMB MB)"
if ($sizeMB -gt 5) {
    Write-Host "[WARN] Bundle larger than 5 MB — check .mcpbignore exclusions" -ForegroundColor Yellow
}

Write-Host "`nDone. Bundle: $packagePath" -ForegroundColor Green
