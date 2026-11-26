-- Paquete 1, S3 — what the system posts for the Business (order and return notices) is its own
-- kind of message, not a text that looks like one. Its own migration: a new enum value cannot be
-- used in the transaction that adds it.
ALTER TYPE "MessagingMessageType" ADD VALUE 'SYSTEM';
