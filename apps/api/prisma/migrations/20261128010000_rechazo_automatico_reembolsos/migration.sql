-- OR-B4-055 (Owner, 2026-11-27) — a paid order not accepted within 3 minutes is rejected and
-- refunded automatically; so is one the store or the customer cancels. The deadline and each
-- refund (attempts, result) are kept here, never only in memory. Additive only.

-- CreateEnum
CREATE TYPE "EstadoReembolsoPedido" AS ENUM ('PENDIENTE', 'REALIZADO', 'FALLIDO');

-- AlterTable
ALTER TABLE "Pedido" ADD COLUMN     "aceptarAntes" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ReembolsoPedido" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "pagoId" TEXT NOT NULL,
    "monto" DECIMAL(18,2) NOT NULL,
    "motivo" TEXT NOT NULL,
    "estado" "EstadoReembolsoPedido" NOT NULL DEFAULT 'PENDIENTE',
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "proximoIntento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimoError" TEXT,
    "referenciaMp" TEXT,
    "realizadoAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReembolsoPedido_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReembolsoPedido_estado_proximoIntento_idx" ON "ReembolsoPedido"("estado", "proximoIntento");

-- CreateIndex
CREATE UNIQUE INDEX "ReembolsoPedido_empresaId_id_key" ON "ReembolsoPedido"("empresaId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "ReembolsoPedido_empresaId_pagoId_key" ON "ReembolsoPedido"("empresaId", "pagoId");

-- CreateIndex
CREATE INDEX "Pedido_estado_aceptarAntes_idx" ON "Pedido"("estado", "aceptarAntes");

-- AddForeignKey
ALTER TABLE "ReembolsoPedido" ADD CONSTRAINT "ReembolsoPedido_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReembolsoPedido" ADD CONSTRAINT "ReembolsoPedido_empresaId_pedidoId_fkey" FOREIGN KEY ("empresaId", "pedidoId") REFERENCES "Pedido"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ReembolsoPedido" ADD CONSTRAINT "ReembolsoPedido_empresaId_pagoId_fkey" FOREIGN KEY ("empresaId", "pagoId") REFERENCES "Pago"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;


-- Fase 2 (ADR-DAT-019): one business per connection, like every business table.
ALTER TABLE "ReembolsoPedido" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "ReembolsoPedido" USING ("empresaId" = current_setting('app.business_id', true)) WITH CHECK ("empresaId" = current_setting('app.business_id', true));
