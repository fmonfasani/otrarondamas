# Deployment Checklist

Pre-deployment verification checklist for Wapsell. Use this before every production deployment.

## Pre-Deployment (24 hours before)

- [ ] **Code Review Complete**
  - All changes reviewed and approved
  - No outstanding issues or TODOs
  - Commit message follows convention
  - Related PR merged to main/develop

- [ ] **Tests Passing**
  - Unit tests: `npm test`
  - Integration tests: `npm run test:integration`
  - E2E tests: `npm run test:e2e`
  - Coverage maintained or improved: `npm test -- --coverage`

- [ ] **Build Verification**
  - TypeScript compiles: `npm run build`
  - No eslint warnings/errors: `npm run lint`
  - Docker build successful locally: `docker-compose build`

- [ ] **Database Migrations**
  - Migrations reviewed: `npx prisma migrate status`
  - Rollback plan documented
  - Schema changes validated against Prisma client
  - Migration tested in staging environment

- [ ] **Staging Deployment**
  - Latest code deployed to staging
  - Staging tests passing
  - Staging API responding correctly
  - Database migrations applied in staging

- [ ] **Environment Variables**
  - All required vars defined in secrets
  - Sensitive data not committed
  - Environment parity verified
  - .env files excluded from git

## 2 Hours Before Deployment

- [ ] **Backup Verification**
  - Recent backup exists and is valid
  - Backup file size reasonable (not truncated)
  - Backup integrity verified
  - Backup location accessible

- [ ] **Current Production State**
  - Production services healthy
  - No active incidents
  - Database connections normal
  - Disk/memory usage acceptable
  - Recent logs show no errors

- [ ] **Stakeholder Notification**
  - Dev team notified via Slack
  - QA team on standby
  - Support team aware of deployment window
  - Monitoring team ready

- [ ] **Monitoring Setup**
  - Alert channels configured
  - Slack webhooks tested
  - Health check endpoints working
  - Rollback procedures documented

## 30 Minutes Before

- [ ] **Final Code Review**
  - Review diff one last time: `git diff main...HEAD`
  - Check for unintended changes
  - Verify commit history is clean
  - Confirm version tag is correct

- [ ] **Final Testing**
  - Run quick sanity tests
  - Test critical user flows
  - Verify API endpoints respond
  - Check database connectivity

- [ ] **SSH Access Verification**
  - SSH keys working
  - VPS accessible and responsive
  - Disk space available
  - No firewall blocking access

- [ ] **Deployment Window**
  - Outside business hours (if possible)
  - Low-traffic period confirmed
  - Support team ready for emergencies
  - Team member designated for rollback

## During Deployment

- [ ] **Monitor Logs**
  - Watch API logs for errors
  - Check database migration progress
  - Monitor service startup
  - Verify no critical warnings

- [ ] **Health Checks**
  - API /health endpoint responding (HTTP 200)
  - API /api/v1/ping responding
  - Database connectivity verified
  - Frontend loading correctly

- [ ] **Smoke Tests**
  - Test login flow
  - Test critical user features
  - Verify API response times
  - Check error handling

- [ ] **Performance Monitoring**
  - API response times normal
  - Database queries performing
  - Memory usage stable
  - CPU usage reasonable

## Post-Deployment (30 minutes after)

- [ ] **Full Verification**
  - All services running
  - No error spikes in logs
  - Database is responsive
  - API availability: 99.9%+

- [ ] **User-Facing Tests**
  - Homepage loads correctly
  - User registration works
  - Login/logout flow working
  - Product catalog loading
  - Cart functionality working
  - Payment processing testable

- [ ] **Backend Verification**
  - All API endpoints responding
  - Database queries executing
  - Email notifications sending (if applicable)
  - External integrations working (payments, etc.)

- [ ] **Slack Notifications**
  - ✅ or ❌ status posted to team channel
  - Any issues documented
  - Rollback status (if applicable)
  - ETA for any follow-up work

- [ ] **Monitoring Active**
  - All alerts configured and active
  - Team monitoring logs
  - Incident response team on call

## Post-Deployment (1-24 hours)

- [ ] **Extended Monitoring**
  - No error spikes
  - Consistent API response times
  - Database performance normal
  - No memory leaks observed
  - Disk space usage stable

- [ ] **User Feedback**
  - No critical bugs reported
  - User sessions stable
  - No data corruption issues
  - Feature functionality verified

- [ ] **Data Integrity**
  - Data consistency verified
  - No orphaned records
  - Referential integrity intact
  - Backup restore tested (optional but recommended)

- [ ] **Runbook Documentation**
  - Deployment notes updated
  - Lessons learned documented
  - Process improvements identified
  - Runbook updated for next deployment

## Rollback Scenarios

### Automatic Rollback (deployment-production.yml)

The deployment script automatically rolls back if:
- Migration fails
- Health check fails after 5 attempts
- Database connectivity fails

Automatic rollback includes:
1. Stopping new services
2. Restoring previous git commit
3. Restoring database from pre-deployment backup
4. Slack notification with failure details

### Manual Rollback

If automatic rollback doesn't work:

```bash
# SSH into production server
ssh root@${PROD_HOST}

# Navigate to deployment directory
cd /opt/wapsell

# Stop current services
docker-compose down

# Restore previous version
git checkout main
# or: git checkout <previous-commit-sha>

# Start old services
docker-compose up -d

# Restore database from backup
gunzip -c /backups/production/backup-YYYYMMDD-HHMMSS.sql.gz | \
  docker-compose exec -T postgres psql -U wapsell_user -d wapsell_prod

# Verify services
docker-compose ps
curl -f https://api.wapsell.com/health
```

## Deployment Metrics

Track these metrics for each deployment:

- Deployment start time
- Deployment end time
- Total deployment time
- Number of database migrations
- Code changes (line count)
- Files modified
- Services affected
- Health check time
- Time to production-ready
- Any incidents during deployment
- Rollback required (yes/no)
- Root cause of any issues

## Contact Information

**On-call Engineer**: [Team members and their shift times]

**Slack Channel**: #wapsell-deployments

**Emergency Contact**: [Phone number for critical incidents]

**Escalation Path**:
1. On-call engineer
2. Tech lead
3. Engineering manager
4. VP Engineering

## Related Documentation

- [Monitoring Guide](MONITORING.md)
- [Rollback Procedures](ROLLBACK.md)
- [Incident Response](INCIDENT-RESPONSE.md)
- [GitHub Actions Workflows](../.github/workflows/)
