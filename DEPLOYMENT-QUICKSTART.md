# Wapsell Production Deployment - Quick Start Guide

**Target:** Hetzner VPS (89.167.96.239)  
**Date:** 2026-10-29  
**Duration:** ~30-45 minutes  

---

## Prerequisites

- [ ] SSH access to 89.167.96.239 with key auth (id_ed25519)
- [ ] Docker and docker-compose installed on VPS
- [ ] Git repository cloned at `/opt/wapsell/` on VPS
- [ ] All production secrets prepared (see below)

---

## Required Production Secrets

Before starting deployment, ensure these are available:

```bash
# Database
DB_PASSWORD=<generate: openssl rand -base64 32>

# JWT Authentication
JWT_SECRET=<generate: openssl rand -base64 32>

# Session Management  
SESSION_SECRET=<generate: openssl rand -hex 16>

# Third-party APIs
TWILIO_ACCOUNT_SID=<from Twilio console>
TWILIO_AUTH_TOKEN=<from Twilio console>
TWILIO_PHONE_NUMBER=<WhatsApp number from Twilio>

MERCADOPAGO_API_KEY=<from MercadoPago dashboard>
MERCADOPAGO_ACCESS_TOKEN=<from MercadoPago dashboard>

# Email (optional)
SMTP_HOST=<mail server>
SMTP_PORT=<usually 587 or 465>
SMTP_USER=<email account>
SMTP_PASSWORD=<email password>
SMTP_FROM=<sender address>

# AWS S3 (if needed)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<from AWS IAM>
AWS_SECRET_ACCESS_KEY=<from AWS IAM>
AWS_S3_BUCKET=<bucket name>

# Error tracking (optional)
SENTRY_DSN=<from Sentry project>
```

---

## Quick Deployment (5 minutes)

### 1. Connect to VPS
```bash
ssh root@89.167.96.239
cd /opt/wapsell/
```

### 2. Update Environment
```bash
# Backup current environment
cp .env.production .env.production.backup

# Update with production secrets
nano .env.production
# OR
cat > .env.production << 'EOF'
DB_PASSWORD=<your-password>
JWT_SECRET=<your-secret>
SESSION_SECRET=<your-session-secret>
NODE_ENV=production
TWILIO_ACCOUNT_SID=<...>
# ... rest of vars
EOF
```

### 3. Deploy Using Automated Script
```bash
# Make script executable
chmod +x scripts/deploy-to-production.sh

# Run deployment
./scripts/deploy-to-production.sh refactor/opcion-6
# OR for main branch:
./scripts/deploy-to-production.sh main
```

**Expected output:**
```
✓ Git working tree clean
✓ docker-compose.yml found
✓ Frontend built successfully
✓ API built successfully
✓ Services started
✓ Frontend is healthy
✓ API is healthy
✓ DEPLOYMENT SUCCESSFUL!
```

### 4. Validate Deployment
```bash
# Run validation script
chmod +x scripts/validate-deployment.sh
./scripts/validate-deployment.sh

# Expected: All checks PASS
```

---

## Manual Deployment (if automated script fails)

### Step 1: SSH & Navigate
```bash
ssh root@89.167.96.239
cd /opt/wapsell
git status
```

### Step 2: Update Code
```bash
git fetch origin
git checkout refactor/opcion-6
git pull origin refactor/opcion-6
```

### Step 3: Build Services
```bash
docker-compose build wapsell-remix
docker-compose build api
```

### Step 4: Deploy
```bash
docker-compose down
docker-compose up -d
```

### Step 5: Verify
```bash
# Wait 10 seconds for services to start
sleep 10

# Check status
docker-compose ps

# Test frontend
curl http://localhost:5173/health

# Test API
curl http://localhost:8600/api/health

# View logs
docker-compose logs -f wapsell-remix
docker-compose logs -f api
```

---

## Health Check URLs

Once deployed, services are available at:

| Service | URL | Expected |
|---------|-----|----------|
| Frontend | http://localhost:5173/ | HTML page |
| Frontend Health | http://localhost:5173/health | 200 OK |
| API | http://localhost:8600/api/health | JSON response |
| POS Admin | http://localhost:3030/ | React app |
| Tienda | http://localhost:3040/ | React app |

If using Nginx reverse proxy with SSL:
- https://wapsell.com/ (frontend)
- https://pos.wapsell.com/ (POS admin)
- https://tienda.wapsell.com/ (customer store)
- https://api.wapsell.com/ (API proxy)

---

## Troubleshooting

### Container not starting
```bash
# View logs
docker-compose logs <service-name>

# Restart specific service
docker-compose restart <service-name>

# Rebuild from scratch
docker-compose build --no-cache <service-name>
```

### Port already in use
```bash
# Find process on port
sudo lsof -i :5173

# Kill process
kill -9 <PID>

# Or change port in docker-compose.yml and redeploy
```

### Database connection failed
```bash
# Check database is running
docker-compose ps postgres

# Test connection
docker-compose exec postgres psql -U wapsell -d otrarondamas -c "SELECT 1"

# Check DATABASE_URL is correct
docker-compose exec api env | grep DATABASE_URL
```

### API not responding
```bash
# Check API logs
docker-compose logs api --tail 100

# Verify API is listening
docker-compose exec api curl http://localhost:8600/api/health

# Check environment variables
docker-compose exec api env | grep -E "JWT_SECRET|API_PORT"
```

### Frontend blank/errors
```bash
# Check frontend logs
docker-compose logs wapsell-remix --tail 100

# Check API connectivity from frontend
docker-compose exec wapsell-remix curl http://api:8600/api/health

# Verify VITE_API_URL is set correctly
docker-compose exec wapsell-remix env | grep VITE_API_URL
```

---

## Rollback Procedure

If deployment fails, rollback to previous version:

```bash
# Stop services
docker-compose down

# Revert code
git reset --hard HEAD~1

# Rebuild
docker-compose build wapsell-remix api

# Restart
docker-compose up -d

# Verify
docker-compose ps
./scripts/validate-deployment.sh
```

---

## Post-Deployment Checklist

- [ ] All containers healthy: `docker-compose ps`
- [ ] Frontend accessible: `curl http://localhost:5173/`
- [ ] API responsive: `curl http://localhost:8600/api/health`
- [ ] No errors in logs: `docker-compose logs | grep -i error`
- [ ] Database connected: `docker-compose exec postgres psql -U wapsell -d otrarondamas -c "SELECT 1"`
- [ ] User can login: Test in browser
- [ ] Orders can be created: End-to-end test
- [ ] Payment integration working: Test payment flow

---

## Monitoring

### View Real-time Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f wapsell-remix
docker-compose logs -f api
```

### Check Container Health
```bash
# Get detailed status
docker-compose ps

# Inspect specific container
docker inspect wapsell-remix

# View container metrics
docker stats wapsell-remix
```

### Database Backups
```bash
# Create backup
docker-compose exec postgres pg_dump -U wapsell -d otrarondamas > backup-$(date +%Y%m%d).sql

# Restore from backup
docker-compose exec -T postgres psql -U wapsell -d otrarondamas < backup-20261029.sql
```

---

## Support & Escalation

- **Logs:** `/var/log/wapsell/deployment-*.log`
- **Backups:** `/opt/backups/`
- **Code Owner:** Federico Monfasani (fmonfasani@gmail.com)

---

## Key Files

| File | Purpose |
|------|---------|
| `DEPLOYMENT-REPORT.md` | Comprehensive deployment documentation |
| `scripts/deploy-to-production.sh` | Automated deployment script |
| `scripts/validate-deployment.sh` | Deployment validation checks |
| `docker-compose.yml` | Service configuration |
| `.env.production` | Production environment variables |
| `Dockerfile.remix` | Frontend build configuration |
| `Dockerfile.api` | API build configuration |

---

## Timeline

- **Preparation:** 5 minutes (gather secrets, prepare environment)
- **Deployment:** 10-15 minutes (build images, start services)
- **Validation:** 5 minutes (health checks, smoke tests)
- **Verification:** 10 minutes (manual testing, logs review)
- **Total:** ~30-45 minutes

---

## Success Criteria

✅ Deployment is successful when:
1. All 5 containers running and healthy
2. Frontend accessible on port 5173
3. API responding on port 8600
4. Database connected and operational
5. No critical errors in logs
6. Health checks passing (100%)
7. Pages loading without JavaScript errors
8. Authentication flows working

---

**Deployment prepared by Agent M4**  
**Date: 2026-10-29**  
**Status: Ready for deployment**
