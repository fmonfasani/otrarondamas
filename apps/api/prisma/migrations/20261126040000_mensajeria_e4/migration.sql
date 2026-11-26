-- E4 (messaging like WhatsApp) — reactions from customers, starred messages and forwarding.
-- Additive except Reaction's uniqueness (empty table in production when this was written).

-- Reaction: from a team member OR a customer, never both, never neither; one per person and
-- message (choosing another emoji replaces it).
ALTER TABLE "Reaction" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "Reaction" ADD COLUMN "customerId" TEXT;
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_one_owner"
  CHECK (("userId" IS NULL) <> ("customerId" IS NULL));
DROP INDEX "Reaction_messageId_userId_emoji_key";
CREATE UNIQUE INDEX "Reaction_messageId_userId_key" ON "Reaction"("messageId", "userId");
CREATE UNIQUE INDEX "Reaction_messageId_customerId_key" ON "Reaction"("messageId", "customerId");
CREATE INDEX "Reaction_businessId_messageId_idx" ON "Reaction"("businessId", "messageId");
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_customerId_businessId_fkey" FOREIGN KEY ("customerId", "businessId") REFERENCES "Cliente"("id", "empresaId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- Message: sent with «Reenviar».
ALTER TABLE "Message" ADD COLUMN "forwarded" BOOLEAN NOT NULL DEFAULT false;

-- MessageStar: a team member's starred messages (personal).
CREATE TABLE "MessageStar" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageStar_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MessageStar_messageId_userId_key" ON "MessageStar"("messageId", "userId");
CREATE INDEX "MessageStar_businessId_userId_createdAt_idx" ON "MessageStar"("businessId", "userId", "createdAt");
ALTER TABLE "MessageStar" ADD CONSTRAINT "MessageStar_messageId_businessId_fkey" FOREIGN KEY ("messageId", "businessId") REFERENCES "Message"("id", "businessId") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "MessageStar" ADD CONSTRAINT "MessageStar_userId_businessId_fkey" FOREIGN KEY ("userId", "businessId") REFERENCES "Membership"("userId", "businessId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- RLS (same policy as the other business tables).
ALTER TABLE "MessageStar" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "MessageStar" USING ("businessId" = current_setting('app.business_id', true)) WITH CHECK ("businessId" = current_setting('app.business_id', true));
