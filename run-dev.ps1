# Run Synapse dev server (no system Node.js required)
# Prefer:  .\run-dev.cmd
# Or:      powershell -ExecutionPolicy Bypass -File .\run-dev.ps1
$nodeBin = Join-Path $PSScriptRoot ".tools\nodejs\node-v22.16.0-win-x64"
$npmCmd = Join-Path $nodeBin "npm.cmd"
if (-not (Test-Path $npmCmd)) {
    Write-Error "Portable Node.js not found at $nodeBin. Install Node.js from https://nodejs.org or run install-deps.cmd"
    exit 1
}
$env:PATH = "$nodeBin;$env:PATH"
Set-Location $PSScriptRoot
if (-not (Test-Path "node_modules\vite")) {
    Write-Host "Installing dependencies..."
    & $npmCmd install
}
Write-Host "Starting dev server at http://localhost:5173/"
& $npmCmd run dev
