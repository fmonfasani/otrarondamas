-- E6b (messaging like WhatsApp Business) — the greeting and the away message the store sends by
-- itself are marked, so the team does not count them unread nor get a push. Additive only.

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "automatic" BOOLEAN NOT NULL DEFAULT false;

