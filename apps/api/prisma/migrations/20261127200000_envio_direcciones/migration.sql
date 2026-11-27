-- OR-B4-054, fase 2b (Owner, 2026-11-27) — delivery or pickup on each store order, and the
-- addresses a buyer saves to receive orders. Additive only: orders placed before keep
-- tipoEntrega NULL and costoEnvio 0. CompradorDireccion has no business column, so no RLS
-- policy applies: it is revoked from wapsell_app in db-roles/grants.sql, like Comprador.

-- CreateEnum
CREATE TYPE "TipoEntrega" AS ENUM ('RETIRO', 'ENVIO');

-- AlterTable
ALTER TABLE "Pedido" ADD COLUMN     "costoEnvio" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "direccionEntrega" TEXT,
ADD COLUMN     "indicacionesEntrega" TEXT,
ADD COLUMN     "kmEntrega" DOUBLE PRECISION,
ADD COLUMN     "latEntrega" DOUBLE PRECISION,
ADD COLUMN     "lngEntrega" DOUBLE PRECISION,
ADD COLUMN     "tipoEntrega" "TipoEntrega";

-- CreateTable
CREATE TABLE "CompradorDireccion" (
    "id" TEXT NOT NULL,
    "compradorId" TEXT NOT NULL,
    "etiqueta" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "indicaciones" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompradorDireccion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompradorDireccion_compradorId_idx" ON "CompradorDireccion"("compradorId");

-- AddForeignKey
ALTER TABLE "CompradorDireccion" ADD CONSTRAINT "CompradorDireccion_compradorId_fkey" FOREIGN KEY ("compradorId") REFERENCES "Comprador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

