#!/bin/bash
set -e

# P2G: Execute Migration Script
# Applies the businessId migration to Producto table
# Supports: --dry-run, --staging modes

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Script Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
LOG_FILE="${SCRIPT_DIR}/execute-migration-${TIMESTAMP}.log"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Parse Arguments
DRY_RUN=false
ENV_MODE="production"

while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --staging)
      ENV_MODE="staging"
      shift
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
BACKUP_FILE="${BACKUP_DIR}/pre-migration-backup-${TIMESTAMP}.sql"

# Initialize logging
mkdir -p "$(dirname "${LOG_FILE}")"
exec 1> >(tee -a "${LOG_FILE}")
exec 2>&1

echo "════════════════════════════════════════════════════════════"
echo "  P2G MIGRATION EXECUTION SCRIPT"
echo "  Timestamp: ${TIMESTAMP}"
echo "  Environment: ${ENV_MODE}"
echo "  Database: ${DB_NAME}"
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

# STEP 1: Create Pre-Migration Backup
echo "[STEP 1/5] Creating pre-migration backup..."
if [[ "${DRY_RUN}" != "true" ]]; then
  mkdir -p "${BACKUP_DIR}"
  echo "Backing up ${DB_NAME} to ${BACKUP_FILE}..."
  PGPASSWORD="${DB_PASSWORD}" pg_dump \
    --host="${DB_HOST}" \
    --port="${DB_PORT}" \
    --username="${DB_USER}" \
    "${DB_NAME}" \
    --file="${BACKUP_FILE}" \
    --format=plain \
    --compress=9

  if [[ $? -eq 0 ]]; then
    echo -e "${GREEN}✓ Backup created successfully${NC}"
    BACKUP_SIZE=$(ls -lh "${BACKUP_FILE}" | awk '{print $5}')
    echo "  Backup file: ${BACKUP_FILE} (${BACKUP_SIZE})"
  else
    echo -e "${RED}✗ Backup creation failed${NC}"
    exit 1
  fi
else
  echo -e "${YELLOW}[DRY-RUN]${NC} Would backup to: ${BACKUP_FILE}"
fi

echo ""

# STEP 2: Add businessId Column (Nullable)
echo "[STEP 2/5] Adding businessId column to Producto..."
SQL_ADD_COLUMN="ALTER TABLE \"Producto\" ADD COLUMN \"businessId\" UUID;"
execute_sql "${SQL_ADD_COLUMN}" "Add businessId column" || exit 1

echo ""

# STEP 3: Populate businessId from empresaId
echo "[STEP 3/5] Populating businessId from empresaId..."
SQL_POPULATE="UPDATE \"Producto\" SET \"businessId\" = \"empresaId\";"
execute_sql "${SQL_POPULATE}" "Populate businessId from empresaId" || exit 1

# Verify Population
if [[ "${DRY_RUN}" != "true" ]]; then
  POPULATED_COUNT=$(PGPASSWORD="${DB_PASSWORD}" psql --host="${DB_HOST}" --port="${DB_PORT}" \
    --username="${DB_USER}" --dbname="${DB_NAME}" -t -c \
    "SELECT COUNT(*) FROM \"Producto\" WHERE \"businessId\" IS NOT NULL;" | tr -d ' ')
  TOTAL_COUNT=$(PGPASSWORD="${DB_PASSWORD}" psql --host="${DB_HOST}" --port="${DB_PORT}" \
    --username="${DB_USER}" --dbname="${DB_NAME}" -t -c \
    "SELECT COUNT(*) FROM \"Producto\";" | tr -d ' ')

  echo "Populated: ${POPULATED_COUNT}/${TOTAL_COUNT} rows"
  if [[ ${POPULATED_COUNT} -eq ${TOTAL_COUNT} ]]; then
    echo -e "${GREEN}✓ All Producto rows populated with businessId${NC}"
  else
    echo -e "${YELLOW}⚠ Partial population: ${POPULATED_COUNT}/${TOTAL_COUNT}${NC}"
  fi
fi

echo ""

# STEP 4: Add Foreign Key Constraint
echo "[STEP 4/5] Adding foreign key constraint..."
SQL_FK="ALTER TABLE \"Producto\"
  ADD CONSTRAINT \"Producto_businessId_fkey\"
  FOREIGN KEY (\"businessId\") REFERENCES \"Empresa\"(\"id\")
  ON DELETE RESTRICT ON UPDATE CASCADE;"
execute_sql "${SQL_FK}" "Add businessId foreign key" || exit 1

echo ""

# STEP 5: Make businessId NOT NULL
echo "[STEP 5/5] Making businessId NOT NULL..."
SQL_NOT_NULL="ALTER TABLE \"Producto\" ALTER COLUMN \"businessId\" SET NOT NULL;"
execute_sql "${SQL_NOT_NULL}" "Make businessId NOT NULL" || exit 1

echo ""
echo "════════════════════════════════════════════════════════════"
if [[ "${DRY_RUN}" == "true" ]]; then
  echo -e "${YELLOW}[DRY-RUN MODE]${NC} Migration steps outlined (not executed)"
else
  echo -e "${GREEN}✓ MIGRATION COMPLETED SUCCESSFULLY${NC}"
fi
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Next step: Run post-migration-checks.sh to validate"
echo "Log saved to: ${LOG_FILE}"
echo ""

exit 0
