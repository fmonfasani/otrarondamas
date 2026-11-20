-- OR-B4-046 §4.4 (D4), stage C3: offers between two dates. A percent off or an offer price, for
-- some products or (percent only) a whole category; in every channel or only in the store. The
-- order and sale lines keep the offer that set their price. Non-destructive: new tables and two
-- nullable columns; nothing is dropped or rewritten.

-- CreateEnum
CREATE TYPE "TipoOferta" AS ENUM ('PORCENTAJE', 'PRECIO');

-- AlterTable
ALTER TABLE "PedidoItem" ADD COLUMN "ofertaId" TEXT;

-- AlterTable
ALTER TABLE "VentaItem" ADD COLUMN "ofertaId" TEXT;

-- CreateTable
CREATE TABLE "Oferta" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoOferta" NOT NULL,
    "descuentoPorcentaje" DECIMAL(5,2),
    "precioOferta" DECIMAL(18,2),
    "desde" TIMESTAMP(3) NOT NULL,
    "hasta" TIMESTAMP(3) NOT NULL,
    "soloTienda" BOOLEAN NOT NULL DEFAULT false,
    "terminadaEn" TIMESTAMP(3),
    "familiaId" TEXT,
    "usuarioId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Oferta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfertaProducto" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "ofertaId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfertaProducto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (ADR-DAT-020: the category's key with its business, for the offer's reference)
CREATE UNIQUE INDEX "Familia_empresaId_id_key" ON "Familia"("empresaId", "id");

-- CreateIndex
CREATE INDEX "Oferta_empresaId_hasta_idx" ON "Oferta"("empresaId", "hasta");

-- CreateIndex
CREATE UNIQUE INDEX "Oferta_empresaId_id_key" ON "Oferta"("empresaId", "id");

-- CreateIndex
CREATE INDEX "OfertaProducto_productoId_idx" ON "OfertaProducto"("productoId");

-- CreateIndex
CREATE UNIQUE INDEX "OfertaProducto_ofertaId_productoId_key" ON "OfertaProducto"("ofertaId", "productoId");

-- AddForeignKey
ALTER TABLE "PedidoItem" ADD CONSTRAINT "PedidoItem_empresaId_ofertaId_fkey" FOREIGN KEY ("empresaId", "ofertaId") REFERENCES "Oferta"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Oferta" ADD CONSTRAINT "Oferta_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Oferta" ADD CONSTRAINT "Oferta_empresaId_familiaId_fkey" FOREIGN KEY ("empresaId", "familiaId") REFERENCES "Familia"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "OfertaProducto" ADD CONSTRAINT "OfertaProducto_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "OfertaProducto" ADD CONSTRAINT "OfertaProducto_empresaId_ofertaId_fkey" FOREIGN KEY ("empresaId", "ofertaId") REFERENCES "Oferta"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "OfertaProducto" ADD CONSTRAINT "OfertaProducto_empresaId_productoId_fkey" FOREIGN KEY ("empresaId", "productoId") REFERENCES "Producto"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "VentaItem" ADD CONSTRAINT "VentaItem_empresaId_ofertaId_fkey" FOREIGN KEY ("empresaId", "ofertaId") REFERENCES "Oferta"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;


-- An offer always reads one way (Prisma cannot express CHECK constraints).
ALTER TABLE "Oferta" ADD CONSTRAINT "Oferta_valor_segun_tipo" CHECK (
  ("tipo" = 'PORCENTAJE' AND "descuentoPorcentaje" > 0 AND "descuentoPorcentaje" < 100 AND "precioOferta" IS NULL)
  OR ("tipo" = 'PRECIO' AND "precioOferta" > 0 AND "descuentoPorcentaje" IS NULL AND "familiaId" IS NULL)
);
ALTER TABLE "Oferta" ADD CONSTRAINT "Oferta_hasta_despues_de_desde" CHECK ("hasta" > "desde");
