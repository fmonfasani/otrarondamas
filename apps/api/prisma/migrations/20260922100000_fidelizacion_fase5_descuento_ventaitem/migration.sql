-- AlterTable
ALTER TABLE "VentaItem" ADD COLUMN     "descuentoFidelizacionPorcentaje" DECIMAL(5,2),
ADD COLUMN     "reglaFidelizacionId" TEXT;

-- AddForeignKey
ALTER TABLE "VentaItem" ADD CONSTRAINT "VentaItem_reglaFidelizacionId_fkey" FOREIGN KEY ("reglaFidelizacionId") REFERENCES "ReglaFidelizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

