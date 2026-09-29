-- CreateEnum
CREATE TYPE "NivelFidelidad" AS ENUM ('NUEVO', 'FRECUENTE', 'VIP');

-- CreateTable
CREATE TABLE "ReglaFidelizacion" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "nivelRequerido" "NivelFidelidad" NOT NULL,
    "descuentoPorcentaje" DECIMAL(5,2) NOT NULL,
    "categoriaId" TEXT,
    "marca" TEXT,
    "cantidadMinima" INTEGER,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReglaFidelizacion_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ReglaFidelizacion" ADD CONSTRAINT "ReglaFidelizacion_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReglaFidelizacion" ADD CONSTRAINT "ReglaFidelizacion_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE SET NULL ON UPDATE CASCADE;
