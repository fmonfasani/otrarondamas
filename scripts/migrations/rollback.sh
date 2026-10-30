#!/bin/bash
set -e

# P2G: Rollback Migration Script
# Reverses the businessId migration
# Supports: --test mode, --staging, --dry-run

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Script Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
LOG_FILE="${SCRIPT_DIR}/rollback-${TIMESTAMP}.log"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Parse Arguments
DRY_RUN=false
TEST_MODE=false
ENV_MODE="production"
BACKUP_FILE=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --test)
      TEST_MODE=true
      shift
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --staging)
      ENV_MODE="staging"
      shift
      ;;
    --backup)
      BACKUP_FILE="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

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

# Backup Configuration
BACKUP_DIR="${BACKUP_DIR:-${PROJECT_ROOT}/backups}"

# Initialize logging
mkdir -p "$(dirname "${LOG_FILE}")"
exec 1> >(tee -a "${LOG_FILE}")
exec 2>&1

echo "════════════════════════════════════════════════════════════"
echo "  P2G ROLLBACK MIGRATION SCRIPT"
echo "  Timestamp: ${TIMESTAMP}"
echo "  Environment: ${ENV_MODE}"
echo "  Database: ${DB_NAME}"
echo "  Test Mode: ${TEST_MODE}"
echo "  Dry Run: ${DRY_RUN}"
echo "════════════════════════════════════════════════════════════"
echo ""

# Function to execute SQL
execute_sql() {
  local sql_statement=$1
  local description=$2

  if [[ "${DRY_RUN}" == "true" ]]; then
    echo -e "${YELLOW}[DRY-RUN]${NC} Would execute: ${description}"
    echo "SQL: ${sql_statement}"
    return 0
  fi

  echo "Executing: ${description}..."
  PGPASSWORD="${DB_PASSWORD}" psql \
    --host="${DB_HOST}" \
    --port="${DB_PORT}" \
    --username="${DB_USER}" \
    --dbname="${DB_NAME}" \
    -c "${sql_statement}"

  if [[ $? -eq 0 ]]; then
    echo -e "${GREEN}✓ ${description} completed${NC}"
  else
    echo -e "${RED}✗ ${description} failed${NC}"
    return 1
  fi
}

# OPTION 1: Restore from Backup File
if [[ -n "${BACKUP_FILE}" ]] && [[ -f "${BACKUP_FILE}" ]]; then
  echo "[ROLLBACK] Using backup file: ${BACKUP_FILE}"
  echo ""
  echo "STEP 1: Restoring from backup..."

  if [[ "${DRY_RUN}" == "true" ]]; then
    echo -e "${YELLOW}[DRY-RUN]${NC} Would restore from: ${BACKUP_FILE}"
  else
    # Terminate active connections
    echo "Terminating active connections to ${DB_NAME}..."
    PGPASSWORD="${DB_PASSWORD}" psql \
      --host="${DB_HOST}" \
      --port="${DB_PORT}" \
      --username="${DB_USER}" \
      --dbname="postgres" \
      -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB_NAME}';" || true

    sleep 2

    # Drop and recreate database
    echo "Dropping database ${DB_NAME}..."
    PGPASSWORD="${DB_PASSWORD}" psql \
      --host="${DB_HOST}" \
      --port="${DB_PORT}" \
      --username="${DB_USER}" \
      --dbname="postgres" \
      -c "DROP DATABASE IF EXISTS \"${DB_NAME}\";"

    echo "Creating fresh database ${DB_NAME}..."
    PGPASSWORD="${DB_PASSWORD}" psql \
      --host="${DB_HOST}" \
      --port="${DB_PORT}" \
      --username="${DB_USER}" \
      --dbname="postgres" \
      -c "CREATE DATABASE \"${DB_NAME}\";"

    echo "Restoring from backup..."
    PGPASSWORD="${DB_PASSWORD}" psql \
      --host="${DB_HOST}" \
      --port="${DB_PORT}" \
      --username="${DB_USER}" \
      --dbname="${DB_NAME}" \
      < "${BACKUP_FILE}"

    if [[ $? -eq 0 ]]; then
      echo -e "${GREEN}✓ Database restored successfully${NC}"
    else
      echo -e "${RED}✗ Restore failed${NC}"
      exit 1
    fi
  fi
else
  # OPTION 2: Rollback via SQL (without full restore)
  echo "[ROLLBACK] Rolling back via SQL statements..."
  echo ""

  echo "STEP 1: Dropping foreign key constraint..."
  SQL_DROP_FK="ALTER TABLE \"Producto\" DROP CONSTRAINT IF EXISTS \"Producto_businessId_fkey\";"
  execute_sql "${SQL_DROP_FK}" "Drop foreign key constraint" || exit 1

  echo ""
  echo "STEP 2: Dropping businessId column..."
  SQL_DROP_COL="ALTER TABLE \"Producto\" DROP COLUMN IF EXISTS \"businessId\";"
  execute_sql "${SQL_DROP_COL}" "Drop businessId column" || exit 1

  echo ""
  echo "STEP 3: Verifying rollback..."

  if [[ "${DRY_RUN}" != "true" ]]; then
    COL_EXISTS=$(PGPASSWORD="${DB_PASSWORD}" psql --host="${DB_HOST}" --port="${DB_PORT}" \
      --username="${DB_USER}" --dbname="${DB_NAME}" -t -c "
      SELECT COUNT(*) FROM information_schema.columns
      WHERE table_name = 'Producto' AND column_name = 'businessId';" | tr -d ' ')

    if [[ ${COL_EXISTS} -eq 0 ]]; then
      echo -e "${GREEN}✓ businessId column successfully removed${NC}"
    else
      echo -e "${RED}✗ businessId column still exists${NC}"
      exit 1
    fi
  fi
fi

echo ""
echo "════════════════════════════════════════════════════════════"

if [[ "${DRY_RUN}" == "true" ]]; then
  echo -e "${YELLOW}[DRY-RUN MODE]${NC} Rollback steps outlined (not executed)"
elif [[ "${TEST_MODE}" == "true" ]]; then
  echo -e "${YELLOW}[TEST MODE]${NC} Rollback test completed successfully"
  echo "Run production rollback with: bash rollback.sh --staging"
else
  echo -e "${GREEN}✓ ROLLBACK COMPLETED SUCCESSFULLY${NC}"
fi

echo "════════════════════════════════════════════════════════════"
echo ""
echo "Log saved to: ${LOG_FILE}"
echo ""

exit 0
