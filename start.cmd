@echo off
rem Double-click to start Chesapeake Dev Derby and open it in your browser.
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required. Install it from https://nodejs.org/ and try again.
  pause
  exit /b 1
)
if not exist "node_modules\three" (
  echo Installing Three.js ^(first run only^)...
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo npm install failed.
    pause
    exit /b 1
  )
)
node server.js --open --exit-on-close
if errorlevel 1 pause
