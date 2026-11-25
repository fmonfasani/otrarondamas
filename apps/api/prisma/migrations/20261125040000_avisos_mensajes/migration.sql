-- E3 (messaging like WhatsApp) — alerts with Wapsell closed. Additive:
-- - ConversationReadState.lastAlertedAt: one e-mail per run of unread customer messages;
-- - PushSubscription: browsers of team members that accepted push notifications, with RLS by
--   business like every business table.

-- AlterTable
ALTER TABLE "ConversationReadState" ADD COLUMN     "lastAlertedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PushSubscription_businessId_userId_idx" ON "PushSubscription"("businessId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_businessId_endpoint_key" ON "PushSubscription"("businessId", "endpoint");

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_businessId_fkey" FOREIGN KEY ("userId", "businessId") REFERENCES "Membership"("userId", "businessId") ON DELETE RESTRICT ON UPDATE RESTRICT;


-- RLS (same policy as the other business tables).
ALTER TABLE "PushSubscription" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "PushSubscription" USING ("businessId" = current_setting('app.business_id', true)) WITH CHECK ("businessId" = current_setting('app.business_id', true));
