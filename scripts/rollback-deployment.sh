#!/bin/bash

###############################################################################
# ROLLBACK DEPLOYMENT SCRIPT
#
# Reverts to a previous build if current deployment fails
#
# Usage: ./rollback-deployment.sh <HOST> <USER> <SSH_KEY> [SSH_PORT] [BACKUP_NUMBER]
#   BACKUP_NUMBER: 1 (latest), 2 (second latest), etc. Default: 1
#
# Author: Claude Haiku 4.5
# Date: 2026-10-26
###############################################################################

set -euo pipefail

# Parameters
HOST="${1:-}"
USER="${2:-root}"
SSH_KEY="${3:-.ssh/deploy_key}"
SSH_PORT="${4:-22}"
BACKUP_NUM="${5:-1}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Helper functions
log_info() { echo -e "${GREEN}✅ $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; exit 1; }
log_warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_blue() { echo -e "${BLUE}ℹ️  $1${NC}"; }

###############################################################################
# VALIDATION
###############################################################################

if [ -z "$HOST" ]; then
  log_error "HOST is required. Usage: ./rollback-deployment.sh <HOST> <USER> <SSH_KEY> [SSH_PORT] [BACKUP_NUMBER]"
fi

if [ ! -f "$SSH_KEY" ]; then
  log_error "SSH key not found: $SSH_KEY"
fi

if ! ssh -i "$SSH_KEY" -p "$SSH_PORT" -o ConnectTimeout=10 "$USER@$HOST" "echo 'SSH OK'" > /dev/null 2>&1; then
  log_error "Cannot connect to $HOST via SSH"
fi

log_blue "Starting rollback on $HOST"
log_blue "Using backup #$BACKUP_NUM (1=latest, 2=second latest, etc.)"
echo ""

###############################################################################
# STEP 1: LIST AVAILABLE BACKUPS
###############################################################################

log_info "Step 1/4: Checking available backups..."

AVAILABLE_BACKUPS=$(ssh -i "$SSH_KEY" -p "$SSH_PORT" "$USER@$HOST" << 'EOF'
DEPLOY_DIR="/var/www/wapsell"
BACKUPS_DIR="${DEPLOY_DIR}/.backups"

if [ ! -d "$BACKUPS_DIR" ]; then
  echo "0"
  exit 1
fi

ls -1d "$BACKUPS_DIR"/*/ 2>/dev/null | wc -l
EOF
)

if [ "$AVAILABLE_BACKUPS" -lt "$BACKUP_NUM" ]; then
  log_error "Only $AVAILABLE_BACKUPS backup(s) available, but requested backup #$BACKUP_NUM"
fi

log_info "Found $AVAILABLE_BACKUPS backup(s)"
echo ""

###############################################################################
# STEP 2: BACKUP CURRENT (BROKEN) BUILD
###############################################################################

log_info "Step 2/4: Backing up current (broken) build..."

ssh -i "$SSH_KEY" -p "$SSH_PORT" "$USER@$HOST" << 'EOF'
set -e

DEPLOY_DIR="/var/www/wapsell"
BACKUPS_DIR="${DEPLOY_DIR}/.backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BROKEN_BACKUP="${BACKUPS_DIR}/dist_BROKEN_${TIMESTAMP}"

if [ -d "$DEPLOY_DIR/dist" ]; then
  mkdir -p "$BACKUPS_DIR"
  cp -r "$DEPLOY_DIR/dist" "$BROKEN_BACKUP"
  echo "  Saved broken build to: $(basename $BROKEN_BACKUP)"
fi
EOF

log_info "✓ Current build backed up"
echo ""

###############################################################################
# STEP 3: RESTORE PREVIOUS BUILD
###############################################################################

log_info "Step 3/4: Restoring previous build (backup #$BACKUP_NUM)..."

ssh -i "$SSH_KEY" -p "$SSH_PORT" "$USER@$HOST" << EOF
set -e

DEPLOY_DIR="/var/www/wapsell"
BACKUPS_DIR="\${DEPLOY_DIR}/.backups"

# Get the list of backups sorted by modification time (newest first)
BACKUPS=($(ls -td "\${BACKUPS_DIR}"/dist*/ 2>/dev/null | grep -v "BROKEN"))

if [ \${#BACKUPS[@]} -lt $BACKUP_NUM ]; then
  echo "❌ Not enough backups available"
  exit 1
fi

# Get the requested backup (1-indexed)
RESTORE_BACKUP="\${BACKUPS[\$(($BACKUP_NUM - 1))]}"

if [ ! -d "\$RESTORE_BACKUP" ]; then
  echo "❌ Backup not found: \$RESTORE_BACKUP"
  exit 1
fi

echo "  Restoring from: \$(basename \$RESTORE_BACKUP)"

# Remove current (broken) build
if [ -d "\${DEPLOY_DIR}/dist" ]; then
  rm -rf "\${DEPLOY_DIR}/dist"
fi

# Restore previous build
cp -r "\$RESTORE_BACKUP" "\${DEPLOY_DIR}/dist"
echo "  ✓ Restored"
EOF

log_info "✓ Previous build restored"
echo ""

###############################################################################
# STEP 4: RESTART APPLICATION
###############################################################################

log_info "Step 4/4: Restarting application..."

ssh -i "$SSH_KEY" -p "$SSH_PORT" "$USER@$HOST" << 'EOF'
set -e

# Restart with PM2
if command -v pm2 &> /dev/null; then
  echo "  Restarting with PM2..."
  pm2 restart wapsell --update-env || pm2 start /var/www/wapsell/dist/src/main.js --name wapsell
  echo "  ✓ Application restarted"
elif command -v systemctl &> /dev/null && systemctl is-enabled wapsell >/dev/null 2>&1; then
  echo "  Restarting systemd service..."
  systemctl restart wapsell
  echo "  ✓ Service restarted"
else
  echo "  ⚠️  Could not restart (no process manager)"
fi

sleep 2
EOF

log_info "✓ Application restarted"
echo ""

###############################################################################
# FINAL VERIFICATION
###############################################################################

log_info "Verifying rollback..."

HEALTH=$(ssh -i "$SSH_KEY" -p "$SSH_PORT" "$USER@$HOST" << 'EOF'
for i in {1..10}; do
  HEALTH=$(curl -s -m 5 "http://localhost:3000/health" 2>/dev/null || echo "")
  if echo "$HEALTH" | grep -q "ok\|healthy\|running"; then
    echo "healthy"
    exit 0
  fi
  sleep 1
done
echo "unhealthy"
EOF
)

if [ "$HEALTH" = "healthy" ]; then
  log_info "✓ Application is healthy after rollback"
else
  log_warn "Application may need additional verification"
fi

echo ""
cat << 'SUMMARY'
================================================================================
✅ ROLLBACK COMPLETE
================================================================================

Your previous build has been restored.

Verification steps:
  1. Check application logs: pm2 logs wapsell
  2. Verify API health: curl http://localhost:3000/health
  3. Run manual tests

If issues persist:
  1. Check database migrations: npx prisma migrate status
  2. Review application logs carefully
  3. Consider manual intervention if needed

Next deployment:
  Fix the issues in your code and redeploy
  The broken build is backed up in .backups/dist_BROKEN_*

================================================================================
SUMMARY
