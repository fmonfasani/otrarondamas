# Deployment Checklist - Wapsell Production

Complete checklist for deploying Wapsell to Hetzner VPS (89.167.96.239).

## Pre-Deployment (24 hours before)

### Code Validation
- [ ] All tests passing: `npm test`
- [ ] Build succeeds: `npm run build`
- [ ] No TypeScript errors: `npm run typecheck`
- [ ] ESLint clean: `npm run lint`
- [ ] Git history clean: `git log --oneline -10`
- [ ] On `main` branch: `git rev-parse --abbrev-ref HEAD`

### Documentation
- [ ] CHANGELOG.md updated with version & features
- [ ] API docs current (OpenAPI/Swagger)
- [ ] README.md reflects current state
- [ ] Breaking changes documented
- [ ] Migration guide (if needed) prepared

### Dependencies & Security
- [ ] All npm dependencies current: `npm outdated`
- [ ] No critical vulnerabilities: `npm audit`
- [ ] Database migrations tested locally
- [ ] ENV variables documented in `.env.production.example`
- [ ] Secrets rotated (if applicable)

### Database
- [ ] Backup scheduled and verified
- [ ] Migration script prepared: `npm run db:migrate`
- [ ] Rollback plan documented
- [ ] Data validation queries prepared
- [ ] Backup tested for restore

## Deployment Day

### Pre-Deployment Environment

1. **SSH to Hetzner VPS**
```bash
ssh root@89.167.96.239
cd /app/otrarondamas
```

2. **Verify Current State**
```bash
git status
git rev-parse HEAD
docker ps -a
npm --version
node --version
```

3. **Pull Latest Code**
```bash
git fetch origin main
git checkout main
git pull origin main
```

4. **Install Dependencies**
```bash
npm install --legacy-peer-deps --prefer-offline
```

5. **Build All Applications**
```bash
npm run build
```

6. **Database Migration**
```bash
npm run db:migrate
```

### Docker Deployment

7. **Backup Current Docker Volumes**
```bash
docker-compose down
cp -r postgres_data postgres_data.backup-$(date +%Y%m%d-%H%M%S)
```

8. **Build Docker Images**
```bash
docker-compose build --no-cache
```

9. **Start Services**
```bash
docker-compose up -d
```

10. **Health Checks**
```bash
# Wait 30 seconds for services to start
sleep 30

# Check all services running
docker-compose ps

# Verify API health
curl http://localhost:8600/api/health

# Check database connectivity
docker-compose logs postgres | grep "accepting connections"
```

11. **Application Verification**
```bash
# Verify API endpoints
curl http://localhost:8600/api/health
curl -X GET http://localhost:8600/api/users/me

# Check frontend availability
curl http://localhost:3051/

# Verify database
docker-compose exec postgres psql -U wapsell -d otrarondamas -c "SELECT COUNT(*) FROM public.\"User\";"
```

### Post-Deployment

12. **Data Validation**
```bash
# Run migration status check
npm run db:migrate -- --status

# Verify critical data integrity
docker-compose exec postgres psql -U wapsell -d otrarondamas < scripts/validate-migration.sql

# Check for any failed transactions
npm run db:validate
```

13. **Smoke Tests**
```bash
# Run basic E2E tests against production
npm run test:e2e -- --baseURL=http://localhost:3051

# Check key business flows
# - User login
# - Product catalog
# - Order creation
# - Payment processing (test mode)
```

14. **Monitoring & Logging**
```bash
# Check application logs
docker-compose logs --since=1h api | grep -i error

# Verify metrics collection
curl http://localhost:8600/api/metrics

# Check all services healthy
npm run docker:health
```

15. **Nginx Configuration**
```bash
# Test Nginx config
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Verify SSL certificates
sudo certbot certificates

# Check certificate expiration
echo | openssl s_client -servername wapsell.com -connect wapsell.com:443 2>/dev/null | openssl x509 -noout -dates
```

## Post-Deployment Verification (30 min - 2 hours)

### Automated Monitoring
- [ ] Error rate < 0.1%
- [ ] API response time < 200ms (p95)
- [ ] Database queries < 100ms (avg)
- [ ] No increase in memory usage
- [ ] Zero failed health checks

### Manual Verification
- [ ] Login works (email + OAuth)
- [ ] Dashboard loads
- [ ] Can create order
- [ ] Payment flow works
- [ ] Email notifications sent
- [ ] WhatsApp notifications work
- [ ] Admin panel accessible
- [ ] Reports generate

### Performance Baseline
```bash
# Record current metrics
curl http://localhost:8600/api/metrics > metrics-post-deploy-$(date +%Y%m%d-%H%M%S).json

# Monitor for 1 hour
watch -n 5 'docker stats --no-stream'
```

## Rollback Plan (If Issues)

### Quick Rollback (Last 1 hour)

1. **Stop Current Deployment**
```bash
docker-compose down
```

2. **Restore Previous Code**
```bash
git checkout HEAD~1
npm install --legacy-peer-deps
```

3. **Restore Database**
```bash
rm -rf postgres_data
mv postgres_data.backup-XXXXX postgres_data
```

4. **Restart Services**
```bash
docker-compose up -d
npm run db:migrate
```

### Full Rollback (Last 24 hours)

1. **Restore from VM Snapshot** (if available in Hetzner)
2. **Or restore from database backup**
```bash
# List available backups
ls -la /backups/

# Restore specific backup
psql -U wapsell -d otrarondamas < /backups/db-backup-XXXXX.sql
```

3. **Verify rollback success**
```bash
docker-compose down
docker-compose up -d
npm run db:migrate --status
```

## Post-Rollback Communication

- [ ] Notify stakeholders of issue
- [ ] Document what went wrong
- [ ] Create issue for fix
- [ ] Schedule new deployment date
- [ ] Update deployment guide based on learnings

## Success Criteria

Deployment is **successful** when:

- ✅ All services up and healthy
- ✅ API responds normally
- ✅ Frontend loads without errors
- ✅ Database migrations completed
- ✅ No critical errors in logs
- ✅ Users can login and transact
- ✅ Error rates < 0.1%
- ✅ Response times acceptable
- ✅ All automated tests pass

Deployment is **failed** if:
- ❌ Any service fails to start
- ❌ Database migration fails
- ❌ API crashes or hangs
- ❌ Error rate > 5%
- ❌ Critical feature broken
- ❌ User login broken
- ❌ Payments affected

## Deployment Log Template

```markdown
## Deployment Report - 2026-10-DD

**Version**: v1.0.0
**Deploy Time**: 2026-10-DD HH:MM UTC
**Duration**: XX minutes
**Deployed By**: [Name]

### Pre-Deployment Checks
- [ ] Tests: PASSED
- [ ] Build: PASSED
- [ ] Code Review: APPROVED
- [ ] DB Backup: VERIFIED

### Deployment Steps Executed
1. Code pull: ✅ [SHA]
2. Dependencies: ✅ [version]
3. Build: ✅ [time]
4. DB Migration: ✅ [status]
5. Docker deploy: ✅ [time]
6. Health checks: ✅ [all passed]

### Post-Deployment Verification
- [ ] API health: ✅
- [ ] Frontend: ✅
- [ ] Database: ✅
- [ ] Error logs: ✅ (none)
- [ ] Metrics: ✅ (normal)

### Issues & Resolutions
[List any issues encountered and how resolved]

### Next Steps
[Any follow-up tasks]
```

## Useful Commands

```bash
# Tail all logs
docker-compose logs -f

# Tail specific service
docker-compose logs -f api

# Check environment variables
docker-compose exec api env | grep NODE_ENV

# Connect to database
docker-compose exec postgres psql -U wapsell -d otrarondamas

# Run migrations with verbose output
npm run db:migrate -- --verbose

# Check npm workspace status
npm ls -p

# Build individual service
npm run build --workspace=@otrarondamas/api
```

## Emergency Contacts

- **Engineering Lead**: Federico Monfasani (fmonfasani@gmail.com)
- **On-Call**: [TBD]
- **Hetzner Support**: dashboard.hetzner.cloud

---

**Last Updated**: 2026-10-29  
**Version**: 1.0.0
