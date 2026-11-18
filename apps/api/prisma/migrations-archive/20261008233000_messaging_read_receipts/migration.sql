-- Read receipts MVP
-- Tenant-scoped per-actor receipts and per-Business privacy preferences.

CREATE UNIQUE INDEX "Message_id_businessId_key"
ON "Message"("id", "businessId");

CREATE TABLE "MessagingReadPreference" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "userId" TEXT,
    "membershipBusinessId" TEXT,
    "customerId" TEXT,
    "customerBusinessId" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessagingReadPreference_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "MessagingReadPreference_actor_xor" CHECK (
        (CASE WHEN "userId" IS NULL THEN 0 ELSE 1 END) +
        (CASE WHEN "customerId" IS NULL THEN 0 ELSE 1 END) = 1
    ),
    CONSTRAINT "MessagingReadPreference_membership_business_match" CHECK (
        ("userId" IS NULL AND "membershipBusinessId" IS NULL) OR
        ("userId" IS NOT NULL AND "membershipBusinessId" = "businessId")
    ),
    CONSTRAINT "MessagingReadPreference_customer_business_match" CHECK (
        ("customerId" IS NULL AND "customerBusinessId" IS NULL) OR
        ("customerId" IS NOT NULL AND "customerBusinessId" = "businessId")
    )
);

CREATE TABLE "MessageReadReceipt" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "userId" TEXT,
    "membershipBusinessId" TEXT,
    "customerId" TEXT,
    "customerBusinessId" TEXT,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageReadReceipt_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "MessageReadReceipt_actor_xor" CHECK (
        (CASE WHEN "userId" IS NULL THEN 0 ELSE 1 END) +
        (CASE WHEN "customerId" IS NULL THEN 0 ELSE 1 END) = 1
    ),
    CONSTRAINT "MessageReadReceipt_membership_business_match" CHECK (
        ("userId" IS NULL AND "membershipBusinessId" IS NULL) OR
        ("userId" IS NOT NULL AND "membershipBusinessId" = "businessId")
    ),
    CONSTRAINT "MessageReadReceipt_customer_business_match" CHECK (
        ("customerId" IS NULL AND "customerBusinessId" IS NULL) OR
        ("customerId" IS NOT NULL AND "customerBusinessId" = "businessId")
    )
);

CREATE UNIQUE INDEX "MessagingReadPreference_userId_businessId_key"
ON "MessagingReadPreference"("userId", "businessId");

CREATE UNIQUE INDEX "MessagingReadPreference_customerId_businessId_key"
ON "MessagingReadPreference"("customerId", "businessId");

CREATE INDEX "MessagingReadPreference_businessId_userId_idx"
ON "MessagingReadPreference"("businessId", "userId");

CREATE INDEX "MessagingReadPreference_businessId_customerId_idx"
ON "MessagingReadPreference"("businessId", "customerId");

CREATE UNIQUE INDEX "MessageReadReceipt_messageId_userId_key"
ON "MessageReadReceipt"("messageId", "userId");

CREATE UNIQUE INDEX "MessageReadReceipt_messageId_customerId_key"
ON "MessageReadReceipt"("messageId", "customerId");

CREATE INDEX "MessageReadReceipt_businessId_messageId_idx"
ON "MessageReadReceipt"("businessId", "messageId");

CREATE INDEX "MessageReadReceipt_businessId_userId_idx"
ON "MessageReadReceipt"("businessId", "userId");

CREATE INDEX "MessageReadReceipt_businessId_customerId_idx"
ON "MessageReadReceipt"("businessId", "customerId");

ALTER TABLE "MessagingReadPreference"
  ADD CONSTRAINT "MessagingReadPreference_business_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MessagingReadPreference"
  ADD CONSTRAINT "MessagingReadPreference_membership_fkey"
  FOREIGN KEY ("userId", "membershipBusinessId")
  REFERENCES "Membership"("userId", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MessagingReadPreference"
  ADD CONSTRAINT "MessagingReadPreference_customer_fkey"
  FOREIGN KEY ("customerId", "customerBusinessId")
  REFERENCES "Cliente"("id", "empresaId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MessageReadReceipt"
  ADD CONSTRAINT "MessageReadReceipt_business_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MessageReadReceipt"
  ADD CONSTRAINT "MessageReadReceipt_message_fkey"
  FOREIGN KEY ("messageId", "businessId")
  REFERENCES "Message"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MessageReadReceipt"
  ADD CONSTRAINT "MessageReadReceipt_membership_fkey"
  FOREIGN KEY ("userId", "membershipBusinessId")
  REFERENCES "Membership"("userId", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MessageReadReceipt"
  ADD CONSTRAINT "MessageReadReceipt_customer_fkey"
  FOREIGN KEY ("customerId", "customerBusinessId")
  REFERENCES "Cliente"("id", "empresaId") ON DELETE RESTRICT ON UPDATE CASCADE;
