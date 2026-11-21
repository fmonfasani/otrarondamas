-- Fase 2 (INIT-019) PR 4, module 3 — catalog and loyalty (ADR-DAT-020). The category tree, the
-- products, their presentations and the loyalty rules point at their parents with the business in
-- the key, Restrict both ways, so a row can never point at another business's row. With these the
-- relation-ownership registry is empty and goes away (it must, before RLS in PR 5).
-- Non-destructive: foreign keys are replaced and three unique indexes added; no data changes.

-- DropForeignKey
ALTER TABLE "Presentacion" DROP CONSTRAINT "Presentacion_productoId_fkey";

-- DropForeignKey
ALTER TABLE "Producto" DROP CONSTRAINT "Producto_familiaId_fkey";

-- DropForeignKey
ALTER TABLE "Producto" DROP CONSTRAINT "Producto_subfamiliaId_fkey";

-- DropForeignKey
ALTER TABLE "Producto" DROP CONSTRAINT "Producto_subtipoId_fkey";

-- DropForeignKey
ALTER TABLE "Producto" DROP CONSTRAINT "Producto_tipoId_fkey";

-- DropForeignKey
ALTER TABLE "ReglaFidelizacion" DROP CONSTRAINT "ReglaFidelizacion_familiaId_fkey";

-- DropForeignKey
ALTER TABLE "ReglaFidelizacion" DROP CONSTRAINT "ReglaFidelizacion_subfamiliaId_fkey";

-- DropForeignKey
ALTER TABLE "ReglaFidelizacion" DROP CONSTRAINT "ReglaFidelizacion_subtipoId_fkey";

-- DropForeignKey
ALTER TABLE "ReglaFidelizacion" DROP CONSTRAINT "ReglaFidelizacion_tipoId_fkey";

-- DropForeignKey
ALTER TABLE "Subfamilia" DROP CONSTRAINT "Subfamilia_familiaId_fkey";

-- DropForeignKey
ALTER TABLE "Subtipo" DROP CONSTRAINT "Subtipo_tipoId_fkey";

-- DropForeignKey
ALTER TABLE "Tipo" DROP CONSTRAINT "Tipo_subfamiliaId_fkey";

-- CreateIndex
CREATE UNIQUE INDEX "Subfamilia_empresaId_id_key" ON "Subfamilia"("empresaId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Subtipo_empresaId_id_key" ON "Subtipo"("empresaId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Tipo_empresaId_id_key" ON "Tipo"("empresaId", "id");

-- AddForeignKey
ALTER TABLE "Presentacion" ADD CONSTRAINT "Presentacion_empresaId_productoId_fkey" FOREIGN KEY ("empresaId", "productoId") REFERENCES "Producto"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_empresaId_familiaId_fkey" FOREIGN KEY ("empresaId", "familiaId") REFERENCES "Familia"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_empresaId_subfamiliaId_fkey" FOREIGN KEY ("empresaId", "subfamiliaId") REFERENCES "Subfamilia"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_empresaId_subtipoId_fkey" FOREIGN KEY ("empresaId", "subtipoId") REFERENCES "Subtipo"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_empresaId_tipoId_fkey" FOREIGN KEY ("empresaId", "tipoId") REFERENCES "Tipo"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ReglaFidelizacion" ADD CONSTRAINT "ReglaFidelizacion_empresaId_familiaId_fkey" FOREIGN KEY ("empresaId", "familiaId") REFERENCES "Familia"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ReglaFidelizacion" ADD CONSTRAINT "ReglaFidelizacion_empresaId_subfamiliaId_fkey" FOREIGN KEY ("empresaId", "subfamiliaId") REFERENCES "Subfamilia"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ReglaFidelizacion" ADD CONSTRAINT "ReglaFidelizacion_empresaId_subtipoId_fkey" FOREIGN KEY ("empresaId", "subtipoId") REFERENCES "Subtipo"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ReglaFidelizacion" ADD CONSTRAINT "ReglaFidelizacion_empresaId_tipoId_fkey" FOREIGN KEY ("empresaId", "tipoId") REFERENCES "Tipo"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Subfamilia" ADD CONSTRAINT "Subfamilia_empresaId_familiaId_fkey" FOREIGN KEY ("empresaId", "familiaId") REFERENCES "Familia"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Subtipo" ADD CONSTRAINT "Subtipo_empresaId_tipoId_fkey" FOREIGN KEY ("empresaId", "tipoId") REFERENCES "Tipo"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Tipo" ADD CONSTRAINT "Tipo_empresaId_subfamiliaId_fkey" FOREIGN KEY ("empresaId", "subfamiliaId") REFERENCES "Subfamilia"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

