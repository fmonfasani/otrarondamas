-- Messaging MVP persistence foundation.
-- Tenant-aware foreign keys use Membership(userId,businessId) and
-- Cliente(id,empresaId) to make cross-Business references invalid at DB level.

-- CreateEnum
CREATE TYPE "MessagingConversationType" AS ENUM ('DIRECT', 'GROUP');

-- CreateEnum
CREATE TYPE "MessagingMessageType" AS ENUM ('TEXT', 'IMAGE', 'FILE', 'VOICE');

-- CreateEnum
CREATE TYPE "MessagingAssociationType" AS ENUM ('CUSTOMER', 'ORDER', 'SALE', 'PRODUCT', 'PURCHASE');

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_id_empresaId_key" ON "Cliente"("id", "empresaId");

-- CreateIndex
CREATE INDEX "Membership_businessId_userId_idx" ON "Membership"("businessId", "userId");

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "type" "MessagingConversationType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationParticipant" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "userId" TEXT,
    "customerId" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "removedAt" TIMESTAMP(3),
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ConversationParticipant_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ConversationParticipant_actor_xor" CHECK (
        (CASE WHEN "userId" IS NULL THEN 0 ELSE 1 END) +
        (CASE WHEN "customerId" IS NULL THEN 0 ELSE 1 END) = 1
    )
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "authorUserId" TEXT,
    "authorCustomerId" TEXT,
    "sequence" BIGINT NOT NULL,
    "clientMessageId" TEXT NOT NULL,
    "type" "MessagingMessageType" NOT NULL,
    "content" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "editedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "deletedByUserId" TEXT,
    "replyToMessageId" TEXT,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Message_author_xor" CHECK (
        (CASE WHEN "authorUserId" IS NULL THEN 0 ELSE 1 END) +
        (CASE WHEN "authorCustomerId" IS NULL THEN 0 ELSE 1 END) = 1
    )
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "durationSec" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reaction" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationAssociation" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "entityType" "MessagingAssociationType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "changedBy" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConversationAssociation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_id_businessId_key" ON "Conversation"("id", "businessId");
CREATE INDEX "Conversation_businessId_updatedAt_idx" ON "Conversation"("businessId", "updatedAt");
CREATE INDEX "Conversation_businessId_deletedAt_idx" ON "Conversation"("businessId", "deletedAt");

CREATE INDEX "ConversationParticipant_conversationId_joinedAt_idx" ON "ConversationParticipant"("conversationId", "joinedAt");
CREATE INDEX "ConversationParticipant_conversationId_leftAt_idx" ON "ConversationParticipant"("conversationId", "leftAt");
CREATE INDEX "ConversationParticipant_businessId_userId_idx" ON "ConversationParticipant"("businessId", "userId");
CREATE INDEX "ConversationParticipant_businessId_customerId_idx" ON "ConversationParticipant"("businessId", "customerId");

CREATE UNIQUE INDEX "Message_conversationId_sequence_key" ON "Message"("conversationId", "sequence");
CREATE UNIQUE INDEX "Message_conversationId_clientMessageId_authorUserId_key" ON "Message"("conversationId", "clientMessageId", "authorUserId");
CREATE UNIQUE INDEX "Message_conversationId_clientMessageId_authorCustomerId_key" ON "Message"("conversationId", "clientMessageId", "authorCustomerId");
CREATE INDEX "Message_businessId_conversationId_createdAt_idx" ON "Message"("businessId", "conversationId", "createdAt");
CREATE INDEX "Message_conversationId_deletedAt_idx" ON "Message"("conversationId", "deletedAt");

CREATE INDEX "Attachment_messageId_deletedAt_idx" ON "Attachment"("messageId", "deletedAt");
CREATE INDEX "Attachment_storageKey_idx" ON "Attachment"("storageKey");

CREATE UNIQUE INDEX "Reaction_messageId_userId_emoji_key" ON "Reaction"("messageId", "userId", "emoji");
CREATE INDEX "Reaction_userId_messageId_idx" ON "Reaction"("userId", "messageId");

CREATE INDEX "ConversationAssociation_businessId_conversationId_active_idx" ON "ConversationAssociation"("businessId", "conversationId", "active");
CREATE INDEX "ConversationAssociation_businessId_entityType_entityId_idx" ON "ConversationAssociation"("businessId", "entityType", "entityId");

-- AddForeignKey
ALTER TABLE "Conversation"
  ADD CONSTRAINT "Conversation_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ConversationParticipant"
  ADD CONSTRAINT "ConversationParticipant_conversation_fkey"
  FOREIGN KEY ("conversationId", "businessId")
  REFERENCES "Conversation"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ConversationParticipant"
  ADD CONSTRAINT "ConversationParticipant_membership_fkey"
  FOREIGN KEY ("userId", "businessId")
  REFERENCES "Membership"("userId", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ConversationParticipant"
  ADD CONSTRAINT "ConversationParticipant_customer_fkey"
  FOREIGN KEY ("customerId", "businessId")
  REFERENCES "Cliente"("id", "empresaId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Message"
  ADD CONSTRAINT "Message_conversation_fkey"
  FOREIGN KEY ("conversationId", "businessId")
  REFERENCES "Conversation"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Message"
  ADD CONSTRAINT "Message_authorMembership_fkey"
  FOREIGN KEY ("authorUserId", "businessId")
  REFERENCES "Membership"("userId", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Message"
  ADD CONSTRAINT "Message_authorCustomer_fkey"
  FOREIGN KEY ("authorCustomerId", "businessId")
  REFERENCES "Cliente"("id", "empresaId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Message"
  ADD CONSTRAINT "Message_replyToMessage_fkey"
  FOREIGN KEY ("replyToMessageId") REFERENCES "Message"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Message"
  ADD CONSTRAINT "Message_deletedByUser_fkey"
  FOREIGN KEY ("deletedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Attachment"
  ADD CONSTRAINT "Attachment_message_fkey"
  FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Reaction"
  ADD CONSTRAINT "Reaction_message_fkey"
  FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Reaction"
  ADD CONSTRAINT "Reaction_user_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ConversationAssociation"
  ADD CONSTRAINT "ConversationAssociation_conversation_fkey"
  FOREIGN KEY ("conversationId", "businessId")
  REFERENCES "Conversation"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;
