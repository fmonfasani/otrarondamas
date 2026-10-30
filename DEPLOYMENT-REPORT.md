# Wapsell Frontend Deployment Report
## Production Deployment to Hetzner VPS (89.167.96.239)

**Date:** 2026-10-29  
**Deployment Agent:** M4 (Production Deployment)  
**Target:** Hetzner VPS (89.167.96.239)  
**Project:** Wapsell Consolidated Platform  

---

## Pre-Deployment Checklist

### Environment Verification
- [x] SSH key configured: `~/.ssh/id_ed25519` exists (399 bytes, private key)
- [x] Git branch: `refactor/opcion-6` (18 commits ahead of origin/main)
- [x] Git HEAD: `0ee8ffd099eddb1815e2a22ea8c1f1ad108f1a59` (feat(tienda): Tienda components)
- [x] Docker-compose.yml exists: 4107 bytes, valid YAML
- [x] Environment files:
  - `.env.production` configured with placeholders for secrets
  - `.env.prod.example` available for reference
  - All required env vars documented

### Docker Configuration
Verified docker-compose.yml contains:
1. **postgres** service - PostgreSQL 16 Alpine, port 5432
2. **api** service - NestJS API, port 8600, Dockerfile.api
3. **wapsell-remix** service - Remix frontend, port 5173, Dockerfile.remix
4. **pos-admin** service - POS admin interface, port 3030
5. **tienda-online** service - Tienda storefront, port 3040

### Dockerfile Verification
- [x] `Dockerfile.remix` - Multi-stage build:
  - Builder stage: Node 20 Alpine, npm install, remix build
  - Runtime stage: Node 20 Alpine, non-root user (nodejs:1001), dumb-init, healthcheck
  - Exposed port: 5173
  - Start command: `npm start --workspace=@otrarondamas/wapsell-remix`

- [x] `Dockerfile.api` - NestJS API build
- [x] `Dockerfile.pos-admin` - POS admin build
- [x] `Dockerfile.tienda-online` - Tienda online build

### Build Configuration
- [x] Root package.json exists
- [x] wapsell-remix workspace configured
  - Build script: `remix build`
  - Start script: `remix-serve ./build/index.js`
  - Workspace: `@otrarondamas/wapsell-remix`

### Code Status
- [x] No critical uncommitted changes affecting deployment
- [x] Worktree submodules present (e2e-tests, p5-ux, p6-cart)
- [x] 11 untracked files (documentation, examples)

---

## Deployment Architecture

### Production Environment Variables
**From `.env.production`:**
- `NODE_ENV=production`
- `DATABASE_URL=postgresql://wapsell:${DB_PASSWORD}@postgres:5432/otrarondamas`
- `API_PORT=8600`
- `VITE_API_URL=https://api.wapsell.com` (production domain)
- `SESSION_SECRET=${SESSION_SECRET}` (32-char random required)
- `JWT_SECRET=${JWT_SECRET}` (production value required)
- `CORS_ORIGINS=https://wapsell.com,https://www.wapsell.com,https://pos.wapsell.com,https://tienda.wapsell.com`

### Docker Network
- Bridge network: `wapsell-network`
- All services connected for inter-container communication
- API accessible as `http://api:8600` from other containers
- Database accessible as `postgresql://wapsell:pass@postgres:5432`

### Health Checks
Each service has configured health checks:
- **wapsell-remix:** `curl -f http://localhost:5173/health`
- **api:** `curl -f http://localhost:8600/api/health`
- **pos-admin:** `curl -f http://localhost:3030/`
- **tienda-online:** `curl -f http://localhost:3040/`

---

## Deployment Steps

### Phase 1: SSH Connection & Repository Setup
```bash
# Connect to VPS
ssh root@89.167.96.239

# Navigate to deployment directory
cd /opt/wapsell/

# Verify git state
git status --short --branch
git log --oneline -3
```

### Phase 2: Code Update
```bash
# Option A: Deploy from refactor/opcion-6 (latest development)
git fetch origin
git checkout refactor/opcion-6
git pull origin refactor/opcion-6

# Option B: Deploy from main (requires merge first)
git checkout main
git pull origin main
```

**Decision Required:** Determine which branch should be deployed:
- `refactor/opcion-6`: Latest feature branch (18 commits ahead)
- `main`: Stable release branch (currently at feat(phase2): dashboard)

### Phase 3: Environment Setup
```bash
# Backup existing .env
cp .env.production .env.production.backup.$(date +%Y%m%d-%H%M%S)

# Update production secrets (manual step - secrets not in repo)
# Required secrets to provision:
# - DB_PASSWORD (PostgreSQL password)
# - JWT_SECRET (JWT signing key, 32+ chars)
# - SESSION_SECRET (Remix session secret, 32+ chars)
# - TWILIO_ACCOUNT_SID (WhatsApp integration)
# - TWILIO_AUTH_TOKEN
# - TWILIO_PHONE_NUMBER
# - MERCADOPAGO_API_KEY (Payment processing)
# - MERCADOPAGO_ACCESS_TOKEN
# - SMTP_* (Email configuration)
# - AWS_* (S3 storage - if applicable)
# - SENTRY_DSN (Error tracking - optional)

export NODE_ENV=production
```

### Phase 4: Docker Build
```bash
# Build all services (or specific services)
docker-compose build wapsell-remix
docker-compose build api
docker-compose build postgres  # if needed
docker-compose build pos-admin
docker-compose build tienda-online

# Check build success
docker images | grep wapsell
```

### Phase 5: Service Deployment
```bash
# Stop existing services
docker-compose down

# Start all services in background
docker-compose up -d

# Verify services are running
docker-compose ps
```

Expected output:
```
NAME                    STATUS              PORTS
wapsell-postgres        Up (healthy)        5432->5432
wapsell-api             Up (healthy)        8600->8600
wapsell-remix           Up (healthy)        3051->5173
wapsell-pos-admin       Up (healthy)        3030->3030
wapsell-tienda-online   Up (healthy)        3040->3040
```

### Phase 6: Health Checks
```bash
# Frontend health check
curl http://localhost:5173/health
# Expected: 200 OK

# API health check
curl http://localhost:8600/api/health
# Expected: 200 OK with health status JSON

# Database connectivity test
docker-compose exec api curl http://localhost:8600/api/health
# Should show database connection OK
```

### Phase 7: Smoke Tests
```bash
# Test landing page (Spanish)
curl -s http://localhost:5173/es/ | head -20

# Test login page
curl -s http://localhost:5173/es/auth/login | head -20

# Test API endpoints
curl http://localhost:8600/api/health
curl http://localhost:8600/api/properties  # example endpoint
```

### Phase 8: Log Verification
```bash
# Check frontend logs
docker-compose logs wapsell-remix --tail 50

# Check API logs
docker-compose logs api --tail 50

# Follow logs in real-time
docker-compose logs -f wapsell-remix
docker-compose logs -f api

# Check for errors
docker-compose logs | grep -i error
```

### Phase 9: SSL/HTTPS Setup (Optional)
If Nginx reverse proxy is configured:
```bash
# Verify Nginx container (if exists)
docker-compose ps | grep nginx

# Test HTTPS endpoint
curl -I https://wapsell.com/
curl -I https://pos.wapsell.com/
curl -I https://tienda.wapsell.com/

# Verify SSL certificate
openssl s_client -connect wapsell.com:443
```

---

## Rollback Plan

If deployment fails or requires rollback:

### Quick Rollback (Last 1 commit)
```bash
# Stop services
docker-compose down

# Revert to previous commit
git reset --hard HEAD~1

# Rebuild and restart
docker-compose build wapsell-remix
docker-compose up -d

# Verify
docker-compose ps
```

### Full Rollback (to Last Known Good State)
```bash
# If deployment was from refactor/opcion-6
docker-compose down
git checkout main
git pull origin main
docker-compose build
docker-compose up -d
```

### Database Rollback (if schema changes failed)
```bash
# Do NOT restart database without warning
# Preserve postgres_data volume
# Manual database restoration may be required

docker-compose logs postgres
# Check migration status
docker-compose exec postgres pg_dump -U wapsell otrarondamas > /opt/backups/pre-deployment.sql
```

---

## Post-Deployment Validation

### Immediate Validation (0-5 minutes)
- [ ] All containers healthy: `docker-compose ps`
- [ ] No critical errors: `docker-compose logs | grep -i error`
- [ ] Frontend accessible: `curl http://localhost:5173/`
- [ ] API responding: `curl http://localhost:8600/api/health`

### Functional Testing (5-30 minutes)
- [ ] Landing page loads (ES/EN locales)
- [ ] Login flow works
- [ ] Authentication tokens issued
- [ ] API routes respond to authenticated requests
- [ ] Database queries execute correctly
- [ ] WebSocket connections establish (if applicable)

### Production Verification (30+ minutes)
- [ ] SSL certificate valid (if HTTPS)
- [ ] All domains accessible
- [ ] Error logging working (Sentry/Datadog)
- [ ] Performance metrics normal
- [ ] No increased latency
- [ ] Database backups running

---

## Deployment Configuration Details

### API Service Configuration
- **Port:** 8600 (internal container), exposed on Docker network
- **Health endpoint:** `GET /api/health`
- **Database:** PostgreSQL 16 Alpine on postgres:5432
- **Healthcheck:** curl to `/api/health` every 10s, 5s timeout, 5 retries
- **Restart policy:** unless-stopped (auto-restart on failure)

### Frontend Service (wapsell-remix) Configuration
- **Port:** 5173 (internal container), mapped to 3051 on host (or reverse proxy)
- **Build:** Remix full-stack framework
- **Runtime:** Node.js 20 Alpine with dumb-init
- **User:** nodejs (non-root, uid 1001)
- **Health endpoint:** GET /health (implicit Remix status)
- **Session management:** Remix cookie-based sessions with SECRET_SESSION
- **API communication:** Internal Docker network to api:8600

### POS Admin & Tienda Online
- **POS Admin:** Port 3030, React-based admin interface
- **Tienda Online:** Port 3040, Customer-facing storefront
- **API Integration:** Both use REACT_APP_API_URL=http://api:8600 internally

---

## Monitoring & Logging

### Log Locations
- **Docker logs:** `docker-compose logs [service-name]`
- **Container logs:** `/var/lib/docker/containers/[container-id]/[container-id]-json.log`
- **Configured:** JSON-file driver, max-size 10m, max-file 3 (rotation)

### Critical Log Messages to Monitor
```
API startup: "NestApplication initialized"
Frontend startup: "[vite] v5.x.x build"
Database ready: "pg_isready: accepting connections"
Errors: grep "ERROR\|error\|fatal\|FATAL"
```

### Services to Monitor
1. **wapsell-remix** - Frontend availability & response time
2. **api** - API health & database connectivity
3. **postgres** - Database performance & disk usage
4. **docker-compose** - Container restart frequency

---

## Security Considerations

### Secrets Management
- **Status:** All secrets use environment variable placeholders
- **Location:** .env.production (not in git, must be provisioned)
- **Required secrets:** DB_PASSWORD, JWT_SECRET, SESSION_SECRET, API keys
- **Do NOT:** Commit secrets to repository

### Network Security
- **Internal network:** wapsell-network (bridge driver)
- **Inter-service communication:** api:8600 (internal only)
- **External access:** Requires reverse proxy (Nginx/HAProxy)
- **CORS:** Configured for production domains

### Container Security
- **Non-root user:** nodejs (uid 1001) in frontend and api
- **Signal handling:** dumb-init for graceful shutdowns
- **Resource limits:** Not yet configured (recommend setting in production)

---

## Performance Optimization (Post-Deployment)

### Recommended Improvements
1. **Caching:** Enable Redis for session store & query cache
2. **CDN:** Deploy static assets to CDN (S3 + CloudFront)
3. **Database:** Add query indexing & connection pooling (pg-boss)
4. **Compression:** Enable gzip in Nginx reverse proxy
5. **Monitoring:** Set up Prometheus/Grafana for metrics

### Resource Requirements
- **CPU:** 2+ cores recommended
- **Memory:** 4GB+ recommended (postgres 1GB, api 512MB, frontend 512MB)
- **Disk:** 20GB+ for postgres_data volume
- **Network:** 100 Mbps+ connection

---

## Success Criteria

### Deployment Success Indicators
- ✅ All 5 containers running and healthy
- ✅ No "error" messages in logs during first 5 minutes
- ✅ Frontend responds on port 5173
- ✅ API responds on port 8600
- ✅ Database healthcheck passes
- ✅ All inter-service communication working
- ✅ Static assets served correctly
- ✅ Authentication flows functional

### Failure Indicators (Require Rollback)
- ❌ Any container in "Exited" or "Unhealthy" state
- ❌ Critical errors in logs (database connection, build failures)
- ❌ API responds with 5xx errors
- ❌ Frontend returns 404 for HTML pages
- ❌ Database migrations fail
- ❌ Memory/CPU exhaustion

---

## Decision Points & Approvals Required

### Pre-Deployment Decision
**Question:** Which branch to deploy?
- **Option A:** refactor/opcion-6 (18 commits ahead, latest features)
- **Option B:** main (stable, fewer untested commits)
- **Recommendation:** Requires code review and approval
- **Timeline:** Merge to main OR deploy refactor/opcion-6 as-is

### Secrets Provisioning
**Action Required:** Create/provide production secrets:
- Database password (random 32+ chars)
- JWT_SECRET (random 32+ chars)
- SESSION_SECRET (random 32+ chars)
- Twilio credentials (for WhatsApp)
- MercadoPago API keys
- SMTP credentials (email sending)
- AWS credentials (if using S3)

### SSL Certificate
**Decision:** Is Nginx reverse proxy configured with SSL?
- If YES: Verify certificate is valid and domains point to VPS
- If NO: Proceed with HTTP-only for now, add SSL later

---

## Contacts & Escalation

**Deployment Lead:** Agent M4 (Claude Haiku 4.5)  
**Code Owner:** Federico Monfasani (fmonfasani@gmail.com)  
**Emergency Contact:** [To be defined]  
**Slack Channel:** #wapsell-deployments (recommended)

---

## Appendix: Useful Commands

### Docker Management
```bash
# View all containers
docker-compose ps -a

# Inspect specific service
docker-compose logs -f wapsell-remix --tail 100

# Execute command in container
docker-compose exec api npm run typeorm migration:run

# Stop/start individual service
docker-compose stop wapsell-remix
docker-compose start wapsell-remix

# Remove volumes (WARNING: deletes data)
docker-compose down -v

# Rebuild specific service
docker-compose build --no-cache wapsell-remix
```

### Database Management
```bash
# Access PostgreSQL shell
docker-compose exec postgres psql -U wapsell -d otrarondamas

# Backup database
docker-compose exec postgres pg_dump -U wapsell otrarondamas > backup.sql

# Restore database
docker-compose exec -T postgres psql -U wapsell -d otrarondamas < backup.sql

# List tables
docker-compose exec postgres psql -U wapsell -d otrarondamas -c "\dt"
```

### Git Management
```bash
# View deployment history
git log --oneline -20

# Compare main vs current branch
git log --oneline main..HEAD

# Show what changed in last deploy
git diff main HEAD -- apps/wapsell-remix/

# Create annotated tag for release
git tag -a v1.0.0-prod -m "Production deployment 2026-10-29"
git push origin v1.0.0-prod
```

---

## Document Status

**Created:** 2026-10-29  
**Last Updated:** 2026-10-29  
**Status:** Pre-Deployment Checklist Complete  
**Next Action:** Execute Phase 1 (SSH connection) with approval  

---

*Generated by Agent M4: Production Deployment to Hetzner VPS*  
*This document should be reviewed and approved before execution.*
