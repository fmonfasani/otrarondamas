-- Inc-3: número comercial correlativo por empresa (spec-modulos_ventas D-VTA-10/A).
-- nullable para no bloquear ventas ya existentes que no tienen número asignado.

ALTER TABLE "Venta" ADD COLUMN "numero" INTEGER;

-- Índice no-único por empresa para acelerar el MAX(numero) que calcula el próximo
-- número dentro de la transacción de create(). No es UNIQUE porque las ventas
-- previas al incremento tienen numero=NULL y Postgres no garantiza unicidad en
-- NULLs con un índice UNIQUE estándar.
CREATE INDEX "Venta_empresaId_numero_idx" ON "Venta"("empresaId", "numero");
