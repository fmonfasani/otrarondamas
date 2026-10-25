# Operations Runbooks

Standard procedures for operating and maintaining Wapsell platform in production.

## Table of Contents

1. [Daily Operations](#daily-operations)
2. [Weekly Maintenance](#weekly-maintenance)
3. [Monthly Maintenance](#monthly-maintenance)
4. [Emergency Procedures](#emergency-procedures)
5. [Deployment Procedures](#deployment-procedures)
6. [Scaling Procedures](#scaling-procedures)

## Daily Operations

### Morning Health Check (Start of Business Day)

**Purpose**: Verify all systems are operational before users access

**Duration**: 10 minutes

**Steps**:

```bash
#!/bin/bash
# Run this every morning

echo "=== Wapsell Daily Health Check ==="
DATE=$(date)
echo "Time: $DATE"

# 1. Check Container Status
echo "1. Container Status..."
docker-compose -f docker-compose.prod.yml ps
if [ $? -ne 0 ]; then
  echo "ERROR: Docker Compose failed. Escalate!"
  exit 1
fi

# 2. Check API Health
echo "2. API Health..."
curl -f https://api.wapsell.com/health
if [ $? -ne 0 ]; then
  echo "ERROR: API not responding!"
  docker-compose -f docker-compose.prod.yml logs api --tail 20
  exit 1
fi

# 3. Check Database
echo "3. Database Health..."
docker-compose -f docker-compose.prod.yml exec db psql -U wapsell_user -d wapsell_prod -c "SELECT 1;"
if [ $? -ne 0 ]; then
  echo "ERROR: Database not responding!"
  exit 1
fi

# 4. Check Disk Space
echo "4. Disk Space..."
DISK=$(df -h / | tail -1 | awk '{print $5}' | sed 's/%//')
echo "Used: ${DISK}%"
if [ $DISK -gt 80 ]; then
  echo "WARNING: Disk usage > 80%"
fi

# 5. Check Memory
echo "5. Memory Usage..."
docker stats --no-stream --format "table {{.Container}}\t{{.MemUsage}}"

# 6. Check Recent Errors
echo "6. Recent Errors (last 1 hour)..."
docker logs wapsell-api --since 1h | grep -i error | head -5

echo "=== Health Check Complete ==="
```

**Save and run daily**:
```bash
chmod +x /opt/wapsell/health-check.sh
# Add to crontab at 7 AM
# 0 7 * * * /opt/wapsell/health-check.sh >> /var/log/wapsell-health.log 2>&1
```

### Backup Verification

**Purpose**: Ensure daily backups completed successfully

**Steps**:

```bash
# Check backup directory
ls -lh /backups/db_*.sql.gz | head -5

# Should show at least one file from today
ls -lh /backups/db_$(date +%Y%m%d)*.sql.gz

# Check file size (should be > 1MB for active database)
ls -lh /backups/db_$(date +%Y%m%d)*.sql.gz | awk '{print $5}'

# Test restore (if time permits)
# gzip -t /backups/db_LATEST.sql.gz
# (This verifies gzip integrity without extracting)
```

### Monitor Error Logs

**Purpose**: Catch issues before they impact users

**Steps**:

```bash
# Check for 500 errors in last 24 hours
docker logs wapsell-api --since 24h | grep "500" | wc -l

# Check for database errors
docker logs wapsell-api --since 24h | grep -i "database\|connection" | head -5

# Check for authentication failures
docker logs wapsell-api --since 24h | grep -i "unauthorized\|forbidden" | wc -l

# Alert if more than 10 errors
if [ $(docker logs wapsell-api --since 24h | grep "500" | wc -l) -gt 10 ]; then
  echo "ERROR: High error rate detected. Investigate immediately."
fi
```

## Weekly Maintenance

### Database Health & Optimization

**Purpose**: Ensure database performance and health

**Duration**: 30 minutes (off-peak hours)

**Steps**:

```bash
# 1. Analyze and VACUUM database
docker-compose -f docker-compose.prod.yml exec db psql -U wapsell_user -d wapsell_prod <<EOF
ANALYZE;
VACUUM ANALYZE;
EOF

# 2. Check table sizes
docker-compose -f docker-compose.prod.yml exec db psql -U wapsell_user -d wapsell_prod <<EOF
SELECT schemaname, tablename, 
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname NOT LIKE 'pg_%'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;
EOF

# 3. Check for missing indexes
docker-compose -f docker-compose.prod.yml exec db psql -U wapsell_user -d wapsell_prod <<EOF
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname NOT LIKE 'pg_%'
  AND n_distinct > 100
  AND correlation < 0.1
ORDER BY abs(correlation) ASC
LIMIT 10;
EOF

# 4. Check for long-running queries
docker-compose -f docker-compose.prod.yml exec db psql -U wapsell_user -d wapsell_prod <<EOF
SELECT pid, usename, state, query, query_start
FROM pg_stat_activity
WHERE state != 'idle'
  AND query NOT ILIKE '%pg_stat_activity%'
ORDER BY query_start;
EOF

# 5. Check replication lag (if applicable)
docker-compose -f docker-compose.prod.yml exec db psql -U wapsell_user -d wapsell_prod <<EOF
SELECT now() - pg_last_xact_replay_timestamp() AS replication_lag;
EOF
```

### Review Audit Logs

**Purpose**: Check for suspicious user activity

**Duration**: 15 minutes

**Steps**:

```sql
-- Failed login attempts
SELECT usuario_id, empresa_id, COUNT(*) as attempts
FROM usuario_acceso
WHERE tipo = 'LOGIN_FAILED'
  AND fecha >= NOW() - INTERVAL '7 days'
GROUP BY usuario_id, empresa_id
HAVING COUNT(*) > 5
ORDER BY attempts DESC;

-- Permission changes
SELECT usuario_id, cambio, fecha
FROM usuario_acceso
WHERE tipo = 'PERMISSION_CHANGED'
  AND fecha >= NOW() - INTERVAL '7 days';

-- Data deletions
SELECT usuario_id, tabla, COUNT(*) as deletes
FROM usuario_acceso
WHERE tipo = 'DELETE'
  AND fecha >= NOW() - INTERVAL '7 days'
GROUP BY usuario_id, tabla
ORDER BY deletes DESC;

-- Unusual access times (outside business hours)
SELECT usuario_id, fecha, accion
FROM usuario_acceso
WHERE EXTRACT(HOUR FROM fecha) NOT BETWEEN 6 AND 22
  AND fecha >= NOW() - INTERVAL '7 days'
LIMIT 20;
```

### Update Dependencies (Optional)

**Purpose**: Keep packages up-to-date (patch versions only)

**Duration**: 1 hour (off-peak)

**Steps**:

```bash
# Check for updates
npm outdated

# Update patch versions only
npm update

# Run tests to verify nothing broke
npm test

# If tests pass, commit and deploy
git add -A
git commit -m "chore: update dependencies (patch versions)"
git push origin main
```

## Monthly Maintenance

### Full Database Backup Verification

**Purpose**: Ensure backups are restorable

**Duration**: 1-2 hours (low-traffic time)

**Steps**:

```bash
# 1. List recent backups
ls -lh /backups/db_*.sql.gz | head -10

# 2. Verify integrity
for file in /backups/db_*.sql.gz; do
  gzip -t "$file"
  if [ $? -eq 0 ]; then
    echo "✓ $(basename $file) OK"
  else
    echo "✗ $(basename $file) CORRUPTED"
  fi
done

# 3. Test restore on staging (if available)
# Restore to temporary database
BACKUP_FILE="/backups/db_20261001_020000.sql.gz"
gzip -d < "$BACKUP_FILE" | \
  docker exec -i wapsell-db-test psql -U wapsell_user wapsell_test

# 4. Verify data integrity
docker-compose exec db-test psql -U wapsell_user -d wapsell_test <<EOF
SELECT COUNT(*) as total_records FROM venta;
SELECT COUNT(*) as total_records FROM cliente;
SELECT COUNT(*) as total_records FROM producto;
EOF

# 5. Cleanup
docker volume rm wapsell_db_test_data
```

### SSL Certificate Review

**Purpose**: Ensure certificates are current and will auto-renew

**Duration**: 10 minutes

**Steps**:

```bash
# 1. List all certificates
certbot certificates

# 2. Check expiration dates
certbot certificates --format csv | tail -n +2 | while IFS=',' read -r name exp_date; do
  DAYS=$((($( date -d "$exp_date" +%s) - $( date +%s)) / 86400))
  if [ $DAYS -lt 30 ]; then
    echo "WARNING: Certificate for $name expires in $DAYS days"
  else
    echo "✓ Certificate for $name expires in $DAYS days"
  fi
done

# 3. Test renewal
certbot renew --dry-run

# 4. Verify NGINX has latest cert
curl -vI https://api.wapsell.com 2>&1 | grep "subject="
```

### Performance Review

**Purpose**: Identify performance degradation

**Duration**: 30 minutes

**Steps**:

```bash
# 1. Check request latency (if monitoring available)
# Look at last 30 days of API response times
# p50, p95, p99 should be stable

# 2. Check database performance
# Query times should be < 100ms on average

# 3. Check error rates
# Should be < 1% (5xx errors)

# 4. Review slow query log
docker-compose exec db psql -U wapsell_user -d wapsell_prod <<EOF
SELECT query, calls, mean_exec_time, max_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
EOF

# 5. Check cache hit ratios
docker-compose exec redis redis-cli INFO stats | grep -E "keyspace_hits|keyspace_misses"

# 6. Recommendations
# If high latency: Add indexes or optimize queries
# If high errors: Investigate logs
# If low cache hits: Check cache TTL or warm up strategy
```

### Update OS Packages (Security)

**Purpose**: Apply security patches to underlying OS

**Duration**: 30 minutes (maintenance window)

**Steps**:

```bash
# 1. Check for updates
apt-get update
apt-get upgrade -s  # Simulate

# 2. Apply updates
apt-get upgrade -y

# 3. Check if reboot required
if [ -f /var/run/reboot-required ]; then
  echo "Reboot required. Plan downtime or use hot-reload."
fi

# 4. Restart services (if needed)
systemctl restart docker

# 5. Verify all services running
docker ps
```

## Emergency Procedures

### API Service Down

**Alert Trigger**: API not responding for > 5 minutes

**Severity**: CRITICAL - Immediate action required

**Steps**:

```bash
# 1. IMMEDIATE: Declare incident
echo "🚨 INCIDENT: API Service Down - $(date)"
# Notify on-call team

# 2. ASSESSMENT (2 min): Check status
docker-compose -f docker-compose.prod.yml ps api

# 3. First attempt: Restart API
docker-compose -f docker-compose.prod.yml restart api
sleep 10
curl https://api.wapsell.com/health

# 4. If still down: Check logs
docker logs wapsell-api --tail 50 | tail -20

# 5. Check dependencies
docker-compose -f docker-compose.prod.yml ps db redis

# 6. Second attempt: Full restart
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d
sleep 30
curl https://api.wapsell.com/health

# 7. If still not working: Rollback
cd /opt/wapsell
git log --oneline -5
git reset --hard <last-known-good-commit>
docker-compose -f docker-compose.prod.yml build --no-cache api
docker-compose -f docker-compose.prod.yml up -d api

# 8. Investigate root cause
docker logs wapsell-api > /tmp/api_logs.txt
# Send logs to development team

# 9. Post-incident: Root cause analysis
# Schedule meeting with team
# Document findings and prevention
```

**SLA Target**: Restore within 15 minutes

### Database Down

**Alert Trigger**: Database connection refused

**Severity**: CRITICAL - All operations blocked

**Steps**:

```bash
# 1. Check if PostgreSQL is running
docker-compose -f docker-compose.prod.yml ps db

# 2. Try to restart
docker-compose -f docker-compose.prod.yml restart db
sleep 20

# 3. Verify connectivity
docker-compose -f docker-compose.prod.yml exec db psql -U wapsell_user -d wapsell_prod -c "SELECT 1;"

# 4. If failed: Check logs
docker logs wapsell-db --tail 50

# 5. Check disk space (often cause of DB failure)
df -h /var/lib/docker/volumes/

# 6. If disk full: Cleanup
docker system prune -a  # WARNING: Removes unused images
df -h

# 7. Restart all services
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d db
sleep 30
docker-compose -f docker-compose.prod.yml ps

# 8. Restore from backup if needed
# See Backup & Recovery section in DEPLOYMENT.md
```

### Disk Space Critical

**Alert Trigger**: Disk usage > 90%

**Severity**: HIGH - Take action immediately

**Steps**:

```bash
# 1. Check disk usage
df -h
du -sh /var/lib/docker/*

# 2. Identify large items
du -sh /var/lib/docker/volumes/*
du -sh /var/lib/docker/containers/*

# 3. Clean up Docker
docker system prune -a --volumes  # WARNING: Destructive

# 4. Archive old logs
tar -czf /backups/logs_archive_$(date +%Y%m%d).tar.gz /var/log/wapsell*
rm -f /var/log/wapsell*.log

# 5. Clear old backups
find /backups -name "db_*.sql.gz" -mtime +30 -delete

# 6. Verify disk space recovered
df -h

# 7. If still critical: Expand volume
# For Hetzner Cloud: Use console to resize volume
# Or migrate to larger instance
```

### High Memory Usage

**Alert Trigger**: Container using > 80% of limit

**Severity**: MEDIUM - Prevent OOMKill

**Steps**:

```bash
# 1. Check memory usage
docker stats --no-stream

# 2. Identify offender
# Usually API or database

# 3. For API: Restart
docker-compose -f docker-compose.prod.yml restart api

# 4. For Database: Check for long-running queries
docker-compose -f docker-compose.prod.yml exec db psql -U wapsell_user -d wapsell_prod <<EOF
SELECT pid, usename, query, query_start
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY query_start DESC;
EOF

# 5. Cancel long-running query if needed
docker-compose -f docker-compose.prod.yml exec db psql -U wapsell_user -d wapsell_prod <<EOF
SELECT pg_terminate_backend(pid) FROM pg_stat_activity 
WHERE query ILIKE '%<your_query_here>%' AND pid != pg_backend_pid();
EOF

# 6. Increase resource limit
# Edit docker-compose.prod.yml:
# deploy:
#   resources:
#     limits:
#       memory: 2G

docker-compose -f docker-compose.prod.yml up -d
```

## Deployment Procedures

### Standard Deployment (Blue-Green)

**Purpose**: Zero-downtime deployment of new code

**Duration**: 15-20 minutes

**Steps**:

```bash
# 1. Prepare: Pull latest code
cd /opt/wapsell
git fetch origin
git log origin/main -1

# 2. Prepare: Build new image
docker-compose -f docker-compose.prod.yml build --no-cache api

# 3. Test: Run tests on new image
docker run --rm \
  --env-file apps/api/.env.production \
  $(docker-compose -f docker-compose.prod.yml images api -q) \
  npm test:integration

# 4. Deploy: Create new container (blue-green)
# Keep current running, start new in parallel
docker-compose -f docker-compose.prod.yml up -d api

# 5. Verify: Health checks on new version
docker logs wapsell-api-new --tail 20
curl https://api.wapsell.com/health

# 6. Cutover: Switch traffic to new version
# NGINX already load-balances, traffic shifts automatically

# 7. Verify: Run smoke tests
npm run test:smoke

# 8. Cleanup: Remove old container
docker-compose -f docker-compose.prod.yml down api
# (This removes old one, keeps new)

# 9. Document: Log deployment
echo "Deployed $(git rev-parse --short HEAD) at $(date)" >> /var/log/deployments.log
```

### Rollback Procedure

**Purpose**: Revert to previous version if deployment fails

**Duration**: 5-10 minutes

**Steps**:

```bash
# 1. Detect failure
# - API returns 500 errors
# - Tests fail
# - Users report issues

# 2. Immediate: Revert
cd /opt/wapsell
git log --oneline -3
git reset --hard <previous-good-commit>

# 3. Rebuild and restart
docker-compose -f docker-compose.prod.yml build api
docker-compose -f docker-compose.prod.yml up -d api

# 4. Verify
sleep 10
curl https://api.wapsell.com/health

# 5. Notify team
echo "⚠️ Rolled back to $(git rev-parse --short HEAD) due to $(cat /tmp/incident_reason.txt)"

# 6. Post-mortem: Understand failure
docker logs wapsell-api > /tmp/rollback_logs.txt
# Share with team for analysis
```

## Scaling Procedures

### Horizontal Scaling (Add More API Instances)

**Purpose**: Handle increased load

**When to Scale**: 
- CPU > 70% consistently
- Response time > 500ms
- Error rate increasing

**Steps**:

```bash
# 1. Update docker-compose to run multiple API instances
# Edit docker-compose.prod.yml:
# api:
#   deploy:
#     replicas: 3

# 2. Ensure stateless design
# Verify: No local file storage
# Verify: No in-memory user sessions
# All state in Redis or database

# 3. Update NGINX to load balance
# NGINX upstream already handles this:
# upstream api {
#   server api:3000;
#   server api:3001;
#   server api:3002;
# }

# 4. Scale services
docker-compose -f docker-compose.prod.yml up -d --scale api=3

# 5. Verify traffic distributed
docker logs wapsell-api_1 --tail 5
docker logs wapsell-api_2 --tail 5
docker logs wapsell-api_3 --tail 5

# 6. Monitor load
docker stats --no-stream

# 7. Verify all healthy
curl https://api.wapsell.com/health (should route to all 3)
```

### Database Scaling (Read Replicas)

**Purpose**: Offload read-heavy workloads

**Complexity**: HIGH - Requires planning

**Steps**:

```bash
# 1. Setup read replica on Hetzner
# - Create new VPS instance
# - Install PostgreSQL
# - Configure as streaming replica

# 2. Update application to route reads
# Implement read/write splitting in Prisma

# 3. Test replication
docker-compose exec db-replica psql -c "SELECT pg_last_wal_replay_lsn();"

# 4. Migrate queries gradually
# Start with non-critical reads (analytics)
# Then move to product queries
# Finally to customer queries

# 5. Monitor replication lag
SELECT now() - pg_last_xact_replay_timestamp();
# Should be < 1 second
```

### Redis Clustering

**Purpose**: Improve cache availability and throughput

**Steps**:

```bash
# 1. Setup Redis Cluster on 3+ nodes
# Each node: Redis instance on different VPS

# 2. Update application
REDIS_URL="redis://node1:6379,redis://node2:6379,redis://node3:6379"

# 3. Test cluster
docker exec wapsell-redis redis-cli cluster info

# 4. Monitor cluster health
docker exec wapsell-redis redis-cli cluster nodes
```

## Monitoring & Alerting

### Key Metrics to Monitor

| Metric | Alert Threshold | Action |
|--------|-----------------|--------|
| API Response Time p95 | > 1000ms | Investigate slow queries |
| Error Rate | > 1% | Check logs, assess impact |
| Database Connections | > 80 | Check for connection leaks |
| Redis Memory | > 80% | Clear expired keys |
| Disk Usage | > 85% | Archive logs, cleanup |
| Memory Usage | > 85% | Restart service |

### Setup Monitoring (Optional)

```bash
# Install Prometheus + Grafana
docker run -d --name prometheus \
  -p 9090:9090 \
  -v /opt/wapsell/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus

# Install Grafana
docker run -d --name grafana \
  -p 3000:3000 \
  grafana/grafana

# Access Grafana: http://localhost:3000
# Add Prometheus datasource: http://prometheus:9090
```
