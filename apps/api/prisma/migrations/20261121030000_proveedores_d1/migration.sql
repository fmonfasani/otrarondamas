-- OR-B4-052, stage D1: the supplier's tax and commercial data, and the products each supplier
-- provides (its code, last cost, last purchase, and the usual supplier of each product).
-- Non-destructive: a new enum and nullable or defaulted columns; nothing is dropped or rewritten.

-- CreateEnum
CREATE TYPE "CondicionIva" AS ENUM ('RESPONSABLE_INSCRIPTO', 'MONOTRIBUTO', 'EXENTO', 'CONSUMIDOR_FINAL');

-- AlterTable
ALTER TABLE "ProductoProveedor" ADD COLUMN "codigoProveedor" TEXT,
ADD COLUMN "costoUnitario" DECIMAL(18,4),
ADD COLUMN "habitual" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "ultimaCompra" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Proveedor" ADD COLUMN "condicionIva" "CondicionIva",
ADD COLUMN "cuit" TEXT,
ADD COLUMN "plazoPagoDias" INTEGER;

-- At most one usual supplier per product (Prisma cannot express a partial unique index).
CREATE UNIQUE INDEX "ProductoProveedor_un_habitual_por_producto" ON "ProductoProveedor"("productoId") WHERE "habitual";

-- A CUIT is 11 digits; payment terms are 0 (cash) to 365 days.
ALTER TABLE "Proveedor" ADD CONSTRAINT "Proveedor_cuit_valido" CHECK ("cuit" IS NULL OR "cuit" ~ '^[0-9]{11}$');
ALTER TABLE "Proveedor" ADD CONSTRAINT "Proveedor_plazo_valido" CHECK ("plazoPagoDias" IS NULL OR "plazoPagoDias" BETWEEN 0 AND 365);

-- Products already bought from a supplier: link them, with the last cost and date of their purchases,
-- so the purchase suggestion has a usual supplier from the start (the most recent one).
INSERT INTO "ProductoProveedor" ("id", "empresaId", "productoId", "proveedorId", "costoUnitario", "ultimaCompra", "updatedAt")
SELECT gen_random_uuid()::text, last."empresaId", last."productoId", last."proveedorId", last."costoUnitario", last."fecha", CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT ON (ci."productoId", c."proveedorId")
         ci."empresaId", ci."productoId", c."proveedorId", ci."costoUnitario", c."fechaOrden" AS "fecha"
  FROM "CompraItem" ci
  JOIN "Compra" c ON c."empresaId" = ci."empresaId" AND c."id" = ci."compraId"
  ORDER BY ci."productoId", c."proveedorId", c."fechaOrden" DESC
) last
ON CONFLICT ("productoId", "proveedorId") DO UPDATE
  SET "costoUnitario" = EXCLUDED."costoUnitario", "ultimaCompra" = EXCLUDED."ultimaCompra";

UPDATE "ProductoProveedor" pp SET "habitual" = true
WHERE pp."id" IN (
  SELECT DISTINCT ON ("productoId") "id" FROM "ProductoProveedor"
  ORDER BY "productoId", "ultimaCompra" DESC NULLS LAST, "createdAt" DESC
);
