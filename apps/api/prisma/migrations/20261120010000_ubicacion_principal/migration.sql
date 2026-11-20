-- OR-B4-015 / R8-INV-003 (#166), stage B4: stock locations. Every business has one main location
-- («Principal») and every lot is in a location. More locations and transfers come later.
-- OR-B4-050: deleting a whole business deletes its locations (the only exception to ADR-DAT-020 D3);
-- a location that still holds lots cannot be deleted. Non-destructive: nothing is dropped.

-- CreateTable
CREATE TABLE "Ubicacion" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "principal" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ubicacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Ubicacion_empresaId_id_key" ON "Ubicacion"("empresaId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Ubicacion_empresaId_nombre_key" ON "Ubicacion"("empresaId", "nombre");

-- One main location per business (Prisma cannot express a partial unique index).
CREATE UNIQUE INDEX "Ubicacion_una_principal_por_negocio" ON "Ubicacion"("empresaId") WHERE "principal";

-- AddForeignKey
ALTER TABLE "Ubicacion" ADD CONSTRAINT "Ubicacion_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- The main location of every existing business.
INSERT INTO "Ubicacion" ("id", "empresaId", "nombre", "principal", "updatedAt")
SELECT gen_random_uuid()::text, e."id", 'Principal', true, CURRENT_TIMESTAMP
FROM "Empresa" e;

-- AlterTable: every existing lot goes to its business's main location.
ALTER TABLE "Lote" ADD COLUMN "ubicacionId" TEXT;

UPDATE "Lote" l
SET "ubicacionId" = u."id"
FROM "Ubicacion" u
WHERE u."empresaId" = l."empresaId" AND u."principal";

ALTER TABLE "Lote" ALTER COLUMN "ubicacionId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Lote_ubicacionId_idx" ON "Lote"("ubicacionId");

-- AddForeignKey
ALTER TABLE "Lote" ADD CONSTRAINT "Lote_empresaId_ubicacionId_fkey" FOREIGN KEY ("empresaId", "ubicacionId") REFERENCES "Ubicacion"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- A new business gets its main location.
CREATE FUNCTION wapsell_ubicacion_principal_de_empresa() RETURNS trigger AS $$
BEGIN
  INSERT INTO "Ubicacion" ("id", "empresaId", "nombre", "principal", "updatedAt")
  VALUES (gen_random_uuid()::text, NEW."id", 'Principal', true, CURRENT_TIMESTAMP)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER "Empresa_ubicacion_principal"
  AFTER INSERT ON "Empresa"
  FOR EACH ROW EXECUTE FUNCTION wapsell_ubicacion_principal_de_empresa();

-- A lot created without a location goes to its business's main location (creating it if the
-- business somehow has none), so every path that creates lots keeps working as it is.
CREATE FUNCTION wapsell_lote_ubicacion_principal() RETURNS trigger AS $$
BEGIN
  IF NEW."ubicacionId" IS NULL THEN
    INSERT INTO "Ubicacion" ("id", "empresaId", "nombre", "principal", "updatedAt")
    VALUES (gen_random_uuid()::text, NEW."empresaId", 'Principal', true, CURRENT_TIMESTAMP)
    ON CONFLICT DO NOTHING;
    SELECT u."id" INTO NEW."ubicacionId"
    FROM "Ubicacion" u
    WHERE u."empresaId" = NEW."empresaId" AND u."principal";
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER "Lote_ubicacion_principal"
  BEFORE INSERT ON "Lote"
  FOR EACH ROW EXECUTE FUNCTION wapsell_lote_ubicacion_principal();
