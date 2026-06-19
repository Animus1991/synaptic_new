@echo off
setlocal
cd /d "%~dp0"

set "NODE_BIN=%~dp0.tools\nodejs\node-v22.16.0-win-x64"
if not exist "%NODE_BIN%\npm.cmd" (
  echo Portable Node.js not found at %NODE_BIN%
  exit /b 1
)

set "PATH=%NODE_BIN%;%PATH%"
echo Installing dependencies...
call "%NODE_BIN%\npm.cmd" install
if errorlevel 1 exit /b 1
echo Done.
