-- AlterTable
ALTER TABLE "PedidoItem" ADD COLUMN     "descuentoFidelizacionPorcentaje" DECIMAL(5,2),
ADD COLUMN     "reglaFidelizacionId" TEXT;

-- AddForeignKey
ALTER TABLE "PedidoItem" ADD CONSTRAINT "PedidoItem_reglaFidelizacionId_fkey" FOREIGN KEY ("reglaFidelizacionId") REFERENCES "ReglaFidelizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

