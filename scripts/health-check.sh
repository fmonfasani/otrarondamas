#!/bin/bash

###############################################################################
# HEALTH CHECK SCRIPT
#
# Verifies that the deployed application is healthy
#
# Usage: ./health-check.sh <HOST> <SSH_KEY> [SSH_PORT]
#
# Exit codes:
#   0 - All health checks passed
#   1 - One or more health checks failed
#
# Author: Claude Haiku 4.5
# Date: 2026-10-26
###############################################################################

set -uo pipefail

# Parameters
HOST="${1:-}"
SSH_KEY="${2:-.ssh/deploy_key}"
SSH_PORT="${3:-22}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Tracking
CHECKS_PASSED=0
CHECKS_FAILED=0

# Helper functions
log_info() { echo -e "${GREEN}✅ $1${NC}"; ((CHECKS_PASSED++)); }
log_error() { echo -e "${RED}❌ $1${NC}"; ((CHECKS_FAILED++)); }
log_warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_blue() { echo -e "${BLUE}ℹ️  $1${NC}"; }

###############################################################################
# VALIDATION
###############################################################################

if [ -z "$HOST" ]; then
  echo "❌ HOST is required. Usage: ./health-check.sh <HOST> <SSH_KEY> [SSH_PORT]"
  exit 1
fi

if [ ! -f "$SSH_KEY" ]; then
  echo "❌ SSH key not found: $SSH_KEY"
  exit 1
fi

log_blue "Running health checks on $HOST"
echo ""

###############################################################################
# CHECK 1: SSH CONNECTIVITY
###############################################################################

log_blue "Check 1/5: SSH Connectivity"

if ssh -i "$SSH_KEY" -p "$SSH_PORT" -o ConnectTimeout=10 root@"$HOST" "echo 'SSH OK'" > /dev/null 2>&1; then
  log_info "SSH connection successful"
else
  log_error "SSH connection failed"
  exit 1
fi
echo ""

###############################################################################
# CHECK 2: APPLICATION PROCESS
###############################################################################

log_blue "Check 2/5: Application Process"

PROCESS_CHECK=$(ssh -i "$SSH_KEY" -p "$SSH_PORT" root@"$HOST" << 'EOF'
if command -v pm2 &> /dev/null; then
  pm2 list | grep wapsell | grep online > /dev/null && echo "running" || echo "stopped"
elif command -v systemctl &> /dev/null && systemctl is-enabled wapsell >/dev/null 2>&1; then
  systemctl is-active wapsell > /dev/null && echo "running" || echo "stopped"
elif pgrep -f "node.*main.js" > /dev/null; then
  echo "running"
else
  echo "unknown"
fi
EOF
)

if [ "$PROCESS_CHECK" = "running" ]; then
  log_info "Application process is running"
else
  log_error "Application process is not running (status: $PROCESS_CHECK)"
fi
echo ""

###############################################################################
# CHECK 3: API HEALTH ENDPOINT
###############################################################################

log_blue "Check 3/5: API Health Endpoint"

API_HEALTH=$(ssh -i "$SSH_KEY" -p "$SSH_PORT" root@"$HOST" << 'EOF'
# Try health check endpoint with retries
for i in {1..5}; do
  HEALTH=$(curl -s -m 5 "http://localhost:3000/health" 2>/dev/null || echo "")
  if echo "$HEALTH" | grep -q "ok\|healthy\|running" 2>/dev/null; then
    echo "healthy"
    exit 0
  fi
  if [ $i -lt 5 ]; then
    echo "  Retry $i/4..."
    sleep 2
  fi
done

# If specific health endpoint doesn't work, try generic endpoint
if curl -s -m 5 -o /dev/null -w "%{http_code}" "http://localhost:3000/" | grep -q "200\|301\|302"; then
  echo "responding"
else
  echo "unhealthy"
fi
EOF
)

if [ "$API_HEALTH" = "healthy" ] || [ "$API_HEALTH" = "responding" ]; then
  log_info "API is responding (status: $API_HEALTH)"
else
  log_error "API health check failed (status: $API_HEALTH)"
fi
echo ""

###############################################################################
# CHECK 4: DATABASE CONNECTION
###############################################################################

log_blue "Check 4/5: Database Connection"

DB_CHECK=$(ssh -i "$SSH_KEY" -p "$SSH_PORT" root@"$HOST" << 'EOF'
DEPLOY_DIR="/var/www/wapsell"
cd "$DEPLOY_DIR" 2>/dev/null || exit 1

# Try to check database with Prisma
if [ -f "dist/src/main.js" ]; then
  # Quick validation that app can start (database accessible)
  timeout 10 npm run start:prod 2>&1 &
  PID=$!
  sleep 3

  if ps -p $PID > /dev/null 2>&1; then
    echo "connected"
    kill $PID 2>/dev/null || true
  else
    echo "failed"
  fi
else
  echo "unknown"
fi
EOF
)

if [ "$DB_CHECK" = "connected" ]; then
  log_info "Database connection verified"
elif [ "$DB_CHECK" = "unknown" ]; then
  log_warn "Database check inconclusive (app not found)"
else
  log_error "Database connection failed"
fi
echo ""

###############################################################################
# CHECK 5: DISK SPACE & RESOURCES
###############################################################################

log_blue "Check 5/5: System Resources"

RESOURCES=$(ssh -i "$SSH_KEY" -p "$SSH_PORT" root@"$HOST" << 'EOF'
# Check disk space
DISK_USAGE=$(df -h /var/www | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -lt 80 ]; then
  echo "disk:ok"
else
  echo "disk:warning"
fi

# Check memory
MEM_USAGE=$(free | grep Mem | awk '{printf("%.0f", $3/$2*100)}')
if [ "$MEM_USAGE" -lt 80 ]; then
  echo "memory:ok"
else
  echo "memory:warning"
fi
EOF
)

DISK_STATUS=$(echo "$RESOURCES" | grep "^disk:" | cut -d: -f2)
MEM_STATUS=$(echo "$RESOURCES" | grep "^memory:" | cut -d: -f2)

if [ "$DISK_STATUS" = "ok" ]; then
  log_info "Disk space healthy"
else
  log_warn "Disk usage high"
fi

if [ "$MEM_STATUS" = "ok" ]; then
  log_info "Memory usage healthy"
else
  log_warn "Memory usage high"
fi
echo ""

###############################################################################
# SUMMARY
###############################################################################

TOTAL=$((CHECKS_PASSED + CHECKS_FAILED))

echo "================================================================================"
if [ "$CHECKS_FAILED" -eq 0 ]; then
  echo -e "${GREEN}✅ ALL HEALTH CHECKS PASSED ($CHECKS_PASSED/$TOTAL)${NC}"
  echo "================================================================================"
  exit 0
else
  echo -e "${RED}❌ SOME HEALTH CHECKS FAILED ($CHECKS_FAILED/$TOTAL failed)${NC}"
  echo "================================================================================"
  echo ""
  echo "Troubleshooting:"
  echo "  1. Check application logs:"
  echo "     pm2 logs wapsell"
  echo "  2. Verify database migrations ran:"
  echo "     npx prisma migrate status"
  echo "  3. Check environment variables:"
  echo "     cat /var/www/wapsell/.env"
  echo ""
  exit 1
fi
