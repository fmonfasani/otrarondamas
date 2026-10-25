#!/bin/bash
# Validation script for docker-compose.wapsell.yml deployment
# Usage: bash docker-validate.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Helper functions
error() {
  echo -e "${RED}✗ ERROR${NC}: $1" >&2
  ((ERRORS++))
}

warning() {
  echo -e "${YELLOW}⚠ WARNING${NC}: $1" >&2
  ((WARNINGS++))
}

success() {
  echo -e "${GREEN}✓ OK${NC}: $1"
}

# ============================================================================
# CHECKS
# ============================================================================

echo "========================================="
echo "Wapsell Docker Deployment Validation"
echo "========================================="
echo ""

# 1. Docker & Docker Compose installed
echo "1. Checking Docker installation..."
if command -v docker &> /dev/null; then
  DOCKER_VERSION=$(docker --version)
  success "$DOCKER_VERSION"
else
  error "Docker not installed"
fi

if command -v docker &> /dev/null && docker compose version &> /dev/null; then
  COMPOSE_VERSION=$(docker compose version)
  success "$COMPOSE_VERSION"
else
  error "Docker Compose not installed"
fi

# 2. Files exist
echo ""
echo "2. Checking required files..."

FILES=(
  "docker-compose.wapsell.yml"
  ".env.wapsell"
  "apps/api/Dockerfile"
  "apps/tienda-online/Dockerfile"
  "apps/pos-admin/Dockerfile"
  "postgres/init-schemas.sql"
  "postgres/init-extensions.sql"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    success "$file"
  else
    error "$file not found"
  fi
done

# 3. Environment variables
echo ""
echo "3. Checking environment variables (.env.wapsell)..."

if [ ! -f ".env.wapsell" ]; then
  error ".env.wapsell not found (copy from .env.wapsell.example)"
else
  # Check critical variables
  CRITICAL_VARS=(
    "POSTGRES_PASSWORD"
    "POSTGRES_USER"
    "JWT_SECRET"
    "JWT_REFRESH_SECRET"
    "REDIS_PASSWORD"
    "ELASTICSEARCH_PASSWORD"
    "API_BASE_URL"
    "VITE_API_URL_TIENDA"
    "VITE_API_URL_ADMIN"
  )

  for var in "${CRITICAL_VARS[@]}"; do
    if grep -q "^${var}=" .env.wapsell; then
      VALUE=$(grep "^${var}=" .env.wapsell | cut -d'=' -f2)
      if [ -z "$VALUE" ]; then
        warning "${var} is empty"
      else
        success "${var} defined"
      fi
    else
      error "${var} not in .env.wapsell"
    fi
  done
fi

# 4. Directory structure
echo ""
echo "4. Checking directory structure..."

DIRS=(
  "apps/api"
  "apps/tienda-online"
  "apps/pos-admin"
  "packages"
  "postgres"
)

for dir in "${DIRS[@]}"; do
  if [ -d "$dir" ]; then
    success "$dir exists"
  else
    error "$dir directory not found"
  fi
done

# 5. Docker compose syntax
echo ""
echo "5. Validating docker-compose.wapsell.yml syntax..."

if docker compose -f docker-compose.wapsell.yml config > /dev/null 2>&1; then
  success "docker-compose.wapsell.yml is valid"
else
  error "docker-compose.wapsell.yml has syntax errors"
fi

# 6. Port availability
echo ""
echo "6. Checking port availability..."

PORTS=(
  "127.0.0.1:5432:postgres"
  "127.0.0.1:6379:redis"
  "127.0.0.1:9200:elasticsearch"
  "127.0.0.1:3000:api"
  "127.0.0.1:3001:tienda-online"
  "127.0.0.1:3002:pos-admin"
)

for port_info in "${PORTS[@]}"; do
  IFS=':' read -r host port service <<< "$port_info"
  if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
    warning "Port $port is already in use (may conflict with existing service)"
  else
    success "Port $port is available"
  fi
done

# 7. Disk space
echo ""
echo "7. Checking disk space..."

REQUIRED_SPACE_GB=50
AVAILABLE_SPACE=$(df /data | awk 'NR==2 {print $4}')
AVAILABLE_SPACE_GB=$((AVAILABLE_SPACE / 1024 / 1024))

if [ $AVAILABLE_SPACE_GB -gt $REQUIRED_SPACE_GB ]; then
  success "$AVAILABLE_SPACE_GB GB available (need $REQUIRED_SPACE_GB GB)"
else
  warning "Only $AVAILABLE_SPACE_GB GB available (recommend $REQUIRED_SPACE_GB GB)"
fi

# 8. Data directories
echo ""
echo "8. Checking data directories..."

DATA_DIRS=(
  "/data/wapsell/postgres"
  "/data/wapsell/redis"
  "/data/wapsell/elasticsearch"
  "/data/wapsell/logs/api"
  "/data/wapsell/assets"
)

for dir in "${DATA_DIRS[@]}"; do
  if [ -d "$dir" ]; then
    if [ -w "$dir" ]; then
      success "$dir exists and writable"
    else
      error "$dir exists but not writable"
    fi
  else
    warning "$dir does not exist (will be created on first run)"
  fi
done

# 9. Git status
echo ""
echo "9. Checking git status..."

if git status > /dev/null 2>&1; then
  if git diff-index --quiet HEAD --; then
    success "Git working tree clean"
  else
    warning "Git working tree has uncommitted changes"
  fi
else
  warning "Not a git repository"
fi

# ============================================================================
# SUMMARY
# ============================================================================

echo ""
echo "========================================="
echo "Validation Summary"
echo "========================================="

if [ $ERRORS -eq 0 ]; then
  echo -e "${GREEN}✓ All critical checks passed${NC}"
else
  echo -e "${RED}✗ $ERRORS critical errors found${NC}"
fi

if [ $WARNINGS -gt 0 ]; then
  echo -e "${YELLOW}⚠ $WARNINGS warnings${NC}"
fi

echo ""

if [ $ERRORS -eq 0 ]; then
  echo "Deployment ready. Run:"
  echo "  docker compose -f docker-compose.wapsell.yml up -d"
  exit 0
else
  echo "Please fix errors before deploying."
  exit 1
fi
