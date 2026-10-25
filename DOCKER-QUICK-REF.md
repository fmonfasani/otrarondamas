# Docker Compose Quick Reference for Wapsell

## One-Liners

```bash
# Start stack
docker compose -f docker-compose.wapsell.yml up -d

# See all services healthy
docker compose -f docker-compose.wapsell.yml ps

# Stream API logs
docker compose -f docker-compose.wapsell.yml logs -f api

# Connect to database
docker compose -f docker-compose.wapsell.yml exec postgres psql -U wapsell_prod -d wapsell_prod

# Connect to Redis
docker compose -f docker-compose.wapsell.yml exec redis redis-cli -a $REDIS_PASSWORD

# Run migrations
docker compose -f docker-compose.wapsell.yml exec api npx prisma migrate deploy

# Seed data
docker compose -f docker-compose.wapsell.yml exec api npx prisma db seed

# Backup database
docker compose -f docker-compose.wapsell.yml exec postgres pg_dump -U wapsell_prod -d wapsell_prod | gzip > backup.sql.gz

# Stop stack (keep volumes)
docker compose -f docker-compose.wapsell.yml down

# Remove everything (⚠️ destructive)
docker compose -f docker-compose.wapsell.yml down -v

# Check resource usage
docker compose -f docker-compose.wapsell.yml stats

# Rebuild specific service
docker compose -f docker-compose.wapsell.yml build api

# Update & restart
git pull && docker compose -f docker-compose.wapsell.yml build api tienda-online pos-admin && docker compose -f docker-compose.wapsell.yml up -d
```

## Environment Setup

```bash
# Generate secrets
POSTGRES_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)
REDIS_PASSWORD=$(openssl rand -base64 24)
ELASTICSEARCH_PASSWORD=$(openssl rand -base64 32)

# Print for copying into .env.wapsell
echo "POSTGRES_PASSWORD=${POSTGRES_PASSWORD}"
echo "JWT_SECRET=${JWT_SECRET}"
echo "JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}"
echo "REDIS_PASSWORD=${REDIS_PASSWORD}"
echo "ELASTICSEARCH_PASSWORD=${ELASTICSEARCH_PASSWORD}"
```

## Health Checks

```bash
# All services
curl http://localhost:3000/health         # API
curl http://localhost:3001/health         # Tienda
curl http://localhost:3002/health         # Admin

# Database
docker compose -f docker-compose.wapsell.yml exec postgres pg_isready -U wapsell_prod

# Redis
docker compose -f docker-compose.wapsell.yml exec redis redis-cli -a $REDIS_PASSWORD ping

# Elasticsearch
curl -u elastic:$ELASTICSEARCH_PASSWORD http://localhost:9200/_cluster/health
```

## Troubleshooting Checklist

- [ ] `.env.wapsell` exists and has valid values
- [ ] `/data/wapsell` directories created with correct permissions
- [ ] Ports 5432, 6379, 9200, 3000, 3001, 3002 available
- [ ] `docker compose ps` shows all services "healthy"
- [ ] `docker compose logs api` shows no critical errors
- [ ] Database migrations completed: `npx prisma migrate deploy`
- [ ] Redis accessible: `redis-cli -a $REDIS_PASSWORD ping`
- [ ] Elasticsearch accessible: `curl http://localhost:9200/_health`

## Common Issues

| Issue | Solution |
|-------|----------|
| Port already in use | `sudo lsof -i :5432` → kill process |
| Disk full | Check `/data/wapsell` size: `du -sh /data/wapsell/*` |
| API won't start | Check logs: `docker logs wapsell-api` |
| DB connection error | Verify DATABASE_URL in api service logs |
| Redis auth error | Check REDIS_PASSWORD matches in .env |
| ES security error | Verify ELASTICSEARCH_PASSWORD in .env |
| Migrations fail | Check DB is healthy: `pg_isready` |

## Maintenance

```bash
# Weekly: backup database
docker compose -f docker-compose.wapsell.yml exec postgres \
  pg_dump -U wapsell_prod -d wapsell_prod | gzip > ~/backups/wapsell-$(date +%Y%m%d).sql.gz

# Monthly: check logs for errors
docker compose -f docker-compose.wapsell.yml logs api | grep ERROR | tail -20

# Quarterly: test recovery
# (On dev machine: restore from backup, test)
```

## File Structure

```
wapsell/
├── docker-compose.wapsell.yml      # Main composition
├── .env.wapsell                    # Runtime config (DO NOT COMMIT)
├── .env.wapsell.example            # Template (COMMIT)
├── apps/
│   ├── api/Dockerfile              # NestJS build
│   ├── tienda-online/Dockerfile    # React frontend
│   └── pos-admin/Dockerfile        # Admin panel
├── postgres/
│   ├── init-schemas.sql            # Schema initialization
│   ├── init-extensions.sql         # Extension setup
│   └── backup.sh                   # Backup script
├── nginx/
│   └── nginx-wapsell.conf          # Frontend reverse proxy
├── DOCKER-DEPLOY.md                # Full documentation
└── DOCKER-QUICK-REF.md            # This file
```

## Logs Location

- **API logs**: `/data/wapsell/logs/api/` (JSON format)
- **Nginx logs**: Docker volume (inside container)
- **Database logs**: Docker logs: `docker logs wapsell-postgres`
- **Redis logs**: Docker logs: `docker logs wapsell-redis`
- **ES logs**: Docker logs: `docker logs wapsell-elasticsearch`

## Network Info

- **Internal network**: `172.25.0.0/16` (bridge: `wapsell-network`)
- **Hostnames** (from inside container):
  - `postgres:5432`
  - `redis:6379`
  - `elasticsearch:9200`
  - `api:3000`
- **From host** (localhost only):
  - `127.0.0.1:5432` → postgres
  - `127.0.0.1:6379` → redis
  - `127.0.0.1:9200` → elasticsearch
  - `127.0.0.1:3000` → api
  - `127.0.0.1:3001` → tienda-online
  - `127.0.0.1:3002` → pos-admin

## Emergency Procedures

### Database Corruption

```bash
# 1. Stop API (to prevent further writes)
docker compose -f docker-compose.wapsell.yml stop api

# 2. Restore from backup
gunzip < backup-20261025.sql.gz | \
docker compose -f docker-compose.wapsell.yml exec -T postgres \
  psql -U wapsell_prod -d wapsell_prod

# 3. Run migrations
docker compose -f docker-compose.wapsell.yml start api
docker compose -f docker-compose.wapsell.yml exec api npx prisma migrate deploy
```

### Elasticsearch Index Corruption

```bash
# 1. Delete corrupted index
curl -u elastic:$ELASTICSEARCH_PASSWORD -X DELETE \
  http://localhost:9200/products

# 2. Trigger reindex from API
# (Implement endpoint or run manually)
curl -X POST http://localhost:3000/admin/reindex
```

### Out of Memory

```bash
# 1. Check which service is hungry
docker compose -f docker-compose.wapsell.yml stats

# 2. Clear Redis cache (temporary relief)
docker compose -f docker-compose.wapsell.yml exec redis \
  redis-cli -a $REDIS_PASSWORD FLUSHALL

# 3. Restart that service
docker compose -f docker-compose.wapsell.yml restart api

# 4. Permanent fix: scale vertically (bigger VPS)
```

---

**Last updated**: 2026-10-25  
**Docker version**: 20.10+  
**Compose version**: 2.0+
