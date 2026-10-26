@echo off
REM ============================================================================
REM Execute Auth E2E Tests - Wapsell Frontend (LIVE)
REM ============================================================================

setlocal enabledelayedexpansion

cd /d "D:\Software Development\Porfolio\OtraRondaMas"

echo.
echo ==========================================
echo Auth E2E Tests - LIVE Wapsell Frontend
echo ==========================================
echo Target: https://www.wapsell.com
echo Date: %date% %time%
echo.

REM Check if Playwright is installed
echo [INFO] Checking Playwright installation...
npm list @playwright/test >nul 2>&1
if %errorlevel% neq 0 (
  echo [ERROR] Playwright not installed
  echo [INFO] Run: npm install --save-dev @playwright/test --legacy-peer-deps
  exit /b 1
)
echo [OK] Playwright installed

echo [INFO] Installing Chromium browser...
call npx playwright install chromium
if %errorlevel% neq 0 (
  echo [ERROR] Failed to install Chromium
  exit /b 1
)
echo [OK] Chromium ready

echo.
echo [INFO] Running tests...
echo Command: npx playwright test tests/e2e/auth-flows.spec.js
echo.

set PLAYWRIGHT_BASE_URL=https://www.wapsell.com

call npx playwright test tests/e2e/auth-flows.spec.js ^
  --reporter=list ^
  --reporter=html ^
  --reporter=json

set EXIT_CODE=%errorlevel%

echo.
if %EXIT_CODE% equ 0 (
  echo [SUCCESS] Tests completed!
) else (
  echo [ERROR] Tests failed with exit code: %EXIT_CODE%
)

echo [INFO] HTML Report: playwright-report/index.html
echo [INFO] Test Results: test-results/
echo.

pause
exit /b %EXIT_CODE%
