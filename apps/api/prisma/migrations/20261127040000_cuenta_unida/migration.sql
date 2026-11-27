-- Login por rol (Owner, 2026-11-26) — a buyer account remembers the work account of the same
-- person (joined once by email, confirmed). Additive: one nullable column, unique.

-- AlterTable
ALTER TABLE "Comprador" ADD COLUMN     "userId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Comprador_userId_key" ON "Comprador"("userId");

-- AddForeignKey
ALTER TABLE "Comprador" ADD CONSTRAINT "Comprador_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

