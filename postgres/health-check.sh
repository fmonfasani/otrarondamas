#!/bin/bash
# PostgreSQL Health Check Script for Wapsell
# Usage: ./health-check.sh
# Run daily or as part of monitoring pipeline

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

POSTGRES_HOST="${1:-localhost}"
POSTGRES_USER="${2:-wapsell_prod}"
POSTGRES_DB="${3:-wapsell_prod}"
POSTGRES_PORT="${4:-5432}"

echo "==================================================================="
echo "PostgreSQL Health Check: ${POSTGRES_HOST}:${POSTGRES_PORT}"
echo "==================================================================="
echo ""

# 1. Test connection
echo -e "${YELLOW}1. Testing database connection...${NC}"
if PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "${POSTGRES_HOST}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -p "${POSTGRES_PORT}" -c "SELECT version();" > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Database connection successful${NC}"
else
  echo -e "${RED}✗ Database connection failed${NC}"
  exit 1
fi
echo ""

# 2. Check database size
echo -e "${YELLOW}2. Database size:${NC}"
PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "${POSTGRES_HOST}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -p "${POSTGRES_PORT}" -c "
  SELECT pg_database.datname, pg_size_pretty(pg_database_size(pg_database.datname)) AS size
  FROM pg_database
  WHERE datname = '${POSTGRES_DB}';
"
echo ""

# 3. Check active connections
echo -e "${YELLOW}3. Active connections:${NC}"
CONN_COUNT=$(PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "${POSTGRES_HOST}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -p "${POSTGRES_PORT}" -tc "
  SELECT COUNT(*) FROM pg_stat_activity WHERE datname = '${POSTGRES_DB}';
")
echo "Total: ${CONN_COUNT} connections"
echo ""

# 4. Check table count
echo -e "${YELLOW}4. Table statistics:${NC}"
TABLE_COUNT=$(PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "${POSTGRES_HOST}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -p "${POSTGRES_PORT}" -tc "
  SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';
")
echo "Tables in public schema: ${TABLE_COUNT}"
echo ""

# 5. Check transaction wrap-around age
echo -e "${YELLOW}5. Transaction wrap-around status:${NC}"
PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "${POSTGRES_HOST}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -p "${POSTGRES_PORT}" -c "
  SELECT
    datname,
    (2147483647::bigint - pg_database.datfrozenxid::bigint)::bigint as age_remaining,
    CASE
      WHEN (2147483647::bigint - pg_database.datfrozenxid::bigint)::bigint < 100000000 THEN 'ALARM: vacuum urgent'
      WHEN (2147483647::bigint - pg_database.datfrozenxid::bigint)::bigint < 500000000 THEN 'WARNING: vacuum recommended'
      ELSE 'OK'
    END as status
  FROM pg_database
  WHERE datname = '${POSTGRES_DB}';
"
echo ""

# 6. Check vacuum/analyze status
echo -e "${YELLOW}6. Vacuum and analyze status:${NC}"
PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "${POSTGRES_HOST}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -p "${POSTGRES_PORT}" -c "
  SELECT
    schemaname,
    tablename,
    last_autovacuum,
    last_autoanalyze
  FROM pg_stat_user_tables
  WHERE schemaname = 'public'
  ORDER BY last_autovacuum DESC NULLS LAST
  LIMIT 10;
"
echo ""

# 7. Check cache hit ratio
echo -e "${YELLOW}7. Cache hit ratio:${NC}"
PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "${POSTGRES_HOST}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -p "${POSTGRES_PORT}" -c "
  SELECT
    ROUND(sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) * 100, 2) as cache_hit_ratio
  FROM pg_statio_user_tables;
"
echo ""

# 8. Check slow queries (if pg_stat_statements is enabled)
echo -e "${YELLOW}8. Top 5 slowest queries:${NC}"
PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "${POSTGRES_HOST}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -p "${POSTGRES_PORT}" -c "
  SELECT
    query,
    calls,
    ROUND(mean_exec_time::numeric, 2) as mean_ms,
    ROUND(max_exec_time::numeric, 2) as max_ms
  FROM pg_stat_statements
  WHERE query NOT LIKE '%pg_stat_statements%'
  ORDER BY mean_exec_time DESC
  LIMIT 5;
" 2>/dev/null || echo "Note: pg_stat_statements extension not enabled"
echo ""

# 9. Check for unused indexes
echo -e "${YELLOW}9. Unused indexes (no scans):${NC}"
UNUSED_IDX=$(PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "${POSTGRES_HOST}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -p "${POSTGRES_PORT}" -tc "
  SELECT COUNT(*) FROM pg_stat_user_indexes WHERE idx_scan = 0;
")
echo "Count: ${UNUSED_IDX}"
echo ""

# 10. Check for blocking locks
echo -e "${YELLOW}10. Blocking locks:${NC}"
BLOCKED=$(PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "${POSTGRES_HOST}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -p "${POSTGRES_PORT}" -tc "
  SELECT COUNT(*) FROM pg_locks l1
  JOIN pg_locks l2 ON l1.transactionid = l2.transactionid AND l1.pid != l2.pid
  WHERE NOT l1.granted;
" 2>/dev/null || echo "0")
if [ "${BLOCKED}" -gt 0 ]; then
  echo -e "${RED}✗ Found ${BLOCKED} blocked locks${NC}"
else
  echo -e "${GREEN}✓ No blocking locks${NC}"
fi
echo ""

echo "==================================================================="
echo "Health check complete!"
echo "==================================================================="
