#!/bin/bash
# =============================================================================
# Run Auth E2E Tests against LIVE Wapsell Frontend
# =============================================================================

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "=========================================="
echo "Auth E2E Tests - LIVE Wapsell Frontend"
echo "=========================================="
echo "Target: https://www.wapsell.com"
echo "API: https://api.wapsell.com/auth/*"
echo "Date: $(date)"
echo ""

# Check if @playwright/test is installed
if ! npm list @playwright/test &> /dev/null; then
  echo "[ERROR] Playwright not installed. Install with: npm install --save-dev @playwright/test @playwright/base @playwright/chromium"
  exit 1
fi

# Run tests with live domain
echo "[INFO] Running tests against LIVE domain..."
PLAYWRIGHT_BASE_URL="https://www.wapsell.com" npx playwright test tests/e2e/auth-flows.spec.js \
  --reporter=list \
  --reporter=html \
  --reporter=json \
  --output-file=test-results/auth-e2e-results.json

echo ""
echo "[SUCCESS] Tests completed!"
echo "[INFO] HTML Report: playwright-report/index.html"
echo "[INFO] JSON Report: test-results/auth-e2e-results.json"
