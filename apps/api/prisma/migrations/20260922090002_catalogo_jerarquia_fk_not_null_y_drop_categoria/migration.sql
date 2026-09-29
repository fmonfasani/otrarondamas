-- DropForeignKey
ALTER TABLE "Categoria" DROP CONSTRAINT "Categoria_empresaId_fkey";

-- DropForeignKey
ALTER TABLE "Producto" DROP CONSTRAINT "Producto_categoriaId_fkey";

-- DropForeignKey
ALTER TABLE "Producto" DROP CONSTRAINT "Producto_familiaId_fkey";

-- DropForeignKey
ALTER TABLE "Producto" DROP CONSTRAINT "Producto_subfamiliaId_fkey";

-- DropForeignKey
ALTER TABLE "Producto" DROP CONSTRAINT "Producto_subtipoId_fkey";

-- DropForeignKey
ALTER TABLE "Producto" DROP CONSTRAINT "Producto_tipoId_fkey";

-- DropForeignKey
ALTER TABLE "ReglaFidelizacion" DROP CONSTRAINT "ReglaFidelizacion_categoriaId_fkey";

-- AlterTable
ALTER TABLE "Producto" DROP COLUMN "categoriaId",
ALTER COLUMN "familiaId" SET NOT NULL,
ALTER COLUMN "subfamiliaId" SET NOT NULL,
ALTER COLUMN "tipoId" SET NOT NULL,
ALTER COLUMN "subtipoId" SET NOT NULL;

-- AlterTable
ALTER TABLE "ReglaFidelizacion" DROP COLUMN "categoriaId";

-- DropTable
DROP TABLE "Categoria";

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_familiaId_fkey" FOREIGN KEY ("familiaId") REFERENCES "Familia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_subfamiliaId_fkey" FOREIGN KEY ("subfamiliaId") REFERENCES "Subfamilia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_tipoId_fkey" FOREIGN KEY ("tipoId") REFERENCES "Tipo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_subtipoId_fkey" FOREIGN KEY ("subtipoId") REFERENCES "Subtipo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

