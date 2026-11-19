-- INIT-019 PR 4, module 2 (purchases and stock), ADR-DAT-020: every reference between business tables
-- carries the business, so a purchase, a reception, a supplier payment or return, a lot or a stock
-- movement can only point to rows of its own business. Restrict on delete and on update (D3, D5).
-- Purchase lines and supplier return lines get their business, filled from their header.

-- DropForeignKey
ALTER TABLE "Compra" DROP CONSTRAINT "Compra_proveedorId_fkey";

-- DropForeignKey
ALTER TABLE "Compra" DROP CONSTRAINT "Compra_usuarioId_fkey";

-- DropForeignKey
ALTER TABLE "CompraItem" DROP CONSTRAINT "CompraItem_compraId_fkey";

-- DropForeignKey
ALTER TABLE "CompraItem" DROP CONSTRAINT "CompraItem_productoId_fkey";

-- DropForeignKey
ALTER TABLE "DevolucionProveedor" DROP CONSTRAINT "DevolucionProveedor_compraId_fkey";

-- DropForeignKey
ALTER TABLE "DevolucionProveedor" DROP CONSTRAINT "DevolucionProveedor_proveedorId_fkey";

-- DropForeignKey
ALTER TABLE "DevolucionProveedor" DROP CONSTRAINT "DevolucionProveedor_usuarioId_fkey";

-- DropForeignKey
ALTER TABLE "DevolucionProveedorItem" DROP CONSTRAINT "DevolucionProveedorItem_devolucionId_fkey";

-- DropForeignKey
ALTER TABLE "DevolucionProveedorItem" DROP CONSTRAINT "DevolucionProveedorItem_loteId_fkey";

-- DropForeignKey
ALTER TABLE "DevolucionProveedorItem" DROP CONSTRAINT "DevolucionProveedorItem_productoId_fkey";

-- DropForeignKey
ALTER TABLE "Lote" DROP CONSTRAINT "Lote_productoId_fkey";

-- DropForeignKey
ALTER TABLE "MovimientoStock" DROP CONSTRAINT "MovimientoStock_loteId_fkey";

-- DropForeignKey
ALTER TABLE "MovimientoStock" DROP CONSTRAINT "MovimientoStock_productoId_fkey";

-- DropForeignKey
ALTER TABLE "MovimientoStock" DROP CONSTRAINT "MovimientoStock_recepcionCompraId_fkey";

-- DropForeignKey
ALTER TABLE "MovimientoStock" DROP CONSTRAINT "MovimientoStock_usuarioId_fkey";

-- DropForeignKey
ALTER TABLE "PagoProveedor" DROP CONSTRAINT "PagoProveedor_compraId_fkey";

-- DropForeignKey
ALTER TABLE "PagoProveedor" DROP CONSTRAINT "PagoProveedor_proveedorId_fkey";

-- DropForeignKey
ALTER TABLE "PagoProveedor" DROP CONSTRAINT "PagoProveedor_usuarioId_fkey";

-- DropForeignKey
ALTER TABLE "ProductoProveedor" DROP CONSTRAINT "ProductoProveedor_productoId_fkey";

-- DropForeignKey
ALTER TABLE "ProductoProveedor" DROP CONSTRAINT "ProductoProveedor_proveedorId_fkey";

-- DropForeignKey
ALTER TABLE "RecepcionCompra" DROP CONSTRAINT "RecepcionCompra_compraId_fkey";

-- DropForeignKey
ALTER TABLE "RecepcionCompra" DROP CONSTRAINT "RecepcionCompra_usuarioId_fkey";

-- AlterTable: purchase lines carry their business, filled from the purchase, then required.
ALTER TABLE "CompraItem" ADD COLUMN "empresaId" TEXT;
UPDATE "CompraItem" AS c SET "empresaId" = p."empresaId" FROM "Compra" AS p WHERE p."id" = c."compraId";
ALTER TABLE "CompraItem" ALTER COLUMN "empresaId" SET NOT NULL;

-- AlterTable: supplier return lines carry their business, filled from the return, then required.
ALTER TABLE "DevolucionProveedorItem" ADD COLUMN "empresaId" TEXT;
UPDATE "DevolucionProveedorItem" AS c SET "empresaId" = p."empresaId" FROM "DevolucionProveedor" AS p WHERE p."id" = c."devolucionId";
ALTER TABLE "DevolucionProveedorItem" ALTER COLUMN "empresaId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Compra_empresaId_id_key" ON "Compra"("empresaId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "DevolucionProveedor_empresaId_id_key" ON "DevolucionProveedor"("empresaId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Lote_empresaId_id_key" ON "Lote"("empresaId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Proveedor_empresaId_id_key" ON "Proveedor"("empresaId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "RecepcionCompra_empresaId_id_key" ON "RecepcionCompra"("empresaId", "id");

-- AddForeignKey
ALTER TABLE "Compra" ADD CONSTRAINT "Compra_empresaId_proveedorId_fkey" FOREIGN KEY ("empresaId", "proveedorId") REFERENCES "Proveedor"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Compra" ADD CONSTRAINT "Compra_empresaId_usuarioId_fkey" FOREIGN KEY ("empresaId", "usuarioId") REFERENCES "Usuario"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CompraItem" ADD CONSTRAINT "CompraItem_empresaId_compraId_fkey" FOREIGN KEY ("empresaId", "compraId") REFERENCES "Compra"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CompraItem" ADD CONSTRAINT "CompraItem_empresaId_productoId_fkey" FOREIGN KEY ("empresaId", "productoId") REFERENCES "Producto"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "DevolucionProveedor" ADD CONSTRAINT "DevolucionProveedor_empresaId_compraId_fkey" FOREIGN KEY ("empresaId", "compraId") REFERENCES "Compra"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "DevolucionProveedor" ADD CONSTRAINT "DevolucionProveedor_empresaId_proveedorId_fkey" FOREIGN KEY ("empresaId", "proveedorId") REFERENCES "Proveedor"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "DevolucionProveedor" ADD CONSTRAINT "DevolucionProveedor_empresaId_usuarioId_fkey" FOREIGN KEY ("empresaId", "usuarioId") REFERENCES "Usuario"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "DevolucionProveedorItem" ADD CONSTRAINT "DevolucionProveedorItem_empresaId_devolucionId_fkey" FOREIGN KEY ("empresaId", "devolucionId") REFERENCES "DevolucionProveedor"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "DevolucionProveedorItem" ADD CONSTRAINT "DevolucionProveedorItem_empresaId_loteId_fkey" FOREIGN KEY ("empresaId", "loteId") REFERENCES "Lote"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "DevolucionProveedorItem" ADD CONSTRAINT "DevolucionProveedorItem_empresaId_productoId_fkey" FOREIGN KEY ("empresaId", "productoId") REFERENCES "Producto"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Lote" ADD CONSTRAINT "Lote_empresaId_productoId_fkey" FOREIGN KEY ("empresaId", "productoId") REFERENCES "Producto"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "MovimientoStock" ADD CONSTRAINT "MovimientoStock_empresaId_loteId_fkey" FOREIGN KEY ("empresaId", "loteId") REFERENCES "Lote"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "MovimientoStock" ADD CONSTRAINT "MovimientoStock_empresaId_productoId_fkey" FOREIGN KEY ("empresaId", "productoId") REFERENCES "Producto"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "MovimientoStock" ADD CONSTRAINT "MovimientoStock_empresaId_recepcionCompraId_fkey" FOREIGN KEY ("empresaId", "recepcionCompraId") REFERENCES "RecepcionCompra"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "MovimientoStock" ADD CONSTRAINT "MovimientoStock_empresaId_usuarioId_fkey" FOREIGN KEY ("empresaId", "usuarioId") REFERENCES "Usuario"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "PagoProveedor" ADD CONSTRAINT "PagoProveedor_empresaId_compraId_fkey" FOREIGN KEY ("empresaId", "compraId") REFERENCES "Compra"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "PagoProveedor" ADD CONSTRAINT "PagoProveedor_empresaId_proveedorId_fkey" FOREIGN KEY ("empresaId", "proveedorId") REFERENCES "Proveedor"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "PagoProveedor" ADD CONSTRAINT "PagoProveedor_empresaId_usuarioId_fkey" FOREIGN KEY ("empresaId", "usuarioId") REFERENCES "Usuario"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ProductoProveedor" ADD CONSTRAINT "ProductoProveedor_empresaId_productoId_fkey" FOREIGN KEY ("empresaId", "productoId") REFERENCES "Producto"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ProductoProveedor" ADD CONSTRAINT "ProductoProveedor_empresaId_proveedorId_fkey" FOREIGN KEY ("empresaId", "proveedorId") REFERENCES "Proveedor"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "RecepcionCompra" ADD CONSTRAINT "RecepcionCompra_empresaId_compraId_fkey" FOREIGN KEY ("empresaId", "compraId") REFERENCES "Compra"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "RecepcionCompra" ADD CONSTRAINT "RecepcionCompra_empresaId_usuarioId_fkey" FOREIGN KEY ("empresaId", "usuarioId") REFERENCES "Usuario"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

