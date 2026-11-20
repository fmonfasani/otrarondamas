-- OR-B4-046 stage C1 (ADR-DAT-009, D10): the product keeps its moving weighted average cost and,
-- after a new cost, the price that keeps its markup, for a person to apply or dismiss.
-- Non-destructive: two nullable columns, nothing is dropped or rewritten.

-- AlterTable
ALTER TABLE "Producto" ADD COLUMN "costoPromedio" DECIMAL(18,4),
ADD COLUMN "precioSugerido" DECIMAL(18,2);
