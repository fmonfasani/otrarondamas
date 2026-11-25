-- E2b (messaging like WhatsApp) — «últ. vez»: when a team member last left the panel of a
-- business, and when a customer last left the store chat. Additive, nullable columns; the
-- tables already have RLS by business.

-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN     "lastSeenAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Membership" ADD COLUMN     "lastSeenAt" TIMESTAMP(3);
