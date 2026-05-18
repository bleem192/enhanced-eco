# E-Commerce System Unit Tests
# Run this script to execute all unit tests

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  E-Commerce System Unit Tests" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Stop"

# Step 1: Check Node.js
Write-Host "[1/4] Checking Node.js environment..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "  Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "  ERROR: Node.js not found" -ForegroundColor Red
    exit 1
}

# Step 2: Install dependencies
Write-Host ""
Write-Host "[2/4] Installing test dependencies..." -ForegroundColor Yellow
try {
    npm install jest supertest --save-dev
    Write-Host "  Dependencies installed successfully" -ForegroundColor Green
} catch {
    Write-Host "  ERROR: Failed to install dependencies" -ForegroundColor Red
    exit 1
}

# Step 3: Run tests
Write-Host ""
Write-Host "[3/4] Running tests..." -ForegroundColor Yellow
Write-Host ""

try {
    npm test
} catch {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "  TESTS FAILED" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    exit 1
}

# Step 4: Success
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  ALL TESTS PASSED!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
