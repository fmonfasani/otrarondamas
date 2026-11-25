-- E2 (messaging like WhatsApp) — read positions per participant: up to which message a
-- conversation reached their screen (✓✓) and up to which they read it. Additive: a new table
-- and a unique index on ConversationParticipant(id, businessId), which ids already satisfy.
-- The new table carries a business, so it gets RLS like every other one (ADR-DAT-019).

-- CreateTable
CREATE TABLE "ConversationReadState" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "lastDeliveredAt" TIMESTAMP(3),
    "lastReadAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConversationReadState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConversationReadState_businessId_idx" ON "ConversationReadState"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationReadState_participantId_businessId_key" ON "ConversationReadState"("participantId", "businessId");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationParticipant_id_businessId_key" ON "ConversationParticipant"("id", "businessId");

-- AddForeignKey
ALTER TABLE "ConversationReadState" ADD CONSTRAINT "ConversationReadState_participantId_businessId_fkey" FOREIGN KEY ("participantId", "businessId") REFERENCES "ConversationParticipant"("id", "businessId") ON DELETE CASCADE ON UPDATE RESTRICT;


-- RLS (same policy as the other business tables, 20261125010000_rls_por_negocio).
ALTER TABLE "ConversationReadState" ENABLE ROW LEVEL SECURITY;
CREATE POLICY negocio ON "ConversationReadState" USING ("businessId" = current_setting('app.business_id', true)) WITH CHECK ("businessId" = current_setting('app.business_id', true));
