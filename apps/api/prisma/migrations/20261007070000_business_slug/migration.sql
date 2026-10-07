-- Add the canonical public Business identifier required by D01.
-- Existing businesses are backfilled deterministically from their current
-- unique names before the column becomes mandatory.
ALTER TABLE "Empresa" ADD COLUMN "slug" TEXT;

UPDATE "Empresa"
SET "slug" = TRIM(BOTH '-' FROM REGEXP_REPLACE(
  REGEXP_REPLACE(
    LOWER(TRANSLATE(TRIM("nombre"), 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')),
    '[^a-z0-9]+',
    '-',
    'g'
  ),
  '(^-+|-+$)',
  '',
  'g'
));

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "Empresa"
    WHERE "slug" IS NULL OR "slug" = ''
  ) THEN
    RAISE EXCEPTION 'Cannot backfill Empresa.slug: one or more businesses produce an empty slug';
  END IF;

  IF EXISTS (
    SELECT "slug"
    FROM "Empresa"
    GROUP BY "slug"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot backfill Empresa.slug: generated slugs are not unique';
  END IF;
END $$;

ALTER TABLE "Empresa" ALTER COLUMN "slug" SET NOT NULL;

CREATE UNIQUE INDEX "Empresa_slug_key" ON "Empresa"("slug");
