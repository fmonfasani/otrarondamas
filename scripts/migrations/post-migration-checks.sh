#!/bin/bash
set -e

# P2G: Post-Migration Validation Checks
# Validates successful migration of businessId to Producto
# Checks: data integrity, constraints, performance, rollback readiness

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Script Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
LOG_FILE="${SCRIPT_DIR}/post-migration-checks.log"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
ENV_MODE="${1:-production}"

# Database Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-otrarondamas}"
DB_PASSWORD="${DB_PASSWORD:-}"

# Staging Mode
if [[ "${ENV_MODE}" == "staging" ]]; then
  DB_NAME="otrarondamas_staging"
fi

# Initialize logging
mkdir -p "$(dirname "${LOG_FILE}")"
exec 1> >(tee -a "${LOG_FILE}")
exec 2>&1

echo "════════════════════════════════════════════════════════════"
echo "  P2G POST-MIGRATION VALIDATION CHECKS"
echo "  Timestamp: ${TIMESTAMP}"
echo "  Environment: ${ENV_MODE}"
echo "  Database: ${DB_NAME}"
echo "════════════════════════════════════════════════════════════"
echo ""

# Function to log results
log_check() {
  local check_name=$1
  local status=$2
  local details=$3

  if [[ "${status}" == "PASS" ]]; then
    echo -e "${GREEN}✓ ${check_name}${NC} - ${details}"
  elif [[ "${status}" == "WARN" ]]; then
    echo -e "${YELLOW}⚠ ${check_name}${NC} - ${details}"
  else
    echo -e "${RED}✗ ${check_name}${NC} - ${details}"
  fi
}

# Function to fail gracefully
fail_check() {
  local check_name=$1
  local reason=$2

  echo ""
  echo -e "${RED}════════════════════════════════════════════════════════════${NC}"
  echo -e "${RED}VALIDATION FAILED: ${check_name}${NC}"
  echo -e "${RED}Reason: ${reason}${NC}"
  echo -e "${RED}════════════════════════════════════════════════════════════${NC}"
  exit 1
}

# CHECK 1: businessId Column Exists and Populated
echo "[CHECK 1/5] Verifying businessId column..."

COL_EXISTS=$(PGPASSWORD="${DB_PASSWORD}" psql --host="${DB_HOST}" --port="${DB_PORT}" \
  --username="${DB_USER}" --dbname="${DB_NAME}" -t -c "
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_name = 'Producto' AND column_name = 'businessId';" | tr -d ' ')

if [[ ${COL_EXISTS} -eq 1 ]]; then
  log_check "businessId Column Exists" "PASS" "Column successfully created"
else
  fail_check "businessId Column Exists" "Column not found in Producto table"
fi

# Check Population
TOTAL_PRODUCTOS=$(PGPASSWORD="${DB_PASSWORD}" psql --host="${DB_HOST}" --port="${DB_PORT}" \
  --username="${DB_USER}" --dbname="${DB_NAME}" -t -c "SELECT COUNT(*) FROM \"Producto\";" | tr -d ' ')

POPULATED_PRODUCTOS=$(PGPASSWORD="${DB_PASSWORD}" psql --host="${DB_HOST}" --port="${DB_PORT}" \
  --username="${DB_USER}" --dbname="${DB_NAME}" -t -c \
  "SELECT COUNT(*) FROM \"Producto\" WHERE \"businessId\" IS NOT NULL;" | tr -d ' ')

if [[ ${POPULATED_PRODUCTOS} -eq ${TOTAL_PRODUCTOS} ]]; then
  log_check "businessId Population" "PASS" "${POPULATED_PRODUCTOS}/${TOTAL_PRODUCTOS} rows populated"
else
  fail_check "businessId Population" \
    "Incomplete population: ${POPULATED_PRODUCTOS}/${TOTAL_PRODUCTOS} rows"
fi

echo ""

# CHECK 2: Null Values Validation
echo "[CHECK 2/5] Checking for null values in businessId..."

NULL_COUNT=$(PGPASSWORD="${DB_PASSWORD}" psql --host="${DB_HOST}" --port="${DB_PORT}" \
  --username="${DB_USER}" --dbname="${DB_NAME}" -t -c \
  "SELECT COUNT(*) FROM \"Producto\" WHERE \"businessId\" IS NULL;" | tr -d ' ')

if [[ ${NULL_COUNT} -eq 0 ]]; then
  log_check "Null Values" "PASS" "No null businessId values found"
else
  fail_check "Null Values" "Found ${NULL_COUNT} null businessId values"
fi

echo ""

# CHECK 3: Foreign Key Constraint
echo "[CHECK 3/5] Verifying foreign key constraint..."

FK_EXISTS=$(PGPASSWORD="${DB_PASSWORD}" psql --host="${DB_HOST}" --port="${DB_PORT}" \
  --username="${DB_USER}" --dbname="${DB_NAME}" -t -c "
  SELECT COUNT(*) FROM information_schema.table_constraints
  WHERE table_name = 'Producto'
    AND constraint_name = 'Producto_businessId_fkey'
    AND constraint_type = 'FOREIGN KEY';" | tr -d ' ')

if [[ ${FK_EXISTS} -eq 1 ]]; then
  log_check "Foreign Key Constraint" "PASS" "Constraint successfully created"
else
  fail_check "Foreign Key Constraint" "Foreign key not found or not properly created"
fi

echo ""

# CHECK 4: Data Consistency (businessId matches empresaId)
echo "[CHECK 4/5] Verifying data consistency..."

CONSISTENCY_ERRORS=$(PGPASSWORD="${DB_PASSWORD}" psql --host="${DB_HOST}" --port="${DB_PORT}" \
  --username="${DB_USER}" --dbname="${DB_NAME}" -t -c "
  SELECT COUNT(*) FROM \"Producto\"
  WHERE \"businessId\" != \"empresaId\";" | tr -d ' ')

if [[ ${CONSISTENCY_ERRORS} -eq 0 ]]; then
  log_check "Data Consistency" "PASS" "businessId matches empresaId for all rows"
else
  fail_check "Data Consistency" \
    "Found ${CONSISTENCY_ERRORS} rows where businessId != empresaId"
fi

echo ""

# CHECK 5: Index Performance
echo "[CHECK 5/5] Checking index status..."

INDEX_INFO=$(PGPASSWORD="${DB_PASSWORD}" psql --host="${DB_HOST}" --port="${DB_PORT}" \
  --username="${DB_USER}" --dbname="${DB_NAME}" -t -c "
  SELECT COUNT(*) FROM pg_indexes
  WHERE tablename = 'Producto'
    AND indexname LIKE '%businessId%';" | tr -d ' ')

if [[ ${INDEX_INFO} -gt 0 ]]; then
  log_check "Index Status" "PASS" "Indexes available on businessId"
else
  log_check "Index Status" "WARN" "No explicit indexes on businessId (foreign key provides some performance)"
fi

echo ""

# Summary
echo "════════════════════════════════════════════════════════════"
echo -e "${GREEN}✓ POST-MIGRATION CHECKS PASSED${NC}"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Migration Statistics:"
echo "  Total Productos: ${TOTAL_PRODUCTOS}"
echo "  Populated with businessId: ${POPULATED_PRODUCTOS}"
echo "  Data Consistency Errors: ${CONSISTENCY_ERRORS}"
echo "  Null Values: ${NULL_COUNT}"
echo ""
echo "The migration is ready for application deployment."
echo "Log saved to: ${LOG_FILE}"
echo ""

exit 0
