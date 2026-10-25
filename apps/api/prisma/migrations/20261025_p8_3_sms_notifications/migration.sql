-- CreateEnum for SMSType
CREATE TYPE "SMSType" AS ENUM ('OTP', 'ALERT', 'TRANSACTIONAL', 'BULK');

-- CreateEnum for SMSStatus
CREATE TYPE "SMSStatus" AS ENUM ('SENT', 'DELIVERED', 'FAILED', 'PENDING');

-- CreateEnum for OTPPurpose
CREATE TYPE "OTPPurpose" AS ENUM ('LOGIN', 'PAYMENT', 'ACCOUNT_VERIFICATION', 'PASSWORD_RESET');

-- CreateTable PhoneNumber
CREATE TABLE "PhoneNumber" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT,
    "clienteId" TEXT,
    "empresaId" TEXT NOT NULL,
    "phoneNumber" VARCHAR(20) NOT NULL,
    "countryCode" TEXT NOT NULL DEFAULT '+54',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "verificationCode" TEXT,
    "verificationCodeExpires" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhoneNumber_pkey" PRIMARY KEY ("id")
);

-- CreateTable OTPSession
CREATE TABLE "OTPSession" (
    "id" TEXT NOT NULL,
    "phoneNumberId" TEXT NOT NULL,
    "purpose" "OTPPurpose" NOT NULL,
    "code" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OTPSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable SMSLog
CREATE TABLE "SMSLog" (
    "id" TEXT NOT NULL,
    "phoneNumberId" TEXT NOT NULL,
    "toPhone" VARCHAR(20) NOT NULL,
    "message" VARCHAR(160) NOT NULL,
    "type" "SMSType" NOT NULL,
    "status" "SMSStatus" NOT NULL DEFAULT 'PENDING',
    "twilioSid" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SMSLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable SMSAlert
CREATE TABLE "SMSAlert" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "usuarioId" TEXT,
    "clienteId" TEXT,
    "trigger" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "phoneNumberId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SMSAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PhoneNumber_empresaId_phoneNumber_key" ON "PhoneNumber"("empresaId", "phoneNumber");

-- CreateIndex
CREATE INDEX "PhoneNumber_usuarioId_idx" ON "PhoneNumber"("usuarioId");

-- CreateIndex
CREATE INDEX "PhoneNumber_clienteId_idx" ON "PhoneNumber"("clienteId");

-- CreateIndex
CREATE INDEX "PhoneNumber_empresaId_idx" ON "PhoneNumber"("empresaId");

-- CreateIndex
CREATE INDEX "OTPSession_phoneNumberId_idx" ON "OTPSession"("phoneNumberId");

-- CreateIndex
CREATE INDEX "OTPSession_expiresAt_idx" ON "OTPSession"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "SMSLog_twilioSid_key" ON "SMSLog"("twilioSid");

-- CreateIndex
CREATE INDEX "SMSLog_phoneNumberId_idx" ON "SMSLog"("phoneNumberId");

-- CreateIndex
CREATE INDEX "SMSLog_status_idx" ON "SMSLog"("status");

-- CreateIndex
CREATE INDEX "SMSLog_createdAt_idx" ON "SMSLog"("createdAt");

-- CreateIndex
CREATE INDEX "SMSLog_twilioSid_idx" ON "SMSLog"("twilioSid");

-- CreateIndex
CREATE INDEX "SMSAlert_empresaId_idx" ON "SMSAlert"("empresaId");

-- CreateIndex
CREATE INDEX "SMSAlert_usuarioId_idx" ON "SMSAlert"("usuarioId");

-- CreateIndex
CREATE INDEX "SMSAlert_clienteId_idx" ON "SMSAlert"("clienteId");

-- AddForeignKey
ALTER TABLE "PhoneNumber" ADD CONSTRAINT "PhoneNumber_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhoneNumber" ADD CONSTRAINT "PhoneNumber_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhoneNumber" ADD CONSTRAINT "PhoneNumber_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OTPSession" ADD CONSTRAINT "OTPSession_phoneNumberId_fkey" FOREIGN KEY ("phoneNumberId") REFERENCES "PhoneNumber"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SMSLog" ADD CONSTRAINT "SMSLog_phoneNumberId_fkey" FOREIGN KEY ("phoneNumberId") REFERENCES "PhoneNumber"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SMSAlert" ADD CONSTRAINT "SMSAlert_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SMSAlert" ADD CONSTRAINT "SMSAlert_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SMSAlert" ADD CONSTRAINT "SMSAlert_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SMSAlert" ADD CONSTRAINT "SMSAlert_phoneNumberId_fkey" FOREIGN KEY ("phoneNumberId") REFERENCES "PhoneNumber"("id") ON DELETE SET NULL ON UPDATE CASCADE;
