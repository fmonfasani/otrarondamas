-- Inc-1: Integridad del módulo de ventas (spec-modulos_ventas §15)
-- 1. Enum EstadoVenta reemplaza el campo String "CONFIRMADA"/"ANULADA" (C11)
-- 2. Venta.idempotencyKey para evitar doble confirmación (INV-VTA-07)
-- 3. Pago.montoRecibido, Pago.vuelto (RF-VTA-15, C19) y Pago.referencia (RF-VTA-16, C16)

-- CreateEnum
CREATE TYPE "EstadoVenta" AS ENUM ('CONFIRMADA', 'ANULADA');

-- AlterTable: convertir Venta.estado de String a EstadoVenta
-- Paso 1: agregar columna nueva nullable
ALTER TABLE "Venta" ADD COLUMN "estadoVenta" "EstadoVenta";

-- Paso 2: poblar desde el valor String existente
UPDATE "Venta" SET "estadoVenta" = 'CONFIRMADA'::"EstadoVenta" WHERE estado = 'CONFIRMADA';
UPDATE "Venta" SET "estadoVenta" = 'ANULADA'::"EstadoVenta" WHERE estado = 'ANULADA';
-- Fallback: cualquier valor desconocido queda CONFIRMADA
UPDATE "Venta" SET "estadoVenta" = 'CONFIRMADA'::"EstadoVenta" WHERE "estadoVenta" IS NULL;

-- Paso 3: hacer NOT NULL y setear default
ALTER TABLE "Venta" ALTER COLUMN "estadoVenta" SET NOT NULL;
ALTER TABLE "Venta" ALTER COLUMN "estadoVenta" SET DEFAULT 'CONFIRMADA'::"EstadoVenta";

-- Paso 4: eliminar columna String vieja y renombrar
ALTER TABLE "Venta" DROP COLUMN "estado";
ALTER TABLE "Venta" RENAME COLUMN "estadoVenta" TO "estado";

-- AlterTable: idempotencyKey en Venta
ALTER TABLE "Venta" ADD COLUMN "idempotencyKey" TEXT;

-- CreateIndex: único sobre idempotencyKey (NULL no viola la unicidad en Postgres)
CREATE UNIQUE INDEX "Venta_idempotencyKey_key" ON "Venta"("idempotencyKey");

-- AlterTable: campos de cobro en Pago
ALTER TABLE "Pago" ADD COLUMN "montoRecibido" DECIMAL(65,30);
ALTER TABLE "Pago" ADD COLUMN "vuelto" DECIMAL(65,30);
ALTER TABLE "Pago" ADD COLUMN "referencia" TEXT;
