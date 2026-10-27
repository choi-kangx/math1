@echo off
rem Math playground launcher: starts a local web server and opens the browser.
cd /d "%~dp0"
set PORT=8000
where python >nul 2>nul && (set PY=python) || (set PY=py)
%PY% --version >nul 2>nul || (
  echo Python is not installed. Install it from https://www.python.org/ and run this file again.
  pause
  exit /b 1
)
start "math-playground-server" /min %PY% -m http.server %PORT%
timeout /t 2 /nobreak >nul
start "" http://localhost:%PORT%/index.html
echo The app is open at http://localhost:%PORT%/index.html
echo Close the minimized "math-playground-server" window to stop the server.
