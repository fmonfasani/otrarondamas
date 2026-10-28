#!/bin/bash
set -e

echo "=========================================="
echo "WAPSELL FRONTEND: BUILD & DEPLOY"
echo "=========================================="
echo ""

# Step 1: Build
echo "[1/5] Building Next.js application..."
npm run build 2>&1
echo "✓ Build completed"
echo ""

# Step 2: Check build artifacts
echo "[2/5] Verifying build artifacts..."
if [ ! -d ".next" ]; then
  echo "✗ ERROR: .next directory not found"
  exit 1
fi
echo "✓ Build artifacts verified"
echo "  - .next/ directory size: $(du -sh .next/ | cut -f1)"
echo ""

# Step 3: Check for build errors
echo "[3/5] Checking for build errors..."
if [ -f ".next/BUILD_ID" ]; then
  echo "✓ BUILD_ID found: $(cat .next/BUILD_ID)"
else
  echo "⚠ BUILD_ID not found (may be expected)"
fi
echo ""

# Step 4: Summary
echo "[4/5] Build summary:"
echo "  - Next.js version: $(node -p "require('./package.json').dependencies.next")"
echo "  - Build time: $(date)"
echo ""

echo "[5/5] Ready for deployment"
echo "=========================================="
echo "Next steps:"
echo "  1. Run: npm run dev (local test)"
echo "  2. Run: scp -r .next/ root@89.167.96.239:/opt/wapsell-frontend/"
echo "  3. Run: ssh root@89.167.96.239 'pm2 restart wapsell-frontend'"
echo "=========================================="
