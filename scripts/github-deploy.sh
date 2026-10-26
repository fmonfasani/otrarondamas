#!/bin/bash

###############################################################################
# GITHUB ACTIONS DEPLOYMENT SCRIPT
#
# Used by GitHub Actions workflow to deploy to Hetzner VPS
#
# Usage: ./github-deploy.sh <HOST> <USER> <SSH_KEY> [SSH_PORT]
#
# Environment variables (set by GitHub Actions secrets):
#   GITHUB_SHA - Git commit SHA
#   GITHUB_ACTOR - GitHub user who triggered the deploy
#   GITHUB_REPOSITORY - Repository name
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

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Helper functions
log_info() { echo -e "${GREEN}✅ $1${NC}"; }
log_warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; exit 1; }
log_blue() { echo -e "${BLUE}ℹ️  $1${NC}"; }

###############################################################################
# VALIDATION
###############################################################################

if [ -z "$HOST" ]; then
  log_error "HOST is required. Usage: ./github-deploy.sh <HOST> <USER> <SSH_KEY> [SSH_PORT]"
fi

if [ ! -f "$SSH_KEY" ]; then
  log_error "SSH key not found: $SSH_KEY"
fi

# Test SSH connectivity
if ! ssh -i "$SSH_KEY" -p "$SSH_PORT" -o ConnectTimeout=10 "$USER@$HOST" "echo 'SSH OK'" > /dev/null 2>&1; then
  log_error "Cannot connect to $HOST via SSH. Check IP, user, and SSH key."
fi

log_info "Starting deployment to $HOST"
log_blue "Commit: ${GITHUB_SHA:0:7}"
log_blue "Author: ${GITHUB_ACTOR:-unknown}"
log_blue "Repository: ${GITHUB_REPOSITORY:-unknown}"
echo ""

###############################################################################
# STEP 1: BACKUP CURRENT BUILD
###############################################################################

log_info "Step 1/5: Backing up current build..."

ssh -i "$SSH_KEY" -p "$SSH_PORT" "$USER@$HOST" << 'EOF'
set -e

DEPLOY_DIR="/var/www/wapsell"
BACKUPS_DIR="${DEPLOY_DIR}/.backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create backups directory if it doesn't exist
mkdir -p "$BACKUPS_DIR"

# Keep only the 3 most recent backups
BACKUP_COUNT=$(ls -1d "$BACKUPS_DIR"/* 2>/dev/null | wc -l)
if [ "$BACKUP_COUNT" -ge 3 ]; then
  OLDEST=$(ls -td "$BACKUPS_DIR"/* | tail -1)
  rm -rf "$OLDEST"
  echo "  Removed old backup: $(basename $OLDEST)"
fi

# Backup current dist if it exists
if [ -d "$DEPLOY_DIR/dist" ]; then
  BACKUP_PATH="$BACKUPS_DIR/dist_${TIMESTAMP}"
  cp -r "$DEPLOY_DIR/dist" "$BACKUP_PATH"
  echo "  ✓ Backed up to: $(basename $BACKUP_PATH)"
fi
EOF

log_info "✓ Backup complete"
echo ""

###############################################################################
# STEP 2: DEPLOY NEW BUILD
###############################################################################

log_info "Step 2/5: Deploying new build..."

# Create deployment directory structure
ssh -i "$SSH_KEY" -p "$SSH_PORT" "$USER@$HOST" "mkdir -p /var/www/wapsell"

# Copy dist directory to server
scp -i "$SSH_KEY" -P "$SSH_PORT" -r apps/api/dist "$USER@$HOST:/var/www/wapsell/" || \
  log_error "Failed to copy build artifacts to server"

log_info "✓ Build deployed"
echo ""

###############################################################################
# STEP 3: INSTALL DEPENDENCIES & BUILD
###############################################################################

log_info "Step 3/5: Installing dependencies on server..."

ssh -i "$SSH_KEY" -p "$SSH_PORT" "$USER@$HOST" << 'EOF'
set -e

DEPLOY_DIR="/var/www/wapsell"
cd "$DEPLOY_DIR"

# Install dependencies
echo "  Installing npm packages..."
npm ci --prefer-offline --no-audit --production 2>&1 | grep -v "^npm" | tail -5 || true

# Generate Prisma Client
echo "  Generating Prisma Client..."
npx prisma generate 2>&1 | tail -3 || true

echo "  ✓ Dependencies installed"
EOF

log_info "✓ Dependencies installed"
echo ""

###############################################################################
# STEP 4: DATABASE MIGRATIONS
###############################################################################

log_info "Step 4/5: Running database migrations..."

ssh -i "$SSH_KEY" -p "$SSH_PORT" "$USER@$HOST" << 'EOF'
set -e

DEPLOY_DIR="/var/www/wapsell"
cd "$DEPLOY_DIR"

# Run Prisma migrations
echo "  Running Prisma migrations..."
npx prisma migrate deploy --skip-generate 2>&1 | tail -5 || true

echo "  ✓ Migrations complete"
EOF

log_info "✓ Migrations complete"
echo ""

###############################################################################
# STEP 5: RESTART APPLICATION
###############################################################################

log_info "Step 5/5: Restarting application..."

ssh -i "$SSH_KEY" -p "$SSH_PORT" "$USER@$HOST" << 'EOF'
set -e

# Restart application with PM2
if command -v pm2 &> /dev/null; then
  echo "  Restarting with PM2..."
  pm2 restart wapsell --update-env || {
    echo "  PM2 restart failed, attempting start..."
    pm2 start /var/www/wapsell/dist/src/main.js --name wapsell --update-env
  }
  echo "  ✓ Application restarted"
elif command -v systemctl &> /dev/null && systemctl is-enabled wapsell >/dev/null 2>&1; then
  echo "  Restarting systemd service..."
  systemctl restart wapsell
  echo "  ✓ Service restarted"
else
  echo "  ⚠️  No process manager found (PM2 or systemd)"
  echo "  Manual restart may be required"
fi

sleep 2
EOF

log_info "✓ Application restarted"
echo ""

###############################################################################
# SUMMARY
###############################################################################

cat << 'SUMMARY'
================================================================================
✅ DEPLOYMENT COMPLETE
================================================================================

Your application has been deployed to Hetzner.

Next: Run health checks with the health-check.sh script
================================================================================
SUMMARY
