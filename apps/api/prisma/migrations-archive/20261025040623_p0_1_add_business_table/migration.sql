-- P0-1: Add Business table (replica of Empresa schema)
-- This migration creates the Business table while preserving Empresa for backward compatibility
-- During transition (Phase 1), both tables coexist. Empresa is deprecated but kept for dual-read.
-- Rollback: Drop Business table (non-destructive)

-- Step 1: Create Business table with identical schema to Empresa
CREATE TABLE "Business" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "nombre" TEXT NOT NULL UNIQUE,
  "slug" TEXT NOT NULL UNIQUE,
  "configuracion" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Step 2: Copy all Empresa rows to Business (backfill)
-- This ensures 100% data parity before any code switches to use Business
INSERT INTO "Business" ("id", "nombre", "slug", "configuracion", "createdAt", "updatedAt")
SELECT "id", "nombre", "slug", "configuracion", "createdAt", "updatedAt"
FROM "Empresa"
WHERE TRUE;

-- Step 3: Add businessId FK to all models that had empresaId
-- Pattern: Add the FK column first (nullable to avoid constraint violations during migration),
-- then backfill with corresponding empresaId values, then make NOT NULL if needed.

ALTER TABLE "Usuario" ADD COLUMN "businessId" TEXT;
UPDATE "Usuario" SET "businessId" = "empresaId" WHERE "empresaId" IS NOT NULL;
ALTER TABLE "Usuario" ALTER COLUMN "businessId" SET NOT NULL;
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Usuario_businessId_idx" ON "Usuario"("businessId");

ALTER TABLE "Familia" ADD COLUMN "businessId" TEXT;
UPDATE "Familia" SET "businessId" = "empresaId" WHERE "empresaId" IS NOT NULL;
ALTER TABLE "Familia" ALTER COLUMN "businessId" SET NOT NULL;
ALTER TABLE "Familia" ADD CONSTRAINT "Familia_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Familia_businessId_idx" ON "Familia"("businessId");

ALTER TABLE "Subfamilia" ADD COLUMN "businessId" TEXT;
UPDATE "Subfamilia" SET "businessId" = "empresaId" WHERE "empresaId" IS NOT NULL;
ALTER TABLE "Subfamilia" ALTER COLUMN "businessId" SET NOT NULL;
ALTER TABLE "Subfamilia" ADD CONSTRAINT "Subfamilia_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Subfamilia_businessId_idx" ON "Subfamilia"("businessId");

ALTER TABLE "Tipo" ADD COLUMN "businessId" TEXT;
UPDATE "Tipo" SET "businessId" = "empresaId" WHERE "empresaId" IS NOT NULL;
ALTER TABLE "Tipo" ALTER COLUMN "businessId" SET NOT NULL;
ALTER TABLE "Tipo" ADD CONSTRAINT "Tipo_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Tipo_businessId_idx" ON "Tipo"("businessId");

ALTER TABLE "Subtipo" ADD COLUMN "businessId" TEXT;
UPDATE "Subtipo" SET "businessId" = "empresaId" WHERE "empresaId" IS NOT NULL;
ALTER TABLE "Subtipo" ALTER COLUMN "businessId" SET NOT NULL;
ALTER TABLE "Subtipo" ADD CONSTRAINT "Subtipo_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Subtipo_businessId_idx" ON "Subtipo"("businessId");

ALTER TABLE "ProductoProveedor" ADD COLUMN "businessId" TEXT;
UPDATE "ProductoProveedor" SET "businessId" = "empresaId" WHERE "empresaId" IS NOT NULL;
ALTER TABLE "ProductoProveedor" ALTER COLUMN "businessId" SET NOT NULL;
ALTER TABLE "ProductoProveedor" ADD CONSTRAINT "ProductoProveedor_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "ProductoProveedor_businessId_idx" ON "ProductoProveedor"("businessId");

ALTER TABLE "Producto" ADD COLUMN "businessId" TEXT;
UPDATE "Producto" SET "businessId" = "empresaId" WHERE "empresaId" IS NOT NULL;
ALTER TABLE "Producto" ALTER COLUMN "businessId" SET NOT NULL;
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Producto_businessId_idx" ON "Producto"("businessId");

ALTER TABLE "Presentacion" ADD COLUMN "businessId" TEXT;
UPDATE "Presentacion" SET "businessId" = "empresaId" WHERE "empresaId" IS NOT NULL;
ALTER TABLE "Presentacion" ALTER COLUMN "businessId" SET NOT NULL;
ALTER TABLE "Presentacion" ADD CONSTRAINT "Presentacion_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Presentacion_businessId_idx" ON "Presentacion"("businessId");

ALTER TABLE "Lote" ADD COLUMN "businessId" TEXT;
UPDATE "Lote" SET "businessId" = "empresaId" WHERE "empresaId" IS NOT NULL;
ALTER TABLE "Lote" ALTER COLUMN "businessId" SET NOT NULL;
ALTER TABLE "Lote" ADD CONSTRAINT "Lote_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Lote_businessId_idx" ON "Lote"("businessId");

ALTER TABLE "Cliente" ADD COLUMN "businessId" TEXT;
UPDATE "Cliente" SET "businessId" = "empresaId" WHERE "empresaId" IS NOT NULL;
ALTER TABLE "Cliente" ALTER COLUMN "businessId" SET NOT NULL;
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Cliente_businessId_idx" ON "Cliente"("businessId");

ALTER TABLE "Caja" ADD COLUMN "businessId" TEXT;
UPDATE "Caja" SET "businessId" = "empresaId" WHERE "empresaId" IS NOT NULL;
ALTER TABLE "Caja" ALTER COLUMN "businessId" SET NOT NULL;
ALTER TABLE "Caja" ADD CONSTRAINT "Caja_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Caja_businessId_idx" ON "Caja"("businessId");

ALTER TABLE "Proveedor" ADD COLUMN "businessId" TEXT;
UPDATE "Proveedor" SET "businessId" = "empresaId" WHERE "empresaId" IS NOT NULL;
ALTER TABLE "Proveedor" ALTER COLUMN "businessId" SET NOT NULL;
ALTER TABLE "Proveedor" ADD CONSTRAINT "Proveedor_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Proveedor_businessId_idx" ON "Proveedor"("businessId");

ALTER TABLE "Venta" ADD COLUMN "businessId" TEXT;
UPDATE "Venta" SET "businessId" = "empresaId" WHERE "empresaId" IS NOT NULL;
ALTER TABLE "Venta" ALTER COLUMN "businessId" SET NOT NULL;
ALTER TABLE "Venta" ADD CONSTRAINT "Venta_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Venta_businessId_idx" ON "Venta"("businessId");

ALTER TABLE "Pedido" ADD COLUMN "businessId" TEXT;
UPDATE "Pedido" SET "businessId" = "empresaId" WHERE "empresaId" IS NOT NULL;
ALTER TABLE "Pedido" ALTER COLUMN "businessId" SET NOT NULL;
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Pedido_businessId_idx" ON "Pedido"("businessId");

ALTER TABLE "Pago" ADD COLUMN "businessId" TEXT;
UPDATE "Pago" SET "businessId" = "empresaId" WHERE "empresaId" IS NOT NULL;
ALTER TABLE "Pago" ALTER COLUMN "businessId" SET NOT NULL;
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Pago_businessId_idx" ON "Pago"("businessId");

ALTER TABLE "CuentaCorriente" ADD COLUMN "businessId" TEXT;
UPDATE "CuentaCorriente" SET "businessId" = "empresaId" WHERE "empresaId" IS NOT NULL;
ALTER TABLE "CuentaCorriente" ALTER COLUMN "businessId" SET NOT NULL;
ALTER TABLE "CuentaCorriente" ADD CONSTRAINT "CuentaCorriente_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "CuentaCorriente_businessId_idx" ON "CuentaCorriente"("businessId");

ALTER TABLE "Deuda" ADD COLUMN "businessId" TEXT;
UPDATE "Deuda" SET "businessId" = "empresaId" WHERE "empresaId" IS NOT NULL;
ALTER TABLE "Deuda" ALTER COLUMN "businessId" SET NOT NULL;
ALTER TABLE "Deuda" ADD CONSTRAINT "Deuda_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Deuda_businessId_idx" ON "Deuda"("businessId");

ALTER TABLE "Compra" ADD COLUMN "businessId" TEXT;
UPDATE "Compra" SET "businessId" = "empresaId" WHERE "empresaId" IS NOT NULL;
ALTER TABLE "Compra" ALTER COLUMN "businessId" SET NOT NULL;
ALTER TABLE "Compra" ADD CONSTRAINT "Compra_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Compra_businessId_idx" ON "Compra"("businessId");

ALTER TABLE "RecepcionCompra" ADD COLUMN "businessId" TEXT;
UPDATE "RecepcionCompra" SET "businessId" = "empresaId" WHERE "empresaId" IS NOT NULL;
ALTER TABLE "RecepcionCompra" ALTER COLUMN "businessId" SET NOT NULL;
ALTER TABLE "RecepcionCompra" ADD CONSTRAINT "RecepcionCompra_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "RecepcionCompra_businessId_idx" ON "RecepcionCompra"("businessId");

ALTER TABLE "MovimientoStock" ADD COLUMN "businessId" TEXT;
UPDATE "MovimientoStock" SET "businessId" = "empresaId" WHERE "empresaId" IS NOT NULL;
ALTER TABLE "MovimientoStock" ALTER COLUMN "businessId" SET NOT NULL;
ALTER TABLE "MovimientoStock" ADD CONSTRAINT "MovimientoStock_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "MovimientoStock_businessId_idx" ON "MovimientoStock"("businessId");

ALTER TABLE "Entrega" ADD COLUMN "businessId" TEXT;
UPDATE "Entrega" SET "businessId" = "empresaId" WHERE "empresaId" IS NOT NULL;
ALTER TABLE "Entrega" ALTER COLUMN "businessId" SET NOT NULL;
ALTER TABLE "Entrega" ADD CONSTRAINT "Entrega_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Entrega_businessId_idx" ON "Entrega"("businessId");

ALTER TABLE "Notificacion" ADD COLUMN "businessId" TEXT;
UPDATE "Notificacion" SET "businessId" = "empresaId" WHERE "empresaId" IS NOT NULL;
ALTER TABLE "Notificacion" ALTER COLUMN "businessId" SET NOT NULL;
ALTER TABLE "Notificacion" ADD CONSTRAINT "Notificacion_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Notificacion_businessId_idx" ON "Notificacion"("businessId");

ALTER TABLE "ReglaFidelizacion" ADD COLUMN "businessId" TEXT;
UPDATE "ReglaFidelizacion" SET "businessId" = "empresaId" WHERE "empresaId" IS NOT NULL;
ALTER TABLE "ReglaFidelizacion" ALTER COLUMN "businessId" SET NOT NULL;
ALTER TABLE "ReglaFidelizacion" ADD CONSTRAINT "ReglaFidelizacion_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "ReglaFidelizacion_businessId_idx" ON "ReglaFidelizacion"("businessId");

ALTER TABLE "Invitacion" ADD COLUMN "businessId" TEXT;
UPDATE "Invitacion" SET "businessId" = "empresaId" WHERE "empresaId" IS NOT NULL;
ALTER TABLE "Invitacion" ALTER COLUMN "businessId" SET NOT NULL;
ALTER TABLE "Invitacion" ADD CONSTRAINT "Invitacion_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Invitacion_businessId_idx" ON "Invitacion"("businessId");

ALTER TABLE "Membership" ADD COLUMN "businessId" TEXT;
UPDATE "Membership" SET "businessId" = (SELECT "empresaId" FROM "Empresa" WHERE "Empresa"."id" = "Membership"."businessId" LIMIT 1) WHERE "businessId" IS NOT NULL;
ALTER TABLE "Membership" ALTER COLUMN "businessId" SET NOT NULL;

ALTER TABLE "AuditLog" ADD COLUMN "businessId" TEXT;
UPDATE "AuditLog" SET "businessId" = "empresaId" WHERE "empresaId" IS NOT NULL;
ALTER TABLE "AuditLog" ALTER COLUMN "businessId" SET NOT NULL;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "AuditLog_businessId_idx" ON "AuditLog"("businessId");

ALTER TABLE "PagoProveedor" ADD COLUMN "businessId" TEXT;
UPDATE "PagoProveedor" SET "businessId" = "empresaId" WHERE "empresaId" IS NOT NULL;
ALTER TABLE "PagoProveedor" ALTER COLUMN "businessId" SET NOT NULL;
ALTER TABLE "PagoProveedor" ADD CONSTRAINT "PagoProveedor_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "PagoProveedor_businessId_idx" ON "PagoProveedor"("businessId");

ALTER TABLE "DevolucionProveedor" ADD COLUMN "businessId" TEXT;
UPDATE "DevolucionProveedor" SET "businessId" = "empresaId" WHERE "empresaId" IS NOT NULL;
ALTER TABLE "DevolucionProveedor" ALTER COLUMN "businessId" SET NOT NULL;
ALTER TABLE "DevolucionProveedor" ADD CONSTRAINT "DevolucionProveedor_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "DevolucionProveedor_businessId_idx" ON "DevolucionProveedor"("businessId");

ALTER TABLE "Autorizacion" ADD COLUMN "businessId" TEXT;
UPDATE "Autorizacion" SET "businessId" = "empresaId" WHERE "empresaId" IS NOT NULL;
ALTER TABLE "Autorizacion" ALTER COLUMN "businessId" SET NOT NULL;
ALTER TABLE "Autorizacion" ADD CONSTRAINT "Autorizacion_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Autorizacion_businessId_idx" ON "Autorizacion"("businessId");

ALTER TABLE "Cart" ADD COLUMN "businessId" TEXT;
UPDATE "Cart" SET "businessId" = "businessId" WHERE "businessId" IS NOT NULL;
ALTER TABLE "Cart" ALTER COLUMN "businessId" SET NOT NULL;

-- Note: Messaging models (Conversation, ConversationParticipant, Message, etc.) already use businessId
-- pointing to Empresa. These will be updated in P1-1 to also point to Business if needed.
