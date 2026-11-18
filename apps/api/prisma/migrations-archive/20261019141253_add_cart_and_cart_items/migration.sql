-- DropForeignKey
ALTER TABLE "ConversationParticipant" DROP CONSTRAINT "ConversationParticipant_customer_fkey";

-- DropForeignKey
ALTER TABLE "ConversationParticipant" DROP CONSTRAINT "ConversationParticipant_membership_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_authorCustomer_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_authorMembership_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_deletedByUser_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_replyToMessage_fkey";

-- DropForeignKey
ALTER TABLE "MessageReadReceipt" DROP CONSTRAINT "MessageReadReceipt_customer_fkey";

-- DropForeignKey
ALTER TABLE "MessageReadReceipt" DROP CONSTRAINT "MessageReadReceipt_membership_fkey";

-- DropForeignKey
ALTER TABLE "MessagingReadPreference" DROP CONSTRAINT "MessagingReadPreference_customer_fkey";

-- DropForeignKey
ALTER TABLE "MessagingReadPreference" DROP CONSTRAINT "MessagingReadPreference_membership_fkey";

-- CreateTable
CREATE TABLE "Cart" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartItem" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "cantidad" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Cart_businessId_customerId_idx" ON "Cart"("businessId", "customerId");

-- CreateIndex
CREATE UNIQUE INDEX "Cart_customerId_businessId_key" ON "Cart"("customerId", "businessId");

-- CreateIndex
CREATE INDEX "CartItem_cartId_idx" ON "CartItem"("cartId");

-- CreateIndex
CREATE UNIQUE INDEX "CartItem_cartId_productoId_key" ON "CartItem"("cartId", "productoId");

-- RenameForeignKey
ALTER TABLE "Attachment" RENAME CONSTRAINT "Attachment_message_fkey" TO "Attachment_messageId_fkey";

-- RenameForeignKey
ALTER TABLE "ConversationAssociation" RENAME CONSTRAINT "ConversationAssociation_conversation_fkey" TO "ConversationAssociation_conversationId_businessId_fkey";

-- RenameForeignKey
ALTER TABLE "ConversationParticipant" RENAME CONSTRAINT "ConversationParticipant_conversation_fkey" TO "ConversationParticipant_conversationId_businessId_fkey";

-- RenameForeignKey
ALTER TABLE "Message" RENAME CONSTRAINT "Message_conversation_fkey" TO "Message_conversationId_businessId_fkey";

-- RenameForeignKey
ALTER TABLE "MessageReadReceipt" RENAME CONSTRAINT "MessageReadReceipt_business_fkey" TO "MessageReadReceipt_businessId_fkey";

-- RenameForeignKey
ALTER TABLE "MessageReadReceipt" RENAME CONSTRAINT "MessageReadReceipt_message_fkey" TO "MessageReadReceipt_messageId_businessId_fkey";

-- RenameForeignKey
ALTER TABLE "MessagingReadPreference" RENAME CONSTRAINT "MessagingReadPreference_business_fkey" TO "MessagingReadPreference_businessId_fkey";

-- RenameForeignKey
ALTER TABLE "Reaction" RENAME CONSTRAINT "Reaction_message_fkey" TO "Reaction_messageId_fkey";

-- RenameForeignKey
ALTER TABLE "Reaction" RENAME CONSTRAINT "Reaction_user_fkey" TO "Reaction_userId_fkey";

-- AddForeignKey
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_userId_membershipBusinessId_fkey" FOREIGN KEY ("userId", "membershipBusinessId") REFERENCES "Membership"("userId", "businessId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_customerId_customerBusinessId_fkey" FOREIGN KEY ("customerId", "customerBusinessId") REFERENCES "Cliente"("id", "empresaId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_authorUserId_authorMembershipBusinessId_fkey" FOREIGN KEY ("authorUserId", "authorMembershipBusinessId") REFERENCES "Membership"("userId", "businessId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_authorCustomerId_authorCustomerBusinessId_fkey" FOREIGN KEY ("authorCustomerId", "authorCustomerBusinessId") REFERENCES "Cliente"("id", "empresaId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessagingReadPreference" ADD CONSTRAINT "MessagingReadPreference_userId_membershipBusinessId_fkey" FOREIGN KEY ("userId", "membershipBusinessId") REFERENCES "Membership"("userId", "businessId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessagingReadPreference" ADD CONSTRAINT "MessagingReadPreference_customerId_customerBusinessId_fkey" FOREIGN KEY ("customerId", "customerBusinessId") REFERENCES "Cliente"("id", "empresaId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageReadReceipt" ADD CONSTRAINT "MessageReadReceipt_userId_membershipBusinessId_fkey" FOREIGN KEY ("userId", "membershipBusinessId") REFERENCES "Membership"("userId", "businessId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageReadReceipt" ADD CONSTRAINT "MessageReadReceipt_customerId_customerBusinessId_fkey" FOREIGN KEY ("customerId", "customerBusinessId") REFERENCES "Cliente"("id", "empresaId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
