# PostgreSQL Database Infrastructure for Wapsell

**Status:** Production Ready  
**Last Updated:** 2026-10-25  
**Location:** `postgres/` directory and related files

This directory contains all the PostgreSQL initialization, configuration, backup, and monitoring infrastructure for the Wapsell platform.

---

## Files Overview

### Initialization Scripts

#### `init-schemas.sql` (01-schemas.sql)
- Creates database schemas (public, audit, search)
- Configures security (role permissions, default privileges)
- Creates application roles (wapsell_app, wapsell_readonly)
- **When:** Runs automatically on container startup
- **Manual Run:** `docker compose exec postgres psql -U wapsell_prod -d wapsell_prod -f init-schemas.sql`

#### `init-extensions.sql` (02-extensions.sql)
- Enables PostgreSQL extensions required by the platform
- Extensions: uuid-ossp, pgcrypto, pg_trgm, unaccent, hstore
- **When:** Runs automatically on container startup
- **Manual Run:** `docker compose exec postgres psql -U wapsell_prod -d wapsell_prod -f init-extensions.sql`

### Operations Scripts

#### `backup.sh`
- **Purpose:** Creates compressed backups of the database
- **Usage:** `docker compose exec postgres /usr/local/bin/backup.sh`
- **Output:** `wapsell_prod_YYYYMMDD_HHMMSS.sql.gz` in `/var/lib/postgresql/backups`
- **Retention:** Keeps last 7 automatic backups (manual ones kept indefinitely)
- **Cron:** Daily at 2 AM UTC (for production)

#### `health-check.sh`
- **Purpose:** Comprehensive database health monitoring
- **Usage:** `docker compose exec postgres /usr/local/bin/health-check.sh`
- **Checks:**
  - Connection availability
  - Database size
  - Active connections
  - Transaction age (XID wrap-around warning)
  - Cache hit ratio
  - Slow queries
  - Lock contention
  - Unused indexes
- **Run:** Daily or as part of monitoring pipeline

### Configuration Files

#### `pgbouncer.ini`
- **Purpose:** Connection pooling configuration (optional, for high concurrency)
- **When to Use:** Deployments with > 500 concurrent requests
- **Default:** Not required; Prisma's built-in pooling is sufficient (20 connections)
- **Usage:** Deploy as separate container if needed
- **Key Settings:**
  - pool_mode = transaction
  - default_pool_size = 25
  - max_db_connections = 100

### Monitoring

#### `monitoring-queries.sql`
- **Purpose:** Collection of diagnostic queries for database monitoring
- **Usage:** `docker compose exec postgres psql -U wapsell_prod -d wapsell_prod -f monitoring-queries.sql`
- **Queries Include:**
  - Active connections
  - Slow queries
  - Table sizes
  - Index usage statistics
  - Cache hit ratio
  - Vacuum/analyze status
  - Transaction wrap-around age
  - Lock contention
  - Configuration parameters

---

## Quick Start

### 1. First-Time Setup

```bash
# Prepare environment
cp .env.wapsell.example .env.wapsell
# Edit .env.wapsell with secure passwords

# Create data directories
sudo mkdir -p /data/wapsell/{postgres,redis,elasticsearch,logs/api,assets}
sudo chown -R 1000:1000 /data/wapsell

# Start PostgreSQL
docker compose -f docker-compose.wapsell.yml up -d postgres

# Wait for health check
docker compose -f docker-compose.wapsell.yml exec postgres pg_isready -U wapsell_prod

# Run migrations
docker compose -f docker-compose.wapsell.yml exec api npx prisma migrate deploy

# Seed initial data
docker compose -f docker-compose.wapsell.yml exec api npm run prisma:seed
```

### 2. Daily Operations

```bash
# Health check
docker compose -f docker-compose.wapsell.yml exec postgres /usr/local/bin/health-check.sh

# Check slow queries
docker compose -f docker-compose.wapsell.yml exec postgres psql -U wapsell_prod -d wapsell_prod -f postgres/monitoring-queries.sql

# View logs
docker compose -f docker-compose.wapsell.yml logs postgres | tail -100
```

### 3. Backup Management

```bash
# Manual backup
docker compose -f docker-compose.wapsell.yml exec postgres /usr/local/bin/backup.sh

# List backups
docker compose -f docker-compose.wapsell.yml exec postgres ls -lh /var/lib/postgresql/backups/

# Restore from backup (destructive!)
docker compose -f docker-compose.wapsell.yml exec postgres bash -c '
  gunzip < /var/lib/postgresql/backups/wapsell_prod_20261025_020000.sql.gz | \
  psql -U wapsell_prod -d wapsell_prod
'
```

---

## Database Design

### Schemas

- **public** - Application tables (created by Prisma)
- **audit** - Audit trail for sensitive changes
- **search** - Denormalized views and search indices (optional)

### Key Principles

1. **Multi-Tenant Isolation** - All tables have `empresa_id` or similar tenant context
2. **Soft Deletes** - Records marked as deleted, not physically removed
3. **Audit Trail** - Changes logged via triggers (future implementation)
4. **UUID Primary Keys** - All tables use UUID v4 for IDs
5. **Immutable Timestamps** - created_at never changes, updated_at tracks changes

### Connection Pooling

- **Default:** Prisma (20 connections max)
- **Optional:** PgBouncer for high-concurrency (500+ concurrent)
- **Configuration:** Set via `DATABASE_POOL_SIZE` in `.env.wapsell`

---

## Performance Tuning

### Current Configuration (8 GB RAM)

```
shared_buffers       = 2 GB   (25% of RAM)
effective_cache_size = 6 GB   (75% of RAM)
work_mem             = 10 MB  (per operation)
maintenance_work_mem = 512 MB (VACUUM/CREATE INDEX)
```

### For Different Hardware

**4 GB RAM:**
```
shared_buffers       = 1 GB
effective_cache_size = 3 GB
work_mem             = 5 MB
maintenance_work_mem = 256 MB
```

**16 GB RAM:**
```
shared_buffers       = 4 GB
effective_cache_size = 12 GB
work_mem             = 20 MB
maintenance_work_mem = 1 GB
```

### Key Metrics to Monitor

| Metric | Target | Warning | Alarm |
|--------|--------|---------|-------|
| Cache Hit Ratio | > 99% | < 99% | < 95% |
| Connection Usage | < 50% | > 80% | > 95% |
| Disk Usage | < 70% | > 70% | > 90% |
| XID Age | < 100M | > 500M | > 1.9B |

---

## Disaster Recovery

### Backup & Restore

```bash
# Daily automated backups at 2 AM UTC
# Retention: 7 days (local)
# Optional: S3 replication (needs AWS credentials)

# To restore:
docker compose exec postgres bash -c '
  gunzip < /var/lib/postgresql/backups/backup_file.sql.gz | \
  psql -U wapsell_prod -d wapsell_prod
'
```

### Failover (if using replication)

1. Promote standby to primary
2. Update connection strings
3. Verify all services reconnect

### Point-in-Time Recovery

Configure WAL archiving (optional):
```sql
ALTER SYSTEM SET archive_mode = on;
ALTER SYSTEM SET archive_command = 'cp %p /backups/wal_archive/%f';
SELECT pg_reload_conf();
```

---

## Troubleshooting

### Connection Issues

```bash
# Test connection
docker compose exec postgres pg_isready -U wapsell_prod -d wapsell_prod

# Check logs
docker compose logs postgres | grep -i error

# Verify credentials
grep POSTGRES_ .env.wapsell
```

### Performance Issues

```bash
# Check cache hit ratio
docker compose exec postgres psql -U wapsell_prod -d wapsell_prod -c "
  SELECT sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) FROM pg_statio_user_tables;
"

# Find slow queries
docker compose exec postgres psql -U wapsell_prod -d wapsell_prod -c "
  SELECT query, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;
"

# Check table sizes
docker compose exec postgres psql -U wapsell_prod -d wapsell_prod -c "
  SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
  FROM pg_tables WHERE schemaname = 'public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"
```

### Maintenance

```bash
# Update statistics (weekly)
docker compose exec postgres psql -U wapsell_prod -d wapsell_prod -c "ANALYZE;"

# Full vacuum (monthly)
docker compose exec postgres psql -U wapsell_prod -d wapsell_prod -c "VACUUM ANALYZE;"

# Check transaction age (critical!)
docker compose exec postgres psql -U wapsell_prod -d wapsell_prod -c "
  SELECT datname, (2147483647 - datfrozenxid) as remaining_xids FROM pg_database WHERE datname = 'wapsell_prod';
"
```

---

## Documentation

Comprehensive documentation available in:

- **`docs/DATABASE-SETUP.md`** - Complete setup and operations guide (400+ lines)
- **`docs/DATABASE-DEPLOY-CHECKLIST.md`** - Deployment verification checklist
- **`postgres/monitoring-queries.sql`** - Diagnostic SQL queries

---

## Support

For issues or questions:

1. Check `DATABASE-SETUP.md` troubleshooting section
2. Review container logs: `docker compose logs postgres`
3. Run health check: `/usr/local/bin/health-check.sh`
4. Consult PostgreSQL docs: https://www.postgresql.org/docs/16/

---

## Version History

| Date | Change |
|------|--------|
| 2026-10-25 | Initial setup: init scripts, backup, monitoring, pgbouncer config |
| 2026-10-25 | Documentation: DATABASE-SETUP.md, deploy checklist |
| 2026-10-25 | Health check and monitoring queries |

---

## Checklist: Everything in Place?

- [x] `init-schemas.sql` - Schema and security configuration
- [x] `init-extensions.sql` - Required PostgreSQL extensions
- [x] `backup.sh` - Daily backup script
- [x] `health-check.sh` - Comprehensive health monitoring
- [x] `monitoring-queries.sql` - Diagnostic queries
- [x] `pgbouncer.ini` - Connection pooling (optional)
- [x] `docs/DATABASE-SETUP.md` - Complete documentation
- [x] `docs/DATABASE-DEPLOY-CHECKLIST.md` - Deployment verification
- [x] `.env.wapsell.example` - Environment template
- [x] `docker-compose.wapsell.yml` - Container orchestration

✅ **P-DEPLOY-4 Complete: PostgreSQL Database Setup**
