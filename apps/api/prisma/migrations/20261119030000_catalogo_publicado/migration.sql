-- OR-B4-046, stage A: the Mercadería is 100 % of the products; the Catálogo is what the
-- Business publishes in its store, featured products first, with a description for the customer.

-- AlterTable
ALTER TABLE "Producto" ADD COLUMN     "descripcion" TEXT,
ADD COLUMN     "destacado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "publicado" BOOLEAN NOT NULL DEFAULT false;

-- Rule 13: the Businesses that already exist keep their store as it is, so every active product
-- starts published. A new Business starts with an empty Catálogo (the column default).
UPDATE "Producto" SET "publicado" = true WHERE "activo" = true;
