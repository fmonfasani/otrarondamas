-- Paso 1 de 3 de la migración de catálogo (Familia/Subfamilia/Tipo/Subtipo).
--
-- Este paso SOLO agrega columnas y tablas nuevas, todas nullable/vacías.
-- Deliberadamente NO toca "Categoria" ni "Producto"."categoriaId" ni
-- "ReglaFidelizacion"."categoriaId" — el script de datos (paso 2) necesita
-- leerlas para mapear cada producto existente a su Subfamilia nueva antes
-- de que se puedan borrar. Se eliminan recién en la migración final
-- (20260922090002_catalogo_jerarquia_fk_not_null_y_drop_categoria), junto
-- con el ALTER que vuelve las 4 FK nuevas a NOT NULL.

-- AlterTable: categoriaId pasa a nullable TEMPORALMENTE (era NOT NULL).
-- Mismo motivo que familiaId/subfamiliaId/tipoId/subtipoId: el script de
-- datos necesita poder crear productos nuevos ya con la jerarquía nueva
-- sin verse obligado a rellenar la columna vieja que se va a eliminar en
-- la migración final. La tabla "Categoria" y esta columna se eliminan
-- recién en 20260922090002_catalogo_jerarquia_fk_not_null_y_drop_categoria.
ALTER TABLE "Producto" ALTER COLUMN "categoriaId" DROP NOT NULL;

-- DropIndex: el único global viejo de codigoInterno se reemplaza por uno
-- compuesto con empresaId (bug conocido: el código interno debía ser único
-- SOLO dentro de cada empresa, no global). Seguro de hacer ya: no depende
-- del script de datos de jerarquía.
DROP INDEX "Producto_codigoInterno_key";

-- CreateIndex
CREATE UNIQUE INDEX "Producto_empresaId_codigoInterno_key" ON "Producto"("empresaId", "codigoInterno");

-- AlterTable: nuevas columnas de jerarquía en Producto (nullable por ahora)
ALTER TABLE "Producto"
  ADD COLUMN "familiaId" TEXT,
  ADD COLUMN "subfamiliaId" TEXT,
  ADD COLUMN "tipoId" TEXT,
  ADD COLUMN "subtipoId" TEXT;

-- AlterTable: mismo alcance opcional en ReglaFidelizacion (Fase 4 Fidelización)
ALTER TABLE "ReglaFidelizacion"
  ADD COLUMN "familiaId" TEXT,
  ADD COLUMN "subfamiliaId" TEXT,
  ADD COLUMN "tipoId" TEXT,
  ADD COLUMN "subtipoId" TEXT;

-- CreateTable
CREATE TABLE "Familia" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "prefijo" CHAR(3) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Familia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subfamilia" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "familiaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "prefijo" CHAR(3) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subfamilia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tipo" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "subfamiliaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "prefijo" CHAR(3) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tipo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subtipo" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "tipoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "prefijo" CHAR(3) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subtipo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductoProveedor" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "proveedorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductoProveedor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Familia_empresaId_nombre_key" ON "Familia"("empresaId", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Familia_empresaId_prefijo_key" ON "Familia"("empresaId", "prefijo");

-- CreateIndex
CREATE UNIQUE INDEX "Subfamilia_familiaId_nombre_key" ON "Subfamilia"("familiaId", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Subfamilia_familiaId_prefijo_key" ON "Subfamilia"("familiaId", "prefijo");

-- CreateIndex
CREATE UNIQUE INDEX "Tipo_subfamiliaId_nombre_key" ON "Tipo"("subfamiliaId", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Tipo_subfamiliaId_prefijo_key" ON "Tipo"("subfamiliaId", "prefijo");

-- CreateIndex
CREATE UNIQUE INDEX "Subtipo_tipoId_nombre_key" ON "Subtipo"("tipoId", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Subtipo_tipoId_prefijo_key" ON "Subtipo"("tipoId", "prefijo");

-- CreateIndex
CREATE UNIQUE INDEX "ProductoProveedor_productoId_proveedorId_key" ON "ProductoProveedor"("productoId", "proveedorId");

-- AddForeignKey
ALTER TABLE "Familia" ADD CONSTRAINT "Familia_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subfamilia" ADD CONSTRAINT "Subfamilia_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subfamilia" ADD CONSTRAINT "Subfamilia_familiaId_fkey" FOREIGN KEY ("familiaId") REFERENCES "Familia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tipo" ADD CONSTRAINT "Tipo_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tipo" ADD CONSTRAINT "Tipo_subfamiliaId_fkey" FOREIGN KEY ("subfamiliaId") REFERENCES "Subfamilia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subtipo" ADD CONSTRAINT "Subtipo_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subtipo" ADD CONSTRAINT "Subtipo_tipoId_fkey" FOREIGN KEY ("tipoId") REFERENCES "Tipo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductoProveedor" ADD CONSTRAINT "ProductoProveedor_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductoProveedor" ADD CONSTRAINT "ProductoProveedor_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductoProveedor" ADD CONSTRAINT "ProductoProveedor_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_familiaId_fkey" FOREIGN KEY ("familiaId") REFERENCES "Familia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_subfamiliaId_fkey" FOREIGN KEY ("subfamiliaId") REFERENCES "Subfamilia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_tipoId_fkey" FOREIGN KEY ("tipoId") REFERENCES "Tipo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_subtipoId_fkey" FOREIGN KEY ("subtipoId") REFERENCES "Subtipo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReglaFidelizacion" ADD CONSTRAINT "ReglaFidelizacion_familiaId_fkey" FOREIGN KEY ("familiaId") REFERENCES "Familia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReglaFidelizacion" ADD CONSTRAINT "ReglaFidelizacion_subfamiliaId_fkey" FOREIGN KEY ("subfamiliaId") REFERENCES "Subfamilia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReglaFidelizacion" ADD CONSTRAINT "ReglaFidelizacion_tipoId_fkey" FOREIGN KEY ("tipoId") REFERENCES "Tipo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReglaFidelizacion" ADD CONSTRAINT "ReglaFidelizacion_subtipoId_fkey" FOREIGN KEY ("subtipoId") REFERENCES "Subtipo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
