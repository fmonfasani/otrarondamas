-- ADR-DAT-020 (INIT-019 PR 4, module 1: sales and orders). FASE-2-BASE-SEGURA §4.2 and §5.4.
--
-- The lines of sales, orders, customer returns and carts get the business column, filled from their
-- header. Every reference of this module becomes composite: it carries the business, so a row can
-- only point to rows of its own business, whichever database role writes it.
-- On delete: RESTRICT (D3), except header -> lines that already cascaded. On update: RESTRICT (D5).

-- DropForeignKey
ALTER TABLE "Cart" DROP CONSTRAINT "Cart_customerId_fkey";

-- DropForeignKey
ALTER TABLE "CartItem" DROP CONSTRAINT "CartItem_cartId_fkey";

-- DropForeignKey
ALTER TABLE "CartItem" DROP CONSTRAINT "CartItem_productoId_fkey";

-- DropForeignKey
ALTER TABLE "DevolucionCliente" DROP CONSTRAINT "DevolucionCliente_clienteId_fkey";

-- DropForeignKey
ALTER TABLE "DevolucionCliente" DROP CONSTRAINT "DevolucionCliente_ventaId_fkey";

-- DropForeignKey
ALTER TABLE "DevolucionCliente" DROP CONSTRAINT "DevolucionCliente_createdBy_fkey";

-- DropForeignKey
ALTER TABLE "DevolucionClienteItem" DROP CONSTRAINT "DevolucionClienteItem_devolucionClienteId_fkey";

-- DropForeignKey
ALTER TABLE "DevolucionClienteItem" DROP CONSTRAINT "DevolucionClienteItem_ventaItemId_fkey";

-- DropForeignKey
ALTER TABLE "DevolucionClienteItem" DROP CONSTRAINT "DevolucionClienteItem_productoId_fkey";

-- DropForeignKey
ALTER TABLE "Reembolso" DROP CONSTRAINT "Reembolso_devolucionClienteId_fkey";

-- DropForeignKey
ALTER TABLE "Entrega" DROP CONSTRAINT "Entrega_pedidoId_fkey";

-- DropForeignKey
ALTER TABLE "Entrega" DROP CONSTRAINT "Entrega_preparadorId_fkey";

-- DropForeignKey
ALTER TABLE "Entrega" DROP CONSTRAINT "Entrega_repartidorId_fkey";

-- DropForeignKey
ALTER TABLE "Pedido" DROP CONSTRAINT "Pedido_clienteId_fkey";

-- DropForeignKey
ALTER TABLE "Pedido" DROP CONSTRAINT "Pedido_usuarioId_fkey";

-- DropForeignKey
ALTER TABLE "PedidoItem" DROP CONSTRAINT "PedidoItem_pedidoId_fkey";

-- DropForeignKey
ALTER TABLE "PedidoItem" DROP CONSTRAINT "PedidoItem_productoId_fkey";

-- DropForeignKey
ALTER TABLE "PedidoItem" DROP CONSTRAINT "PedidoItem_reglaFidelizacionId_fkey";

-- DropForeignKey
ALTER TABLE "Venta" DROP CONSTRAINT "Venta_clienteId_fkey";

-- DropForeignKey
ALTER TABLE "Venta" DROP CONSTRAINT "Venta_usuarioId_fkey";

-- DropForeignKey
ALTER TABLE "VentaItem" DROP CONSTRAINT "VentaItem_productoId_fkey";

-- DropForeignKey
ALTER TABLE "VentaItem" DROP CONSTRAINT "VentaItem_reglaFidelizacionId_fkey";

-- DropForeignKey
ALTER TABLE "VentaItem" DROP CONSTRAINT "VentaItem_ventaId_fkey";

-- AlterTable: the line takes its business from its header, then the column is required
ALTER TABLE "CartItem" ADD COLUMN "businessId" TEXT;
UPDATE "CartItem" AS c SET "businessId" = p."businessId" FROM "Cart" AS p WHERE p."id" = c."cartId";
ALTER TABLE "CartItem" ALTER COLUMN "businessId" SET NOT NULL;

-- AlterTable: the line takes its business from its header, then the column is required
ALTER TABLE "DevolucionClienteItem" ADD COLUMN "empresaId" TEXT;
UPDATE "DevolucionClienteItem" AS c SET "empresaId" = p."empresaId" FROM "DevolucionCliente" AS p WHERE p."id" = c."devolucionClienteId";
ALTER TABLE "DevolucionClienteItem" ALTER COLUMN "empresaId" SET NOT NULL;

-- AlterTable: the line takes its business from its header, then the column is required
ALTER TABLE "PedidoItem" ADD COLUMN "empresaId" TEXT;
UPDATE "PedidoItem" AS c SET "empresaId" = p."empresaId" FROM "Pedido" AS p WHERE p."id" = c."pedidoId";
ALTER TABLE "PedidoItem" ALTER COLUMN "empresaId" SET NOT NULL;

-- AlterTable: the line takes its business from its header, then the column is required
ALTER TABLE "VentaItem" ADD COLUMN "empresaId" TEXT;
UPDATE "VentaItem" AS c SET "empresaId" = p."empresaId" FROM "Venta" AS p WHERE p."id" = c."ventaId";
ALTER TABLE "VentaItem" ALTER COLUMN "empresaId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Cart_businessId_id_key" ON "Cart"("businessId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "DevolucionCliente_empresaId_id_key" ON "DevolucionCliente"("empresaId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Reembolso_empresaId_devolucionClienteId_key" ON "Reembolso"("empresaId", "devolucionClienteId");

-- CreateIndex
CREATE UNIQUE INDEX "Entrega_empresaId_pedidoId_key" ON "Entrega"("empresaId", "pedidoId");

-- CreateIndex
CREATE UNIQUE INDEX "Pedido_empresaId_id_key" ON "Pedido"("empresaId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Producto_empresaId_id_key" ON "Producto"("empresaId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "ReglaFidelizacion_empresaId_id_key" ON "ReglaFidelizacion"("empresaId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_empresaId_id_key" ON "Usuario"("empresaId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Venta_empresaId_id_key" ON "Venta"("empresaId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "VentaItem_empresaId_id_key" ON "VentaItem"("empresaId", "id");

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_customerId_businessId_fkey" FOREIGN KEY ("customerId", "businessId") REFERENCES "Cliente"("id", "empresaId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_businessId_cartId_fkey" FOREIGN KEY ("businessId", "cartId") REFERENCES "Cart"("businessId", "id") ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_businessId_productoId_fkey" FOREIGN KEY ("businessId", "productoId") REFERENCES "Producto"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "DevolucionCliente" ADD CONSTRAINT "DevolucionCliente_clienteId_empresaId_fkey" FOREIGN KEY ("clienteId", "empresaId") REFERENCES "Cliente"("id", "empresaId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "DevolucionCliente" ADD CONSTRAINT "DevolucionCliente_empresaId_ventaId_fkey" FOREIGN KEY ("empresaId", "ventaId") REFERENCES "Venta"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "DevolucionCliente" ADD CONSTRAINT "DevolucionCliente_empresaId_createdBy_fkey" FOREIGN KEY ("empresaId", "createdBy") REFERENCES "Usuario"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "DevolucionClienteItem" ADD CONSTRAINT "DevolucionClienteItem_empresaId_devolucionClienteId_fkey" FOREIGN KEY ("empresaId", "devolucionClienteId") REFERENCES "DevolucionCliente"("empresaId", "id") ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "DevolucionClienteItem" ADD CONSTRAINT "DevolucionClienteItem_empresaId_ventaItemId_fkey" FOREIGN KEY ("empresaId", "ventaItemId") REFERENCES "VentaItem"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "DevolucionClienteItem" ADD CONSTRAINT "DevolucionClienteItem_empresaId_productoId_fkey" FOREIGN KEY ("empresaId", "productoId") REFERENCES "Producto"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Reembolso" ADD CONSTRAINT "Reembolso_empresaId_devolucionClienteId_fkey" FOREIGN KEY ("empresaId", "devolucionClienteId") REFERENCES "DevolucionCliente"("empresaId", "id") ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Entrega" ADD CONSTRAINT "Entrega_empresaId_pedidoId_fkey" FOREIGN KEY ("empresaId", "pedidoId") REFERENCES "Pedido"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Entrega" ADD CONSTRAINT "Entrega_empresaId_preparadorId_fkey" FOREIGN KEY ("empresaId", "preparadorId") REFERENCES "Usuario"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Entrega" ADD CONSTRAINT "Entrega_empresaId_repartidorId_fkey" FOREIGN KEY ("empresaId", "repartidorId") REFERENCES "Usuario"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_clienteId_empresaId_fkey" FOREIGN KEY ("clienteId", "empresaId") REFERENCES "Cliente"("id", "empresaId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_empresaId_usuarioId_fkey" FOREIGN KEY ("empresaId", "usuarioId") REFERENCES "Usuario"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "PedidoItem" ADD CONSTRAINT "PedidoItem_empresaId_pedidoId_fkey" FOREIGN KEY ("empresaId", "pedidoId") REFERENCES "Pedido"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "PedidoItem" ADD CONSTRAINT "PedidoItem_empresaId_productoId_fkey" FOREIGN KEY ("empresaId", "productoId") REFERENCES "Producto"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "PedidoItem" ADD CONSTRAINT "PedidoItem_empresaId_reglaFidelizacionId_fkey" FOREIGN KEY ("empresaId", "reglaFidelizacionId") REFERENCES "ReglaFidelizacion"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Venta" ADD CONSTRAINT "Venta_clienteId_empresaId_fkey" FOREIGN KEY ("clienteId", "empresaId") REFERENCES "Cliente"("id", "empresaId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Venta" ADD CONSTRAINT "Venta_empresaId_usuarioId_fkey" FOREIGN KEY ("empresaId", "usuarioId") REFERENCES "Usuario"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "VentaItem" ADD CONSTRAINT "VentaItem_empresaId_productoId_fkey" FOREIGN KEY ("empresaId", "productoId") REFERENCES "Producto"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "VentaItem" ADD CONSTRAINT "VentaItem_empresaId_reglaFidelizacionId_fkey" FOREIGN KEY ("empresaId", "reglaFidelizacionId") REFERENCES "ReglaFidelizacion"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "VentaItem" ADD CONSTRAINT "VentaItem_empresaId_ventaId_fkey" FOREIGN KEY ("empresaId", "ventaId") REFERENCES "Venta"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

