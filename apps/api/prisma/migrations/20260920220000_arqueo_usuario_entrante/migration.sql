-- AlterTable
ALTER TABLE "ArqueoCaja" ADD COLUMN     "usuarioEntranteId" TEXT NOT NULL;

-- CreateIndex
-- Nota: este índice ya estaba declarado en schema.prisma desde el
-- commit inicial (@@unique([empresaId]) en Caja) pero nunca se había
-- aplicado a la base — la migración inicial no lo incluyó. Se corrige
-- acá junto con el cambio de ArqueoCaja porque `prisma migrate diff`
-- lo detectó como pendiente; no es parte del alcance de doble
-- confirmación de arqueo, es un gap preexistente encontrado al generar
-- este diff.
CREATE UNIQUE INDEX "Caja_empresaId_key" ON "Caja"("empresaId");

-- AddForeignKey
ALTER TABLE "ArqueoCaja" ADD CONSTRAINT "ArqueoCaja_usuarioEntranteId_fkey" FOREIGN KEY ("usuarioEntranteId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
