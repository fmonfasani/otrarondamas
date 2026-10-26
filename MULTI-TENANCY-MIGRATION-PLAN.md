# Multi-Tenancy Migration Plan: UserEmpresa M:M Implementation

## Status: READY FOR DEPLOYMENT
**Date**: 2026-10-26  
**Branch**: main  
**Last Updated**: 2026-10-26 18:15 UTC

---

## 1. SCHEMA CHANGES COMPLETED ✅

### Files Modified
- **D:\Software Development\Porfolio\OtraRondaMas\apps\api\prisma\schema.prisma**
  - Added `UserEmpresa` model (M:M junction table)
  - Added relation `UserEmpresa[]` to `Usuario` model
  - Added relation `UserEmpresa[]` to `Empresa` model

### UserEmpresa Model Definition
```prisma
model UserEmpresa {
  id        String   @id @default(uuid())
  usuarioId String
  empresaId String
  role      String   @default("owner")  // owner, admin, user, editor
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  Usuario   Usuario  @relation(fields: [usuarioId], references: [id], onDelete: Cascade)
  Empresa   Empresa  @relation(fields: [empresaId], references: [id], onDelete: Cascade)

  @@unique([usuarioId, empresaId])
  @@index([usuarioId])
  @@index([empresaId])
}
```

---

## 2. MIGRATION ARTIFACTS CREATED ✅

### Migration File Location
- **Directory**: D:\Software Development\Porfolio\OtraRondaMas\apps\api\prisma\migrations\20261026_add_user_empresa_multi_tenancy
- **File**: migration.sql (1000 bytes)

### Migration SQL Contents
```sql
-- CreateTable for UserEmpresa
CREATE TABLE "UserEmpresa" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'owner',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserEmpresa_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint
CREATE UNIQUE INDEX "UserEmpresa_usuarioId_empresaId_key" ON "UserEmpresa"("usuarioId", "empresaId");

-- Create indexes for performance
CREATE INDEX "UserEmpresa_usuarioId_idx" ON "UserEmpresa"("usuarioId");
CREATE INDEX "UserEmpresa_empresaId_idx" ON "UserEmpresa"("empresaId");

-- Add foreign keys
ALTER TABLE "UserEmpresa" ADD CONSTRAINT "UserEmpresa_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserEmpresa" ADD CONSTRAINT "UserEmpresa_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

---

## 3. SEEDING SCRIPT CREATED ✅

### Seed Script Location
- **File**: D:\Software Development\Porfolio\OtraRondaMas\apps\api\prisma\seed-multi-tenancy.ts

### Seed Logic
1. Find all existing `Usuario` records with non-null `empresaId`
2. For each user:
   - Check if `UserEmpresa` record already exists
   - If not, create with `role='owner'` (assuming existing users are owners of their primary empresa)
3. Report summary: Created, Skipped, Errors counts
4. Verify data integrity
5. Identify any users without `empresaId` (edge case warning)

### Execution Command
```bash
cd apps/api
npx ts-node --esm prisma/seed-multi-tenancy.ts
```

---

## 4. NEXT STEPS

### Step 1: Execute Migration
```bash
cd D:\Software Development\Porfolio\OtraRondaMas\apps\api

# Create backup BEFORE migration
pg_dump -U user -h localhost -p 5500 otrarondamas > backup_before_migration.sql

# Apply migration
npx prisma migrate deploy

# Verify migration applied
npx prisma migrate status
```

### Step 2: Execute Seed
```bash
# Seed UserEmpresa data from existing Usuario.empresaId
npx ts-node --esm prisma/seed-multi-tenancy.ts
```

### Step 3: Verify Integrity
```bash
# Check UserEmpresa table created
npx prisma db execute --stdin < <<EOF
SELECT COUNT(*) as user_empresa_count FROM "UserEmpresa";
EOF

# Check for orphaned records (should be 0)
npx prisma db execute --stdin < <<EOF
SELECT COUNT(*) as orphaned_count 
FROM "Usuario" u 
LEFT JOIN "UserEmpresa" ue ON u.id = ue."usuarioId" 
WHERE u."empresaId" IS NOT NULL AND ue.id IS NULL;
EOF

# Check unique constraint integrity
npx prisma db execute --stdin < <<EOF
SELECT "usuarioId", "empresaId", COUNT(*) as duplicate_count
FROM "UserEmpresa"
GROUP BY "usuarioId", "empresaId"
HAVING COUNT(*) > 1;
EOF
```

### Step 4: Create Backup AFTER Migration
```bash
pg_dump -U user -h localhost -p 5500 otrarondamas > backup_after_migration.sql
```

### Step 5: Run Tests
```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e
```

---

## 5. ROLLBACK PROCEDURE (IF NEEDED)

### If Migration Fails
```bash
cd apps/api

# Restore from backup
psql -U user -h localhost -p 5500 otrarondamas < backup_before_migration.sql

# Mark migration as not applied
npx prisma migrate resolve --rolled-back 20261026_add_user_empresa_multi_tenancy
```

### Remove Migration Directory
```bash
# Only if completely rolling back (keep git history though)
rm -rf prisma/migrations/20261026_add_user_empresa_multi_tenancy
```

---

## 6. VERIFICATION CHECKLIST

- [ ] Migration file created: `20261026_add_user_empresa_multi_tenancy/migration.sql`
- [ ] Schema updated: `Usuario` and `Empresa` models include `UserEmpresa` relation
- [ ] Seed script created: `seed-multi-tenancy.ts`
- [ ] Database backup created: `backup_before_migration.sql`
- [ ] Migration executed: `npx prisma migrate deploy` (EXIT CODE: 0)
- [ ] Table created: `SELECT COUNT(*) FROM "UserEmpresa"` (> 0)
- [ ] Seed executed: `npx ts-node --esm prisma/seed-multi-tenancy.ts` (EXIT CODE: 0)
- [ ] Data migrated: UserEmpresa records = Usuario records with empresaId
- [ ] FK constraints validated: No orphaned records
- [ ] Unique constraint tested: No duplicates
- [ ] Indexes created: Verify with `\d+ "UserEmpresa"`
- [ ] Backup created: `backup_after_migration.sql`
- [ ] Unit tests pass: `npm run test` (EXIT CODE: 0)
- [ ] E2E tests pass: `npm run test:e2e` (EXIT CODE: 0)
- [ ] API endpoints tested (if UserEmpresa is already used in code)

---

## 7. DATABASE CONNECTION INFO

```
HOST: localhost
PORT: 5500
USER: user
PASSWORD: password
DATABASE: otrarondamas
SCHEMA: public
```

---

## 8. FILES INVOLVED

### Prisma Schema
- **D:\Software Development\Porfolio\OtraRondaMas\apps\api\prisma\schema.prisma**

### Migration
- **D:\Software Development\Porfolio\OtraRondaMas\apps\api\prisma\migrations\20261026_add_user_empresa_multi_tenancy\migration.sql**

### Seed Script
- **D:\Software Development\Porfolio\OtraRondaMas\apps\api\prisma\seed-multi-tenancy.ts**

### Documentation
- **This file**: D:\Software Development\Porfolio\OtraRondaMas\MULTI-TENANCY-MIGRATION-PLAN.md

---

## 9. ESTIMATED EXECUTION TIME

- Migration execution: 2-5 minutes
- Seed execution: 1-3 minutes (depends on number of usuarios)
- Verification: 5 minutes
- **Total**: 10-15 minutes

---

## 10. NOTES & CONSIDERATIONS

### Data Migration Strategy
- **Current State**: `Usuario.empresaId` (1:1 relationship)
- **New State**: `UserEmpresa` (M:M relationship)
- **Transition**: Each existing `Usuario.empresaId` becomes a `UserEmpresa` record with `role='owner'`

### No Data Loss
- All existing `Usuario.empresaId` values are preserved in `UserEmpresa`
- The `Usuario.empresaId` field can be deprecated/removed in a future migration

### Multi-Tenancy Support
- Users can now belong to multiple empresas
- Each `UserEmpresa` record has a `role` field for permission management
- Cascade delete ensures data consistency (deleting a usuario deletes their UserEmpresa entries)

### Backward Compatibility
- `Usuario.empresaId` still exists (not removed in this migration)
- Existing code continues to work during transition period
- Future: Application code should read from `UserEmpresa` instead of `Usuario.empresaId`

---

## Created By
**Claude Haiku 4.5**  
**Date**: 2026-10-26  
**Co-Authored-By**: Claude Haiku 4.5 <noreply@anthropic.com>
