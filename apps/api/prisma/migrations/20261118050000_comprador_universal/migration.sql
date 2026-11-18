-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN     "compradorId" TEXT;

-- CreateTable
CREATE TABLE "Comprador" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "passwordHash" TEXT,
    "googleId" TEXT,
    "fotoUrl" TEXT,
    "emailVerificadoAt" TIMESTAMP(3),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comprador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompradorToken" (
    "id" TEXT NOT NULL,
    "compradorId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompradorToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Comprador_email_key" ON "Comprador"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Comprador_googleId_key" ON "Comprador"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "CompradorToken_tokenHash_key" ON "CompradorToken"("tokenHash");

-- CreateIndex
CREATE INDEX "CompradorToken_compradorId_tipo_idx" ON "CompradorToken"("compradorId", "tipo");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_empresaId_compradorId_key" ON "Cliente"("empresaId", "compradorId");

-- AddForeignKey
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_compradorId_fkey" FOREIGN KEY ("compradorId") REFERENCES "Comprador"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompradorToken" ADD CONSTRAINT "CompradorToken_compradorId_fkey" FOREIGN KEY ("compradorId") REFERENCES "Comprador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

