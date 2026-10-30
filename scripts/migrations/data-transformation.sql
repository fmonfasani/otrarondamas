-- P2G: Data Transformation SQL
-- Migration to add businessId to Producto table
-- Author: P2G Migration Specialist
-- Date: 2026-10-30
-- Purpose: Support multi-business scoping without removing empresaId
--
-- Strategy:
-- 1. Add businessId column (nullable initially)
-- 2. Populate businessId from empresaId for all existing rows
-- 3. Add foreign key constraint
-- 4. Make businessId NOT NULL to enforce completeness
--
-- Rollback: Simply DROP COLUMN businessId

-- ==============================================================
-- PHASE 1: BACKUP & VALIDATION
-- ==============================================================

-- Create backup table (for safety)
CREATE TABLE "Producto_backup" AS
SELECT * FROM "Producto";

-- Verify backup
SELECT COUNT(*) as total_products_backed_up FROM "Producto_backup";

-- ==============================================================
-- PHASE 2: ADD COLUMN (NULLABLE)
-- ==============================================================

-- Add businessId column, initially allowing NULL
ALTER TABLE "Producto"
  ADD COLUMN "businessId" UUID;

-- Verify column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'Producto'
  AND column_name = 'businessId';

-- ==============================================================
-- PHASE 3: DATA POPULATION
-- ==============================================================

-- Populate businessId from empresaId for all rows
UPDATE "Producto"
SET "businessId" = "empresaId"
WHERE "businessId" IS NULL;

-- Verify population
SELECT
  COUNT(*) as total_rows,
  COUNT(CASE WHEN "businessId" IS NULL THEN 1 END) as null_businessIds,
  COUNT(CASE WHEN "businessId" IS NOT NULL THEN 1 END) as populated_businessIds
FROM "Producto";

-- Validate consistency: businessId should equal empresaId
SELECT COUNT(*) as inconsistency_count
FROM "Producto"
WHERE "businessId" != "empresaId";

-- ==============================================================
-- PHASE 4: FOREIGN KEY CONSTRAINT
-- ==============================================================

-- Add foreign key constraint
ALTER TABLE "Producto"
  ADD CONSTRAINT "Producto_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Empresa"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

-- Verify constraint exists
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'Producto'
  AND constraint_name = 'Producto_businessId_fkey';

-- ==============================================================
-- PHASE 5: NOT NULL CONSTRAINT
-- ==============================================================

-- Make businessId NOT NULL
ALTER TABLE "Producto"
  ALTER COLUMN "businessId" SET NOT NULL;

-- Verify constraint is set
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'Producto'
  AND column_name = 'businessId';

-- ==============================================================
-- PHASE 6: FINAL VALIDATION
-- ==============================================================

-- Comprehensive validation query
SELECT
  (SELECT COUNT(*) FROM "Producto") as total_productos,
  (SELECT COUNT(*) FROM "Producto" WHERE "businessId" IS NULL) as null_businessIds,
  (SELECT COUNT(*) FROM "Producto" WHERE "businessId" != "empresaId") as inconsistencies,
  (SELECT COUNT(*) FROM "Empresa") as total_empresas
AS validation_result;

-- Check indexes
SELECT indexname
FROM pg_indexes
WHERE tablename = 'Producto'
ORDER BY indexname;

-- ==============================================================
-- PHASE 7: CLEANUP (OPTIONAL)
-- ==============================================================

-- Drop backup table after confirming success
-- DROP TABLE "Producto_backup";

-- ==============================================================
-- ROLLBACK PROCEDURE
-- ==============================================================

-- If needed, rollback to previous state:
-- 1. Drop foreign key constraint:
--    ALTER TABLE "Producto" DROP CONSTRAINT "Producto_businessId_fkey";
--
-- 2. Drop businessId column:
--    ALTER TABLE "Producto" DROP COLUMN "businessId";
--
-- 3. Or restore from backup:
--    TRUNCATE TABLE "Producto";
--    INSERT INTO "Producto" SELECT * FROM "Producto_backup";

-- ==============================================================
-- PERFORMANCE CONSIDERATIONS
-- ==============================================================

-- Consider adding index for frequently queried businessId:
-- CREATE INDEX "Producto_businessId_idx" ON "Producto"("businessId");
--
-- Verify index usage:
-- SELECT * FROM pg_stat_user_indexes WHERE indexrelname = 'Producto_businessId_idx';

-- ==============================================================
-- MIGRATION NOTES
-- ==============================================================

-- Timeline:
-- - Add column: ~100ms
-- - Populate 4,342 rows: ~500ms
-- - Add FK constraint: ~50ms
-- - Make NOT NULL: ~100ms
-- Total: ~750ms downtime

-- Test on staging first:
-- 1. Load staging backup
-- 2. Run this script
-- 3. Verify all checks pass
-- 4. Measure actual execution time
-- 5. Document findings
-- 6. Schedule production run during low-traffic window

-- Production deployment:
-- 1. Backup production database
-- 2. Execute this script
-- 3. Run post-migration validation
-- 4. Monitor application behavior
-- 5. Keep rollback snapshot for 30 days
