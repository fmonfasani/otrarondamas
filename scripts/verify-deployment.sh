#!/bin/bash

###############################################################################
# DEPLOYMENT VERIFICATION SCRIPT
#
# Comprehensive verification of deployed application
#
# Usage: ./verify-deployment.sh <HOST> <USER> <SSH_KEY> [SSH_PORT]
#
# Author: Claude Haiku 4.5
# Date: 2026-10-26
###############################################################################

set -uo pipefail

# Parameters
HOST="${1:-}"
USER="${2:-root}"
SSH_KEY="${3:-.ssh/deploy_key}"
SSH_PORT="${4:-22}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Helper functions
log_info() { echo -e "${GREEN}✅ $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }
log_warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_blue() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_section() { echo ""; echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; echo -e "${BLUE}$1${NC}"; echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; echo ""; }

###############################################################################
# VALIDATION
###############################################################################

if [ -z "$HOST" ]; then
  echo "❌ HOST is required. Usage: ./verify-deployment.sh <HOST> <USER> <SSH_KEY> [SSH_PORT]"
  exit 1
fi

if [ ! -f "$SSH_KEY" ]; then
  echo "❌ SSH key not found: $SSH_KEY"
  exit 1
fi

log_blue "Starting deployment verification for $HOST"
echo ""

###############################################################################
# SECTION 1: SYSTEM STATUS
###############################################################################

log_section "1. SYSTEM STATUS"

ssh -i "$SSH_KEY" -p "$SSH_PORT" "$USER@$HOST" << 'EOF'
echo "System Information:"
uname -a
echo ""

echo "Uptime:"
uptime
echo ""

echo "Disk Usage:"
df -h /var/www
echo ""

echo "Memory Usage:"
free -h | head -2
EOF

###############################################################################
# SECTION 2: APPLICATION STATUS
###############################################################################

log_section "2. APPLICATION STATUS"

ssh -i "$SSH_KEY" -p "$SSH_PORT" "$USER@$HOST" << 'EOF'
echo "Process Manager Status:"
if command -v pm2 &> /dev/null; then
  pm2 list
elif command -v systemctl &> /dev/null && systemctl is-enabled wapsell >/dev/null 2>&1; then
  systemctl status wapsell --no-pager
else
  ps aux | grep -E "node|npm" | grep -v grep
fi
EOF

###############################################################################
# SECTION 3: APPLICATION LOGS
###############################################################################

log_section "3. APPLICATION LOGS (Last 20 lines)"

ssh -i "$SSH_KEY" -p "$SSH_PORT" "$USER@$HOST" << 'EOF'
if command -v pm2 &> /dev/null; then
  echo "PM2 Logs:"
  pm2 logs wapsell --lines 20 --nostream
elif [ -f /var/log/wapsell.log ]; then
  echo "Application Log:"
  tail -20 /var/log/wapsell.log
else
  echo "⚠️  No logs found"
fi
EOF

###############################################################################
# SECTION 4: BUILD INFORMATION
###############################################################################

log_section "4. BUILD INFORMATION"

ssh -i "$SSH_KEY" -p "$SSH_PORT" "$USER@$HOST" << 'EOF'
DEPLOY_DIR="/var/www/wapsell"

if [ -d "$DEPLOY_DIR" ]; then
  echo "Deployment Directory: $DEPLOY_DIR"
  echo ""

  echo "Contents:"
  ls -lh "$DEPLOY_DIR" | head -15
  echo ""

  echo "Build Timestamp:"
  stat -c "Modified: %y" "$DEPLOY_DIR/dist" 2>/dev/null || echo "dist directory not found"
  echo ""

  echo "Backups Available:"
  ls -1d "$DEPLOY_DIR/.backups"/*/ 2>/dev/null | wc -l | xargs -I {} echo "  {} backup(s)"
  ls -ltd "$DEPLOY_DIR/.backups"/*/ 2>/dev/null | head -3 | awk '{print "  - " $NF}'
else
  echo "⚠️  Deployment directory not found: $DEPLOY_DIR"
fi
EOF

###############################################################################
# SECTION 5: DATABASE STATUS
###############################################################################

log_section "5. DATABASE STATUS"

ssh -i "$SSH_KEY" -p "$SSH_PORT" "$USER@$HOST" << 'EOF'
DEPLOY_DIR="/var/www/wapsell"
cd "$DEPLOY_DIR" 2>/dev/null || {
  echo "⚠️  Cannot access deployment directory"
  exit 0
}

echo "Database Connection Status:"
if [ -f ".env" ] && grep -q "DATABASE_URL" .env; then
  echo "  ✓ DATABASE_URL configured"
else
  echo "  ⚠️  DATABASE_URL not found in .env"
fi

echo ""
echo "Prisma Status:"
if [ -d "node_modules/.prisma/client" ]; then
  echo "  ✓ Prisma Client generated"
else
  echo "  ⚠️  Prisma Client not found"
fi

echo ""
echo "Migration Status:"
if npx prisma migrate status --skip-generate 2>/dev/null | grep -q "All migrations have been applied"; then
  echo "  ✓ All migrations applied"
else
  echo "  ⚠️  Check migration status:"
  npx prisma migrate status --skip-generate 2>/dev/null || echo "  Could not determine status"
fi
EOF

###############################################################################
# SECTION 6: API ENDPOINT TESTS
###############################################################################

log_section "6. API ENDPOINT TESTS"

ssh -i "$SSH_KEY" -p "$SSH_PORT" "$USER@$HOST" << 'EOF'
echo "Testing API endpoints (localhost:3000):"
echo ""

echo "1. Health Check:"
curl -s -w "   Status: %{http_code}\n" -m 5 "http://localhost:3000/health" 2>/dev/null || echo "   ❌ Timeout or connection error"
echo ""

echo "2. Root Endpoint:"
curl -s -w "   Status: %{http_code}\n" -m 5 "http://localhost:3000/" 2>/dev/null || echo "   ❌ Timeout or connection error"
echo ""

echo "3. API Documentation (Swagger):"
curl -s -w "   Status: %{http_code}\n" -m 5 "http://localhost:3000/api" 2>/dev/null || echo "   ⚠️  Swagger may not be enabled"
EOF

###############################################################################
# SECTION 7: ENVIRONMENT & CONFIGURATION
###############################################################################

log_section "7. ENVIRONMENT & CONFIGURATION"

ssh -i "$SSH_KEY" -p "$SSH_PORT" "$USER@$HOST" << 'EOF'
DEPLOY_DIR="/var/www/wapsell"

if [ -f "$DEPLOY_DIR/.env" ]; then
  echo "Environment Variables (redacted):"
  grep -E "^[A-Z_]+=" "$DEPLOY_DIR/.env" | sed 's/=.*/=***/' | sort
else
  echo "⚠️  .env file not found"
fi

echo ""
echo "Node.js Version:"
node --version

echo ""
echo "NPM Version:"
npm --version
EOF

###############################################################################
# SECTION 8: SECURITY CHECKS
###############################################################################

log_section "8. SECURITY CHECKS"

ssh -i "$SSH_KEY" -p "$SSH_PORT" "$USER@$HOST" << 'EOF'
echo "SSH Keys:"
echo "  Authorized keys: $(wc -l < ~/.ssh/authorized_keys 2>/dev/null || echo '0') key(s)"

echo ""
echo "Firewall Rules (if enabled):"
if command -v ufw &> /dev/null && ufw status | grep -q "active"; then
  ufw status | grep "3000\|443\|80"
else
  echo "  Firewall not active or ufw not installed"
fi

echo ""
echo "SSL Certificates (if configured):"
if [ -d "/etc/letsencrypt/live" ]; then
  ls -1d /etc/letsencrypt/live/*/ 2>/dev/null | wc -l | xargs -I {} echo "  {} domain(s) with certificates"
  certbot certificates 2>/dev/null | grep "Expiration Date" || echo "  ⚠️  Could not verify certificate dates"
else
  echo "  ⚠️  No SSL certificates found"
fi
EOF

###############################################################################
# FINAL SUMMARY
###############################################################################

log_section "VERIFICATION COMPLETE"

cat << 'SUMMARY'
✅ Deployment verification finished!

Next steps:
  1. Monitor logs: pm2 logs wapsell
  2. Check metrics: pm2 monit
  3. Review health: curl http://localhost:3000/health

If issues occur:
  1. Check logs for errors
  2. Verify database migrations: npx prisma migrate status
  3. Restart application: pm2 restart wapsell
  4. Check environment variables: cat /var/www/wapsell/.env

Documentation:
  • Deployment: docs/DEPLOYMENT.md
  • Troubleshooting: docs/TROUBLESHOOTING.md
  • Rollback: scripts/deployment-hetzner.sh <HOST> <SSH_KEY> rollback

SUMMARY
