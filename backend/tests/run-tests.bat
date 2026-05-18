@echo off
chcp 65001 >nul 2>&1
echo ========================================
echo   E-Commerce System Unit Tests
echo ========================================
echo.

cd /d %~dp0

echo [1/4] Check Node.js environment...
node --version
if errorlevel 1 (
    echo ERROR: Node.js not found
    pause
    exit /b 1
)

echo.
echo [2/4] Install dependencies...
call npm install jest supertest --save-dev

if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo [3/4] Run tests...
echo.

call npm test

if errorlevel 1 (
    echo.
    echo ========================================
    echo   TESTS FAILED
    echo ========================================
    pause
    exit /b 1
)

echo.
echo ========================================
echo   ALL TESTS PASSED!
echo ========================================
pause
