-- P12-1: CDN Infrastructure - Asset Management
-- Creates the Asset model for managing S3-backed assets with multi-tenant isolation

CREATE TABLE "Asset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "empresaId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "cdnUrl" TEXT NOT NULL,
    "altText" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "Asset_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Unique constraint on s3Key to prevent duplicate uploads
CREATE UNIQUE INDEX "Asset_s3Key_key" ON "Asset"("s3Key");

-- Index for company-scoped queries
CREATE INDEX "Asset_empresaId_idx" ON "Asset"("empresaId");

-- Index for soft-deleted queries
CREATE INDEX "Asset_deletedAt_idx" ON "Asset"("deletedAt");
