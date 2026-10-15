@echo off
setlocal

call npm install --prefix "%~dp0backend"
if errorlevel 1 exit /b %errorlevel%

call npm install --prefix "%~dp0frontend"
if errorlevel 1 exit /b %errorlevel%

echo Backend and frontend dependencies are installed.
pause
