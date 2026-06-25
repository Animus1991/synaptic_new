# Run Synapse dev server
# replit-redesign (pnpm monorepo): pnpm run dev  →  artifacts/synapse @ :22167
# legacy main (flat npm):           npm run dev  →  :5173
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

$isMonorepo = Test-Path 'pnpm-workspace.yaml'

if ($isMonorepo) {
  $pnpm = Get-Command pnpm -ErrorAction SilentlyContinue
  if (-not $pnpm) {
    Write-Error 'pnpm is required for replit-redesign. Install: npm install -g pnpm'
    exit 1
  }
  if (-not (Test-Path 'node_modules')) {
    Write-Host 'Installing pnpm workspace dependencies...'
    pnpm install
  }
  Write-Host 'Starting Synapse (pnpm monorepo) at http://localhost:22167/'
  pnpm run dev
  exit $LASTEXITCODE
}

$nodeBin = Join-Path $PSScriptRoot '.tools\nodejs\node-v22.16.0-win-x64'
$npmCmd = Join-Path $nodeBin 'npm.cmd'
if (-not (Test-Path $npmCmd)) {
  $npmCmd = 'npm.cmd'
}
if (-not (Test-Path 'node_modules\vite')) {
  Write-Host 'Installing dependencies...'
  & $npmCmd install
}
Write-Host 'Starting dev server at http://localhost:5173/'
& $npmCmd run dev
