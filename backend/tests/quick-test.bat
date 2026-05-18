@echo off
REM Quick Test Runner - Run tests directly without installation
REM Prerequisites: jest and supertest must be installed

cd /d %~dp0
cd ..

echo ========================================
echo   Quick Test Runner
echo ========================================
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo ERROR: node_modules not found
    echo Please run: npm install
    pause
    exit /b 1
)

REM Run tests
echo Running tests...
npm test

if errorlevel 1 (
    echo.
    echo TESTS FAILED
    pause
    exit /b 1
)

echo.
echo ALL TESTS PASSED!
pause
