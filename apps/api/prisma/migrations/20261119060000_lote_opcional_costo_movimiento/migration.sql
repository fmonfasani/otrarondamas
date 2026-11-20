-- OR-B4-046 rule 9 (D9) and ADR-DAT-009, stage B1: a product says whether it controls expiry; only
-- those lots need a date (FEFO), the rest enter without one and leave in arrival order (FIFO). Every
-- stock movement keeps its unit cost, so the stock can be valued at weighted average cost.
-- Existing products start without expiry control (production had none on 2026-11-19); existing lots
-- keep their dates.

-- AlterTable
ALTER TABLE "Lote" ALTER COLUMN "vencimiento" DROP NOT NULL;

-- AlterTable
ALTER TABLE "MovimientoStock" ADD COLUMN     "costoUnitario" DECIMAL(18,4);

-- AlterTable
ALTER TABLE "Producto" ADD COLUMN     "controlaVencimiento" BOOLEAN NOT NULL DEFAULT false;

