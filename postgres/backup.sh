#!/bin/bash
# Backup script para PostgreSQL Wapsell
# Uso: docker compose exec postgres /usr/local/bin/backup.sh
# Genera: wapsell_prod_YYYYMMDD_HHMMSS.sql.gz

set -e

BACKUP_DIR="/var/lib/postgresql/backups"
DB_NAME="wapsell_prod"
DB_USER="${POSTGRES_USER:-wapsell_prod}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz"

# Crear directorio de backups si no existe
mkdir -p "${BACKUP_DIR}"

# Log
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Iniciando backup de ${DB_NAME}..."

# Ejecutar pg_dump con compresión
pg_dump \
  -U "${DB_USER}" \
  -d "${DB_NAME}" \
  --verbose \
  --no-password \
  --format=plain \
  | gzip > "${BACKUP_FILE}"

# Verificar éxito
if [ $? -eq 0 ]; then
  SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup completado: ${BACKUP_FILE} (${SIZE})"

  # Mantener solo los últimos 7 backups
  BACKUP_COUNT=$(ls -1 "${BACKUP_DIR}/${DB_NAME}_"*.sql.gz 2>/dev/null | wc -l)
  if [ "${BACKUP_COUNT}" -gt 7 ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Eliminando backups antiguos..."
    ls -1t "${BACKUP_DIR}/${DB_NAME}_"*.sql.gz 2>/dev/null | tail -n +8 | xargs rm -f
  fi
else
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: Backup falló"
  exit 1
fi
