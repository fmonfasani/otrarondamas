# ============================================================================
# Run Auth E2E Tests against LIVE Wapsell Frontend (PowerShell)
# ============================================================================

param(
  [string]$BaseURL = "https://www.wapsell.com",
  [string]$BrowserHeadless = "true",
  [switch]$ShowBrowser
)

$ErrorActionPreference = "Stop"

# Get project root
$ProjectRoot = Split-Path -Parent $PSScriptRoot

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Auth E2E Tests - LIVE Wapsell Frontend" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Target: $BaseURL" -ForegroundColor White
Write-Host "API: https://api.wapsell.com/auth/*" -ForegroundColor White
Write-Host "Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor White
Write-Host ""

# Check if @playwright/test is installed
Write-Host "[INFO] Checking Playwright installation..." -ForegroundColor Yellow
$PlaywrightCheck = & npm list @playwright/test 2>&1 | Select-String "playwright"
if (-not $PlaywrightCheck) {
  Write-Host "[ERROR] Playwright not installed." -ForegroundColor Red
  Write-Host "Install with: npm install --save-dev @playwright/test @playwright/chromium" -ForegroundColor Red
  exit 1
}
Write-Host "[OK] Playwright is installed" -ForegroundColor Green

# Set headless mode
if ($ShowBrowser) {
  $HeadlessMode = "false"
  Write-Host "[INFO] Running with browser visible" -ForegroundColor Yellow
} else {
  $HeadlessMode = $BrowserHeadless
  Write-Host "[INFO] Running in headless mode" -ForegroundColor Yellow
}

# Run tests
Write-Host ""
Write-Host "[INFO] Starting tests..." -ForegroundColor Yellow
Write-Host "Command: npx playwright test tests/e2e/auth-flows.spec.js" -ForegroundColor Cyan
Write-Host ""

$env:PLAYWRIGHT_BASE_URL = $BaseURL
$env:PLAYWRIGHT_HEADLESS = $HeadlessMode

& npx playwright test tests/e2e/auth-flows.spec.js `
  --reporter=list `
  --reporter=html `
  --reporter=json

$ExitCode = $LASTEXITCODE

Write-Host ""
if ($ExitCode -eq 0) {
  Write-Host "[SUCCESS] Tests completed!" -ForegroundColor Green
} else {
  Write-Host "[ERROR] Tests failed with exit code: $ExitCode" -ForegroundColor Red
}

Write-Host "[INFO] HTML Report: playwright-report/index.html" -ForegroundColor White
Write-Host "[INFO] Test Results Directory: test-results/" -ForegroundColor White

exit $ExitCode
