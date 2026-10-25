# PostgreSQL Database Deployment Checklist

**Task:** P-DEPLOY-4 PostgreSQL Database Setup  
**Status:** Implementation Complete  
**Date:** 2026-10-25  

---

## Pre-Deployment

### Environment Preparation

- [ ] `.env.wapsell` file created with all required variables
  - [ ] `POSTGRES_USER` set to `wapsell_prod`
  - [ ] `POSTGRES_PASSWORD` generated (32+ chars, openssl rand -base64 32)
  - [ ] `POSTGRES_DB` set to `wapsell_prod`
  - [ ] `DATABASE_POOL_SIZE=20`
  - [ ] `DATABASE_STATEMENT_CACHE_SIZE=200`
  - [ ] All other required env vars (Redis, Elasticsearch, JWT, etc.)

- [ ] Data directories created on host
  ```bash
  sudo mkdir -p /data/wapsell/{postgres,redis,elasticsearch,logs/api,assets}
  sudo chown -R 1000:1000 /data/wapsell
  chmod 750 /data/wapsell/{postgres,redis,elasticsearch}
  ```

- [ ] Disk space verified (> 100 GB recommended)
  ```bash
  df -h /data/wapsell
  ```

- [ ] Docker and Docker Compose installed
  ```bash
  docker --version  # 20.10+
  docker compose version  # 2.0+
  ```

### Security Review

- [ ] Passwords/secrets not committed to Git
  - [ ] `.env.wapsell` in `.gitignore`
  - [ ] No hardcoded credentials in code
  - [ ] No secrets in `docker-compose.wapsell.yml`

- [ ] PostgreSQL user permissions verified
  - [ ] `wapsell_prod` user created (not superuser)
  - [ ] Cannot create new databases or roles
  - [ ] Can only modify tables in public schema

- [ ] Network isolation verified
  - [ ] PostgreSQL port (5432) not exposed publicly
  - [ ] Only API container can connect to PostgreSQL
  - [ ] Firewall rules in place

---

## Database Initialization

### Container Startup

- [ ] PostgreSQL container started
  ```bash
  docker compose -f docker-compose.wapsell.yml up -d postgres
  ```

- [ ] PostgreSQL health check passes
  ```bash
  docker compose -f docker-compose.wapsell.yml exec postgres pg_isready -U wapsell_prod
  # Expected: "accepting connections"
  ```

- [ ] Init scripts executed successfully
  ```bash
  docker compose -f docker-compose.wapsell.yml logs postgres | grep "initialization complete"
  ```

### Extensions Verification

- [ ] All required extensions enabled
  ```bash
  docker compose -f docker-compose.wapsell.yml exec postgres psql -U wapsell_prod -d wapsell_prod -c "
    SELECT extname FROM pg_extension WHERE extname IN ('uuid-ossp', 'pgcrypto', 'pg_trgm', 'pg_stat_statements') ORDER BY extname;
  "
  ```
  Expected: uuid-ossp, pgcrypto, pg_trgm, pg_stat_statements

- [ ] Schemas created
  ```bash
  docker compose -f docker-compose.wapsell.yml exec postgres psql -U wapsell_prod -d wapsell_prod -c "
    SELECT nspname FROM pg_namespace WHERE nspname IN ('public', 'audit', 'search') ORDER BY nspname;
  "
  ```
  Expected: audit, public, search

- [ ] Roles configured correctly
  ```bash
  docker compose -f docker-compose.wapsell.yml exec postgres psql -U wapsell_prod -d wapsell_prod -c "
    SELECT rolname FROM pg_roles WHERE rolname IN ('wapsell_app', 'wapsell_readonly') ORDER BY rolname;
  "
  ```

---

## Prisma Migrations

### Prisma Client Generation

- [ ] Prisma client generated
  ```bash
  cd apps/api && npm run prisma:generate
  ```
  Expected: No errors, types generated in node_modules/@prisma/client

### Migration Deployment

- [ ] Pending migrations identified
  ```bash
  docker compose -f docker-compose.wapsell.yml exec api npx prisma migrate status
  ```
  Expected: List of pending migrations or "All migrations have been applied"

- [ ] Migrations applied
  ```bash
  docker compose -f docker-compose.wapsell.yml exec api npx prisma migrate deploy --skip-generate
  ```
  Expected: "All migrations have been applied successfully"

- [ ] Migration history verified
  ```bash
  docker compose -f docker-compose.wapsell.yml exec postgres psql -U wapsell_prod -d wapsell_prod -c "
    SELECT COUNT(*) FROM _prisma_migrations;
  "
  ```
  Expected: > 0 (number of migrations)

### Schema Validation

- [ ] Prisma schema matches database schema
  ```bash
  cd apps/api && npm run prisma:generate && npx prisma db pull --force
  ```
  Expected: No breaking changes detected (or list of expected changes)

- [ ] All tables created with correct structure
  ```bash
  docker compose -f docker-compose.wapsell.yml exec postgres psql -U wapsell_prod -d wapsell_prod -c "
    SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';
  "
  ```
  Expected: > 10 (at least the core tables)

---

## Data Seeding

### Initial Data Load

- [ ] Seed script executed
  ```bash
  docker compose -f docker-compose.wapsell.yml exec api npm run prisma:seed
  ```
  Expected: No errors, companies and users created

- [ ] Admin user created
  ```bash
  docker compose -f docker-compose.wapsell.yml exec postgres psql -U wapsell_prod -d wapsell_prod -c "
    SELECT email, nombre FROM usuario WHERE email LIKE 'admin%';
  "
  ```
  Expected: admin@wapsell.com or similar

- [ ] Sample data count verified
  ```bash
  docker compose -f docker-compose.wapsell.yml exec postgres psql -U wapsell_prod -d wapsell_prod -c "
    SELECT 'empresa' as table_name, count(*) as row_count FROM empresa
    UNION ALL
    SELECT 'usuario', count(*) FROM usuario
    UNION ALL
    SELECT 'familia', count(*) FROM familia;
  "
  ```

---

## Backup Configuration

### Backup Script Setup

- [ ] Backup script executable
  ```bash
  docker compose -f docker-compose.wapsell.yml exec postgres ls -la /usr/local/bin/backup.sh
  # Expected: executable flag (-x)
  ```

- [ ] Backup directory exists in container
  ```bash
  docker compose -f docker-compose.wapsell.yml exec postgres ls -la /var/lib/postgresql/backups
  # Expected: directory exists with permissions 755
  ```

- [ ] Manual backup created
  ```bash
  docker compose -f docker-compose.wapsell.yml exec postgres /usr/local/bin/backup.sh
  ```
  Expected: "Backup completed: backup_YYYYMMDD_HHMMSS.sql.gz"

- [ ] Backup file is valid
  ```bash
  docker compose -f docker-compose.wapsell.yml exec postgres bash -c '
    gunzip -t /var/lib/postgresql/backups/wapsell_prod_*.sql.gz
  '
  ```
  Expected: No errors (file is readable)

### Cron Job Setup (Production)

- [ ] Cron entry added to host
  ```bash
  crontab -e
  # Add: 0 2 * * * /usr/local/bin/backup.sh >> /var/log/postgres-backup.log 2>&1
  ```

- [ ] Cron job tested
  ```bash
  # Check crontab
  crontab -l | grep backup.sh
  
  # Check last backup
  ls -lt /var/lib/postgresql/backups/ | head -1
  ```

### S3 Backup (Optional)

- [ ] AWS credentials configured
  ```bash
  aws configure  # or IAM role assigned to EC2 instance
  aws s3 ls s3://wapsell-backups/  # Test access
  ```

- [ ] Test S3 upload
  ```bash
  aws s3 cp /var/lib/postgresql/backups/wapsell_prod_*.sql.gz s3://wapsell-backups/postgres/
  ```

---

## Monitoring Setup

### Health Check Script

- [ ] Health check script present
  ```bash
  ls -la postgres/health-check.sh
  ```

- [ ] Script is executable
  ```bash
  docker compose -f docker-compose.wapsell.yml exec postgres chmod +x /usr/local/bin/health-check.sh
  ```

- [ ] Health check runs successfully
  ```bash
  docker compose -f docker-compose.wapsell.yml exec postgres /usr/local/bin/health-check.sh
  ```
  Expected: All checks pass (green checkmarks)

### Monitoring Queries

- [ ] Monitoring queries file present
  ```bash
  ls postgres/monitoring-queries.sql
  ```

- [ ] Key metrics can be queried
  ```bash
  docker compose -f docker-compose.wapsell.yml exec postgres psql -U wapsell_prod -d wapsell_prod -c "
    SELECT 
      sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as cache_hit_ratio
    FROM pg_statio_user_tables;
  "
  ```
  Expected: > 0.99 (good cache hit ratio)

### Prometheus/Alerting Setup (if applicable)

- [ ] Prometheus PostgreSQL exporter deployed (optional)
- [ ] Key metrics exported:
  - [ ] pg_stat_activity (active connections)
  - [ ] pg_database_size (database size)
  - [ ] pg_stat_statements (query latency)
- [ ] Alerts configured for:
  - [ ] Connection pool exhaustion
  - [ ] Cache hit ratio < 95%
  - [ ] Slow queries (> 1 second)
  - [ ] Disk usage > 80%
  - [ ] XID wrap around (< 500M remaining)

---

## Connection Pooling

### Prisma Connection Pool

- [ ] Pool size configured in .env.wapsell
  ```bash
  grep DATABASE_POOL_SIZE .env.wapsell
  # Expected: DATABASE_POOL_SIZE=20
  ```

- [ ] Pool works under load (optional test)
  ```bash
  # After API starts, run concurrent requests and monitor:
  docker compose -f docker-compose.wapsell.yml exec postgres psql -U wapsell_prod -d wapsell_prod -c "
    SELECT count(*) FROM pg_stat_activity WHERE datname = 'wapsell_prod' AND state = 'active';
  "
  ```

### PgBouncer Setup (Optional, High Concurrency)

- [ ] PgBouncer config file present (optional)
  ```bash
  ls postgres/pgbouncer.ini
  ```

- [ ] If enabled, PgBouncer container health
  ```bash
  docker ps | grep pgbouncer  # Should be running
  ```

- [ ] Pool statistics accessible
  ```bash
  docker exec pgbouncer psql -U postgres -h localhost -d pgbouncer -c "
    SELECT database, user, state, count(*) FROM pgbouncer.pools GROUP BY database, user, state;
  "
  ```

---

## API Integration

### Environment Variables

- [ ] DATABASE_URL set correctly in api container
  ```bash
  docker compose -f docker-compose.wapsell.yml exec api bash -c 'echo $DATABASE_URL'
  # Expected: postgresql://wapsell_prod:****@postgres:5432/wapsell_prod?schema=public&sslmode=require
  ```

- [ ] API can connect to database
  ```bash
  docker compose -f docker-compose.wapsell.yml exec api npm run prisma:generate
  ```
  Expected: Success (no connection errors)

### API Startup

- [ ] API container starts successfully
  ```bash
  docker compose -f docker-compose.wapsell.yml up -d api
  ```

- [ ] API health check passes
  ```bash
  curl -s http://localhost:3000/health | jq .
  ```
  Expected: HTTP 200, status: "ok"

- [ ] API can query database
  ```bash
  docker compose -f docker-compose.wapsell.yml logs api | grep -i "database\|connected"
  ```
  Expected: No errors, successful connection

---

## Testing

### Smoke Tests

- [ ] Create a new record via API
  ```bash
  # POST /api/v1/usuarios
  # Verify it's written to database
  ```

- [ ] Query database directly
  ```bash
  docker compose -f docker-compose.wapsell.yml exec postgres psql -U wapsell_prod -d wapsell_prod -c "
    SELECT COUNT(*) FROM usuario;
  "
  ```

- [ ] Verify data isolation (multi-tenant)
  ```bash
  # Create records in different companies/tenants
  # Verify company isolation is enforced
  ```

### Load Testing (Optional)

- [ ] Simulate concurrent load
  ```bash
  # Use ab, wrk, or k6 to generate load
  # Monitor: docker compose -f docker-compose.wapsell.yml exec postgres /usr/local/bin/health-check.sh
  ```

- [ ] Connection pool capacity verified
  ```bash
  # Monitor connection count doesn't exceed limit
  ```

---

## Production Handoff

### Documentation

- [ ] DATABASE-SETUP.md reviewed and updated
- [ ] DATABASE-DEPLOY-CHECKLIST.md completed (this file)
- [ ] Runbook created for common operations:
  - [ ] How to restore from backup
  - [ ] How to add a new migration
  - [ ] How to monitor performance
  - [ ] How to troubleshoot connections

### Access & Credentials

- [ ] Credentials securely stored in vault/KMS
  - [ ] POSTGRES_PASSWORD
  - [ ] JWT_SECRET, JWT_REFRESH_SECRET
  - [ ] All other sensitive env vars

- [ ] Access log created
  - [ ] Who has database access (admin, developers)
  - [ ] How to grant/revoke access

### Final Verification

- [ ] All checklist items completed
- [ ] No blocking issues or TODOs
- [ ] Team trained on database operations
- [ ] Monitoring and alerting active
- [ ] Backups tested (restore from backup verified)

---

## Post-Deployment

### Week 1 Monitoring

- [ ] Daily health checks pass
- [ ] No slow query warnings
- [ ] Cache hit ratio stable (> 99%)
- [ ] Connection pool not exhausted
- [ ] Backup jobs complete successfully
- [ ] Zero data corruption incidents

### Week 2-4 Optimization

- [ ] Analyze slow queries and create indexes
- [ ] Tune PostgreSQL parameters based on metrics
- [ ] Optimize Prisma queries if needed
- [ ] Review and document lessons learned

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Database Admin | | | |
| DevOps/Deployment | | | |
| Tech Lead | | | |
| Product Manager | | | |

---

## Appendix: Troubleshooting Quick Reference

### Database won't start
```bash
docker compose -f docker-compose.wapsell.yml logs postgres | tail -50
# Check: POSTGRES_PASSWORD, disk space, permissions
```

### Connection refused
```bash
docker compose -f docker-compose.wapsell.yml exec postgres pg_isready
# If failing: check network, ports, health
```

### Slow queries
```bash
docker compose -f docker-compose.wapsell.yml exec postgres psql -U wapsell_prod -d wapsell_prod -f postgres/monitoring-queries.sql
# Check: cache hit ratio, missing indexes, lock contention
```

### Backup failed
```bash
docker compose -f docker-compose.wapsell.yml exec postgres /usr/local/bin/backup.sh
# Check: disk space, permissions, pg_dump version
```

### Migration failed
```bash
docker compose -f docker-compose.wapsell.yml exec api npx prisma migrate status
# If stuck: resolve conflict, mark as rolled back, retry
```
