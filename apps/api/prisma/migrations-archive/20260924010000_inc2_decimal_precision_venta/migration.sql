-- Inc-2: precisión fija NUMERIC(14,2) en campos de importe de Venta y VentaItem
-- (spec-modulos_ventas RN-VTA-02, CA-VTA-06). Los valores existentes se convierten
-- sin pérdida de datos (Postgres trunca/redondea al nuevo tipo si el valor lo requiere).

ALTER TABLE "Venta"
  ALTER COLUMN "total" TYPE DECIMAL(14,2),
  ALTER COLUMN "descuento" TYPE DECIMAL(14,2);

ALTER TABLE "VentaItem"
  ALTER COLUMN "cantidad" TYPE DECIMAL(14,2),
  ALTER COLUMN "precioUnitario" TYPE DECIMAL(14,2),
  ALTER COLUMN "descuentoItem" TYPE DECIMAL(14,2);
