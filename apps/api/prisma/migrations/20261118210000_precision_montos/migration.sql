-- ADR-DAT-017 — amount precision (FASE-2-BASE-SEGURA §6, INIT-019 PR 2).
-- Amounts NUMERIC(18,2); quantities, unit costs and factors NUMERIC(18,4); percentages keep (5,2).
-- Fields that were (14,2) or (10,2) only widen. The database rounds half away from zero on save,
-- the same half-up rule the application applies per line.

-- AlterTable
ALTER TABLE "AperturaCaja" ALTER COLUMN "montoInicial" SET DATA TYPE DECIMAL(18,2);

-- AlterTable
ALTER TABLE "AplicacionPago" ALTER COLUMN "montoAplicado" SET DATA TYPE DECIMAL(18,2);

-- AlterTable
ALTER TABLE "ArqueoCaja" ALTER COLUMN "fondoFijoContado" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "efectivoVentasContado" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "efectivoDeudasContado" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "gastosRetirosRegistrados" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "efectivoEsperado" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "efectivoContado" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "diferencia" SET DATA TYPE DECIMAL(18,2);

-- AlterTable
ALTER TABLE "Caja" ALTER COLUMN "fondoFijo" SET DATA TYPE DECIMAL(18,2);

-- AlterTable
ALTER TABLE "CartItem" ALTER COLUMN "cantidad" SET DATA TYPE DECIMAL(18,4);

-- AlterTable
ALTER TABLE "CierreCaja" ALTER COLUMN "montoFinal" SET DATA TYPE DECIMAL(18,2);

-- AlterTable
ALTER TABLE "Cliente" ALTER COLUMN "limiteCredito" SET DATA TYPE DECIMAL(18,2);

-- AlterTable
ALTER TABLE "Compra" ALTER COLUMN "total" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "saldo" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "totalPagado" SET DATA TYPE DECIMAL(18,2);

-- AlterTable
ALTER TABLE "CompraItem" ALTER COLUMN "cantidadPedida" SET DATA TYPE DECIMAL(18,4),
ALTER COLUMN "cantidadRecibida" SET DATA TYPE DECIMAL(18,4),
ALTER COLUMN "costoUnitario" SET DATA TYPE DECIMAL(18,4);

-- AlterTable
ALTER TABLE "CuentaCorriente" ALTER COLUMN "saldo" SET DATA TYPE DECIMAL(18,2);

-- AlterTable
ALTER TABLE "Deuda" ALTER COLUMN "montoTotal" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "montoPendiente" SET DATA TYPE DECIMAL(18,2);

-- AlterTable
ALTER TABLE "DevolucionCliente" ALTER COLUMN "montoTotal" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "montoComisiones" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "montoReembolsable" SET DATA TYPE DECIMAL(18,2);

-- AlterTable
ALTER TABLE "DevolucionClienteItem" ALTER COLUMN "cantidad" SET DATA TYPE DECIMAL(18,4),
ALTER COLUMN "precioUnitarioOriginal" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "precioDevuelto" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "descuentoItem" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "montoLineaDevuelto" SET DATA TYPE DECIMAL(18,2);

-- AlterTable
ALTER TABLE "Reembolso" ALTER COLUMN "montoReembolsable" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "montoActual" SET DATA TYPE DECIMAL(18,2);

-- AlterTable
ALTER TABLE "DevolucionProveedorItem" ALTER COLUMN "cantidad" SET DATA TYPE DECIMAL(18,4),
ALTER COLUMN "costoUnitario" SET DATA TYPE DECIMAL(18,4);

-- AlterTable
ALTER TABLE "AnalyticsAggregation" ALTER COLUMN "avgValue" SET DATA TYPE DECIMAL(18,2);

-- AlterTable
ALTER TABLE "Lote" ALTER COLUMN "cantidad" SET DATA TYPE DECIMAL(18,4);

-- AlterTable
ALTER TABLE "MovimientoCaja" ALTER COLUMN "monto" SET DATA TYPE DECIMAL(18,2);

-- AlterTable
ALTER TABLE "MovimientoStock" ALTER COLUMN "cantidad" SET DATA TYPE DECIMAL(18,4);

-- AlterTable
ALTER TABLE "Pago" ALTER COLUMN "monto" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "comision" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "montoRecibido" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "vuelto" SET DATA TYPE DECIMAL(18,2);

-- AlterTable
ALTER TABLE "PagoProveedor" ALTER COLUMN "monto" SET DATA TYPE DECIMAL(18,2);

-- AlterTable
ALTER TABLE "Pedido" ALTER COLUMN "total" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "descuento" SET DATA TYPE DECIMAL(18,2);

-- AlterTable
ALTER TABLE "PedidoItem" ALTER COLUMN "cantidad" SET DATA TYPE DECIMAL(18,4),
ALTER COLUMN "precioUnitario" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "descuentoItem" SET DATA TYPE DECIMAL(18,2);

-- AlterTable
ALTER TABLE "Presentacion" ALTER COLUMN "factorConversion" SET DATA TYPE DECIMAL(18,4);

-- AlterTable
ALTER TABLE "Producto" ALTER COLUMN "costo" SET DATA TYPE DECIMAL(18,4),
ALTER COLUMN "precioMinorista" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "precioMayorista" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "stockMinimo" SET DATA TYPE DECIMAL(18,4);

-- AlterTable
ALTER TABLE "Venta" ALTER COLUMN "total" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "descuento" SET DATA TYPE DECIMAL(18,2);

-- AlterTable
ALTER TABLE "VentaItem" ALTER COLUMN "cantidad" SET DATA TYPE DECIMAL(18,4),
ALTER COLUMN "precioUnitario" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "descuentoItem" SET DATA TYPE DECIMAL(18,2);

-- AlterTable
ALTER TABLE "Payment" ALTER COLUMN "monto" SET DATA TYPE DECIMAL(18,2);

-- AlterTable
ALTER TABLE "Refund" ALTER COLUMN "monto" SET DATA TYPE DECIMAL(18,2);

