-- ADR-DAT-020 (INIT-019 PR 4, module 4a: cash and payments). FASE-2-BASE-SEGURA §4.2 and §5.4.
--
-- Cash openings, counts, closings and movements, and payment applications get the business column,
-- filled from their header. Every reference of this module becomes composite: it carries the business,
-- so a row can only point to rows of its own business, whichever database role writes it.
-- On delete: RESTRICT (D3). On update: RESTRICT (D5).
-- Pago.deudaId keeps its historical name: it references CuentaCorriente, as it did before.

-- DropForeignKey
ALTER TABLE "AperturaCaja" DROP CONSTRAINT "AperturaCaja_cajaId_fkey";

-- DropForeignKey
ALTER TABLE "AperturaCaja" DROP CONSTRAINT "AperturaCaja_usuarioId_fkey";

-- DropForeignKey
ALTER TABLE "AplicacionPago" DROP CONSTRAINT "AplicacionPago_deudaId_fkey";

-- DropForeignKey
ALTER TABLE "AplicacionPago" DROP CONSTRAINT "AplicacionPago_pagoId_fkey";

-- DropForeignKey
ALTER TABLE "ArqueoCaja" DROP CONSTRAINT "ArqueoCaja_aperturaCajaId_fkey";

-- DropForeignKey
ALTER TABLE "ArqueoCaja" DROP CONSTRAINT "ArqueoCaja_autorizacionId_fkey";

-- DropForeignKey
ALTER TABLE "ArqueoCaja" DROP CONSTRAINT "ArqueoCaja_cajaId_fkey";

-- DropForeignKey
ALTER TABLE "ArqueoCaja" DROP CONSTRAINT "ArqueoCaja_usuarioEntranteId_fkey";

-- DropForeignKey
ALTER TABLE "ArqueoCaja" DROP CONSTRAINT "ArqueoCaja_usuarioId_fkey";

-- DropForeignKey
ALTER TABLE "Autorizacion" DROP CONSTRAINT "Autorizacion_autorizadorId_fkey";

-- DropForeignKey
ALTER TABLE "CierreCaja" DROP CONSTRAINT "CierreCaja_aperturaCajaId_fkey";

-- DropForeignKey
ALTER TABLE "CierreCaja" DROP CONSTRAINT "CierreCaja_usuarioId_fkey";

-- DropForeignKey
ALTER TABLE "CuentaCorriente" DROP CONSTRAINT "CuentaCorriente_clienteId_fkey";

-- DropForeignKey
ALTER TABLE "Deuda" DROP CONSTRAINT "Deuda_clienteId_fkey";

-- DropForeignKey
ALTER TABLE "Deuda" DROP CONSTRAINT "Deuda_cuentaCorrienteId_fkey";

-- DropForeignKey
ALTER TABLE "Deuda" DROP CONSTRAINT "Deuda_ventaId_fkey";

-- DropForeignKey
ALTER TABLE "MovimientoCaja" DROP CONSTRAINT "MovimientoCaja_aperturaCajaId_fkey";

-- DropForeignKey
ALTER TABLE "MovimientoCaja" DROP CONSTRAINT "MovimientoCaja_cajaId_fkey";

-- DropForeignKey
ALTER TABLE "MovimientoCaja" DROP CONSTRAINT "MovimientoCaja_usuarioId_fkey";

-- DropForeignKey
ALTER TABLE "Pago" DROP CONSTRAINT "Pago_deudaId_fkey";

-- DropForeignKey
ALTER TABLE "Pago" DROP CONSTRAINT "Pago_pedidoId_fkey";

-- DropForeignKey
ALTER TABLE "Pago" DROP CONSTRAINT "Pago_usuarioId_fkey";

-- DropForeignKey
ALTER TABLE "Pago" DROP CONSTRAINT "Pago_ventaId_fkey";

-- AlterTable: the row takes its business from its header, then the column is required
ALTER TABLE "AperturaCaja" ADD COLUMN "empresaId" TEXT;
UPDATE "AperturaCaja" AS c SET "empresaId" = p."empresaId" FROM "Caja" AS p WHERE p."id" = c."cajaId";
ALTER TABLE "AperturaCaja" ALTER COLUMN "empresaId" SET NOT NULL;

-- AlterTable: the row takes its business from its header, then the column is required
ALTER TABLE "ArqueoCaja" ADD COLUMN "empresaId" TEXT;
UPDATE "ArqueoCaja" AS c SET "empresaId" = p."empresaId" FROM "Caja" AS p WHERE p."id" = c."cajaId";
ALTER TABLE "ArqueoCaja" ALTER COLUMN "empresaId" SET NOT NULL;

-- AlterTable: the row takes its business from its header, then the column is required
ALTER TABLE "MovimientoCaja" ADD COLUMN "empresaId" TEXT;
UPDATE "MovimientoCaja" AS c SET "empresaId" = p."empresaId" FROM "Caja" AS p WHERE p."id" = c."cajaId";
ALTER TABLE "MovimientoCaja" ALTER COLUMN "empresaId" SET NOT NULL;

-- AlterTable: the row takes its business from its header, then the column is required
ALTER TABLE "CierreCaja" ADD COLUMN "empresaId" TEXT;
UPDATE "CierreCaja" AS c SET "empresaId" = p."empresaId" FROM "AperturaCaja" AS p WHERE p."id" = c."aperturaCajaId";
ALTER TABLE "CierreCaja" ALTER COLUMN "empresaId" SET NOT NULL;

-- AlterTable: the row takes its business from its header, then the column is required
ALTER TABLE "AplicacionPago" ADD COLUMN "empresaId" TEXT;
UPDATE "AplicacionPago" AS c SET "empresaId" = p."empresaId" FROM "Pago" AS p WHERE p."id" = c."pagoId";
ALTER TABLE "AplicacionPago" ALTER COLUMN "empresaId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "AperturaCaja_empresaId_id_key" ON "AperturaCaja"("empresaId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Autorizacion_empresaId_id_key" ON "Autorizacion"("empresaId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Caja_empresaId_id_key" ON "Caja"("empresaId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "CierreCaja_empresaId_aperturaCajaId_key" ON "CierreCaja"("empresaId", "aperturaCajaId");

-- CreateIndex
CREATE UNIQUE INDEX "CuentaCorriente_empresaId_id_key" ON "CuentaCorriente"("empresaId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Deuda_empresaId_id_key" ON "Deuda"("empresaId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Pago_empresaId_id_key" ON "Pago"("empresaId", "id");

-- AddForeignKey
ALTER TABLE "AperturaCaja" ADD CONSTRAINT "AperturaCaja_empresaId_cajaId_fkey" FOREIGN KEY ("empresaId", "cajaId") REFERENCES "Caja"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AperturaCaja" ADD CONSTRAINT "AperturaCaja_empresaId_usuarioId_fkey" FOREIGN KEY ("empresaId", "usuarioId") REFERENCES "Usuario"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AplicacionPago" ADD CONSTRAINT "AplicacionPago_empresaId_deudaId_fkey" FOREIGN KEY ("empresaId", "deudaId") REFERENCES "Deuda"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AplicacionPago" ADD CONSTRAINT "AplicacionPago_empresaId_pagoId_fkey" FOREIGN KEY ("empresaId", "pagoId") REFERENCES "Pago"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ArqueoCaja" ADD CONSTRAINT "ArqueoCaja_empresaId_aperturaCajaId_fkey" FOREIGN KEY ("empresaId", "aperturaCajaId") REFERENCES "AperturaCaja"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ArqueoCaja" ADD CONSTRAINT "ArqueoCaja_empresaId_autorizacionId_fkey" FOREIGN KEY ("empresaId", "autorizacionId") REFERENCES "Autorizacion"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ArqueoCaja" ADD CONSTRAINT "ArqueoCaja_empresaId_cajaId_fkey" FOREIGN KEY ("empresaId", "cajaId") REFERENCES "Caja"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ArqueoCaja" ADD CONSTRAINT "ArqueoCaja_empresaId_usuarioEntranteId_fkey" FOREIGN KEY ("empresaId", "usuarioEntranteId") REFERENCES "Usuario"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ArqueoCaja" ADD CONSTRAINT "ArqueoCaja_empresaId_usuarioId_fkey" FOREIGN KEY ("empresaId", "usuarioId") REFERENCES "Usuario"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Autorizacion" ADD CONSTRAINT "Autorizacion_empresaId_autorizadorId_fkey" FOREIGN KEY ("empresaId", "autorizadorId") REFERENCES "Usuario"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CierreCaja" ADD CONSTRAINT "CierreCaja_empresaId_aperturaCajaId_fkey" FOREIGN KEY ("empresaId", "aperturaCajaId") REFERENCES "AperturaCaja"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CierreCaja" ADD CONSTRAINT "CierreCaja_empresaId_usuarioId_fkey" FOREIGN KEY ("empresaId", "usuarioId") REFERENCES "Usuario"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CuentaCorriente" ADD CONSTRAINT "CuentaCorriente_clienteId_empresaId_fkey" FOREIGN KEY ("clienteId", "empresaId") REFERENCES "Cliente"("id", "empresaId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Deuda" ADD CONSTRAINT "Deuda_clienteId_empresaId_fkey" FOREIGN KEY ("clienteId", "empresaId") REFERENCES "Cliente"("id", "empresaId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Deuda" ADD CONSTRAINT "Deuda_empresaId_cuentaCorrienteId_fkey" FOREIGN KEY ("empresaId", "cuentaCorrienteId") REFERENCES "CuentaCorriente"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Deuda" ADD CONSTRAINT "Deuda_empresaId_ventaId_fkey" FOREIGN KEY ("empresaId", "ventaId") REFERENCES "Venta"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "MovimientoCaja" ADD CONSTRAINT "MovimientoCaja_empresaId_aperturaCajaId_fkey" FOREIGN KEY ("empresaId", "aperturaCajaId") REFERENCES "AperturaCaja"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "MovimientoCaja" ADD CONSTRAINT "MovimientoCaja_empresaId_cajaId_fkey" FOREIGN KEY ("empresaId", "cajaId") REFERENCES "Caja"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "MovimientoCaja" ADD CONSTRAINT "MovimientoCaja_empresaId_usuarioId_fkey" FOREIGN KEY ("empresaId", "usuarioId") REFERENCES "Usuario"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_empresaId_deudaId_fkey" FOREIGN KEY ("empresaId", "deudaId") REFERENCES "CuentaCorriente"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_empresaId_pedidoId_fkey" FOREIGN KEY ("empresaId", "pedidoId") REFERENCES "Pedido"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_empresaId_usuarioId_fkey" FOREIGN KEY ("empresaId", "usuarioId") REFERENCES "Usuario"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_empresaId_ventaId_fkey" FOREIGN KEY ("empresaId", "ventaId") REFERENCES "Venta"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;
