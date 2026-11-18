-- AlterTable
ALTER TABLE "Empresa" ADD COLUMN     "interno" BOOLEAN NOT NULL DEFAULT false;


-- ADR-IDN-014 — the internal Wapsell business (platform administration) and its accounts
-- cannot be deleted, emptied or stop being internal. Changing this needs a new migration.

-- At most one internal business.
CREATE UNIQUE INDEX "Empresa_un_solo_interno" ON "Empresa" ("interno") WHERE "interno";

CREATE FUNCTION wapsell_proteger_negocio_interno() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD."interno" THEN
      RAISE EXCEPTION 'El negocio interno de Wapsell no se puede borrar';
    END IF;
    RETURN OLD;
  END IF;
  IF OLD."interno" AND NOT NEW."interno" THEN
    RAISE EXCEPTION 'El negocio interno de Wapsell no puede dejar de ser interno';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER "Empresa_proteger_interno"
  BEFORE DELETE OR UPDATE OF "interno" ON "Empresa"
  FOR EACH ROW EXECUTE FUNCTION wapsell_proteger_negocio_interno();

CREATE FUNCTION wapsell_proteger_cuentas_internas() RETURNS trigger AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Empresa" WHERE "id" = OLD."empresaId" AND "interno") THEN
    RAISE EXCEPTION 'Las cuentas del negocio interno de Wapsell no se pueden borrar';
  END IF;
  RETURN OLD;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER "Usuario_proteger_interno"
  BEFORE DELETE ON "Usuario"
  FOR EACH ROW EXECUTE FUNCTION wapsell_proteger_cuentas_internas();

-- TRUNCATE skips row triggers: refuse emptying these tables while the internal business exists.
CREATE FUNCTION wapsell_impedir_vaciado() RETURNS trigger AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Empresa" WHERE "interno") THEN
    RAISE EXCEPTION 'Existe el negocio interno de Wapsell: no se puede vaciar %', TG_TABLE_NAME;
  END IF;
  RETURN NULL;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER "Empresa_impedir_vaciado" BEFORE TRUNCATE ON "Empresa"
  FOR EACH STATEMENT EXECUTE FUNCTION wapsell_impedir_vaciado();
CREATE TRIGGER "Usuario_impedir_vaciado" BEFORE TRUNCATE ON "Usuario"
  FOR EACH STATEMENT EXECUTE FUNCTION wapsell_impedir_vaciado();
