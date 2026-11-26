-- Paquete 1, S3 — the notices already posted become SYSTEM messages (they were TEXT with a
-- `pedido-…` / `devolucion-…` key, authored by a team member).
UPDATE "Message" SET "type" = 'SYSTEM'
WHERE "authorUserId" IS NOT NULL AND "clientMessageId" ~ '^(pedido|devolucion)-';

-- Paquete 1, F1 — the customer's browser can accept push too: a subscription belongs to a team
-- member OR to a customer, never both, never neither.
ALTER TABLE "PushSubscription" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "PushSubscription" ADD COLUMN "customerId" TEXT;
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_one_owner"
  CHECK (("userId" IS NULL) <> ("customerId" IS NULL));

-- CreateIndex
CREATE INDEX "PushSubscription_businessId_customerId_idx" ON "PushSubscription"("businessId", "customerId");

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_customerId_businessId_fkey" FOREIGN KEY ("customerId", "businessId") REFERENCES "Cliente"("id", "empresaId") ON DELETE RESTRICT ON UPDATE RESTRICT;
