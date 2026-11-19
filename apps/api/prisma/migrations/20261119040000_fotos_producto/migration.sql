-- OR-B4-046 rule 12, stage A3: up to 5 photos per product for the store. The files live on the
-- server volume; each row says which file and in what order. The reference to the product carries
-- the business (ADR-DAT-020): restrict on delete and on update.

-- CreateTable
CREATE TABLE "ProductoFoto" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductoFoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductoFoto_empresaId_productoId_orden_idx" ON "ProductoFoto"("empresaId", "productoId", "orden");

-- AddForeignKey
ALTER TABLE "ProductoFoto" ADD CONSTRAINT "ProductoFoto_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductoFoto" ADD CONSTRAINT "ProductoFoto_empresaId_productoId_fkey" FOREIGN KEY ("empresaId", "productoId") REFERENCES "Producto"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

