-- OR-B4-053 — every order gets a number per business (N° 1, 2, 3…), like an ERP's sales order:
-- the customer and the team talk about «el pedido 12», and that number travels with it.

ALTER TABLE "Pedido" ADD COLUMN "numero" INTEGER;

-- Existing orders: numbered by age within each business.
UPDATE "Pedido" p
SET "numero" = s.n
FROM (
  SELECT "id", row_number() OVER (PARTITION BY "empresaId" ORDER BY "createdAt", "id") AS n
  FROM "Pedido"
) s
WHERE s."id" = p."id";

-- New orders: the database assigns the next number, whatever path inserts them. The advisory
-- lock (one per business) makes two orders placed at the same time take 1 and 2, never 1 twice.
CREATE FUNCTION wapsell_numerar_pedido() RETURNS trigger AS $$
BEGIN
  IF NEW."numero" IS NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended('pedido_numero:' || NEW."empresaId", 0));
    SELECT COALESCE(MAX("numero"), 0) + 1 INTO NEW."numero"
    FROM "Pedido" WHERE "empresaId" = NEW."empresaId";
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER "Pedido_numerar"
  BEFORE INSERT ON "Pedido"
  FOR EACH ROW EXECUTE FUNCTION wapsell_numerar_pedido();

-- CreateIndex
CREATE UNIQUE INDEX "Pedido_empresaId_numero_key" ON "Pedido"("empresaId", "numero");
