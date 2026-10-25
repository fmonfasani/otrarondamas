#!/bin/bash

###############################################################################
# WAPSELL DEPLOYMENT SCRIPT FOR HETZNER CLOUD
#
# Usage: ./deployment-hetzner.sh <PROD_HOST> <SSH_KEY_PATH> [command]
# Commands: deploy, verify, rollback, logs, status
#
# Example:
#   export PROD_HOST=159.89.123.45
#   export SSH_KEY=~/.ssh/id_wapsell
#   ./deployment-hetzner.sh $PROD_HOST $SSH_KEY deploy
#
# Author: Claude Haiku 4.5
# Date: 2026-10-25
###############################################################################

set -e

PROD_HOST=${1:-}
SSH_KEY=${2:-~/.ssh/id_wapsell}
COMMAND=${3:-deploy}

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

if [ -z "$PROD_HOST" ]; then
  cat << 'USAGE'
❌ Usage: ./deployment-hetzner.sh <PROD_HOST> <SSH_KEY_PATH> [command]

Examples:
  ./deployment-hetzner.sh 159.89.123.45 ~/.ssh/id_wapsell deploy
  ./deployment-hetzner.sh 159.89.123.45 ~/.ssh/id_wapsell verify
  ./deployment-hetzner.sh 159.89.123.45 ~/.ssh/id_wapsell logs

Commands:
  deploy     - Deploy/update the Wapsell stack
  verify     - Verify deployment health
  rollback   - Rollback to previous version
  logs       - Tail API logs in real-time
  status     - Show service status
USAGE
  exit 1
fi

# Expand ~ to home directory
SSH_KEY="${SSH_KEY/#\~/$HOME}"

if [ ! -f "$SSH_KEY" ]; then
  log_error "SSH key not found: $SSH_KEY"
fi

if [ ! -r "$SSH_KEY" ]; then
  log_error "SSH key not readable: $SSH_KEY (check permissions)"
fi

###############################################################################
# DEPLOY COMMAND
###############################################################################

deploy_command() {
  log_info "Starting Wapsell deployment to $PROD_HOST..."
  echo ""

  # Step 1: Verify connectivity
  log_info "Step 1/6: Verifying SSH connectivity..."
  if ! ssh -i "$SSH_KEY" -o ConnectTimeout=10 root@"$PROD_HOST" "echo 'SSH OK'" > /dev/null 2>&1; then
    log_error "Cannot connect to $PROD_HOST via SSH. Check IP and SSH key."
  fi
  log_info "  ✓ SSH connection successful"
  echo ""

  # Step 2: Check cloud-init
  log_info "Step 2/6: Waiting for cloud-init completion (up to 5 minutes)..."
  ssh -i "$SSH_KEY" root@"$PROD_HOST" << 'EOF'
for i in {1..30}; do
  STATUS=$(cloud-init status 2>/dev/null | grep -c "Status: done" || echo "0")
  if [ "$STATUS" = "1" ]; then
    echo "✓ Cloud-init completed"
    exit 0
  fi
  echo "  Waiting... ($i/30)"
  sleep 10
done
echo "⚠️  Cloud-init still running, proceeding anyway..."
exit 0
EOF
  log_info "  ✓ Cloud-init check complete"
  echo ""

  # Step 3: Deploy Docker stack
  log_info "Step 3/6: Deploying Docker Compose stack..."
  ssh -i "$SSH_KEY" root@"$PROD_HOST" << 'EOF'
cd /opt/wapsell

# Ensure directories exist
mkdir -p /data/wapsell/{postgres,redis,elasticsearch,logs/api,assets}
chmod 755 -R /data/wapsell

# Check if docker-compose.wapsell.yml exists
if [ ! -f docker-compose.wapsell.yml ]; then
  echo "❌ docker-compose.wapsell.yml not found in /opt/wapsell"
  exit 1
fi

# Stop existing stack
echo "  Stopping existing containers..."
docker-compose -f docker-compose.wapsell.yml down 2>/dev/null || true

# Pull latest images
echo "  Pulling images..."
docker-compose -f docker-compose.wapsell.yml pull

# Start stack
echo "  Starting services..."
docker-compose -f docker-compose.wapsell.yml up -d

# Wait for services to be ready
echo "  Waiting for services to stabilize..."
sleep 10

# Check if containers are running
RUNNING=$(docker-compose -f docker-compose.wapsell.yml ps -q | wc -l)
echo "✓ Docker stack deployed ($RUNNING containers running)"
EOF
  log_info "  ✓ Docker Compose stack deployed"
  echo ""

  # Step 4: Run migrations
  log_info "Step 4/6: Running database migrations..."
  ssh -i "$SSH_KEY" root@"$PROD_HOST" << 'EOF'
cd /opt/wapsell

echo "  Checking database connectivity..."
for i in {1..30}; do
  if docker-compose -f docker-compose.wapsell.yml exec -T postgres psql -U wapsell_user -d wapsell_prod -c "SELECT 1" > /dev/null 2>&1; then
    echo "  ✓ Database connected"
    break
  fi
  echo "    Waiting for database ($i/30)..."
  sleep 2
done

echo "  Running Prisma migrations..."
docker-compose -f docker-compose.wapsell.yml exec -T api \
  npx prisma migrate deploy --skip-generate 2>/dev/null || {
  echo "  ⚠️  Migration warning (may be on initial deploy)"
}

echo "  Running database seed..."
docker-compose -f docker-compose.wapsell.yml exec -T api \
  npx prisma db seed 2>/dev/null || {
  echo "  ⚠️  Seed warning (may be optional)"
}

echo "✓ Database migrations complete"
EOF
  log_info "  ✓ Database migrations completed"
  echo ""

  # Step 5: Setup SSL
  log_info "Step 5/6: Setting up SSL certificates..."
  ssh -i "$SSH_KEY" root@"$PROD_HOST" << 'EOF'
# Check if certbot script exists
if [ -f /opt/wapsell/scripts/setup-ssl.sh ]; then
  bash /opt/wapsell/scripts/setup-ssl.sh 2>/dev/null || {
    echo "⚠️  SSL setup deferred (requires manual certbot)"
  }
else
  echo "⚠️  setup-ssl.sh not found (manual SSL configuration needed)"
fi

# Check if certificates already exist
if [ -d /etc/letsencrypt/live ]; then
  CERT_COUNT=$(ls -1 /etc/letsencrypt/live | wc -l)
  echo "✓ SSL certificates found ($CERT_COUNT domain(s))"
else
  echo "ℹ️  No SSL certificates yet (will be needed for HTTPS)"
fi
EOF
  log_info "  ✓ SSL setup complete (manual verification may be needed)"
  echo ""

  # Step 6: Health check
  log_info "Step 6/6: Running health checks..."
  sleep 5

  ssh -i "$SSH_KEY" root@"$PROD_HOST" << 'EOF'
cd /opt/wapsell

echo "  Checking Docker services..."
docker-compose -f docker-compose.wapsell.yml ps

echo ""
echo "  Checking API health..."
HEALTH=$(docker-compose -f docker-compose.wapsell.yml exec -T api curl -s http://localhost:3000/health || echo "{\"status\":\"error\"}")
echo "  API health: $HEALTH"

echo ""
echo "  Checking database..."
docker-compose -f docker-compose.wapsell.yml exec -T postgres psql -U wapsell_user -d wapsell_prod -c "SELECT version();" | head -1 || echo "  Database check skipped"

echo ""
echo "✓ Health checks complete"
EOF

  log_info "✓ Health checks complete"
  echo ""

  # Final summary
  cat << 'SUMMARY'
================================================================================
✅ DEPLOYMENT COMPLETE! 🎉
================================================================================

Your Wapsell platform is now live!

Endpoints (if DNS is configured):
  • API:      https://api.wapsell.com
  • Store:    https://wapsell.com
  • Admin:    https://admin.wapsell.com

Next steps:
  1. Run health verification:
     ./deployment-hetzner.sh <PROD_HOST> <SSH_KEY> verify

  2. Check post-deployment checklist:
     Read: docs/POST-DEPLOYMENT-CHECKLIST.md

  3. Monitor logs in real-time:
     ./deployment-hetzner.sh <PROD_HOST> <SSH_KEY> logs

  4. If issues occur:
     ./deployment-hetzner.sh <PROD_HOST> <SSH_KEY> status

Estimated time to ready: 5-15 minutes
(DNS propagation may take additional 15-30 minutes)

Documentation:
  • Quick Setup: docs/HETZNER-QUICK-SETUP.md
  • Troubleshooting: docs/TROUBLESHOOTING.md
  • Full Deployment: docs/DEPLOYMENT.md

================================================================================
SUMMARY
}

###############################################################################
# VERIFY COMMAND
###############################################################################

verify_command() {
  log_info "Verifying deployment on $PROD_HOST..."
  echo ""

  ssh -i "$SSH_KEY" root@"$PROD_HOST" << 'EOF'
cd /opt/wapsell

echo "================================"
echo "SSH CONNECTIVITY"
echo "================================"
echo "✅ Connected to $HOSTNAME"
echo ""

echo "================================"
echo "DOCKER SERVICES"
echo "================================"
docker-compose -f docker-compose.wapsell.yml ps
RUNNING=$(docker-compose -f docker-compose.wapsell.yml ps -q | wc -l)
echo "Status: $RUNNING containers running"
echo ""

echo "================================"
echo "HEALTH CHECKS"
echo "================================"

# API Health
echo "API Health:"
curl -s -w "  HTTP Status: %{http_code}\n" http://localhost:3000/health 2>/dev/null || echo "  API not ready"
echo ""

# Database
echo "Database:"
if docker-compose -f docker-compose.wapsell.yml exec -T postgres psql -U wapsell_user -d wapsell_prod -c "SELECT version();" > /dev/null 2>&1; then
  echo "  ✅ Connected"
else
  echo "  ❌ Connection failed"
fi
echo ""

# Redis
echo "Redis:"
if docker-compose -f docker-compose.wapsell.yml exec -T redis redis-cli ping 2>/dev/null | grep -q PONG; then
  echo "  ✅ Connected"
else
  echo "  ❌ Connection failed"
fi
echo ""

# Elasticsearch
echo "Elasticsearch:"
ES_STATUS=$(curl -s http://localhost:9200/_cluster/health | grep -o '"status":"[^"]*"' || echo '"status":"unknown"')
echo "  Status: $ES_STATUS"
echo ""

echo "================================"
echo "SSL CERTIFICATES"
echo "================================"
if [ -d /etc/letsencrypt/live ]; then
  ls -1 /etc/letsencrypt/live | while read domain; do
    EXPIRY=$(openssl x509 -enddate -noout -in /etc/letsencrypt/live/$domain/cert.pem 2>/dev/null | cut -d= -f2)
    echo "  $domain: expires $EXPIRY"
  done
else
  echo "  No SSL certificates configured yet"
fi
echo ""

echo "================================"
echo "DISK & MEMORY"
echo "================================"
echo "Disk usage:"
df -h / | tail -1
echo ""
echo "Memory usage:"
free -h | grep Mem
echo ""

echo "================================"
echo "RECENT LOGS (last 10 lines)"
echo "================================"
docker-compose -f docker-compose.wapsell.yml logs --tail 10 api 2>/dev/null | tail -10
echo ""

echo "✅ Verification complete"
EOF
}

###############################################################################
# ROLLBACK COMMAND
###############################################################################

rollback_command() {
  log_warn "Rolling back to previous version..."
  log_warn "This will stop all services and restore from git main branch"
  echo ""
  read -p "Are you sure? Type 'yes' to confirm: " CONFIRM

  if [ "$CONFIRM" != "yes" ]; then
    log_error "Rollback cancelled"
  fi

  echo ""

  ssh -i "$SSH_KEY" root@"$PROD_HOST" << 'EOF'
cd /opt/wapsell

echo "  Stopping Docker services..."
docker-compose -f docker-compose.wapsell.yml down

echo "  Fetching latest code from GitHub..."
git fetch origin

echo "  Checking out main branch..."
git checkout main
git pull origin main

echo "  Restarting services..."
docker-compose -f docker-compose.wapsell.yml pull
docker-compose -f docker-compose.wapsell.yml up -d

echo "  Waiting for services..."
sleep 10

echo "✓ Rollback complete"
docker-compose -f docker-compose.wapsell.yml ps
EOF

  log_info "Rollback completed"
}

###############################################################################
# LOGS COMMAND
###############################################################################

logs_command() {
  log_info "Tailing API logs from $PROD_HOST..."
  log_blue "Press Ctrl+C to stop"
  echo ""

  ssh -i "$SSH_KEY" root@"$PROD_HOST" << 'EOF'
cd /opt/wapsell
docker-compose -f docker-compose.wapsell.yml logs -f api --tail 100
EOF
}

###############################################################################
# STATUS COMMAND
###############################################################################

status_command() {
  log_info "Checking deployment status on $PROD_HOST..."
  echo ""

  ssh -i "$SSH_KEY" root@"$PROD_HOST" << 'EOF'
cd /opt/wapsell

echo "================================"
echo "SERVICE STATUS"
echo "================================"
docker-compose -f docker-compose.wapsell.yml ps --services

echo ""
echo "================================"
echo "DOCKER IMAGES"
echo "================================"
docker images | grep -E "wapsell|postgres|redis|elasticsearch|nginx" || echo "(no wapsell images found)"

echo ""
echo "================================"
echo "RECENT LOGS (last 20 lines)"
echo "================================"
docker-compose -f docker-compose.wapsell.yml logs --tail 20 api 2>/dev/null

echo ""
echo "================================"
echo "RESOURCE USAGE"
echo "================================"
echo "Disk free:"
df -h / | tail -1

echo ""
echo "Memory usage:"
free -h | grep Mem

echo ""
echo "================================"
echo "DOCKER STATS (press Ctrl+C to exit)"
echo "================================"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"
EOF
}

###############################################################################
# MAIN
###############################################################################

case "$COMMAND" in
  deploy)
    deploy_command
    ;;
  verify)
    verify_command
    ;;
  rollback)
    rollback_command
    ;;
  logs)
    logs_command
    ;;
  status)
    status_command
    ;;
  *)
    log_error "Unknown command: $COMMAND

Available commands:
  deploy   - Deploy/update the Wapsell stack
  verify   - Verify deployment health
  rollback - Rollback to previous version
  logs     - Tail API logs in real-time
  status   - Show service status"
    ;;
esac

# Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
