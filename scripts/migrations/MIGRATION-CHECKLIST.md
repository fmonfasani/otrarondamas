# P2G Migration Checklist: businessId Addition to Producto

**Migration ID:** P2G-MIGRATION-20261030  
**Date:** 2026-10-30  
**Target Table:** Producto  
**Change:** Add `businessId` UUID column (populated from `empresaId`)  
**Estimated Downtime:** 750ms (staging verified)  
**Rollback Window:** 30 days (backup retention)  

---

## PRE-MIGRATION PHASE (24 hours before)

### Gate 1: Infrastructure Readiness
- [ ] Production database backup verified and tested
- [ ] Staging database prepared with production data snapshot
- [ ] Backup directory has >= 50GB free space
- [ ] PostgreSQL version verified: >= 12.0
- [ ] pg_dump and psql tools available in PATH
- [ ] Bash >= 4.0 available for scripts
- [ ] Backup file location confirmed: `/backups/pre-migration-backup-*.sql`

### Gate 2: Data Integrity Checks
- [ ] Run `scripts/migrations/pre-migration-checks.sh`
- [ ] All 8 gates pass (connectivity, row counts, referential integrity, backups, disk space, locks, Prisma status)
- [ ] Log file saved: `scripts/migrations/pre-migration-checks.log`
- [ ] Verify baseline metrics:
  - Productos: >= 4,000 rows
  - Ventas: >= 100 rows
  - Usuarios: >= 3 rows
  - Empresas: >= 1 row

### Gate 3: Schema Readiness
- [ ] `empresaId` column exists in Producto table
- [ ] No `businessId` column already exists
- [ ] No `Producto_businessId_fkey` constraint exists
- [ ] Schema version documented

### Gate 4: Application Readiness
- [ ] Application deployment paused (if auto-deploy is enabled)
- [ ] API servers healthcheck confirmed
- [ ] Read-only mode enabled (if available)
- [ ] Admin notification sent: "Migration window 12:00-12:15 UTC"
- [ ] Incident response team on standby

### Gate 5: Backup Verification
- [ ] Full database backup created: `pg_dump otrarondamas > backup-20261030.sql`
- [ ] Backup file tested (can be restored)
- [ ] Backup size documented: _____ MB
- [ ] Backup checksums computed and stored
- [ ] Backup accessible from secure location

### Gate 6: Script Testing on Staging
- [ ] `execute-migration.sh --staging --dry-run` passes
- [ ] `post-migration-checks.sh --staging` passes
- [ ] `rollback.sh --staging --test` passes
- [ ] Migration execution time measured: _____ ms
- [ ] Performance impact acceptable (< 1000ms)

### Gate 7: Team Alignment
- [ ] DBA confirmed ready
- [ ] DevOps confirmed deployment plan
- [ ] Support team briefed on rollback procedure
- [ ] Monitoring alerts configured for migration window
- [ ] Slack/comms channel active for real-time updates

---

## MIGRATION EXECUTION PHASE (Live, ~5 minutes)

### Step 1: Pre-Migration Snapshot (T-2 min)
- [ ] Stop background jobs (if any)
- [ ] Disable write operations (optional, depends on app design)
- [ ] Take final backup: `pg_dump otrarondamas > pre-exec-backup.sql`
- [ ] Log: "Migration starting, timestamp: $(date)"

### Step 2: Execute Migration (T+0:00)
```bash
cd /path/to/OtraRondaMas
bash scripts/migrations/execute-migration.sh --production
```
- [ ] Command executed successfully (exit code 0)
- [ ] Log file created: `execute-migration-TIMESTAMP.log`
- [ ] Monitor execution time: _____ ms
- [ ] Check for errors in log

### Step 3: Column Verification (T+1:00)
Database Verification Queries:
```sql
-- Verify column exists
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'Producto' AND column_name = 'businessId';

-- Verify populated
SELECT COUNT(*) FROM "Producto" WHERE "businessId" IS NULL;

-- Verify FK constraint
SELECT constraint_name FROM information_schema.table_constraints 
WHERE table_name = 'Producto' AND constraint_name = 'Producto_businessId_fkey';
```
- [ ] businessId column exists
- [ ] All Productos have non-null businessId
- [ ] Foreign key constraint created

### Step 4: Data Validation (T+1:30)
```bash
bash scripts/migrations/post-migration-checks.sh --production
```
- [ ] All 5 checks PASS
- [ ] Log file created: `post-migration-checks.log`
- [ ] Data consistency verified: businessId == empresaId
- [ ] No orphaned rows

### Step 5: Application Restart (T+2:00)
- [ ] Deploy updated schema to API (if needed)
- [ ] Restart application servers
- [ ] Run API health checks
- [ ] Verify API responds to requests
- [ ] Check application logs for errors

### Step 6: Smoke Tests (T+3:00)
- [ ] Create test Producto via API: verify businessId auto-populated
- [ ] Update existing Producto: verify businessId preserved
- [ ] Query Productos by businessId: verify results correct
- [ ] Check Prisma client generation: `npx prisma generate`
- [ ] Run unit tests: `npm run test`

### Step 7: Re-enable Operations (T+4:00)
- [ ] Resume background jobs
- [ ] Enable write operations
- [ ] Resume auto-deployments (if applicable)
- [ ] Mark migration as complete in logs

---

## POST-MIGRATION PHASE (24 hours after)

### Validation Tasks
- [ ] Monitor database for locks/slow queries
- [ ] Review application error logs (none expected)
- [ ] Verify Producto queries perform normally (< 200ms for typical queries)
- [ ] Run E2E test suite: `npm run test:e2e`
- [ ] Validate business logic:
  - [ ] Products created with correct businessId
  - [ ] Products assigned to correct Empresa
  - [ ] Multi-tenant isolation still works

### Performance Monitoring
- [ ] CPU usage: normal (< 50%)
- [ ] Memory usage: stable
- [ ] Query latency: baseline or better
- [ ] Connection pool: healthy

### Documentation
- [ ] Update schema documentation
- [ ] Record actual execution metrics:
  - Migration time: _____ ms
  - Backup size: _____ MB
  - Data consistency verified: _____ rows
- [ ] Archive migration logs
- [ ] Close migration ticket

### Rollback Readiness
- [ ] Backup retained for 30 days minimum
- [ ] Rollback procedure documented
- [ ] Team trained on rollback steps
- [ ] Monitor application for 48 hours before considering migration "stable"

---

## ROLLBACK DECISION TREE

### Scenario A: Migration Failed During Execution
**Indicator:** execute-migration.sh exited with error code != 0

**Action:**
```bash
bash scripts/migrations/rollback.sh --production --backup /path/to/pre-exec-backup.sql
```
- [ ] Rollback completed (all checks pass)
- [ ] Application restarted
- [ ] Verify Producto table schema: businessId removed
- [ ] Post-mortem: identify root cause

### Scenario B: Post-Migration Data Corruption
**Indicator:** post-migration-checks.sh fails

**Action:**
```bash
bash scripts/migrations/rollback.sh --production --backup /path/to/pre-migration-backup.sql
```
- [ ] Restore from pre-migration backup
- [ ] Verify data integrity
- [ ] Application restarted
- [ ] Post-mortem: identify data issue

### Scenario C: Application Errors After Migration
**Indicator:** API returning errors, E2E tests failing

**Action:**
```bash
bash scripts/migrations/rollback.sh --production --backup /path/to/pre-migration-backup.sql
```
- [ ] Restore from backup
- [ ] Debug application code (likely Prisma schema mismatch)
- [ ] Fix code, test on staging
- [ ] Retry migration

### Scenario D: Partial Rollback (Keep Migration, Fix Data)
**Indicator:** Migration succeeded, but specific data issues found

**Action:**
```sql
-- Fix specific rows via SQL updates
-- Verify with post-migration-checks.sh
-- Document changes
```

---

## MIGRATION TIMING & ESTIMATES

| Phase | Task | Estimated Duration | Actual Duration |
|-------|------|-------------------|-----------------|
| Pre-migration | Run validation checks | 2 min | _____ |
| Migration | Add column + populate data | 500 ms | _____ |
| Migration | Add FK constraint | 100 ms | _____ |
| Migration | Make NOT NULL | 100 ms | _____ |
| Post-migration | Verify checks | 2 min | _____ |
| Post-migration | Application restart | 1 min | _____ |
| **Total Downtime** | | **~5 min** | **_____ min** |

---

## CRITICAL SUCCESS FACTORS

1. **Data Integrity:** 100% of Productos must have non-null businessId
2. **Referential Integrity:** All businessIds must reference valid Empresas
3. **Constraint Enforcement:** Foreign key constraint must be active
4. **Zero Data Loss:** All pre-migration data must be preserved
5. **Performance:** Migration must complete in < 1 second
6. **Application Compatibility:** Updated API must handle businessId correctly
7. **Rollback Capability:** Full rollback must be possible within 15 minutes

---

## SIGN-OFF

| Role | Name | Date | Signature |
|------|------|------|-----------|
| DBA | _____ | _____ | _____ |
| DevOps | _____ | _____ | _____ |
| Tech Lead | _____ | _____ | _____ |
| Product | _____ | _____ | _____ |

---

## CONTACT INFORMATION

- **DBA On-Call:** ___________________
- **DevOps On-Call:** ________________
- **Incident Channel:** #migrations-live
- **Backup Location:** /secure/backups/
- **Rollback Contact:** _______________

---

## APPENDIX: Script Commands Reference

### Pre-Migration
```bash
bash scripts/migrations/pre-migration-checks.sh production
```

### Execute Migration (Staging Test)
```bash
bash scripts/migrations/execute-migration.sh --staging --dry-run
bash scripts/migrations/execute-migration.sh --staging
```

### Execute Migration (Production)
```bash
bash scripts/migrations/execute-migration.sh --production
```

### Post-Migration Validation
```bash
bash scripts/migrations/post-migration-checks.sh production
```

### Rollback (Full Restore)
```bash
bash scripts/migrations/rollback.sh --production --backup /path/to/backup.sql
```

### Rollback (SQL Only)
```bash
bash scripts/migrations/rollback.sh --production
```

---

**Document Version:** 1.0  
**Last Updated:** 2026-10-30  
**Status:** READY FOR EXECUTION
