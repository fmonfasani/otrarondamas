-- OR-B4-051 (OR-B4-046 D5, D6), stage C4: discounts never add up. Each order and sale line keeps which
-- one won, and a sale priced with a payment-method discount keeps the method it must be paid with.
-- Non-destructive: a new enum and three nullable columns; older lines stay null.

-- CreateEnum
CREATE TYPE "OrigenPrecio" AS ENUM ('LISTA', 'DESCUENTO_PRODUCTO', 'OFERTA', 'MAYORISTA', 'MEDIO_PAGO', 'FIDELIZACION');

-- AlterTable
ALTER TABLE "PedidoItem" ADD COLUMN "origenPrecio" "OrigenPrecio";

-- AlterTable
ALTER TABLE "Venta" ADD COLUMN "medioPagoDescuento" TEXT;

-- AlterTable
ALTER TABLE "VentaItem" ADD COLUMN "origenPrecio" "OrigenPrecio";

-- Only the payment methods that can carry a discount (OR-B4-051 rule 1).
ALTER TABLE "Venta" ADD CONSTRAINT "Venta_medioPagoDescuento_valido"
  CHECK ("medioPagoDescuento" IS NULL OR "medioPagoDescuento" IN ('efectivo', 'transferencia'));
