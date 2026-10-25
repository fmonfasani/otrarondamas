# Docker Compose Deployment Guide for Wapsell

## Overview

This document describes the production Docker Compose stack for Wapsell — a multi-tenant SaaS platform for restaurant & retail management.

**Architecture**: Single-node, suitable for VPS 2-4 CPUs, 8-16GB RAM  
**Services**: PostgreSQL 16, Redis 7, Elasticsearch 8, NestJS API, React frontends  
**Networking**: Internal bridge network, reverse proxy (NGINX) terminates TLS  

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Configuration](#configuration)
5. [Deployment](#deployment)
6. [Operations](#operations)
7. [Backup & Recovery](#backup--recovery)
8. [Scaling](#scaling)
9. [Troubleshooting](#troubleshooting)

---

## Quick Start

### 1. Prepare Environment

```bash
cd /path/to/wapsell
cp .env.wapsell.example .env.wapsell

# Edit .env.wapsell with real values:
# POSTGRES_PASSWORD, JWT_SECRET, REDIS_PASSWORD, etc.
vim .env.wapsell
```

### 2. Create Data Directories

```bash
sudo mkdir -p /data/wapsell/{postgres,redis,elasticsearch,logs/api,assets}
sudo chown -R $(whoami) /data/wapsell
```

### 3. Start Stack

```bash
docker compose -f docker-compose.wapsell.yml up -d

# Verify all services healthy
docker compose -f docker-compose.wapsell.yml ps
```

### 4. Run Migrations

```bash
# Wait ~30s for database to be ready
docker compose -f docker-compose.wapsell.yml exec api npx prisma migrate deploy

# Seed initial data (companies, roles, etc.)
docker compose -f docker-compose.wapsell.yml exec api npx prisma db seed
```

### 5. Check Health

```bash
curl http://localhost:3000/health
curl http://localhost:3001/  # Tienda online
curl http://localhost:3002/  # Admin panel
```

---

## Architecture

### Network Topology

```
┌─────────────────────────────────────────────────────────────────┐
│                    NGINX Reverse Proxy (host)                   │
│                   HTTPS termination (443)                        │
│   Routes to: api.wapsell.com → :3000                            │
│              wapsell.com → :3001                                 │
│              admin.wapsell.com → :3002                           │
└─────────────────────────────────────────────────────────────────┘
                                │
                ┌───────────────┼───────────────┐
                ▼               ▼               ▼
         ┌──────────────┐ ┌──────────┐ ┌──────────────┐
         │  API:3000    │ │Tienda:3001│ Admin:3002   │
         │ (NestJS)     │ │ (React)   │ (React)      │
         └──────┬───────┘ └──────────┘ └──────────────┘
                │
      ┌─────────┼─────────┬──────────────┐
      ▼         ▼         ▼              ▼
   [PG:5432] [Redis]  [ES:9200]    [Assets/S3]
   [DB]       [Cache]  [Search]
```

### Service Descriptions

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| **postgres** | postgres:16-alpine | 5432 | OLTP database (orders, users, catalog) |
| **redis** | redis:7-alpine | 6379 | Cache, sessions, rate limiting, job queue |
| **elasticsearch** | elasticsearch:8.11.0 | 9200 | Full-text search (products, orders, users) |
| **api** | Custom (NestJS) | 3000 | Core API (P5-P16 features) |
| **tienda-online** | Custom (React+nginx) | 3001 | Public storefront (B2C) |
| **pos-admin** | Custom (React+nginx) | 3002 | Admin panel (B2B) |

### Volume Mapping

```
/data/wapsell/
├── postgres/          → wapsell_prod database files
├── redis/             → AOF persistence
├── elasticsearch/     → Inverted indices
├── logs/api/          → API JSON logs
└── assets/            → CDN files (S3 fallback)
```

---

## Prerequisites

### System Requirements

- **OS**: Linux (Ubuntu 20.04+ recommended)
- **CPU**: 2+ cores (4+ recommended)
- **RAM**: 8GB minimum (16GB recommended)
- **Disk**: 50GB+ SSD (for DB + ES indices)
- **Docker**: 20.10+ (`docker --version`)
- **Docker Compose**: 2.0+ (`docker compose version`)

### Docker Installation

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
sudo apt-get install docker-compose-plugin

# Verify
docker --version
docker compose version
```

### Network & Firewall

```bash
# Firewall: only 443 (HTTPS) public
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp  # SSH
sudo ufw enable

# NGINX on host binds to :443 → :3000, :3001, :3002 (localhost only)
# Docker internal networking (172.25.0.0/16) isolated
```

### SSL Certificates

```bash
# Using Let's Encrypt (certbot)
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot certonly --standalone -d api.wapsell.com -d wapsell.com -d admin.wapsell.com

# Auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

---

## Configuration

### Environment Variables (.env.wapsell)

**Critical (must generate):**
```bash
POSTGRES_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)
REDIS_PASSWORD=$(openssl rand -base64 24)
ELASTICSEARCH_PASSWORD=$(openssl rand -base64 32)
```

**Third-party integrations:**
- Google OAuth Client ID/Secret (from Google Cloud Console)
- Stripe Secret Key, Webhook Secret
- MercadoPago Access Token
- AWS S3 credentials
- Resend API key

See `.env.wapsell.example` for full template.

### Docker Compose Override (Optional)

Create `docker-compose.wapsell.override.yml` to customize without editing main file:

```yaml
# Example: expose postgres for local development
services:
  postgres:
    ports:
      - "5432:5432"  # Expose to host network

  elasticsearch:
    ports:
      - "9200:9200"  # Expose for Kibana, development
```

Then run:
```bash
docker compose -f docker-compose.wapsell.yml \
               -f docker-compose.wapsell.override.yml \
               up -d
```

---

## Deployment

### Initial Deployment

```bash
# 1. Pull latest code
git clone https://github.com/wapsell/wapsell.git /opt/wapsell
cd /opt/wapsell

# 2. Setup environment
cp .env.wapsell.example .env.wapsell
# ... edit .env.wapsell with real values ...

# 3. Create directories
sudo mkdir -p /data/wapsell/{postgres,redis,elasticsearch,logs/api,assets}
sudo chown $USER /data/wapsell -R

# 4. Build images (first time only)
docker compose -f docker-compose.wapsell.yml build

# 5. Start services
docker compose -f docker-compose.wapsell.yml up -d

# 6. Wait for services healthy (~30-60s)
docker compose -f docker-compose.wapsell.yml ps

# 7. Run migrations
docker compose -f docker-compose.wapsell.yml exec api \
  npx prisma migrate deploy

# 8. Seed initial data
docker compose -f docker-compose.wapsell.yml exec api \
  npx prisma db seed
```

### Updating Deployment

```bash
# 1. Pull changes
git pull origin main

# 2. Rebuild API & frontends only (DB/cache unchanged)
docker compose -f docker-compose.wapsell.yml build api tienda-online pos-admin

# 3. Restart services
docker compose -f docker-compose.wapsell.yml up -d

# 4. Run migrations if any
docker compose -f docker-compose.wapsell.yml exec api \
  npx prisma migrate deploy

# 5. Monitor logs
docker compose -f docker-compose.wapsell.yml logs -f api
```

### Blue-Green Deployment (Zero Downtime)

For critical updates:

```bash
# 1. Start second stack on different ports
docker compose -f docker-compose.wapsell.yml -p wapsell-blue up -d

# 2. Verify new stack healthy
docker compose -f docker-compose.wapsell.yml -p wapsell-blue ps

# 3. Switch NGINX upstream to blue
# (Edit /etc/nginx/sites-available/wapsell.com)
# upstream api_backend { server 127.0.0.1:3000-blue; }
sudo nginx -s reload

# 4. Stop old stack (green)
docker compose -f docker-compose.wapsell.yml -p wapsell-green down

# 5. Rename blue → default (for next cycle)
```

---

## Operations

### Service Health

```bash
# View all services
docker compose -f docker-compose.wapsell.yml ps

# View logs
docker compose -f docker-compose.wapsell.yml logs api
docker compose -f docker-compose.wapsell.yml logs -f api --tail 50

# View specific service logs
docker logs wapsell-api

# View resource usage
docker compose -f docker-compose.wapsell.yml stats
```

### Database Operations

```bash
# Connect to database
docker compose -f docker-compose.wapsell.yml exec postgres \
  psql -U wapsell_prod -d wapsell_prod

# Run query
docker compose -f docker-compose.wapsell.yml exec postgres \
  psql -U wapsell_prod -d wapsell_prod -c "SELECT COUNT(*) FROM users;"

# Check table sizes
docker compose -f docker-compose.wapsell.yml exec postgres \
  psql -U wapsell_prod -d wapsell_prod \
  -c "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) \
      FROM pg_tables \
      WHERE schemaname = 'public' \
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"
```

### Cache Operations

```bash
# Connect to Redis
docker compose -f docker-compose.wapsell.yml exec redis \
  redis-cli -a $REDIS_PASSWORD

# Check memory usage
docker compose -f docker-compose.wapsell.yml exec redis \
  redis-cli -a $REDIS_PASSWORD INFO memory

# Clear all cache (⚠️ careful!)
docker compose -f docker-compose.wapsell.yml exec redis \
  redis-cli -a $REDIS_PASSWORD FLUSHALL
```

### Search Index Operations

```bash
# Check cluster health
curl -u elastic:$ELASTICSEARCH_PASSWORD \
  http://localhost:9200/_cluster/health

# List indices
curl -u elastic:$ELASTICSEARCH_PASSWORD \
  http://localhost:9200/_cat/indices

# Reindex (if schema changed)
curl -u elastic:$ELASTICSEARCH_PASSWORD \
  -X POST http://localhost:9200/_reindex \
  -H "Content-Type: application/json" \
  -d '{"source": {"index": "products"}, "dest": {"index": "products-new"}}'
```

### Restart Services

```bash
# Restart one service
docker compose -f docker-compose.wapsell.yml restart api

# Restart all services
docker compose -f docker-compose.wapsell.yml restart

# Hard restart (stop + start)
docker compose -f docker-compose.wapsell.yml down
docker compose -f docker-compose.wapsell.yml up -d
```

---

## Backup & Recovery

### Database Backup

```bash
# Automated backup (daily via cron)
# Add to /etc/cron.daily/wapsell-backup:

#!/bin/bash
docker compose -f /opt/wapsell/docker-compose.wapsell.yml exec -T postgres \
  /usr/local/bin/backup.sh

# Manual full backup
docker compose -f docker-compose.wapsell.yml exec postgres \
  pg_dump -U wapsell_prod -d wapsell_prod | gzip > backup-$(date +%Y%m%d).sql.gz

# Full backup with schema & roles
docker compose -f docker-compose.wapsell.yml exec postgres \
  pg_dump -U wapsell_prod -d wapsell_prod --globals-only \
  | gzip > backup-roles-$(date +%Y%m%d).sql.gz
```

### Database Restore

```bash
# From gzipped backup
gunzip < backup-20261025.sql.gz | \
docker compose -f docker-compose.wapsell.yml exec -T postgres \
  psql -U wapsell_prod -d wapsell_prod

# Point-in-time recovery (from WAL archives)
# 1. Copy WAL archive to postgres container
# 2. Restore base backup + replay WALs up to timestamp
# (Requires `archive_mode=on`, documented separately)
```

### Volume Snapshots (LVM)

```bash
# If /data/wapsell is on LVM:
sudo lvcreate -L 10G -s -n wapsell_snapshot /dev/vg0/wapsell_data

# Mount snapshot for backup
sudo mount /dev/vg0/wapsell_snapshot /mnt/snapshot
tar czf /backup/wapsell-data-$(date +%Y%m%d).tar.gz /mnt/snapshot/
sudo umount /mnt/snapshot
sudo lvremove -f /dev/vg0/wapsell_snapshot
```

### Recovery Test

```bash
# Monthly: test recovery process
docker compose -f docker-compose.wapsell.yml down -v  # WARNING: destroys data
docker compose -f docker-compose.wapsell.yml up -d    # Restore from snapshot/backup
```

---

## Scaling

### Vertical Scaling (Larger Single Node)

**Current config tuned for 8GB RAM:**

To scale to 16GB:

```bash
# In .env.wapsell:
REDIS_MAX_MEMORY=4gb
ELASTICSEARCH_HEAP_SIZE=2g

# In docker-compose.wapsell.yml:
# api → increase NODE_OPTIONS --max-old-space-size to 2048

# Restart
docker compose -f docker-compose.wapsell.yml down
docker compose -f docker-compose.wapsell.yml up -d
```

### Horizontal Scaling (Not Recommended for Compose)

For multi-node production, consider:
- **Kubernetes** (Helm charts available)
- **Docker Swarm** (deprecated, not recommended)
- **Managed databases** (RDS, Cloud SQL) + Compose for stateless apps only

For now, keep single-node; scale vertically or upgrade VPS tier.

### Performance Tuning

```bash
# 1. Monitor slow queries
docker compose -f docker-compose.wapsell.yml exec postgres \
  psql -U wapsell_prod -d wapsell_prod \
  -c "CREATE EXTENSION IF NOT EXISTS pg_stat_statements;"

# 2. Find slow queries
docker compose -f docker-compose.wapsell.yml exec postgres \
  psql -U wapsell_prod -d wapsell_prod \
  -c "SELECT query, mean_exec_time FROM pg_stat_statements \
      WHERE mean_exec_time > 100 \
      ORDER BY mean_exec_time DESC LIMIT 10;"

# 3. Index optimization
# (Add indices in Prisma migrations, not ad-hoc)

# 4. Upgrade Elasticsearch heap (if search is slow)
# In .env.wapsell: ELASTICSEARCH_HEAP_SIZE=2g
```

---

## Troubleshooting

### Service Won't Start

```bash
# 1. Check logs
docker logs wapsell-postgres
docker logs wapsell-api

# 2. Health check details
docker inspect wapsell-postgres | grep -A 10 Healthcheck

# 3. Common issues:
# - Port already in use: `sudo lsof -i :5432`
# - Disk full: `df -h /data/wapsell`
# - Permissions: `ls -la /data/wapsell`
# - Missing .env: `ls -la .env.wapsell`
```

### Database Connection Errors

```bash
# Test connectivity
docker compose -f docker-compose.wapsell.yml exec api \
  nc -zv postgres 5432

# Check DATABASE_URL env var
docker compose -f docker-compose.wapsell.yml exec api \
  env | grep DATABASE_URL

# Test with psql directly
docker compose -f docker-compose.wapsell.yml exec postgres \
  psql -U wapsell_prod -d wapsell_prod -c "SELECT 1;"
```

### Redis Connection Errors

```bash
# Test connectivity
docker compose -f docker-compose.wapsell.yml exec api \
  nc -zv redis 6379

# Check REDIS_PASSWORD
docker compose -f docker-compose.wapsell.yml exec redis \
  redis-cli -a $REDIS_PASSWORD ping

# Clear expired keys (if memory full)
docker compose -f docker-compose.wapsell.yml exec redis \
  redis-cli -a $REDIS_PASSWORD MEMORY DOCTOR
```

### Elasticsearch Connection Errors

```bash
# Test connectivity
docker compose -f docker-compose.wapsell.yml exec api \
  curl -u elastic:$ELASTICSEARCH_PASSWORD https://elasticsearch:9200/_health

# Check logs
docker logs waspell-elasticsearch | tail -50

# Reset security (if password forgotten)
docker compose -f docker-compose.wapsell.yml exec elasticsearch \
  bin/elasticsearch-reset-password -u elastic -i
```

### API Crashes After Boot

```bash
# 1. Check memory
docker stats wapsell-api

# 2. Check logs with timestamps
docker logs wapsell-api --timestamps | tail -100

# 3. Increase memory
docker compose -f docker-compose.wapsell.yml down
# In docker-compose.wapsell.yml: api → NODE_OPTIONS: --max-old-space-size=2048
docker compose -f docker-compose.wapsell.yml up -d

# 4. Check for missing migrations
docker compose -f docker-compose.wapsell.yml exec api \
  npx prisma migrate status
```

### High Latency / Slowness

```bash
# 1. Check resource usage
docker compose -f docker-compose.wapsell.yml stats

# 2. Check database locks
docker compose -f docker-compose.wapsell.yml exec postgres \
  psql -U wapsell_prod -d wapsell_prod \
  -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"

# 3. Check slow queries
docker compose -f docker-compose.wapsell.yml logs api | grep "duration:"

# 4. Check Redis memory
docker compose -f docker-compose.wapsell.yml exec redis \
  redis-cli -a $REDIS_PASSWORD INFO memory

# 5. Check Elasticsearch queue
curl -u elastic:$ELASTICSEARCH_PASSWORD \
  http://localhost:9200/_tasks?detailed=true
```

---

## Appendix: Useful Commands

```bash
# Shortcut in ~/.bashrc or ~/.zshrc:
alias docker-wapsell='docker compose -f /opt/wapsell/docker-compose.wapsell.yml'

docker-wapsell ps                # Service status
docker-wapsell logs -f api       # Stream API logs
docker-wapsell exec api bash     # SSH into API
docker-wapsell down              # Stop all (keep volumes)
docker-wapsell down -v           # Stop all + remove volumes (DANGEROUS)
```

---

## References

- **Docker Documentation**: https://docs.docker.com/
- **PostgreSQL Tuning**: https://wiki.postgresql.org/wiki/Performance_Optimization
- **Redis Persistence**: https://redis.io/topics/persistence
- **Elasticsearch Guide**: https://www.elastic.co/guide/en/elasticsearch/reference/current/
- **NestJS Deployment**: https://docs.nestjs.com/deployment/

---

## Support

For issues or questions:

1. Check logs: `docker compose logs service-name`
2. Check health: `docker compose ps`
3. Review `.env.wapsell` for missing/invalid values
4. Test connectivity between services
5. Create GitHub issue with logs + `.env.wapsell` redacted

