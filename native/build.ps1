$ErrorActionPreference="Stop";$R = Split-Path -Parent $PSScriptRoot;$N = Split-Path -Leaf $R;$T = "x86_64-pc-windows-msvc"
New-Item -ItemType Directory -Force -Path "$PSScriptRoot\resources","$PSScriptRoot\binaries"|Out-Null
foreach($f in @("webapp\src\lib\api.ts","web_sota\src\lib\api.ts")){$p = Join-Path $R $f;if(Test-Path $p){$c = Get-Content $p -Raw
    if($c -match "127.0.0.1:(\d+)" -and [int]$Matches[1] -ne 11110){throw "API port mismatch in $p"};break}}
foreach($d in @("web_sota","webapp\frontend","webapp")){$f = Join-Path $R $d;if(Test-Path "$f\package.json"){Push-Location $f
    bun install;if(Get-Command npx -EA 0){npx tsc --noEmit 2>&1;if($LASTEXITCODE -ne 0){throw "TS FAILED"}}
    bun run build;if($LASTEXITCODE -ne 0){throw "Frontend FAILED"};Pop-Location;break}}
$s = "$R\overte-mcp-backend.spec";if(-not(Test-Path $s)){throw "No spec at $s"}
$pyi = "$R\.venv\Scripts\pyinstaller.exe";if(-not(Test-Path $pyi)){uv add --dev pyinstaller}
Push-Location $R;Remove-Item "dist\overte-mcp-backend.exe" -Force -EA 0
& $pyi $s --clean --noconfirm;if($LASTEXITCODE -ne 0){throw "PyInstaller FAILED"}
$e = "dist\overte-mcp-backend.exe";$m = (Get-Item $e).Length/1MB;if($m -lt 5){throw "Backend exe only $([math]::Round($m,1)) MB"}
Copy-Item $e "$PSScriptRoot\resources\overte-mcp-backend.exe" -Force
Copy-Item $e "$PSScriptRoot\binaries\overte-mcp-backend-$T.exe" -Force;Pop-Location
if(Test-Path "$R\.env.example"){Copy-Item "$R\.env.example" "$PSScriptRoot\resources\.env.example" -Force}
Push-Location $PSScriptRoot; $env:Path = "$env:USERPROFILE\.cargo\bin;$env:Path"
npx @tauri-apps/cli build --bundles nsis; if($LASTEXITCODE -ne 0){throw "Tauri FAILED"}
Pop-Location; Write-Host "=== Build complete ===" -ForegroundColor Green
