-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('OWNER', 'ASISTENTE_LOCAL', 'PROVEEDOR', 'REPARTIDOR');

-- CreateEnum
CREATE TYPE "EstadoLegajo" AS ENUM ('PENDIENTE', 'APROBADO');

-- CreateEnum
CREATE TYPE "TipoDocumentoLegajo" AS ENUM ('ANTECEDENTES_PENALES', 'CONSTANCIA_CUIL');

-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN     "condicionIva" TEXT,
ADD COLUMN     "cuit" TEXT,
ADD COLUMN     "esMayorista" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "estadoLegajo" "EstadoLegajo",
ADD COLUMN     "googleId" TEXT,
ADD COLUMN     "passwordHash" TEXT,
ADD COLUMN     "razonSocial" TEXT;

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "estadoLegajo" "EstadoLegajo" NOT NULL DEFAULT 'APROBADO',
ADD COLUMN     "rol" "RolUsuario" NOT NULL DEFAULT 'OWNER';

-- CreateTable
CREATE TABLE "Invitacion" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "rol" "RolUsuario" NOT NULL,
    "token" TEXT NOT NULL,
    "invitadoPorId" TEXT NOT NULL,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "usadaEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invitacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Legajo" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT,
    "clienteId" TEXT,
    "cuit" TEXT,
    "razonSocial" TEXT,
    "condicionIva" TEXT,
    "tipoFactura" TEXT,
    "dni" TEXT,
    "telefono" TEXT,
    "direccion" TEXT,
    "vehiculoDatos" TEXT,
    "licenciaConducir" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Legajo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentoLegajo" (
    "id" TEXT NOT NULL,
    "legajoId" TEXT NOT NULL,
    "tipo" "TipoDocumentoLegajo" NOT NULL,
    "rutaArchivo" TEXT NOT NULL,
    "nombreArchivo" TEXT NOT NULL,
    "vencimiento" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentoLegajo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Invitacion_token_key" ON "Invitacion"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Legajo_usuarioId_key" ON "Legajo"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "Legajo_clienteId_key" ON "Legajo"("clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_googleId_key" ON "Cliente"("googleId");

-- AddForeignKey
ALTER TABLE "Invitacion" ADD CONSTRAINT "Invitacion_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitacion" ADD CONSTRAINT "Invitacion_invitadoPorId_fkey" FOREIGN KEY ("invitadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Legajo" ADD CONSTRAINT "Legajo_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Legajo" ADD CONSTRAINT "Legajo_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoLegajo" ADD CONSTRAINT "DocumentoLegajo_legajoId_fkey" FOREIGN KEY ("legajoId") REFERENCES "Legajo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

