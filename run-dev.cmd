@echo off
setlocal
cd /d "%~dp0"

set "NODE_BIN=%~dp0.tools\nodejs\node-v22.16.0-win-x64"
if not exist "%NODE_BIN%\npm.cmd" (
  echo Portable Node.js not found at %NODE_BIN%
  echo Install Node.js from https://nodejs.org or extract it to .tools\nodejs\
  exit /b 1
)

set "PATH=%NODE_BIN%;%PATH%"

if not exist "node_modules\vite" (
  echo Installing dependencies...
  call "%NODE_BIN%\npm.cmd" install
  if errorlevel 1 exit /b 1
)

echo Starting dev server at http://localhost:5173/
call "%NODE_BIN%\npm.cmd" run dev
