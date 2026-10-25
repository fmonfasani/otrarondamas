-- CreateTable RoleTemplate
CREATE TABLE "RoleTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "empresaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoleTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable CapabilityDefinition
CREATE TABLE "CapabilityDefinition" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CapabilityDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable RoleCapability
CREATE TABLE "RoleCapability" (
    "id" TEXT NOT NULL,
    "roleTemplateId" TEXT NOT NULL,
    "capabilityDefId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoleCapability_pkey" PRIMARY KEY ("id")
);

-- CreateTable RoleGrant
CREATE TABLE "RoleGrant" (
    "id" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "roleTemplateId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoleGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable CapabilityGrant
CREATE TABLE "CapabilityGrant" (
    "id" TEXT NOT NULL,
    "roleGrantId" TEXT NOT NULL,
    "capabilityDefId" TEXT NOT NULL,
    "grantType" TEXT NOT NULL DEFAULT 'GRANT',
    "reason" TEXT,
    "grantedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CapabilityGrant_pkey" PRIMARY KEY ("id")
);

-- CreateEnum CapabilityGrantType
CREATE TYPE "CapabilityGrantType" AS ENUM ('GRANT', 'DENY');

-- CreateIndex on RoleTemplate.name
CREATE UNIQUE INDEX "RoleTemplate_name_key" ON "RoleTemplate"("name");

-- CreateIndex on CapabilityDefinition.code
CREATE UNIQUE INDEX "CapabilityDefinition_code_key" ON "CapabilityDefinition"("code");

-- CreateIndex on RoleCapability
CREATE UNIQUE INDEX "RoleCapability_roleTemplateId_capabilityDefId_key" ON "RoleCapability"("roleTemplateId", "capabilityDefId");
CREATE INDEX "RoleCapability_roleTemplateId_idx" ON "RoleCapability"("roleTemplateId");

-- CreateIndex on RoleGrant
CREATE UNIQUE INDEX "RoleGrant_membershipId_key" ON "RoleGrant"("membershipId");
CREATE INDEX "RoleGrant_membershipId_idx" ON "RoleGrant"("membershipId");

-- CreateIndex on CapabilityGrant
CREATE UNIQUE INDEX "CapabilityGrant_roleGrantId_capabilityDefId_key" ON "CapabilityGrant"("roleGrantId", "capabilityDefId");
CREATE INDEX "CapabilityGrant_roleGrantId_idx" ON "CapabilityGrant"("roleGrantId");

-- Add foreign keys
ALTER TABLE "RoleCapability" ADD CONSTRAINT "RoleCapability_roleTemplateId_fkey" FOREIGN KEY ("roleTemplateId") REFERENCES "RoleTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoleCapability" ADD CONSTRAINT "RoleCapability_capabilityDefId_fkey" FOREIGN KEY ("capabilityDefId") REFERENCES "CapabilityDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RoleGrant" ADD CONSTRAINT "RoleGrant_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoleGrant" ADD CONSTRAINT "RoleGrant_roleTemplateId_fkey" FOREIGN KEY ("roleTemplateId") REFERENCES "RoleTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CapabilityGrant" ADD CONSTRAINT "CapabilityGrant_roleGrantId_fkey" FOREIGN KEY ("roleGrantId") REFERENCES "RoleGrant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CapabilityGrant" ADD CONSTRAINT "CapabilityGrant_capabilityDefId_fkey" FOREIGN KEY ("capabilityDefId") REFERENCES "CapabilityDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
