-- B2: Add KafkaEventLog table for Kafka event audit trail
-- Enables: event replay, debugging, compliance auditing, multi-tenant isolation verification

CREATE TABLE "KafkaEventLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "error" TEXT,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Idempotency constraint: same event (eventId) per business can only be logged once
CREATE UNIQUE INDEX "KafkaEventLog_eventId_businessId_key" ON "KafkaEventLog"("eventId", "businessId");

-- Query performance: business events by time
CREATE INDEX "KafkaEventLog_businessId_createdAt_idx" ON "KafkaEventLog"("businessId", "createdAt");

-- Query performance: business events by type
CREATE INDEX "KafkaEventLog_businessId_eventType_idx" ON "KafkaEventLog"("businessId", "eventType");

-- Query performance: failed events for replay/analysis
CREATE INDEX "KafkaEventLog_status_idx" ON "KafkaEventLog"("status");
