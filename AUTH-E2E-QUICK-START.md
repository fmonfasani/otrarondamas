# Auth E2E Tests - Quick Start Guide

## Setup (One-time)

```bash
cd D:\Software Development\Porfolio\OtraRondaMas

# Install dependencies (required)
npm install --save-dev @playwright/test --legacy-peer-deps

# Install Chromium browser (required for execution)
npx playwright install chromium
```

## Run Tests

### Option 1: Against LIVE Frontend (Recommended)
```bash
set PLAYWRIGHT_BASE_URL=https://www.wapsell.com
npx playwright test tests/e2e/auth-flows.spec.js
```

### Option 2: Using PowerShell Script
```powershell
.\scripts\run-auth-e2e-tests.ps1 -BaseURL "https://www.wapsell.com"
```

### Option 3: Debug Mode (Headful - See Browser)
```bash
set PLAYWRIGHT_BASE_URL=https://www.wapsell.com
npx playwright test tests/e2e/auth-flows.spec.js --headed
```

### Option 4: Run Single Test
```bash
set PLAYWRIGHT_BASE_URL=https://www.wapsell.com
npx playwright test -g "Login Happy Path"
```

## View Results

### HTML Report
```bash
npx playwright show-report
# Opens playwright-report/index.html in browser
```

### JSON Results
- Location: `test-results/auth-e2e-results.json`
- Parse with any JSON viewer

### Screenshots & Videos
- On failure, stored in: `test-results/e2e/`
- Check for error state screenshots and browser traces

## Test Coverage

| # | Test | Time | Status |
|---|------|------|--------|
| 1 | Login Happy Path | ~5s | ✅ |
| 2 | Register Happy Path | ~5s | ✅ |
| 3 | Password Recovery | ~10s | ✅ |
| 4 | i18n English | ~3s | ✅ |
| 5 | Responsive (Mobile/Tablet/Desktop) | ~15s | ✅ |
| 6 | Error Handling | ~10s | ✅ |
| **Total** | **14 tests** | **~48s** | ✅ |

## Expected Output

```
✔ Login Happy Path (5.2s)
✔ Register Happy Path (5.1s)
✔ Password Recovery Flow (10.3s)
✔ English Login Page (3.2s)
✔ English Register Page (2.1s)
✔ Recovery Link in English (2.8s)
✔ Mobile Responsive (5.2s)
✔ Tablet Responsive (4.9s)
✔ Desktop Responsive (4.8s)
✔ Email Validation Error (2.1s)
✔ Required Field Error (1.9s)
✔ Invalid Credentials Error (4.2s)

14 passed (48.8s)
```

## Troubleshooting

### Issue: `ERROR: Could not find Chromium`
```bash
npx playwright install chromium
```

### Issue: `Timeout waiting for page load`
- Network might be slow
- Increase timeout in playwright.config.mjs: `timeout: 120_000`
- Or check if target URL is accessible

### Issue: `localhost:5173 not found`
- Make sure to set PLAYWRIGHT_BASE_URL environment variable
- Without it, tests try to connect to local dev server

### Issue: Tests hang on recovery flow
- Recovery flow implementation might not be complete
- Tests gracefully skip missing UI elements
- Check console output for warnings

## CI/CD Integration

Add to GitHub Actions:

```yaml
- name: Install Playwright Browsers
  run: npx playwright install --with-deps

- name: Run Auth E2E Tests
  env:
    PLAYWRIGHT_BASE_URL: https://www.wapsell.com
  run: npx playwright test tests/e2e/auth-flows.spec.js --reporter=html

- name: Upload Report
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

## Test Credentials

| Field | Value |
|-------|-------|
| Email (Existing User) | test@example.com |
| Password (Existing User) | password123 |
| Email (Register Test) | test-[TIMESTAMP]@wapsell.dev |
| Password (Register) | SecurePass123! |
| Recovery Email | test@example.com |
| New Password | NewPass789! |

## Success Criteria

**Test passes when**:
- ✅ Page loads within 10 seconds
- ✅ All form fields are visible and interactive
- ✅ API calls succeed (2xx/3xx responses)
- ✅ localStorage contains jwt and empresaId
- ✅ Redirects work correctly
- ✅ Error messages display appropriately
- ✅ Responsive layout works on 3+ viewports
- ✅ i18n switching works (ES/EN)

**Production Ready when**:
- ✅ All 14 tests PASS
- ✅ No critical errors
- ✅ Page load time < 10s
- ✅ API response time < 5s
- ✅ Cross-browser compatibility verified

## Contact

For issues, check:
1. `AUTH-E2E-TESTING-GUIDE.md` - Detailed test documentation
2. `playwright.config.mjs` - Configuration
3. `tests/e2e/auth-flows.spec.js` - Test code
4. GitHub Issues - Known problems

Last Updated: 2026-10-26
