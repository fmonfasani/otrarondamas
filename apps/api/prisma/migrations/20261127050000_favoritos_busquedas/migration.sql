-- Marketplace, step 3b (Owner, 2026-11-26) — a buyer's favorite products (♥) across stores, and
-- what people search per day (words and times, no personal data) for «más buscados».
-- Additive only. Neither table has a business column, so no RLS policy applies: favorites are
-- revoked from wapsell_app in db-roles/grants.sql, like Comprador.

-- CreateTable
CREATE TABLE "CompradorFavorito" (
    "compradorId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompradorFavorito_pkey" PRIMARY KEY ("compradorId","productoId")
);

-- CreateTable
CREATE TABLE "BusquedaDiaria" (
    "dia" DATE NOT NULL,
    "termino" TEXT NOT NULL,
    "veces" INTEGER NOT NULL,

    CONSTRAINT "BusquedaDiaria_pkey" PRIMARY KEY ("dia","termino")
);

-- CreateIndex
CREATE INDEX "CompradorFavorito_productoId_idx" ON "CompradorFavorito"("productoId");

-- AddForeignKey
ALTER TABLE "CompradorFavorito" ADD CONSTRAINT "CompradorFavorito_compradorId_fkey" FOREIGN KEY ("compradorId") REFERENCES "Comprador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompradorFavorito" ADD CONSTRAINT "CompradorFavorito_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
