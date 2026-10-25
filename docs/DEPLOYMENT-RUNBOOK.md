# Deployment Runbook

Operational procedures for deploying Wapsell to staging and production environments.

## Quick Start

### Deploy to Staging

```bash
# Automatic: Merge code to `develop` branch
# The GitHub Actions workflow triggers automatically

# OR Manual trigger:
gh workflow run deploy-staging.yml -R OWNER/REPO

# Monitor:
gh run watch -R OWNER/REPO
```

### Deploy to Production

```bash
# Manual workflow with approval:
gh workflow run deploy-production.yml \
  -f version=main \
  -R OWNER/REPO

# Monitor deployment:
gh run watch -R OWNER/REPO

# View logs:
gh run view <run-id> --log -R OWNER/REPO
```

## Deployment Workflows

### 1. Staging Deployment

**Trigger**: Automatic on push to `develop` branch

**Steps**:
1. Checkout code from develop
2. Install dependencies (npm ci)
3. Generate Prisma client
4. Build TypeScript
5. Connect to staging VPS via SSH
6. Backup current state
7. Pull latest code
8. Pull Docker images
9. Start services with docker-compose up -d
10. Wait for services (10 seconds)
11. Run database migrations
12. Health check (API /health endpoint)
13. Slack notification

**Expected Duration**: 5-10 minutes

**Success Indicators**:
- ✅ Workflow job marked as successful
- ✅ Slack notification in #wapsell-staging
- ✅ API responding at staging endpoint
- ✅ Database migrations applied

**Failure Handling**: Auto-rollback if health check fails

### 2. Production Deployment

**Trigger**: Manual workflow dispatch with version input

**Steps**:
1. Pre-deployment validation:
   - Run full test suite
   - Verify build compiles
   - Validate Prisma migrations
2. Connect to production VPS via SSH
3. Create pre-deployment database backup
4. Verify backup file
5. Git checkout specified version/tag
6. Pull latest Docker images
7. Graceful shutdown (30s timeout)
8. Start new services
9. Wait for services (15 seconds)
10. Run database migrations with rollback if fails
11. Health check with 5 retry attempts
12. Verify frontend accessibility
13. Verify database connectivity
14. Slack notification

**Expected Duration**: 15-25 minutes

**Success Indicators**:
- ✅ Workflow job marked as successful
- ✅ "Production Deployment Successful" in #wapsell-deployments
- ✅ API accessible at https://api.wapsell.com/health
- ✅ Frontend accessible at https://wapsell.com
- ✅ Database accepting connections

**Failure Handling**: Automatic rollback to previous commit with database restore

### 3. Backup Workflow

**Trigger**: 
- Automatic daily at 2:00 AM UTC
- Manual via workflow_dispatch

**Steps**:
1. Connect to production VPS
2. Create full database dump with pg_dump
3. Compress with gzip (compression level 9)
4. Verify backup file integrity
5. Backup PostgreSQL schema
6. Apply retention policy (keep 30 days)
7. Slack notification

**Expected Duration**: 5-15 minutes

**Success Indicators**:
- ✅ Backup file exists and is not empty
- ✅ Backup file passes gzip integrity check
- ✅ Backup file size is reasonable (>100MB for production)

## Pre-Deployment Checklist

See [DEPLOYMENT-CHECKLIST.md](DEPLOYMENT-CHECKLIST.md) for comprehensive checklist.

Quick version:
- [ ] Tests passing locally
- [ ] Build succeeds
- [ ] Code reviewed
- [ ] Migrations tested in staging
- [ ] Backup taken
- [ ] Team notified

## Production Deployment Process

### Step 1: Prepare for Deployment

```bash
# 1. Ensure main branch has latest changes
git checkout main
git pull origin main

# 2. Create deployment tag (optional but recommended)
git tag -a v1.2.3 -m "Release v1.2.3"
git push origin v1.2.3

# 3. Run tests locally
npm test
npm run test:integration

# 4. Verify build
npm run build

# 5. Verify migrations are safe
npx prisma migrate status
```

### Step 2: Trigger Deployment

```bash
# Via GitHub CLI
gh workflow run deploy-production.yml \
  -f version=v1.2.3 \
  -R fmonfasani/wapsell

# Via GitHub Web UI:
# 1. Go to Actions tab
# 2. Select "Deploy to Production"
# 3. Click "Run workflow"
# 4. Enter version (tag or commit SHA)
# 5. Click "Run workflow"
```

### Step 3: Monitor Deployment

```bash
# Watch deployment in real-time
gh run watch -R fmonfasani/wapsell

# Or view logs in GitHub UI:
# Actions tab → Select deployment run → View logs
```

### Step 4: Post-Deployment Verification

```bash
# Run monitoring script
./scripts/monitoring.sh production

# Check critical endpoints
curl https://api.wapsell.com/health
curl https://wapsell.com/

# Monitor logs (SSH into production)
ssh root@prod-host
cd /opt/wapsell
docker logs wapsell-api --tail 50
docker logs wapsell-web --tail 50
```

## Rollback Procedures

### Automatic Rollback

Automatic rollback triggers if:
- Database migration fails
- Health check fails (5 attempts)
- API connectivity check fails

Automatic rollback does:
1. Stop services
2. Restore previous git commit
3. Restore database from backup
4. Start old services
5. Send Slack notification

### Manual Rollback

If automatic rollback doesn't work or you need emergency rollback:

```bash
# SSH into production
ssh root@prod-host

# Navigate to deployment directory
cd /opt/wapsell

# Stop services
docker-compose down

# Go back to previous commit
git log --oneline -5  # See recent commits
git checkout <previous-commit-sha>

# Start old services
docker-compose up -d

# List available backups
ls -lh /backups/production/backup-*.sql.gz | tail -5

# Restore database from most recent backup
LATEST_BACKUP=$(ls -t /backups/production/backup-*.sql.gz | head -1)
gunzip -c "${LATEST_BACKUP}" | docker-compose exec -T postgres \
  psql -U wapsell_user -d wapsell_prod

# Verify services are running
docker-compose ps
curl https://api.wapsell.com/health

# Notify team
# Post message in #wapsell-deployments explaining rollback
```

## Emergency Procedures

### API is Unresponsive

```bash
# SSH into production
ssh root@prod-host
cd /opt/wapsell

# Check if containers are running
docker-compose ps

# If containers crashed, try restart
docker-compose restart api

# If still failing, check logs
docker logs wapsell-api | tail -100

# Check database connectivity
docker-compose exec -T postgres psql -U wapsell_user -d wapsell_prod -c "SELECT 1;"

# If database is down, escalate to database team
```

### Database Connection Errors

```bash
# SSH into production
ssh root@prod-host
cd /opt/wapsell

# Check database container
docker-compose ps postgres

# Check database logs
docker logs wapsell-postgres

# Check disk space (database might be full)
df -h

# Connect to database and check
docker-compose exec postgres psql -U wapsell_user -d wapsell_prod -c "\du"

# If data corruption suspected, STOP and escalate to DBA
```

### Memory/Disk Exhaustion

```bash
# SSH into production
ssh root@prod-host

# Check disk usage
df -h
du -sh /opt/wapsell*
du -sh /backups

# Check memory
free -h
top -b -n 1 | head -20

# If low disk space:
# 1. Remove old Docker images: docker image prune
# 2. Remove old backups: rm /backups/production/backup-*.sql.gz (keep recent)
# 3. Clear Docker buildkit cache: docker buildx prune

# If memory pressure:
# 1. Restart services to clear caches
# 2. Increase VPS memory if persistent
```

### Complete Service Failure

```bash
# SSH into production
ssh root@prod-host
cd /opt/wapsell

# Stop everything
docker-compose down

# Check Docker health
docker ps
docker system df

# Restart Docker daemon if needed
sudo systemctl restart docker

# Restore from last working state
git checkout main  # Go back to known good version
docker-compose up -d

# Wait for services
sleep 15

# Restore database from backup
LATEST_BACKUP=$(ls -t /backups/production/backup-*.sql.gz | head -1)
gunzip -c "${LATEST_BACKUP}" | docker-compose exec -T postgres \
  psql -U wapsell_user -d wapsell_prod

# Verify
docker-compose ps
curl https://api.wapsell.com/health

# Post incident report in #wapsell-ops
```

## Monitoring After Deployment

### Immediate (5-15 minutes)

```bash
# Run monitoring script
./scripts/monitoring.sh production

# Check Slack notifications
# - Deployment success in #wapsell-deployments
# - API health checks passed
# - Database migrations completed
```

### Short-term (30 minutes - 2 hours)

```bash
# Monitor error rates
ssh root@prod-host
cd /opt/wapsell
docker logs wapsell-api | grep -i error | wc -l

# Check response times
curl -w "Response time: %{time_total}s\n" https://api.wapsell.com/health

# Monitor resource usage
docker stats --no-stream

# Check for increased errors vs baseline
```

### Extended (2-24 hours)

```bash
# Monitor for memory leaks
docker stats --no-stream

# Check daily backup completion
ls -lh /backups/production/backup-*.sql.gz

# Review application logs for warnings
ssh root@prod-host
cd /opt/wapsell
docker logs wapsell-api --since 2h | grep -i warn

# Verify data integrity
docker-compose exec -T postgres psql -U wapsell_user -d wapsell_prod -c "\d"
```

## Environment-Specific Notes

### Staging VPS

- **Location**: Hetzner Cloud Staging
- **Auto-deployment**: Yes (on develop branch push)
- **Backup retention**: 7 days
- **Monitoring**: Basic (health checks only)

### Production VPS

- **Location**: Hetzner Cloud Production
- **Auto-deployment**: No (manual trigger required)
- **Backup retention**: 30 days
- **Monitoring**: Comprehensive (all health checks + alerting)

## Communication

### Slack Channels

- `#wapsell-deployments` - Production deployment notifications
- `#wapsell-staging` - Staging deployment notifications  
- `#wapsell-ops` - Operations and backup notifications
- `#incidents` - Incident response (if applicable)

### Deployment Notification Template

```
🚀 Deploying Wapsell to [ENVIRONMENT]
Version: [version/tag]
Committer: [github username]
Expected duration: [X minutes]
Estimated completion: [time]

🔗 Follow progress: [github actions link]
```

### Post-Deployment Notification Template

```
✅ Deployment to [ENVIRONMENT] completed successfully
Version: [version/tag]
Duration: [X minutes]
Status: All health checks passed

Key metrics:
- API response time: [Xms]
- Database: Connected
- Services: All running
- Health: Green
```

## Related Documentation

- [Deployment Checklist](DEPLOYMENT-CHECKLIST.md)
- [GitHub Secrets Setup](GITHUB-SECRETS-SETUP.md)
- [Incident Response](INCIDENT-RESPONSE.md)
- [GitHub Actions Workflows](.github/workflows/)
