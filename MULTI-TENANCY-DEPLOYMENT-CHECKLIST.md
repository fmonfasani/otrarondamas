# Multi-Tenancy Deployment Checklist

**Created**: 2026-10-26  
**Status**: READY FOR DEPLOYMENT  

---

## PRE-DEPLOYMENT VERIFICATION

### ✅ Artifacts Present
- [x] Schema model created: `UserEmpresa` in `/apps/api/prisma/schema.prisma`
- [x] Migration file created: `/apps/api/prisma/migrations/20261026_add_user_empresa_multi_tenancy/migration.sql`
- [x] Seed script created: `/apps/api/prisma/seed-multi-tenancy.ts`
- [x] Verification script (Bash): `/scripts/verify-multi-tenancy-migration.sh`
- [x] Verification script (PowerShell): `/scripts/verify-multi-tenancy-migration.ps1`
- [x] Documentation created: `MULTI-TENANCY-MIGRATION-PLAN.md`
- [x] Documentation created: `MULTI-TENANCY-IMPLEMENTATION-SUMMARY.md`

### ✅ Schema Validation
- [x] `UserEmpresa` model has all required fields
  - [x] `id` (UUID primary key)
  - [x] `usuarioId` (FK to Usuario)
  - [x] `empresaId` (FK to Empresa)
  - [x] `role` (String, default='owner')
  - [x] `createdAt` (timestamp)
  - [x] `updatedAt` (timestamp)
- [x] Relations properly defined
  - [x] `Usuario.UserEmpresa[]` relation added
  - [x] `Empresa.UserEmpresa[]` relation added
- [x] Constraints defined
  - [x] UNIQUE constraint on `(usuarioId, empresaId)`
  - [x] Foreign key to Usuario with CASCADE delete
  - [x] Foreign key to Empresa with CASCADE delete

### ✅ Migration Validation
- [x] Migration file exists at correct path
- [x] Migration SQL is valid
  - [x] CREATE TABLE statement
  - [x] Primary key constraint
  - [x] Unique constraint definition
  - [x] Index creation (3 indexes)
  - [x] Foreign key constraints
- [x] Migration follows Prisma naming conventions

### ✅ Seed Script Validation
- [x] Script reads existing usuarios with empresaId
- [x] Script creates UserEmpresa records
- [x] Script handles duplicates (idempotent)
- [x] Script provides detailed logging
- [x] Script includes error handling
- [x] Script validates data integrity

---

## STAGING DEPLOYMENT

### Step 1: Database Backup
- [ ] Create pre-migration backup
  ```bash
  pg_dump -U user -h localhost -p 5500 otrarondamas > backup_before_migration.sql
  # Result: Backup file created (~XX MB)
  ```
- [ ] Verify backup integrity
  ```bash
  file backup_before_migration.sql
  wc -l backup_before_migration.sql
  ```

### Step 2: Run Migration
- [ ] Navigate to API directory
  ```bash
  cd apps/api
  ```
- [ ] Execute migration
  ```bash
  npx prisma migrate deploy
  # Expected: ✓ Successfully applied migration
  ```
- [ ] Verify migration applied
  ```bash
  npx prisma migrate status
  # Expected: All migrations applied
  ```

### Step 3: Verify Table Creation
- [ ] Check table exists
  ```bash
  npx prisma db execute --stdin <<EOF
  SELECT tablename FROM pg_tables 
  WHERE tablename = 'UserEmpresa';
  EOF
  # Expected: "UserEmpresa"
  ```

### Step 4: Run Seed Script
- [ ] Execute seed script
  ```bash
  npx ts-node --esm prisma/seed-multi-tenancy.ts
  # Expected: ✓ Seed completed successfully!
  ```
- [ ] Verify seed output shows:
  - [ ] Found X usuarios with empresaId
  - [ ] Created Y records
  - [ ] Skipped Z records (if rerunning)
  - [ ] 0 Errors

### Step 5: Data Integrity Checks
- [ ] Count UserEmpresa records
  ```bash
  npx prisma db execute --stdin <<EOF
  SELECT COUNT(*) as count FROM "UserEmpresa";
  EOF
  # Expected: Count > 0
  ```
- [ ] Verify no orphaned usuarios
  ```bash
  npx prisma db execute --stdin <<EOF
  SELECT COUNT(*) FROM "Usuario" u
  WHERE u."empresaId" IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM "UserEmpresa" WHERE "usuarioId" = u.id
  );
  EOF
  # Expected: 0
  ```
- [ ] Check unique constraint
  ```bash
  npx prisma db execute --stdin <<EOF
  SELECT COUNT(*) FROM (
    SELECT "usuarioId", "empresaId", COUNT(*) cnt
    FROM "UserEmpresa"
    GROUP BY "usuarioId", "empresaId"
    HAVING COUNT(*) > 1
  ) duplicates;
  EOF
  # Expected: 0
  ```

### Step 6: Verify Indexes
- [ ] Check indexes created
  ```bash
  npx prisma db execute --stdin <<EOF
  SELECT indexname FROM pg_indexes 
  WHERE tablename = 'UserEmpresa'
  ORDER BY indexname;
  EOF
  # Expected: At least 3 indexes
  ```

### Step 7: Run Test Suite
- [ ] Execute unit tests
  ```bash
  npm run test
  # Expected: All tests pass (exit code 0)
  ```
- [ ] Execute E2E tests
  ```bash
  npm run test:e2e
  # Expected: All tests pass (exit code 0)
  ```

### Step 8: Post-Migration Backup
- [ ] Create post-migration backup
  ```bash
  pg_dump -U user -h localhost -p 5500 otrarondamas > backup_after_migration.sql
  # Result: Backup file created (~XX MB)
  ```
- [ ] Compare backup sizes (should be similar)
  ```bash
  ls -lh backup_before_migration.sql backup_after_migration.sql
  ```

### Step 9: Run Verification Script
- [ ] Execute verification script
  ```bash
  # PowerShell
  .\scripts\verify-multi-tenancy-migration.ps1
  
  # OR Bash
  bash scripts/verify-multi-tenancy-migration.sh
  ```
- [ ] All checks pass with green checkmarks

---

## ROLLBACK PROCEDURE (IF NEEDED)

### Option 1: Restore from Backup (Recommended)
- [ ] Stop application
- [ ] Restore from backup
  ```bash
  psql -U user -h localhost -p 5500 otrarondamas < backup_before_migration.sql
  ```
- [ ] Mark migration as rolled back
  ```bash
  cd apps/api
  npx prisma migrate resolve --rolled-back 20261026_add_user_empresa_multi_tenancy
  ```
- [ ] Verify rollback
  ```bash
  npx prisma db execute --stdin <<EOF
  SELECT COUNT(*) FROM information_schema.tables 
  WHERE table_name = 'UserEmpresa';
  EOF
  # Expected: 0 (table should not exist)
  ```

### Option 2: Manual Table Drop (If Restore Not Needed)
- [ ] Connect to database
  ```bash
  psql -U user -h localhost -p 5500 otrarondamas
  ```
- [ ] Drop UserEmpresa table
  ```sql
  DROP TABLE IF EXISTS "UserEmpresa" CASCADE;
  ```
- [ ] Verify table dropped
  ```sql
  SELECT tablename FROM pg_tables WHERE tablename = 'UserEmpresa';
  -- Should return no rows
  ```

---

## PRODUCTION DEPLOYMENT

### Pre-Production Checklist
- [ ] Staging deployment completed successfully
- [ ] All tests passing
- [ ] Verification script reports success
- [ ] Backups created and verified
- [ ] Team informed of deployment window
- [ ] Rollback plan reviewed
- [ ] Change log prepared

### Production Steps
1. [ ] Create pre-deployment backup
2. [ ] Schedule maintenance window
3. [ ] Execute migration (5 min)
4. [ ] Execute seed script (3 min)
5. [ ] Run verification (5 min)
6. [ ] Run test suite (10 min)
7. [ ] Create post-deployment backup
8. [ ] Deploy updated application code
9. [ ] Monitor logs for errors
10. [ ] Notify team of completion

### Post-Deployment Monitoring
- [ ] Monitor application logs for errors
- [ ] Check database performance (slow queries)
- [ ] Verify user authentication works
- [ ] Test multi-company workflows (if implemented)
- [ ] Monitor CPU/memory usage
- [ ] Check backup integrity

---

## DOCUMENTATION SIGN-OFF

### Files Referenced
- ✅ `/MULTI-TENANCY-MIGRATION-PLAN.md` — Detailed execution guide
- ✅ `/MULTI-TENANCY-IMPLEMENTATION-SUMMARY.md` — Overview and strategy
- ✅ `/MULTI-TENANCY-DEPLOYMENT-CHECKLIST.md` — This file

### Database Connection Details
- **Host**: localhost
- **Port**: 5500
- **Database**: otrarondamas
- **User**: user
- **Schema**: public

### Key Contacts
- **Database Admin**: [To be filled]
- **DevOps Lead**: [To be filled]
- **API Team Lead**: [To be filled]

---

## SIGN-OFF

- **Prepared by**: Claude Haiku 4.5
- **Date**: 2026-10-26
- **Reviewed by**: [To be filled]
- **Approved by**: [To be filled]

**Status**: ✅ READY FOR DEPLOYMENT

---

## QUICK REFERENCE COMMANDS

### Backup
```bash
# Pre-migration
pg_dump -U user -h localhost -p 5500 otrarondamas > backup_before_migration.sql

# Post-migration
pg_dump -U user -h localhost -p 5500 otrarondamas > backup_after_migration.sql
```

### Migration
```bash
cd apps/api
npx prisma migrate deploy
npx prisma migrate status
```

### Seed
```bash
npx ts-node --esm prisma/seed-multi-tenancy.ts
```

### Verification
```bash
# PowerShell
.\scripts\verify-multi-tenancy-migration.ps1

# Bash
bash scripts/verify-multi-tenancy-migration.sh
```

### Rollback
```bash
# Restore from backup
psql -U user -h localhost -p 5500 otrarondamas < backup_before_migration.sql

# Mark migration as rolled back
npx prisma migrate resolve --rolled-back 20261026_add_user_empresa_multi_tenancy
```

### Tests
```bash
npm run test
npm run test:e2e
```

---

**End of Checklist**  
Generated with Claude Code  
🤖 Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
