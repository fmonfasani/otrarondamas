-- PostgreSQL Monitoring Queries for Wapsell
-- Use: psql -h localhost -U wapsell_prod -d wapsell_prod -f monitoring-queries.sql
-- Or run individual queries in psql client

-- =============================================================================
-- 1. ACTIVE CONNECTIONS
-- =============================================================================
-- Shows current active connections and their status
SELECT
  datname,
  usename,
  application_name,
  state,
  state_change,
  wait_event_type,
  wait_event,
  query_start,
  COUNT(*) as connection_count
FROM pg_stat_activity
WHERE datname = 'wapsell_prod'
GROUP BY datname, usename, application_name, state, state_change, wait_event_type, wait_event, query_start
ORDER BY connection_count DESC;

-- =============================================================================
-- 2. IDLE CONNECTIONS (potential cleanup targets)
-- =============================================================================
SELECT
  pid,
  usename,
  application_name,
  state,
  state_change,
  query,
  (extract(epoch from now()) - extract(epoch from state_change))::int as idle_seconds
FROM pg_stat_activity
WHERE datname = 'wapsell_prod'
  AND state = 'idle'
  AND (extract(epoch from now()) - extract(epoch from state_change)) > 300
ORDER BY idle_seconds DESC;

-- =============================================================================
-- 3. SLOW QUERIES (requires pg_stat_statements extension)
-- =============================================================================
-- Requires: CREATE EXTENSION pg_stat_statements;
SELECT
  query,
  calls,
  mean_exec_time::numeric(10,2) as mean_ms,
  max_exec_time::numeric(10,2) as max_ms,
  total_exec_time::numeric(15,2) as total_ms,
  rows,
  100.0 * shared_blks_hit / NULLIF(shared_blks_hit + shared_blks_read, 0) as cache_hit_ratio
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
ORDER BY mean_exec_time DESC
LIMIT 20;

-- =============================================================================
-- 4. TABLE SIZES (largest tables)
-- =============================================================================
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as indexes_size,
  (SELECT count(*) FROM information_schema.tables t2 WHERE t2.table_schema = t1.schemaname AND t2.table_name = t1.tablename) > 0 as has_table_info
FROM (
  SELECT schemaname, tablename
  FROM pg_tables
  WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
) t1
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 20;

-- =============================================================================
-- 5. INDEX USAGE STATISTICS
-- =============================================================================
-- Identifies unused or rarely used indexes
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY idx_scan ASC
LIMIT 20;

-- =============================================================================
-- 6. MISSING INDEXES (queries that perform sequential scans)
-- =============================================================================
SELECT
  schemaname,
  tablename,
  seq_scan,
  seq_tup_read,
  idx_scan,
  (seq_scan - idx_scan) as seq_minus_idx,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as table_size
FROM pg_stat_user_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
  AND seq_scan > 100
ORDER BY (seq_scan - idx_scan) DESC
LIMIT 20;

-- =============================================================================
-- 7. CACHE HIT RATIO (overall system health)
-- =============================================================================
SELECT
  sum(heap_blks_read) as heap_blocks_read,
  sum(heap_blks_hit) as heap_blocks_hit,
  sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as ratio
FROM pg_statio_user_tables;

-- =============================================================================
-- 8. VACUUM AND ANALYZE STATUS
-- =============================================================================
SELECT
  schemaname,
  tablename,
  last_vacuum,
  last_autovacuum,
  last_analyze,
  last_autoanalyze,
  vacuum_count,
  autovacuum_count,
  analyze_count,
  autoanalyze_count
FROM pg_stat_user_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY last_autovacuum DESC NULLS LAST;

-- =============================================================================
-- 9. TRANSACTION WRAP-AROUND (age of transactions)
-- =============================================================================
-- Critical: if age > 2 billion, vacuum becomes urgent
SELECT
  datname,
  (2147483647::bigint - pg_database.datfrozenxid::bigint)::bigint as age_remaining,
  (2147483647::bigint - pg_database.datfrozenxid::bigint)::bigint > 1000000000 as alarm
FROM pg_database
WHERE datname = 'wapsell_prod';

-- =============================================================================
-- 10. DISK SPACE AND WAL STATUS
-- =============================================================================
-- Shows database size and WAL archive size
SELECT
  datname,
  pg_size_pretty(pg_database_size(datname)) as database_size
FROM pg_database
WHERE datname = 'wapsell_prod';

-- WAL file count (indicates archiving health)
-- Run on server: ls -l /var/lib/postgresql/data/pg_wal/ | wc -l
-- Should be < 20 files if archiving is healthy

-- =============================================================================
-- 11. AUTOVACUUM AND MAINTENANCE JOBS
-- =============================================================================
SELECT
  schemaname,
  tablename,
  n_live_tup,
  n_dead_tup,
  n_dead_tup * 100.0 / NULLIF(n_live_tup, 0) as pct_dead,
  last_autovacuum,
  autovacuum_count
FROM pg_stat_user_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY n_dead_tup DESC
LIMIT 20;

-- =============================================================================
-- 12. LOCK CONTENTION (blocking queries)
-- =============================================================================
SELECT
  blocked_locks.pid AS blocked_pid,
  blocked_activity.usename AS blocked_user,
  blocking_locks.pid AS blocking_pid,
  blocking_activity.usename AS blocking_user,
  blocked_activity.application_name AS blocked_app,
  blocked_activity.query AS blocked_query,
  blocking_activity.query AS blocking_query,
  blocked_activity.application_name
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
  AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
  AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
  AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
  AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
  AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
  AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
  AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
  AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
  AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
  AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;

-- =============================================================================
-- 13. REPLICATION STATUS (if enabled)
-- =============================================================================
-- SELECT * FROM pg_stat_replication;

-- =============================================================================
-- 14. CONFIGURATION PARAMETERS (current settings)
-- =============================================================================
SELECT name, setting, unit
FROM pg_settings
WHERE name IN (
  'max_connections',
  'shared_buffers',
  'effective_cache_size',
  'maintenance_work_mem',
  'checkpoint_completion_target',
  'wal_buffers',
  'default_statistics_target',
  'random_page_cost',
  'effective_io_concurrency',
  'work_mem',
  'min_wal_size',
  'max_wal_size'
)
ORDER BY name;

-- =============================================================================
-- 15. HEALTH CHECK SUMMARY (execute this daily)
-- =============================================================================
SELECT
  'Database Health Check' as check_name,
  (SELECT count(*) FROM pg_stat_activity WHERE datname = 'wapsell_prod') as active_connections,
  (SELECT count(*) FROM pg_stat_user_tables) as table_count,
  (SELECT count(*) FROM pg_stat_user_indexes) as index_count,
  pg_database_size('wapsell_prod') as db_size_bytes,
  (2147483647::bigint - (SELECT datfrozenxid FROM pg_database WHERE datname = 'wapsell_prod'))::bigint as xid_remaining;
