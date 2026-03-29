@echo off
title Trading Journal
cd /d "%~dp0"

echo ============================================
echo    Trading Journal - Starting...
echo ============================================
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

:: Kill any existing processes on our ports
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3001.*LISTENING" 2^>nul') do taskkill /f /pid %%a >nul 2>nul
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173.*LISTENING" 2^>nul') do taskkill /f /pid %%a >nul 2>nul

echo [1/2] Starting backend server (port 3001)...
echo [2/2] Starting frontend server (port 5173)...
echo.

:: Start both servers using concurrently
start "" /min cmd /c "cd /d "%~dp0" && npm run dev"

:: Wait for servers to start
echo Waiting for servers to start...
timeout /t 4 /nobreak >nul

:: Open browser
echo Opening browser...
start http://localhost:5173

echo.
echo ============================================
echo    Trading Journal is running!
echo    Frontend: http://localhost:5173
echo    Backend:  http://localhost:3001
echo ============================================
echo.
echo Press any key to STOP the servers...
pause >nul

:: Kill processes when user presses a key
echo Shutting down...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3001.*LISTENING" 2^>nul') do taskkill /f /pid %%a >nul 2>nul
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173.*LISTENING" 2^>nul') do taskkill /f /pid %%a >nul 2>nul
echo Done. Goodbye!
timeout /t 2 /nobreak >nul
