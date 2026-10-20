-- C3: Add idempotencyKey to Pedido for order creation idempotence.
-- Required for cart→order flow to guarantee no duplicate orders on reintent.
-- Same pattern as Venta (INV-VTA-07).

ALTER TABLE "Pedido" ADD COLUMN "idempotencyKey" TEXT;
CREATE UNIQUE INDEX "Pedido_idempotencyKey_key" ON "Pedido"("idempotencyKey") WHERE "idempotencyKey" IS NOT NULL;

-- Migration succeeds; NULL idempotencyKey entries (pre-C3 orders) do not violate uniqueness.
