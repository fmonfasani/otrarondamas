#!/bin/bash
#
# Wapsell Deployment Validation Script
# This script validates that a deployment is successful and operational
# Usage: ./scripts/validate-deployment.sh
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0

# Test result tracking
test_result() {
    local name="$1"
    local result="$2"
    local details="${3:-}"

    if [ "$result" = "PASS" ]; then
        echo -e "${GREEN}✓${NC} $name"
        PASS_COUNT=$((PASS_COUNT + 1))
    elif [ "$result" = "FAIL" ]; then
        echo -e "${RED}✗${NC} $name"
        if [ -n "$details" ]; then
            echo -e "  ${RED}Error: $details${NC}"
        fi
        FAIL_COUNT=$((FAIL_COUNT + 1))
    elif [ "$result" = "WARN" ]; then
        echo -e "${YELLOW}⚠${NC} $name"
        if [ -n "$details" ]; then
            echo -e "  ${YELLOW}Warning: $details${NC}"
        fi
        WARN_COUNT=$((WARN_COUNT + 1))
    fi
}

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║         WAPSELL DEPLOYMENT VALIDATION                          ║"
echo "║         $(date '+%Y-%m-%d %H:%M:%S')"
echo "╚════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ============================================================================
# 1. Docker Service Checks
# ============================================================================
echo -e "\n${BLUE}1. Docker Services${NC}"

# Check if docker-compose is running
if docker-compose ps > /dev/null 2>&1; then
    test_result "docker-compose accessible" "PASS"
else
    test_result "docker-compose accessible" "FAIL" "Cannot execute docker-compose"
    exit 1
fi

# Check individual services
for service in postgres api wapsell-remix pos-admin tienda-online; do
    STATUS=$(docker-compose ps "$service" --format "{{.State}}" 2>/dev/null || echo "MISSING")
    HEALTH=$(docker-compose ps "$service" --format "{{.Status}}" 2>/dev/null | grep -o "healthy\|unhealthy\|Up" || echo "UNKNOWN")

    if [ "$STATUS" = "running" ]; then
        if echo "$HEALTH" | grep -q "healthy"; then
            test_result "Service: $service (healthy)" "PASS"
        elif echo "$HEALTH" | grep -q "Up"; then
            test_result "Service: $service (running)" "WARN" "Container running but healthcheck status unknown"
        else
            test_result "Service: $service" "FAIL" "Container running but not healthy"
        fi
    else
        test_result "Service: $service" "FAIL" "Container not running (Status: $STATUS)"
    fi
done

# ============================================================================
# 2. Connectivity Tests
# ============================================================================
echo -e "\n${BLUE}2. Connectivity Tests${NC}"

# Frontend health check
if curl -sf http://localhost:5173/health > /dev/null 2>&1; then
    test_result "Frontend health endpoint" "PASS"
else
    test_result "Frontend health endpoint" "FAIL" "No response on http://localhost:5173/health"
fi

# API health check
if curl -sf http://localhost:8600/api/health > /dev/null 2>&1; then
    test_result "API health endpoint" "PASS"
else
    test_result "API health endpoint" "FAIL" "No response on http://localhost:8600/api/health"
fi

# Database connectivity check
if docker-compose exec -T postgres pg_isready -U wapsell > /dev/null 2>&1; then
    test_result "Database connectivity" "PASS"
else
    test_result "Database connectivity" "FAIL" "PostgreSQL not responding"
fi

# POS Admin check
if curl -sf http://localhost:3030/ > /dev/null 2>&1; then
    test_result "POS Admin service" "PASS"
else
    test_result "POS Admin service" "WARN" "No response on http://localhost:3030/"
fi

# Tienda Online check
if curl -sf http://localhost:3040/ > /dev/null 2>&1; then
    test_result "Tienda Online service" "PASS"
else
    test_result "Tienda Online service" "WARN" "No response on http://localhost:3040/"
fi

# ============================================================================
# 3. Response Content Tests
# ============================================================================
echo -e "\n${BLUE}3. Response Content Tests${NC}"

# Check frontend returns HTML
FRONTEND_RESPONSE=$(curl -s http://localhost:5173/es/)
if echo "$FRONTEND_RESPONSE" | grep -q "<!DOCTYPE\|<html"; then
    test_result "Frontend returns HTML" "PASS"
else
    test_result "Frontend returns HTML" "WARN" "Unexpected content type"
fi

# Check API returns JSON
API_RESPONSE=$(curl -s http://localhost:8600/api/health)
if echo "$API_RESPONSE" | grep -q "{\|}" || [ -n "$API_RESPONSE" ]; then
    test_result "API returns structured response" "PASS"
else
    test_result "API returns structured response" "FAIL" "Empty response"
fi

# ============================================================================
# 4. Error Log Analysis
# ============================================================================
echo -e "\n${BLUE}4. Error Log Analysis${NC}"

# Check for fatal errors in frontend logs
if docker-compose logs wapsell-remix 2>/dev/null | grep -qi "fatal\|panic\|critical"; then
    test_result "Frontend: No fatal errors" "FAIL" "Critical errors detected in logs"
else
    test_result "Frontend: No fatal errors" "PASS"
fi

# Check for fatal errors in API logs
if docker-compose logs api 2>/dev/null | grep -qi "fatal\|panic\|critical\|killed"; then
    test_result "API: No fatal errors" "FAIL" "Critical errors detected in logs"
else
    test_result "API: No fatal errors" "PASS"
fi

# Check for database errors
if docker-compose logs postgres 2>/dev/null | grep -qi "fatal\|shutdown\|error (unknown command)"; then
    test_result "Database: No fatal errors" "FAIL" "Critical errors detected in logs"
else
    test_result "Database: No fatal errors" "PASS"
fi

# ============================================================================
# 5. Container Resource Usage
# ============================================================================
echo -e "\n${BLUE}5. Container Resource Usage${NC}"

# Check memory usage
MEMORY_USAGE=$(docker-compose stats --no-stream --format "table {{.Container}}\t{{.MemUsage}}" 2>/dev/null | tail -n +2 || echo "")
if [ -z "$MEMORY_USAGE" ]; then
    test_result "Container memory stats" "WARN" "Unable to retrieve memory stats"
else
    while IFS=$'\t' read -r container mem; do
        echo "  $container: $mem"
    done <<< "$MEMORY_USAGE"
    test_result "Container memory usage" "PASS"
fi

# Check CPU usage (basic)
if docker stats --no-stream > /dev/null 2>&1; then
    test_result "Container CPU stats available" "PASS"
else
    test_result "Container CPU stats available" "WARN" "Unable to retrieve CPU stats"
fi

# ============================================================================
# 6. Volume and Network Checks
# ============================================================================
echo -e "\n${BLUE}6. Volume and Network Checks${NC}"

# Check wapsell-network exists
if docker network ls | grep -q "wapsell-network"; then
    test_result "Docker network: wapsell-network" "PASS"
else
    test_result "Docker network: wapsell-network" "FAIL" "Network not found"
fi

# Check postgres_data volume exists
if docker volume ls | grep -q "wapsell-postgres\|postgres_data"; then
    test_result "Docker volume: postgres_data" "PASS"
else
    test_result "Docker volume: postgres_data" "FAIL" "Volume not found"
fi

# Check volume has data
VOLUME_SIZE=$(docker run --rm -v postgres_data:/data alpine du -sh /data 2>/dev/null | cut -f1 || echo "UNKNOWN")
if [ "$VOLUME_SIZE" != "UNKNOWN" ] && [ "$VOLUME_SIZE" != "0" ]; then
    test_result "Database volume has data" "PASS" "(Size: $VOLUME_SIZE)"
else
    test_result "Database volume has data" "WARN" "Cannot verify volume size"
fi

# ============================================================================
# 7. Git and Deployment Info
# ============================================================================
echo -e "\n${BLUE}7. Git and Deployment Info${NC}"

if [ -d ".git" ]; then
    BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "UNKNOWN")
    COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "UNKNOWN")
    ORIGIN=$(git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null || echo "UNKNOWN")

    test_result "Git repository" "PASS"
    echo "  Branch: $BRANCH"
    echo "  Commit: $COMMIT"
    echo "  Upstream: $ORIGIN"
else
    test_result "Git repository" "FAIL" "Not a git repository"
fi

# ============================================================================
# 8. Environment Configuration
# ============================================================================
echo -e "\n${BLUE}8. Environment Configuration${NC}"

if [ -f ".env.production" ]; then
    test_result "Production environment file" "PASS"

    # Check for required vars
    REQUIRED_VARS=("DB_PASSWORD" "JWT_SECRET" "SESSION_SECRET" "NODE_ENV")
    for var in "${REQUIRED_VARS[@]}"; do
        if grep -q "^${var}=" .env.production; then
            test_result "Env var: $var" "PASS"
        else
            test_result "Env var: $var" "FAIL" "Not found in .env.production"
        fi
    done
else
    test_result "Production environment file" "FAIL" ".env.production not found"
fi

# ============================================================================
# Summary
# ============================================================================
echo -e "\n${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                      VALIDATION SUMMARY                        ║${NC}"
echo -e "${BLUE}║${NC}"
echo -e "${GREEN}║  ✓ PASSED: $PASS_COUNT${NC}"
echo -e "${YELLOW}║  ⚠ WARNING: $WARN_COUNT${NC}"
echo -e "${RED}║  ✗ FAILED: $FAIL_COUNT${NC}"
echo -e "${BLUE}║${NC}"

if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "${GREEN}║                    ✓ DEPLOYMENT VALID                         ║${NC}"
elif [ $FAIL_COUNT -le 2 ]; then
    echo -e "${YELLOW}║                  ⚠ DEPLOYMENT PARTIALLY VALID                 ║${NC}"
else
    echo -e "${RED}║                    ✗ DEPLOYMENT INVALID                       ║${NC}"
fi

echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"

# Exit code based on failures
if [ $FAIL_COUNT -gt 0 ]; then
    exit 1
else
    exit 0
fi
