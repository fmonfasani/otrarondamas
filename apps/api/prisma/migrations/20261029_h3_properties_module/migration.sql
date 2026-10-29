-- CreateTable "Property" (H3: Properties Module - Demo property listing)
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "bedrooms" INTEGER NOT NULL,
    "bathrooms" INTEGER NOT NULL,
    "location" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "images" JSONB,
    "amenities" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable "Lead" (H3: Leads from demo contact form)
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "propertyId" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "verificationToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable "EmailVerificationToken" (H3: Email verification tokens)
CREATE TABLE "EmailVerificationToken" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex for Property
CREATE INDEX "Property_location_createdAt_idx" ON "Property"("location", "createdAt");
CREATE INDEX "Property_price_idx" ON "Property"("price");
CREATE INDEX "Property_type_idx" ON "Property"("type");
CREATE INDEX "Property_deletedAt_idx" ON "Property"("deletedAt");

-- CreateIndex for Lead
CREATE INDEX "Lead_email_createdAt_idx" ON "Lead"("email", "createdAt");
CREATE INDEX "Lead_verifiedAt_idx" ON "Lead"("verifiedAt");
CREATE INDEX "Lead_propertyId_idx" ON "Lead"("propertyId");
CREATE INDEX "Lead_ipAddress_createdAt_idx" ON "Lead"("ipAddress", "createdAt");

-- CreateUnique for Lead.verificationToken
CREATE UNIQUE INDEX "Lead_verificationToken_key" ON "Lead"("verificationToken");

-- CreateIndex for EmailVerificationToken
CREATE INDEX "EmailVerificationToken_email_expiresAt_idx" ON "EmailVerificationToken"("email", "expiresAt");

-- CreateUnique for EmailVerificationToken.tokenHash
CREATE UNIQUE INDEX "EmailVerificationToken_tokenHash_key" ON "EmailVerificationToken"("tokenHash");

-- AddForeignKey for Lead.propertyId
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;
