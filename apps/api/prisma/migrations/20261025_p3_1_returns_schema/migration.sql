-- P3-1: Returns/Refunds Schema (DevolucionCliente, DevolucionClienteItem, Reembolso)
-- Date: 2026-10-25
-- This migration creates the schema for customer returns and refund processing
-- Non-destructive: Tables can be dropped to rollback

-- Create estatos/enums as types
CREATE TYPE "EstadoDevolucion" AS ENUM ('SOLICITADA', 'AUTORIZADA', 'RECIBIDA', 'PROCESADA');
CREATE TYPE "EstadoReembolso" AS ENUM ('PENDIENTE', 'EN_PROCESO', 'EXITO', 'FALLIDO', 'RECHAZADO', 'PENDIENTE_MANUAL');

-- Create DevolucionCliente table (customer return requests)
CREATE TABLE "DevolucionCliente" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "empresaId" TEXT NOT NULL,
  "negocioId" TEXT,
  "clienteId" TEXT NOT NULL,
  "ventaId" TEXT NOT NULL,
  "creadoPorId" TEXT NOT NULL,
  "numeroDevolucion" INTEGER,
  "estado" "EstadoDevolucion" NOT NULL DEFAULT 'SOLICITADA',
  "fechaSolicitud" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "fechaAutorizacion" TIMESTAMP(3),
  "fechaRecibida" TIMESTAMP(3),
  "fechaProcesada" TIMESTAMP(3),
  "ventaFecha" TIMESTAMP(3) NOT NULL,
  "diasDesdeVenta" INTEGER,
  "montoTotal" DECIMAL(14,2) NOT NULL,
  "montoComisiones" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "montoReembolsable" DECIMAL(14,2) NOT NULL,
  "motivo" TEXT NOT NULL,
  "observaciones" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdBy" TEXT,

  CONSTRAINT "DevolucionCliente_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "DevolucionCliente_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "DevolucionCliente_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "DevolucionCliente_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "DevolucionCliente_empresaId_numeroDevolucion_key" UNIQUE ("empresaId", "numeroDevolucion")
);

CREATE INDEX "DevolucionCliente_empresaId_estado_idx" ON "DevolucionCliente"("empresaId", "estado");
CREATE INDEX "DevolucionCliente_empresaId_clienteId_idx" ON "DevolucionCliente"("empresaId", "clienteId");
CREATE INDEX "DevolucionCliente_empresaId_ventaId_idx" ON "DevolucionCliente"("empresaId", "ventaId");
CREATE INDEX "DevolucionCliente_empresaId_createdAt_idx" ON "DevolucionCliente"("empresaId", "createdAt");
CREATE INDEX "DevolucionCliente_estado_fechaSolicitud_idx" ON "DevolucionCliente"("estado", "fechaSolicitud");

-- Create DevolucionClienteItem table (return line items)
CREATE TABLE "DevolucionClienteItem" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "devolucionClienteId" TEXT NOT NULL,
  "ventaItemId" TEXT NOT NULL,
  "productoId" TEXT NOT NULL,
  "cantidad" DECIMAL(14,2) NOT NULL,
  "precioUnitarioOriginal" DECIMAL(14,2) NOT NULL,
  "precioDevuelto" DECIMAL(14,2) NOT NULL,
  "descuentoItem" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "montoLineaDevuelto" DECIMAL(14,2) NOT NULL,
  "motivo" TEXT,
  "observaciones" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DevolucionClienteItem_devolucionClienteId_fkey" FOREIGN KEY ("devolucionClienteId") REFERENCES "DevolucionCliente"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "DevolucionClienteItem_ventaItemId_fkey" FOREIGN KEY ("ventaItemId") REFERENCES "VentaItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "DevolucionClienteItem_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "DevolucionClienteItem_devolucionClienteId_ventaItemId_key" UNIQUE ("devolucionClienteId", "ventaItemId")
);

CREATE INDEX "DevolucionClienteItem_devolucionClienteId_idx" ON "DevolucionClienteItem"("devolucionClienteId");
CREATE INDEX "DevolucionClienteItem_ventaItemId_idx" ON "DevolucionClienteItem"("ventaItemId");

-- Create Reembolso table (refund execution)
CREATE TABLE "Reembolso" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "devolucionClienteId" TEXT NOT NULL UNIQUE,
  "empresaId" TEXT NOT NULL,
  "referenceId" TEXT,
  "estado" "EstadoReembolso" NOT NULL DEFAULT 'PENDIENTE',
  "montoReembolsable" DECIMAL(14,2) NOT NULL,
  "montoActual" DECIMAL(14,2) NOT NULL,
  "metodoReembolso" TEXT,
  "intentos" INTEGER NOT NULL DEFAULT 0,
  "ultimoIntento" TIMESTAMP(3),
  "proximoIntento" TIMESTAMP(3),
  "resultado" TEXT,
  "motivoFalla" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "procesadoEn" TIMESTAMP(3),

  CONSTRAINT "Reembolso_devolucionClienteId_fkey" FOREIGN KEY ("devolucionClienteId") REFERENCES "DevolucionCliente"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Reembolso_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "Reembolso_empresaId_estado_idx" ON "Reembolso"("empresaId", "estado");
CREATE INDEX "Reembolso_empresaId_createdAt_idx" ON "Reembolso"("empresaId", "createdAt");
CREATE INDEX "Reembolso_estado_proximoIntento_idx" ON "Reembolso"("estado", "proximoIntento");
