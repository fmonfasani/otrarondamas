-- ADR-DAT-020 (INIT-019 PR 4, module 4b: messaging), with decision D6 (option A).
--
-- The messaging references to the customer and the team member used eight separate columns
-- (membershipBusinessId, customerBusinessId, authorMembershipBusinessId, authorCustomerBusinessId)
-- that nothing tied to the row's businessId. They now use the row's own businessId, and the eight
-- columns are dropped. Attachments and reactions get businessId, filled from their message.
-- On delete: RESTRICT (D3). On update: RESTRICT (D5).

-- Guard: stop before changing anything if a row's separate column disagrees with its businessId.
DO $$
DECLARE mismatches bigint;
BEGIN
  SELECT
    (SELECT count(*) FROM "ConversationParticipant"
      WHERE ("userId" IS NOT NULL AND "membershipBusinessId" IS DISTINCT FROM "businessId")
         OR ("customerId" IS NOT NULL AND "customerBusinessId" IS DISTINCT FROM "businessId"))
  + (SELECT count(*) FROM "Message"
      WHERE ("authorUserId" IS NOT NULL AND "authorMembershipBusinessId" IS DISTINCT FROM "businessId")
         OR ("authorCustomerId" IS NOT NULL AND "authorCustomerBusinessId" IS DISTINCT FROM "businessId"))
  + (SELECT count(*) FROM "MessageReadReceipt"
      WHERE ("userId" IS NOT NULL AND "membershipBusinessId" IS DISTINCT FROM "businessId")
         OR ("customerId" IS NOT NULL AND "customerBusinessId" IS DISTINCT FROM "businessId"))
  + (SELECT count(*) FROM "MessagingReadPreference"
      WHERE ("userId" IS NOT NULL AND "membershipBusinessId" IS DISTINCT FROM "businessId")
         OR ("customerId" IS NOT NULL AND "customerBusinessId" IS DISTINCT FROM "businessId"))
  INTO mismatches;
  IF mismatches > 0 THEN
    RAISE EXCEPTION 'D6: % messaging rows point to another business; nothing was changed', mismatches;
  END IF;
END $$;

-- DropForeignKey
ALTER TABLE "Attachment" DROP CONSTRAINT "Attachment_messageId_fkey";

-- DropForeignKey
ALTER TABLE "ConversationAssociation" DROP CONSTRAINT "ConversationAssociation_conversationId_businessId_fkey";

-- DropForeignKey
ALTER TABLE "ConversationParticipant" DROP CONSTRAINT "ConversationParticipant_conversationId_businessId_fkey";

-- DropForeignKey
ALTER TABLE "ConversationParticipant" DROP CONSTRAINT "ConversationParticipant_customerId_customerBusinessId_fkey";

-- DropForeignKey
ALTER TABLE "ConversationParticipant" DROP CONSTRAINT "ConversationParticipant_userId_membershipBusinessId_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_authorCustomerId_authorCustomerBusinessId_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_authorUserId_authorMembershipBusinessId_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_conversationId_businessId_fkey";

-- DropForeignKey
ALTER TABLE "MessageReadReceipt" DROP CONSTRAINT "MessageReadReceipt_customerId_customerBusinessId_fkey";

-- DropForeignKey
ALTER TABLE "MessageReadReceipt" DROP CONSTRAINT "MessageReadReceipt_messageId_businessId_fkey";

-- DropForeignKey
ALTER TABLE "MessageReadReceipt" DROP CONSTRAINT "MessageReadReceipt_userId_membershipBusinessId_fkey";

-- DropForeignKey
ALTER TABLE "MessagingReadPreference" DROP CONSTRAINT "MessagingReadPreference_customerId_customerBusinessId_fkey";

-- DropForeignKey
ALTER TABLE "MessagingReadPreference" DROP CONSTRAINT "MessagingReadPreference_userId_membershipBusinessId_fkey";

-- DropForeignKey
ALTER TABLE "Reaction" DROP CONSTRAINT "Reaction_messageId_fkey";

-- AlterTable
ALTER TABLE "Attachment" ADD COLUMN "businessId" TEXT;
UPDATE "Attachment" AS c SET "businessId" = m."businessId" FROM "Message" AS m WHERE m."id" = c."messageId";
ALTER TABLE "Attachment" ALTER COLUMN "businessId" SET NOT NULL;

-- AlterTable
ALTER TABLE "ConversationParticipant" DROP COLUMN "customerBusinessId",
DROP COLUMN "membershipBusinessId";

-- AlterTable
ALTER TABLE "Message" DROP COLUMN "authorCustomerBusinessId",
DROP COLUMN "authorMembershipBusinessId";

-- AlterTable
ALTER TABLE "MessageReadReceipt" DROP COLUMN "customerBusinessId",
DROP COLUMN "membershipBusinessId";

-- AlterTable
ALTER TABLE "MessagingReadPreference" DROP COLUMN "customerBusinessId",
DROP COLUMN "membershipBusinessId";

-- AlterTable
ALTER TABLE "Reaction" ADD COLUMN "businessId" TEXT;
UPDATE "Reaction" AS c SET "businessId" = m."businessId" FROM "Message" AS m WHERE m."id" = c."messageId";
ALTER TABLE "Reaction" ALTER COLUMN "businessId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_messageId_businessId_fkey" FOREIGN KEY ("messageId", "businessId") REFERENCES "Message"("id", "businessId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ConversationAssociation" ADD CONSTRAINT "ConversationAssociation_conversationId_businessId_fkey" FOREIGN KEY ("conversationId", "businessId") REFERENCES "Conversation"("id", "businessId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_conversationId_businessId_fkey" FOREIGN KEY ("conversationId", "businessId") REFERENCES "Conversation"("id", "businessId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_customerId_businessId_fkey" FOREIGN KEY ("customerId", "businessId") REFERENCES "Cliente"("id", "empresaId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_userId_businessId_fkey" FOREIGN KEY ("userId", "businessId") REFERENCES "Membership"("userId", "businessId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_authorCustomerId_businessId_fkey" FOREIGN KEY ("authorCustomerId", "businessId") REFERENCES "Cliente"("id", "empresaId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_authorUserId_businessId_fkey" FOREIGN KEY ("authorUserId", "businessId") REFERENCES "Membership"("userId", "businessId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_businessId_fkey" FOREIGN KEY ("conversationId", "businessId") REFERENCES "Conversation"("id", "businessId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "MessageReadReceipt" ADD CONSTRAINT "MessageReadReceipt_customerId_businessId_fkey" FOREIGN KEY ("customerId", "businessId") REFERENCES "Cliente"("id", "empresaId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "MessageReadReceipt" ADD CONSTRAINT "MessageReadReceipt_messageId_businessId_fkey" FOREIGN KEY ("messageId", "businessId") REFERENCES "Message"("id", "businessId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "MessageReadReceipt" ADD CONSTRAINT "MessageReadReceipt_userId_businessId_fkey" FOREIGN KEY ("userId", "businessId") REFERENCES "Membership"("userId", "businessId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "MessagingReadPreference" ADD CONSTRAINT "MessagingReadPreference_customerId_businessId_fkey" FOREIGN KEY ("customerId", "businessId") REFERENCES "Cliente"("id", "empresaId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "MessagingReadPreference" ADD CONSTRAINT "MessagingReadPreference_userId_businessId_fkey" FOREIGN KEY ("userId", "businessId") REFERENCES "Membership"("userId", "businessId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_messageId_businessId_fkey" FOREIGN KEY ("messageId", "businessId") REFERENCES "Message"("id", "businessId") ON DELETE RESTRICT ON UPDATE RESTRICT;
