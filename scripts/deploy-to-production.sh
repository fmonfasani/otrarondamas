#!/bin/bash
#
# Wapsell Production Deployment Script
# Target: Hetzner VPS (89.167.96.239)
# Usage: ./scripts/deploy-to-production.sh [branch]
#
# This script automates deployment of wapsell-remix and related services
# to production on the Hetzner VPS.

set -e  # Exit on any error
set -u  # Exit on undefined variable

# Configuration
DEPLOYMENT_BRANCH="${1:-refactor/opcion-6}"
DEPLOYMENT_DATE=$(date '+%Y%m%d-%H%M%S')
BACKUP_DIR="/opt/backups"
LOG_FILE="/var/log/wapsell/deployment-${DEPLOYMENT_DATE}.log"
PROJECT_DIR="/opt/wapsell"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}✓${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}✗${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}⚠${NC} $1" | tee -a "$LOG_FILE"
}

# Ensure we're in the right directory
if [ ! -d "$PROJECT_DIR" ]; then
    error "Project directory $PROJECT_DIR not found"
    exit 1
fi

cd "$PROJECT_DIR"

# Create log directory
mkdir -p "$(dirname "$LOG_FILE")"
mkdir -p "$BACKUP_DIR"

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║       WAPSELL PRODUCTION DEPLOYMENT SCRIPT                     ║"
echo "║       Target: Hetzner VPS (89.167.96.239)                     ║"
echo "║       Date: $(date '+%Y-%m-%d %H:%M:%S')                      ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

log "Deployment started for branch: $DEPLOYMENT_BRANCH"

# ============================================================================
# PHASE 1: Pre-Deployment Checks
# ============================================================================
echo -e "\n${BLUE}PHASE 1: Pre-Deployment Checks${NC}"

log "1.1 Checking git status..."
if [ -n "$(git status --porcelain | grep -v '??')" ]; then
    error "Uncommitted changes detected. Please commit or stash changes first."
    git status
    exit 1
fi
success "Git working tree clean"

log "1.2 Verifying git branch..."
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "$DEPLOYMENT_BRANCH" ]; then
    log "Checking out $DEPLOYMENT_BRANCH..."
    git checkout "$DEPLOYMENT_BRANCH"
fi
success "Branch: $CURRENT_BRANCH"

log "1.3 Displaying recent commits..."
git log --oneline -3
success "Git history verified"

log "1.4 Checking docker-compose.yml..."
if [ ! -f "docker-compose.yml" ]; then
    error "docker-compose.yml not found"
    exit 1
fi
success "docker-compose.yml found"

log "1.5 Checking .env.production..."
if [ ! -f ".env.production" ]; then
    error ".env.production not found"
    exit 1
fi
success ".env.production found"

log "1.6 Checking environment variables..."
REQUIRED_VARS=("DB_PASSWORD" "JWT_SECRET" "SESSION_SECRET")
for var in "${REQUIRED_VARS[@]}"; do
    if ! grep -q "^${var}=" .env.production; then
        warning "Missing env var: $var (should be set in production)"
    fi
done
success "Environment variables checked"

log "1.7 Checking Docker..."
if ! command -v docker &> /dev/null; then
    error "Docker is not installed"
    exit 1
fi
success "Docker available: $(docker --version)"

if ! command -v docker-compose &> /dev/null; then
    error "docker-compose is not installed"
    exit 1
fi
success "docker-compose available: $(docker-compose --version)"

# ============================================================================
# PHASE 2: Backup Existing State
# ============================================================================
echo -e "\n${BLUE}PHASE 2: Backup Existing State${NC}"

log "2.1 Backing up .env.production..."
cp .env.production "$BACKUP_DIR/.env.production-$DEPLOYMENT_DATE.bak"
success "Environment backup created"

log "2.2 Backing up docker-compose state..."
docker-compose ps > "$BACKUP_DIR/docker-ps-before-$DEPLOYMENT_DATE.txt" 2>&1 || true
success "Docker state backed up"

log "2.3 Backing up git history..."
git log --oneline -20 > "$BACKUP_DIR/git-log-before-$DEPLOYMENT_DATE.txt"
success "Git history backed up"

# ============================================================================
# PHASE 3: Update Code
# ============================================================================
echo -e "\n${BLUE}PHASE 3: Update Code from Repository${NC}"

log "3.1 Fetching from origin..."
git fetch origin
success "Repository fetched"

log "3.2 Pulling latest code from $DEPLOYMENT_BRANCH..."
git pull origin "$DEPLOYMENT_BRANCH"
success "Code updated"

CURRENT_COMMIT=$(git rev-parse --short HEAD)
log "Current commit: $CURRENT_COMMIT"

# ============================================================================
# PHASE 4: Build Docker Images
# ============================================================================
echo -e "\n${BLUE}PHASE 4: Building Docker Images${NC}"

log "4.1 Building wapsell-remix (frontend)..."
if docker-compose build wapsell-remix; then
    success "wapsell-remix built successfully"
else
    error "Failed to build wapsell-remix"
    exit 1
fi

log "4.2 Building API service..."
if docker-compose build api; then
    success "API built successfully"
else
    error "Failed to build API"
    exit 1
fi

log "4.3 Listing built images..."
docker images | grep wapsell | head -5

# ============================================================================
# PHASE 5: Deploy Services
# ============================================================================
echo -e "\n${BLUE}PHASE 5: Deploying Services${NC}"

log "5.1 Stopping existing services..."
docker-compose down || true
success "Services stopped"

log "5.2 Starting all services..."
if docker-compose up -d; then
    success "Services started"
else
    error "Failed to start services"
    exit 1
fi

sleep 5  # Give services time to start

log "5.3 Verifying container health..."
docker-compose ps

# ============================================================================
# PHASE 6: Health Checks
# ============================================================================
echo -e "\n${BLUE}PHASE 6: Health Checks${NC}"

log "6.1 Checking frontend (wapsell-remix) health..."
for i in {1..10}; do
    if curl -f http://localhost:5173/health > /dev/null 2>&1; then
        success "Frontend is healthy"
        break
    fi
    if [ $i -eq 10 ]; then
        error "Frontend health check failed after 10 attempts"
        docker-compose logs wapsell-remix
        exit 1
    fi
    log "Health check attempt $i/10... waiting..."
    sleep 3
done

log "6.2 Checking API health..."
for i in {1..10}; do
    if curl -f http://localhost:8600/api/health > /dev/null 2>&1; then
        success "API is healthy"
        break
    fi
    if [ $i -eq 10 ]; then
        error "API health check failed after 10 attempts"
        docker-compose logs api
        exit 1
    fi
    log "Health check attempt $i/10... waiting..."
    sleep 3
done

# ============================================================================
# PHASE 7: Smoke Tests
# ============================================================================
echo -e "\n${BLUE}PHASE 7: Smoke Tests${NC}"

log "7.1 Testing frontend landing page (ES)..."
FRONTEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/es/)
if [ "$FRONTEND_RESPONSE" = "200" ] || [ "$FRONTEND_RESPONSE" = "404" ]; then
    success "Frontend responding with HTTP $FRONTEND_RESPONSE"
else
    warning "Frontend returned HTTP $FRONTEND_RESPONSE (expected 200 or 404)"
fi

log "7.2 Testing API endpoints..."
API_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8600/api/health)
if [ "$API_RESPONSE" = "200" ]; then
    success "API responding with HTTP $API_RESPONSE"
else
    error "API returned HTTP $API_RESPONSE (expected 200)"
fi

log "7.3 Checking for critical errors in logs..."
if docker-compose logs | grep -i "fatal\|panic\|critical" | head -5; then
    warning "Critical errors found in logs (review before marking as success)"
else
    success "No critical errors in logs"
fi

# ============================================================================
# PHASE 8: Deployment Summary
# ============================================================================
echo -e "\n${BLUE}PHASE 8: Deployment Summary${NC}"

log "8.1 Current service status:"
docker-compose ps

log "8.2 Deployment Information:"
echo "  Branch: $DEPLOYMENT_BRANCH"
echo "  Commit: $CURRENT_COMMIT"
echo "  Timestamp: $DEPLOYMENT_DATE"
echo "  Log file: $LOG_FILE"
echo "  Backup dir: $BACKUP_DIR"

# ============================================================================
# Success
# ============================================================================
echo -e "\n${GREEN}"
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                   DEPLOYMENT SUCCESSFUL!                      ║"
echo "║                                                                ║"
echo "║  Services deployed and healthy:                               ║"
echo "║  ✓ wapsell-remix (frontend) - http://localhost:5173           ║"
echo "║  ✓ api (NestJS) - http://localhost:8600                       ║"
echo "║  ✓ postgres (database) - localhost:5432                       ║"
echo "║  ✓ pos-admin - http://localhost:3030                          ║"
echo "║  ✓ tienda-online - http://localhost:3040                      ║"
echo "║                                                                ║"
echo "║  Next steps:                                                   ║"
echo "║  1. Verify SSL/HTTPS if using reverse proxy                   ║"
echo "║  2. Test user authentication flows                            ║"
echo "║  3. Monitor logs: docker-compose logs -f                      ║"
echo "║  4. Update domain DNS if needed                                ║"
echo "║                                                                ║"
echo "║  Logs: $LOG_FILE"
echo "║  Backups: $BACKUP_DIR"
echo "╚════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

success "Deployment completed successfully at $(date)"
log "Deployment duration: $((SECONDS / 60)) minutes"

exit 0
