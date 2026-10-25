# PostgreSQL Database Setup for Wapsell

**Last Updated:** 2026-10-25  
**Status:** Production Ready  
**Scope:** PostgreSQL 16 initialization, migrations, backups, monitoring, connection pooling

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Database Initialization](#database-initialization)
4. [Configuration](#configuration)
5. [Prisma Migrations](#prisma-migrations)
6. [Data Seeding](#data-seeding)
7. [Backup Strategy](#backup-strategy)
8. [Monitoring](#monitoring)
9. [Connection Pooling](#connection-pooling)
10. [Disaster Recovery](#disaster-recovery)
11. [Performance Tuning](#performance-tuning)
12. [Maintenance Tasks](#maintenance-tasks)
13. [Troubleshooting](#troubleshooting)

---

## Overview

Wapsell uses PostgreSQL 16 as the primary transactional database (OLTP) for:
- User authentication and authorization
- Product catalog and inventory
- Orders and transactions
- Payment records
- Audit logs

**Database Name:** `wapsell_prod`  
**Default Port:** `5432`  
**Docker Compose:** `docker-compose.wapsell.yml`

### Architecture

```
┌─────────────────────────────────────────────────────┐
│  NestJS API (apps/api)                              │
│  - Prisma ORM + migrations                          │
│  - Connection pooling (20 concurrent)               │
│  - Multi-tenant scoping (company_id)               │
└────────────────┬────────────────────────────────────┘
                 │ DATABASE_URL
                 │ postgresql://wapsell_prod:****@postgres:5432/wapsell_prod
                 │
         ┌───────▼────────────────────────────────┐
         │  PostgreSQL 16 (postgres container)    │
         │  ├─ Public schema (Prisma)             │
         │  ├─ Audit schema (audit logs)          │
         │  ├─ Search schema (vviews)             │
         │  └─ Extensions: uuid-ossp, pgcrypto   │
         └────────────────────────────────────────┘
                 │
         ┌───────▼────────────────────────────────┐
         │  Volume: postgres_data (/data/wapsell) │
         │  ├─ pgdata/ (tables, indices)         │
         │  └─ WAL logs + backups                │
         └────────────────────────────────────────┘
```

---

## Prerequisites

### Hardware Requirements

**Minimum (Development/Staging):**
- 2 CPU cores
- 4 GB RAM
- 20 GB disk space

**Recommended (Production):**
- 4 CPU cores
- 8 GB RAM
- 100 GB disk space (including WAL, backups)

### Software Requirements

- Docker 20.10+
- Docker Compose 2.0+
- PostgreSQL client tools (optional, for manual queries)
  ```bash
  # On macOS
  brew install postgresql
  
  # On Ubuntu
  sudo apt-get install postgresql-client
  
  # On Windows (via WSL)
  sudo apt-get install postgresql-client
  ```

---

## Database Initialization

### Step 1: Prepare Environment Variables

Copy the example environment file:

```bash
cp .env.wapsell.example .env.wapsell
```

Edit `.env.wapsell` and set the required values:

```bash
# Critical: Generate secure passwords
POSTGRES_USER=wapsell_prod
POSTGRES_PASSWORD=$(openssl rand -base64 32)  # MUST be 32+ characters
POSTGRES_DB=wapsell_prod

# Connection pool
DATABASE_POOL_SIZE=20
DATABASE_STATEMENT_CACHE_SIZE=200

# Other services (Redis, Elasticsearch, etc.)
REDIS_PASSWORD=$(openssl rand -base64 24)
ELASTICSEARCH_PASSWORD=$(openssl rand -base64 32)
```

### Step 2: Create Data Directories

On the host server, create the required volumes:

```bash
sudo mkdir -p /data/wapsell/{postgres,redis,elasticsearch,logs/api,assets}
sudo chown -R 1000:1000 /data/wapsell  # For container permissions
chmod 750 /data/wapsell/{postgres,redis,elasticsearch}
```

### Step 3: Start PostgreSQL Service

```bash
# Start all services
docker compose -f docker-compose.wapsell.yml up -d postgres

# Wait for PostgreSQL to be healthy
docker compose -f docker-compose.wapsell.yml exec postgres pg_isready -U wapsell_prod -d wapsell_prod

# Expected output: "accepting connections"
```

### Step 4: Verify Initialization

The container runs these initialization scripts automatically:

1. **01-schemas.sql** - Creates schemas and security configuration
2. **02-extensions.sql** - Enables PostgreSQL extensions

Verify extensions are loaded:

```bash
docker compose -f docker-compose.wapsell.yml exec postgres psql -U wapsell_prod -d wapsell_prod -c "
  SELECT extname, extversion FROM pg_extension ORDER BY extname;
"
```

Expected extensions:
- `pgcrypto` - cryptographic functions
- `pg_stat_statements` - query performance monitoring
- `pg_trgm` - trigram search
- `unaccent` - accent removal for Spanish text
- `uuid-ossp` - UUID generation

---

## Configuration

### PostgreSQL Parameters (init-db tuning)

The `docker-compose.wapsell.yml` sets these via `POSTGRES_INITDB_ARGS`:

```ini
max_connections=200              # Max total connections
shared_buffers=2GB               # Cache for frequently accessed data
effective_cache_size=6GB         # OS page cache
maintenance_work_mem=512MB       # Memory for VACUUM/CREATE INDEX
checkpoint_completion_target=0.9 # Time spread for checkpoints
wal_buffers=16MB                 # WAL cache
default_statistics_target=100    # Query planner accuracy
random_page_cost=1.1             # SSD detection (1.0-1.5)
effective_io_concurrency=200     # Parallel I/O workers
work_mem=10485kB                 # Per-operation memory
min_wal_size=1GB                 # Minimum WAL retained
max_wal_size=4GB                 # Maximum WAL before checkpoint
```

### Adjust for Different Hardware

**For 4 GB RAM:**
```ini
shared_buffers=1GB
effective_cache_size=3GB
maintenance_work_mem=256MB
work_mem=5242kB
```

**For 16 GB RAM:**
```ini
shared_buffers=4GB
effective_cache_size=12GB
maintenance_work_mem=1GB
work_mem=20971kB
```

Update `docker-compose.wapsell.yml` and restart:

```bash
docker compose -f docker-compose.wapsell.yml down
docker compose -f docker-compose.wapsell.yml up -d postgres
```

---

## Prisma Migrations

### What is Prisma?

Prisma is the ORM used by the NestJS API to manage the database schema. It:
- Defines the schema in `schema.prisma`
- Generates TypeScript types
- Handles schema migrations (version control for database)
- Provides the query builder

### Generate Prisma Client

Required before running tests or the app:

```bash
cd apps/api
npm run prisma:generate
```

### Run Pending Migrations

When the database is first initialized, Prisma migrations must be applied:

```bash
docker compose -f docker-compose.wapsell.yml exec api npx prisma migrate deploy --skip-generate
```

This command:
1. Connects to the database
2. Looks for pending migrations in `apps/api/prisma/migrations/`
3. Applies them in order
4. Records the migration history in `_prisma_migrations` table

### View Migration History

```bash
docker compose -f docker-compose.wapsell.yml exec api npx prisma migrate status
```

### Create a New Migration (Development Only)

When you modify `schema.prisma`:

```bash
cd apps/api
npm run prisma:migrate -- --name <migration_name>

# Example
npm run prisma:migrate -- --name add_product_variants
```

This creates a new SQL file in `prisma/migrations/` for review and version control.

### Troubleshoot Migration Failures

**Scenario 1: Migration Already Applied**

```bash
# Mark as rolled back and retry
docker compose -f docker-compose.wapsell.yml exec api npx prisma migrate resolve --rolled-back "20261025_migration_name"
```

**Scenario 2: Database Locked**

A previous migration may have hung:

```bash
# Kill idle transactions
docker compose -f docker-compose.wapsell.yml exec postgres psql -U wapsell_prod -d wapsell_prod -c "
  SELECT pg_terminate_backend(pid) FROM pg_stat_activity 
  WHERE state = 'idle' AND pid != pg_backend_pid();
"

# Retry migration
docker compose -f docker-compose.wapsell.yml exec api npx prisma migrate deploy
```

**Scenario 3: Schema Out of Sync**

If the Prisma schema doesn't match the database:

```bash
# In development only (destructive!)
cd apps/api
npm run prisma:migrate -- --reset
npm run prisma:seed
```

---

## Data Seeding

### Initial Data Setup

The `seed.ts` script populates the database with initial data (companies, users, roles, etc.):

```bash
docker compose -f docker-compose.wapsell.yml exec api npm run prisma:seed
```

### What Gets Seeded

See `apps/api/prisma/seed.ts` for the complete list. Typically:

1. **Companies** - wapsell-demo, test companies
2. **Roles** - ADMIN, SELLER, VIEWER
3. **Users** - admin@wapsell.com (password: password123)
4. **Catalog** - Product families, categories
5. **Currencies** - USD, EUR, ARS (regional)

### Seed Data Files

Large seed data is stored as JSON:

- `seed-data-minorista.json` - Retail product catalog
- `seed-data-jerarquia-catalogo.json` - Product hierarchy

### Re-seed in Development

```bash
# Clear all data and reseed (development only!)
docker compose -f docker-compose.wapsell.yml exec api npm run prisma:seed
```

---

## Backup Strategy

### Automated Backups

A cron job runs daily at 2 AM UTC:

```bash
0 2 * * * /usr/local/bin/backup.sh >> /var/log/postgres-backup.log 2>&1
```

Script location: `postgres/backup.sh`

### Manual Backup

Create a backup immediately:

```bash
docker compose -f docker-compose.wapsell.yml exec postgres /usr/local/bin/backup.sh
```

Output: `/var/lib/postgresql/backups/wapsell_prod_YYYYMMDD_HHMMSS.sql.gz`

### Backup Retention

- Automatic: Keep last 7 days
- Manual: Keep indefinitely (copy to S3)
- WAL archiving: Keep for point-in-time recovery (optional)

### Restore from Backup

```bash
# List available backups
docker compose -f docker-compose.wapsell.yml exec postgres ls -lh /var/lib/postgresql/backups/

# Restore (destroys current data!)
docker compose -f docker-compose.wapsell.yml exec postgres bash -c '
  gunzip < /var/lib/postgresql/backups/wapsell_prod_20261025_020000.sql.gz | \
  psql -U wapsell_prod -d wapsell_prod
'

# Verify
docker compose -f docker-compose.wapsell.yml exec postgres psql -U wapsell_prod -d wapsell_prod -c "SELECT COUNT(*) FROM usuario;"
```

### Off-site Backup (S3)

To back up to AWS S3:

```bash
# Install AWS CLI
pip install awscli

# Configure credentials
aws configure  # Or use IAM role in EC2

# Upload backup
aws s3 cp /var/lib/postgresql/backups/wapsell_prod_20261025_020000.sql.gz \
  s3://wapsell-backups/postgres/

# List backups in S3
aws s3 ls s3://wapsell-backups/postgres/

# Restore from S3
aws s3 cp s3://wapsell-backups/postgres/wapsell_prod_20261025_020000.sql.gz - | \
  docker compose -f docker-compose.wapsell.yml exec -T postgres \
  gunzip | psql -U wapsell_prod -d wapsell_prod
```

---

## Monitoring

### Health Check

Run the health check script daily:

```bash
docker compose -f docker-compose.wapsell.yml exec postgres chmod +x /usr/local/bin/health-check.sh
docker compose -f docker-compose.wapsell.yml exec postgres /usr/local/bin/health-check.sh
```

This checks:
- Connection availability
- Database size
- Active connections
- Table/index statistics
- Cache hit ratio
- Slow queries
- Transaction age

### Common Monitoring Queries

```bash
# View the monitoring queries file
cat postgres/monitoring-queries.sql

# Run in psql
docker compose -f docker-compose.wapsell.yml exec postgres psql -U wapsell_prod -d wapsell_prod -f /path/to/monitoring-queries.sql
```

### Key Metrics to Watch

| Metric | Warning | Alarm |
|--------|---------|-------|
| Cache hit ratio | < 99% | < 95% |
| Active connections | > 80% of max | > 95% of max |
| Disk usage | > 70% | > 90% |
| Transaction age (xid) | > 1 billion | > 1.9 billion |
| Slow queries (>1s) | Any found | Multiple per minute |
| Blocked locks | Investigating | More than 1 |
| Replication lag | > 10 seconds | > 1 minute |

### Alerting

Configure in your monitoring system (Prometheus, Datadog, New Relic, etc.):

```yaml
# Example Prometheus rule
groups:
  - name: postgres
    rules:
      - alert: PostgresXIDWrapAround
        expr: (2147483647 - pg_database_datfrozenxid) < 500000000
        for: 1h
        annotations:
          summary: "XID wrap around in {{ $labels.datname }}"

      - alert: PostgresCacheHitLow
        expr: (sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read))) < 0.99
        for: 5m
```

---

## Connection Pooling

### Without PgBouncer (Current Setup)

The API container uses Prisma's built-in connection pooling:

```env
DATABASE_POOL_SIZE=20              # Max connections to PostgreSQL
DATABASE_STATEMENT_CACHE_SIZE=200  # Prepared statement cache
```

This is sufficient for most workloads (< 100 concurrent requests).

### With PgBouncer (Optional, High Concurrency)

For deployments with > 500 concurrent requests, use PgBouncer as a connection proxy.

#### Installation

```bash
# Docker image (recommended)
docker run -d \
  --name pgbouncer \
  -v $(pwd)/postgres/pgbouncer.ini:/etc/pgbouncer/pgbouncer.ini \
  -p 6432:6432 \
  pgbouncer:latest
```

#### Configuration

See `postgres/pgbouncer.ini` for the complete config. Key settings:

```ini
[databases]
wapsell_prod = host=postgres port=5432 dbname=wapsell_prod user=wapsell_prod password=<password>

[pgbouncer]
pool_mode = transaction          # One connection per transaction
default_pool_size = 25           # Connections per (db, user) pair
reserve_pool_size = 5            # Extra connections
server_idle_timeout = 600        # Close idle connections after 10 min
```

#### Using PgBouncer in the API

Update `docker-compose.wapsell.yml`:

```yaml
services:
  api:
    environment:
      # Instead of postgres:5432, connect to pgbouncer:6432
      DATABASE_URL: postgresql://wapsell_prod:password@pgbouncer:6432/wapsell_prod?schema=public
      DATABASE_POOL_SIZE: 5  # Smaller pool (pgbouncer handles concurrency)
```

#### Monitoring PgBouncer

```bash
# Connect to admin socket
docker exec pgbouncer psql -U postgres -h localhost -p 6432 -d pgbouncer -c "
  SELECT database, user, state, count(*) FROM pgbouncer.pools GROUP BY database, user, state;
"
```

---

## Disaster Recovery

### Scenario 1: Database Corruption

**Symptoms:** Query errors, integrity constraint violations

**Recovery:**

1. Stop the application
2. Restore from the latest backup
3. Verify data integrity
4. Resume application

```bash
# Stop app
docker compose -f docker-compose.wapsell.yml stop api

# Restore
docker compose -f docker-compose.wapsell.yml exec postgres bash -c '
  gunzip < /var/lib/postgresql/backups/wapsell_prod_LATEST.sql.gz | \
  psql -U wapsell_prod -d wapsell_prod
'

# Verify
docker compose -f docker-compose.wapsell.yml exec postgres psql -U wapsell_prod -d wapsell_prod -c "
  SELECT schemaname, count(*) as tables FROM pg_tables GROUP BY schemaname;
"

# Resume
docker compose -f docker-compose.wapsell.yml start api
```

### Scenario 2: Disk Full

**Symptoms:** Insert/update queries fail with "no space left on device"

**Recovery:**

1. Expand disk or add storage
2. Archive old WAL files
3. Restart PostgreSQL

```bash
# Check disk usage
docker compose -f docker-compose.wapsell.yml exec postgres du -h /var/lib/postgresql/data

# Archive WAL (if archiving is enabled)
docker compose -f docker-compose.wapsell.yml exec postgres bash -c '
  pg_switch_wal() && \
  find /var/lib/postgresql/data/pg_wal -name "*.gz" -mtime +7 -delete
'

# Restart
docker compose -f docker-compose.wapsell.yml restart postgres
```

### Scenario 3: Connection Pool Exhausted

**Symptoms:** "FATAL: remaining connection slots are reserved for non-replication superuser connections"

**Resolution:**

1. Kill idle connections
2. Scale the API horizontally (more instances)
3. Enable PgBouncer

```bash
# Kill idle connections
docker compose -f docker-compose.wapsell.yml exec postgres psql -U wapsell_prod -d wapsell_prod -c "
  SELECT pg_terminate_backend(pid) FROM pg_stat_activity 
  WHERE datname = 'wapsell_prod' AND state = 'idle' AND idle_in_transaction;
"
```

### Scenario 4: Transaction Wrap-Around

**Symptoms:** None initially; data corruption after XID reaches 2.1 billion

**Prevention:**

PostgreSQL auto-vacuums, but check monthly:

```bash
docker compose -f docker-compose.wapsell.yml exec postgres psql -U wapsell_prod -d wapsell_prod -c "
  SELECT datname, (2147483647 - datfrozenxid) as remaining_xids 
  FROM pg_database WHERE datname = 'wapsell_prod';
"
```

**Response (if < 500 million remaining):**

```bash
# Force full VACUUM (may take hours on large DB)
docker compose -f docker-compose.wapsell.yml exec postgres psql -U wapsell_prod -d wapsell_prod -c "VACUUM ANALYZE;"
```

---

## Performance Tuning

### Index Creation Strategy

Indexes speed up queries but slow down writes. Create indexes for:

1. **Foreign keys** - Used in JOINs
2. **WHERE clauses** - Used to filter rows
3. **ORDER BY** - Used to sort results
4. **UNIQUE constraints** - Must be indexed

Example (in migration):

```sql
-- Index on tenant + created_at (common filtering pattern)
CREATE INDEX idx_pedido_empresa_created_at ON pedido(empresa_id, created_at DESC);

-- Full-text search index
CREATE INDEX idx_producto_nombre_trgm ON producto USING GIST (nombre gist_trgm_ops);

-- Partial index (only active products)
CREATE INDEX idx_producto_sku_active ON producto(sku) WHERE estado = 'ACTIVO';
```

### Statistics Collection

The query planner relies on table statistics. Update monthly:

```bash
docker compose -f docker-compose.wapsell.yml exec postgres psql -U wapsell_prod -d wapsell_prod -c "
  ANALYZE;
"
```

### Vacuum and Maintenance

The autovacuum daemon runs continuously, but force a full cleanup weekly:

```bash
docker compose -f docker-compose.wapsell.yml exec postgres psql -U wapsell_prod -d wapsell_prod -c "
  VACUUM ANALYZE;
"
```

### Identify Slow Queries

Enable slow query logging (in `init-schemas.sql`):

```sql
ALTER SYSTEM SET log_min_duration_statement = 1000;  -- Log queries > 1 second
SELECT pg_reload_conf();
```

View slow query logs:

```bash
docker logs wapsell-postgres | grep "duration:"
```

---

## Maintenance Tasks

### Daily

```bash
# Health check
docker compose -f docker-compose.wapsell.yml exec postgres /usr/local/bin/health-check.sh

# Check error logs
docker compose -f docker-compose.wapsell.yml logs postgres | grep ERROR
```

### Weekly

```bash
# Update statistics
docker compose -f docker-compose.wapsell.yml exec postgres psql -U wapsell_prod -d wapsell_prod -c "ANALYZE;"

# Check cache hit ratio
docker compose -f docker-compose.wapsell.yml exec postgres psql -U wapsell_prod -d wapsell_prod -c "
  SELECT sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as ratio
  FROM pg_statio_user_tables;
"
```

### Monthly

```bash
# Full maintenance (VACUUM)
docker compose -f docker-compose.wapsell.yml exec postgres psql -U wapsell_prod -d wapsell_prod -c "
  VACUUM ANALYZE;
"

# Reindex if necessary
docker compose -f docker-compose.wapsell.yml exec postgres psql -U wapsell_prod -d wapsell_prod -c "
  REINDEX DATABASE wapsell_prod;
"

# Review slow query logs
docker compose -f docker-compose.wapsell.yml logs postgres | grep "duration:" | tail -20
```

---

## Troubleshooting

### Connection Issues

**Error: "connection refused"**

```bash
# Check if PostgreSQL is running
docker compose -f docker-compose.wapsell.yml ps postgres

# Check health
docker compose -f docker-compose.wapsell.yml exec postgres pg_isready -U wapsell_prod

# View logs
docker compose -f docker-compose.wapsell.yml logs postgres
```

**Error: "FATAL: password authentication failed"**

```bash
# Verify credentials in .env.wapsell
grep POSTGRES_ .env.wapsell

# Check that environment variables are passed to container
docker compose -f docker-compose.wapsell.yml exec postgres printenv | grep POSTGRES
```

### Query Performance

**Query is slow**

1. Check execution plan:
   ```bash
   docker compose -f docker-compose.wapsell.yml exec postgres psql -U wapsell_prod -d wapsell_prod -c "
     EXPLAIN ANALYZE SELECT * FROM pedido WHERE empresa_id = 'xyz' ORDER BY created_at DESC;
   "
   ```

2. Look for "Seq Scan" (table scan) in the plan
3. Add an index if needed:
   ```bash
   docker compose -f docker-compose.wapsell.yml exec postgres psql -U wapsell_prod -d wapsell_prod -c "
     CREATE INDEX idx_pedido_empresa_created ON pedido(empresa_id, created_at DESC);
   "
   ```

### Replication Issues

If you implement replication, common issues:

**Standby is not following:**

```bash
# Check replication status
docker compose -f docker-compose.wapsell.yml exec postgres psql -U wapsell_prod -c "
  SELECT * FROM pg_stat_replication;
"

# If empty, replication is not connected. Check:
# - Network between primary and standby
# - Credentials on standby
# - WAL level = replica on primary
```

---

## References

- [PostgreSQL 16 Documentation](https://www.postgresql.org/docs/16/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [PgBouncer Documentation](https://pgbouncer.github.io/)
- [PostgreSQL Tuning Guide](https://wiki.postgresql.org/wiki/Performance_Optimization)
