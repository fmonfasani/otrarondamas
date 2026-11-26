-- E6a (messaging like WhatsApp Business) — each person's inbox (pin, archive, mute), the team
-- member in charge of a chat, and customer labels. Additive only.

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "assignedAt" TIMESTAMP(3),
ADD COLUMN     "assignedUserId" TEXT;

-- CreateTable
CREATE TABLE "ConversationPreference" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pinnedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "mutedUntil" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConversationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerLabel" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerLabel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerLabelAssignment" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "labelId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerLabelAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConversationPreference_businessId_userId_idx" ON "ConversationPreference"("businessId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationPreference_conversationId_userId_key" ON "ConversationPreference"("conversationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerLabel_id_businessId_key" ON "CustomerLabel"("id", "businessId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerLabel_businessId_nombre_key" ON "CustomerLabel"("businessId", "nombre");

-- CreateIndex
CREATE INDEX "CustomerLabelAssignment_businessId_customerId_idx" ON "CustomerLabelAssignment"("businessId", "customerId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerLabelAssignment_labelId_customerId_key" ON "CustomerLabelAssignment"("labelId", "customerId");

-- CreateIndex
CREATE INDEX "Conversation_businessId_assignedUserId_idx" ON "Conversation"("businessId", "assignedUserId");

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_assignedUserId_businessId_fkey" FOREIGN KEY ("assignedUserId", "businessId") REFERENCES "Membership"("userId", "businessId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ConversationPreference" ADD CONSTRAINT "ConversationPreference_conversationId_businessId_fkey" FOREIGN KEY ("conversationId", "businessId") REFERENCES "Conversation"("id", "businessId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ConversationPreference" ADD CONSTRAINT "ConversationPreference_userId_businessId_fkey" FOREIGN KEY ("userId", "businessId") REFERENCES "Membership"("userId", "businessId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CustomerLabel" ADD CONSTRAINT "CustomerLabel_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerLabelAssignment" ADD CONSTRAINT "CustomerLabelAssignment_labelId_businessId_fkey" FOREIGN KEY ("labelId", "businessId") REFERENCES "CustomerLabel"("id", "businessId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CustomerLabelAssignment" ADD CONSTRAINT "CustomerLabelAssignment_customerId_businessId_fkey" FOREIGN KEY ("customerId", "businessId") REFERENCES "Cliente"("id", "empresaId") ON DELETE RESTRICT ON UPDATE RESTRICT;


-- RLS (same policy as the other business tables).
ALTER TABLE "ConversationPreference" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "ConversationPreference" USING ("businessId" = current_setting('app.business_id', true)) WITH CHECK ("businessId" = current_setting('app.business_id', true));
ALTER TABLE "CustomerLabel" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "CustomerLabel" USING ("businessId" = current_setting('app.business_id', true)) WITH CHECK ("businessId" = current_setting('app.business_id', true));
ALTER TABLE "CustomerLabelAssignment" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "CustomerLabelAssignment" USING ("businessId" = current_setting('app.business_id', true)) WITH CHECK ("businessId" = current_setting('app.business_id', true));
