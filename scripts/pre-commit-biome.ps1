# Fleet: mcp-central-docs/templates/pre-commit-biome.ps1
# Copy to {repo}/scripts/pre-commit-biome.ps1 - used by .pre-commit-config.yaml local hook.
# Detects the web root (webapp/ canonical, then legacy variants) and runs the
# project-local biome. Hooks run NON-INTERACTIVE (no login PATH, no npm shims):
# every tool resolves by absolute path, first hit wins, else fail LOUD.
# No installs here - a missing node_modules is `just bootstrap`'s job; installing
# mid-commit mutates the tree the hook is validating (see TRAPS #41).

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot

$webRoot = $null
foreach ($candidate in @("webapp", "webapp/frontend", "web_sota", "web-sota", "web", "frontend", "ui", "web_app")) {
    $path = Join-Path $repoRoot $candidate
    if (Test-Path (Join-Path $path "package.json")) {
        $webRoot = $path
        break
    }
}

if (-not $webRoot) {
    exit 0
}

if (-not (Test-Path (Join-Path $webRoot "node_modules"))) {
    Write-Warning "pre-commit-biome: node_modules missing in $webRoot - run 'just bootstrap' (never auto-installed: hooks must be side-effect-free)"
    exit 1
}

$localBiome = Join-Path $webRoot "node_modules/.bin/biome.cmd"
$bunx = Join-Path $env:USERPROFILE ".bun/bin/bunx.exe"
$npx = "C:/Program Files/nodejs/npx.cmd"

Push-Location $webRoot
try {
    if (Test-Path $localBiome) {
        & $localBiome ci src/
    } elseif (Test-Path $bunx) {
        & $bunx --package @biomejs/biome biome ci src/
    } elseif (Test-Path $npx) {
        & $npx --no-install biome ci src/
    } else {
        Write-Warning "pre-commit-biome: no biome executable (node_modules/.bin, bunx, npx all missing)"
        exit 1
    }
    exit $LASTEXITCODE
}
finally {
    Pop-Location
}
