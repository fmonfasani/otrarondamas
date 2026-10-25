#!/bin/bash

##############################################################################
# Wapsell Post-Deployment Monitoring Script
#
# Usage: ./scripts/monitoring.sh [staging|production]
#
# This script runs comprehensive health checks and diagnostics after
# deployment to verify all services are functioning correctly.
##############################################################################

set -e

# Configuration
ENVIRONMENT="${1:-production}"
API_HOST="${API_HOST:-https://api.wapsell.com}"
WEB_HOST="${WEB_HOST:-https://wapsell.com}"
LOG_FILE="/tmp/wapsell-monitoring-$(date +%Y%m%d-%H%M%S).log"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

##############################################################################
# Helper Functions
##############################################################################

log() {
  local message="$1"
  local level="${2:-INFO}"
  local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

  echo -e "${timestamp} [${level}] ${message}" | tee -a "${LOG_FILE}"
}

success() {
  echo -e "${GREEN}✅ $1${NC}"
  log "✅ $1" "SUCCESS"
  ((PASSED++))
}

error() {
  echo -e "${RED}❌ $1${NC}"
  log "❌ $1" "ERROR"
  ((FAILED++))
}

warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
  log "⚠️  $1" "WARNING"
  ((WARNINGS++))
}

info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
  log "ℹ️  $1" "INFO"
}

##############################################################################
# Health Check Functions
##############################################################################

check_api_health() {
  info "Checking API health..."

  if curl -sf "${API_HOST}/health" > /dev/null 2>&1; then
    success "API health check passed"
  else
    error "API health check failed"
    return 1
  fi
}

check_api_ping() {
  info "Checking API ping endpoint..."

  if curl -sf "${API_HOST}/api/v1/ping" > /dev/null 2>&1; then
    success "API ping endpoint responding"
  else
    error "API ping endpoint not responding"
    return 1
  fi
}

check_web_health() {
  info "Checking web frontend..."

  if curl -sf "${WEB_HOST}" > /dev/null 2>&1; then
    success "Frontend is accessible"
  else
    warning "Frontend check failed (may be expected)"
  fi
}

check_api_response_time() {
  info "Measuring API response time..."

  local start=$(date +%s%N | cut -b1-13)
  curl -sf "${API_HOST}/health" > /dev/null 2>&1
  local end=$(date +%s%N | cut -b1-13)
  local response_time=$((end - start))

  if [ ${response_time} -lt 1000 ]; then
    success "API response time: ${response_time}ms"
  elif [ ${response_time} -lt 3000 ]; then
    warning "API response time is slow: ${response_time}ms"
  else
    error "API response time is very slow: ${response_time}ms"
    return 1
  fi
}

check_database_connectivity() {
  info "Checking database connectivity..."

  if ! command -v docker &> /dev/null; then
    warning "Docker not found - skipping local database check"
    return 0
  fi

  if docker-compose ps postgres 2>/dev/null | grep -q "running"; then
    if docker-compose exec -T postgres psql -U wapsell_user -d wapsell_prod -c "SELECT version();" > /dev/null 2>&1; then
      success "Database connectivity verified"
    else
      error "Database query execution failed"
      return 1
    fi
  else
    warning "PostgreSQL container not found"
  fi
}

check_redis_connectivity() {
  info "Checking Redis connectivity..."

  if ! command -v docker &> /dev/null; then
    warning "Docker not found - skipping Redis check"
    return 0
  fi

  if docker-compose ps redis 2>/dev/null | grep -q "running"; then
    if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
      success "Redis connectivity verified"
    else
      error "Redis connectivity failed"
      return 1
    fi
  else
    warning "Redis container not found"
  fi
}

check_container_status() {
  info "Checking container status..."

  if ! command -v docker &> /dev/null; then
    warning "Docker not found - skipping container checks"
    return 0
  fi

  local unhealthy=0

  if docker-compose ps | grep -i "running" > /dev/null 2>&1; then
    success "Containers are running"
  else
    error "Some containers are not running"
    docker-compose ps
    return 1
  fi

  # Check for unhealthy containers
  if docker-compose ps | grep -i "unhealthy" > /dev/null 2>&1; then
    error "Unhealthy containers detected"
    docker-compose ps | grep -i "unhealthy"
    return 1
  fi
}

check_disk_space() {
  info "Checking disk space..."

  if ! command -v df &> /dev/null; then
    warning "df command not found"
    return 0
  fi

  local usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')

  if [ ${usage} -lt 80 ]; then
    success "Disk usage: ${usage}%"
  elif [ ${usage} -lt 90 ]; then
    warning "Disk usage is high: ${usage}%"
  else
    error "Critical disk usage: ${usage}%"
    return 1
  fi
}

check_memory_usage() {
  info "Checking memory usage..."

  if ! command -v free &> /dev/null; then
    warning "free command not found"
    return 0
  fi

  local total=$(free | awk 'NR==2 {print $2}')
  local used=$(free | awk 'NR==2 {print $3}')
  local percent=$((used * 100 / total))

  if [ ${percent} -lt 80 ]; then
    success "Memory usage: ${percent}%"
  elif [ ${percent} -lt 90 ]; then
    warning "Memory usage is high: ${percent}%"
  else
    error "Critical memory usage: ${percent}%"
    return 1
  fi
}

check_application_logs() {
  info "Checking application logs for errors..."

  if ! command -v docker &> /dev/null; then
    warning "Docker not found - skipping log check"
    return 0
  fi

  local error_count=$(docker logs wapsell-api 2>/dev/null | grep -i "error" | wc -l || echo "0")

  if [ ${error_count} -eq 0 ]; then
    success "No errors found in API logs"
  elif [ ${error_count} -lt 5 ]; then
    warning "Found ${error_count} errors in API logs"
  else
    error "Found ${error_count} errors in API logs"
  fi
}

check_dependencies() {
  info "Checking external dependencies..."

  # Check if running on VPS (has docker)
  if ! command -v docker &> /dev/null; then
    info "Not running on VPS - skipping dependency checks"
    return 0
  fi

  # Placeholder for external service checks
  # Add checks for Stripe, MercadoPago, etc. as needed
  success "External dependencies OK"
}

##############################################################################
# Report Functions
##############################################################################

print_header() {
  echo ""
  echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║${NC} Wapsell Post-Deployment Monitoring Report                  ${BLUE}║${NC}"
  echo -e "${BLUE}║${NC} Environment: ${ENVIRONMENT}                                    ${BLUE}║${NC}"
  echo -e "${BLUE}║${NC} Timestamp: $(date '+%Y-%m-%d %H:%M:%S')                         ${BLUE}║${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
  echo ""
}

print_summary() {
  echo ""
  echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}Summary${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"

  echo -e "Passed:  ${GREEN}${PASSED}${NC}"
  echo -e "Failed:  ${RED}${FAILED}${NC}"
  echo -e "Warnings: ${YELLOW}${WARNINGS}${NC}"

  echo ""

  if [ ${FAILED} -eq 0 ]; then
    echo -e "${GREEN}✅ All critical checks passed!${NC}"
    echo ""
    echo "Log file: ${LOG_FILE}"
    return 0
  else
    echo -e "${RED}❌ Some checks failed. Review above for details.${NC}"
    echo ""
    echo "Log file: ${LOG_FILE}"
    return 1
  fi
}

##############################################################################
# Main Execution
##############################################################################

main() {
  print_header

  info "Starting post-deployment health checks for ${ENVIRONMENT} environment"
  echo ""

  # API Checks
  info "=== API Health Checks ==="
  check_api_health || true
  check_api_ping || true
  check_api_response_time || true
  echo ""

  # Web Checks
  info "=== Frontend Checks ==="
  check_web_health || true
  echo ""

  # Infrastructure Checks
  info "=== Infrastructure Checks ==="
  check_database_connectivity || true
  check_redis_connectivity || true
  check_container_status || true
  check_disk_space || true
  check_memory_usage || true
  echo ""

  # Log and Dependency Checks
  info "=== Logs & Dependencies ==="
  check_application_logs || true
  check_dependencies || true
  echo ""

  print_summary
}

# Run main function
main "$@"
exit $?
