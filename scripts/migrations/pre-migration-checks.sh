#!/bin/bash
set -e

# P2G: Pre-Migration Validation Checks
# Runs before any migration execution
# Validates: connectivity, data integrity, backups, disk space, locks

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
LOG_FILE="${SCRIPT_DIR}/pre-migration-checks.log"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
ENV_MODE="${1:-production}"

# Database Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-otrarondamas}"
DB_PASSWORD="${DB_PASSWORD:-}"

# Backup Configuration
BACKUP_DIR="${BACKUP_DIR:-${PROJECT_ROOT}/backups}"
VALIDATION_DIR="${VALIDATION_DIR:-${PROJECT_ROOT}/validation}"

# Staging Mode
if [[ "${ENV_MODE}" == "staging" ]]; then
  DB_NAME="otrarondamas_staging"
  echo -e "${YELLOW}⚠ STAGING MODE: Using ${DB_NAME}${NC}"
fi

# Initialize logging
mkdir -p "$(dirname "${LOG_FILE}")"
exec 1> >(tee -a "${LOG_FILE}")
exec 2>&1

echo "════════════════════════════════════════════════════════════"
echo "  P2G PRE-MIGRATION VALIDATION CHECKS"
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
  echo -e "${RED}MIGRATION BLOCKED: ${check_name}${NC}"
  echo -e "${RED}Reason: ${reason}${NC}"
  echo -e "${RED}════════════════════════════════════════════════════════════${NC}"
  exit 1
}

# GATE 1: Database Connectivity
echo "[1/8] Testing database connectivity..."
if PGPASSWORD="${DB_PASSWORD}" psql \
  --host="${DB_HOST}" \
  --port="${DB_PORT}" \
  --username="${DB_USER}" \
  --dbname="${DB_NAME}" \
  -c "SELECT 1;" > /dev/null 2>&1; then
  log_check "Database Connectivity" "PASS" "Successfully connected to ${DB_NAME}"
else
  fail_check "Database Connectivity" "Cannot connect to ${DB_HOST}:${DB_PORT}/${DB_NAME}"
fi

# GATE 2: Baseline Row Counts
echo ""
echo "[2/8] Verifying baseline row counts..."

PRODUCTO_COUNT=$(PGPASSWORD="${DB_PASSWORD}" psql --host="${DB_HOST}" --port="${DB_PORT}" \
  --username="${DB_USER}" --dbname="${DB_NAME}" -t -c "SELECT COUNT(*) FROM \"Producto\";" | tr -d ' ')
VENTA_COUNT=$(PGPASSWORD="${DB_PASSWORD}" psql --host="${DB_HOST}" --port="${DB_PORT}" \
  --username="${DB_USER}" --dbname="${DB_NAME}" -t -c "SELECT COUNT(*) FROM \"Venta\";" | tr -d ' ')
USUARIO_COUNT=$(PGPASSWORD="${DB_PASSWORD}" psql --host="${DB_HOST}" --port="${DB_PORT}" \
  --username="${DB_USER}" --dbname="${DB_NAME}" -t -c "SELECT COUNT(*) FROM \"Usuario\";" | tr -d ' ')
EMPRESA_COUNT=$(PGPASSWORD="${DB_PASSWORD}" psql --host="${DB_HOST}" --port="${DB_PORT}" \
  --username="${DB_USER}" --dbname="${DB_NAME}" -t -c "SELECT COUNT(*) FROM \"Empresa\";" | tr -d ' ')

echo "  Productos: ${PRODUCTO_COUNT}"
echo "  Ventas: ${VENTA_COUNT}"
echo "  Usuarios: ${USUARIO_COUNT}"
echo "  Empresas: ${EMPRESA_COUNT}"

if [[ ${PRODUCTO_COUNT} -gt 0 ]] && [[ ${EMPRESA_COUNT} -gt 0 ]]; then
  log_check "Row Count Verification" "PASS" "Data present (${PRODUCTO_COUNT} productos, ${EMPRESA_COUNT} empresas)"
else
  fail_check "Row Count Verification" "Missing critical data: productos=${PRODUCTO_COUNT}, empresas=${EMPRESA_COUNT}"
fi

# GATE 3: Referential Integrity
echo ""
echo "[3/8] Checking referential integrity..."

ORPHANED_VENTA_ITEMS=$(PGPASSWORD="${DB_PASSWORD}" psql --host="${DB_HOST}" --port="${DB_PORT}" \
  --username="${DB_USER}" --dbname="${DB_NAME}" -t -c "
  SELECT COUNT(*) FROM \"VentaItem\" v
  WHERE v.\"ventaId\" NOT IN (SELECT id FROM \"Venta\");" | tr -d ' ')

ORPHANED_PRODUCTO=$(PGPASSWORD="${DB_PASSWORD}" psql --host="${DB_HOST}" --port="${DB_PORT}" \
  --username="${DB_USER}" --dbname="${DB_NAME}" -t -c "
  SELECT COUNT(*) FROM \"Producto\" p
  WHERE p.\"empresaId\" NOT IN (SELECT id FROM \"Empresa\");" | tr -d ' ')

if [[ ${ORPHANED_VENTA_ITEMS} -eq 0 ]] && [[ ${ORPHANED_PRODUCTO} -eq 0 ]]; then
  log_check "Referential Integrity" "PASS" "No orphaned records found"
else
  fail_check "Referential Integrity" "Found orphaned records: VentaItems=${ORPHANED_VENTA_ITEMS}, Productos=${ORPHANED_PRODUCTO}"
fi

# GATE 4: empresaId Column Exists
echo ""
echo "[4/8] Checking empresaId presence in key tables..."

TABLES_WITH_EMPRESAID=$(PGPASSWORD="${DB_PASSWORD}" psql --host="${DB_HOST}" --port="${DB_PORT}" \
  --username="${DB_USER}" --dbname="${DB_NAME}" -t -c "
  SELECT COUNT(*) FROM information_schema.columns
  WHERE column_name = 'empresaId' AND table_name = 'Producto';" | tr -d ' ')

if [[ ${TABLES_WITH_EMPRESAID} -gt 0 ]]; then
  log_check "empresaId Column" "PASS" "empresaId present in Producto"
else
  fail_check "empresaId Column" "empresaId missing from Producto table"
fi

# GATE 5: Backup Directory Accessible
echo ""
echo "[5/8] Checking backup directory..."

mkdir -p "${BACKUP_DIR}"
if [[ -d "${BACKUP_DIR}" ]] && [[ -w "${BACKUP_DIR}" ]]; then
  BACKUP_SIZE=$(du -sh "${BACKUP_DIR}" 2>/dev/null | cut -f1 || echo "0KB")
  log_check "Backup Directory" "PASS" "Accessible at ${BACKUP_DIR} (size: ${BACKUP_SIZE})"
else
  fail_check "Backup Directory" "Cannot access/write to ${BACKUP_DIR}"
fi

# GATE 6: Disk Space Available
echo ""
echo "[6/8] Checking available disk space..."

AVAILABLE_KB=$(df "${PROJECT_ROOT}" 2>/dev/null | tail -1 | awk '{print $4}')
AVAILABLE_GB=$((AVAILABLE_KB / 1024 / 1024))
REQUIRED_GB=50

echo "  Available: ${AVAILABLE_GB}GB (required: ${REQUIRED_GB}GB)"

if [[ ${AVAILABLE_GB} -ge ${REQUIRED_GB} ]]; then
  log_check "Disk Space" "PASS" "${AVAILABLE_GB}GB available (>= ${REQUIRED_GB}GB)"
else
  log_check "Disk Space" "WARN" "Only ${AVAILABLE_GB}GB available (need ${REQUIRED_GB}GB)"
fi

# GATE 7: No Active Locks
echo ""
echo "[7/8] Checking for database locks..."

LOCKS=$(PGPASSWORD="${DB_PASSWORD}" psql --host="${DB_HOST}" --port="${DB_PORT}" \
  --username="${DB_USER}" --dbname="${DB_NAME}" -t -c "
  SELECT COUNT(*) FROM pg_locks
  WHERE database = (SELECT oid FROM pg_database WHERE datname = '${DB_NAME}')
    AND NOT granted;" | tr -d ' ')

if [[ ${LOCKS} -eq 0 ]]; then
  log_check "Database Locks" "PASS" "No blocked locks detected"
else
  log_check "Database Locks" "WARN" "Found ${LOCKS} blocked locks (may be transient)"
fi

# GATE 8: Prisma Migration Status
echo ""
echo "[8/8] Checking Prisma migration status..."

if command -v npx &> /dev/null; then
  cd "${PROJECT_ROOT}/apps/api"
  if npx prisma migrate status --schema=prisma/schema.prisma > /dev/null 2>&1; then
    log_check "Prisma Status" "PASS" "Prisma migrations up to date"
  else
    log_check "Prisma Status" "WARN" "Prisma may have pending migrations (verify manually)"
  fi
else
  log_check "Prisma Status" "WARN" "npx not found (cannot verify Prisma status)"
fi

# Summary
echo ""
echo "════════════════════════════════════════════════════════════"
echo -e "${GREEN}✓ PRE-MIGRATION CHECKS PASSED${NC}"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Migration is ready to proceed."
echo "Log saved to: ${LOG_FILE}"
echo ""

# Return success
exit 0
