-- CreateEnum for AccionAudit with 31 event types
CREATE TYPE "AccionAudit" AS ENUM (
  -- SALES subsystem (4 types)
  'CREAR_VENTA',
  'ACTUALIZAR_VENTA',
  'CANCELAR_VENTA',
  'DEVOLVER_VENTA',

  -- INVENTORY subsystem (5 types)
  'CREAR_AJUSTE_STOCK',
  'APLICAR_AJUSTE_STOCK',
  'REVERTIR_AJUSTE_STOCK',
  'CAMBIAR_PRECIO',
  'CREAR_MOVIMIENTO_STOCK',

  -- PURCHASES subsystem (4 types)
  'CREAR_COMPRA',
  'RECIBIR_COMPRA',
  'CANCELAR_COMPRA',
  'CREAR_ORDEN_COMPRA',

  -- ORDERS subsystem (3 types)
  'CREAR_ORDEN',
  'CONFIRMAR_ORDEN',
  'CANCELAR_ORDEN',

  -- CASH REGISTER subsystem (4 types)
  'APERTURA_CAJA',
  'CIERRE_CAJA',
  'MOVIMIENTO_CAJA',
  'ARQUEO_CAJA',

  -- AUTHENTICATION subsystem (4 types)
  'LOGIN',
  'LOGOUT',
  'CAMBIO_CONTRASENA',
  'CAMBIO_PERMISO',

  -- REPORTING subsystem (2 types)
  'ACCESO_REPORTE',
  'EXPORTAR_DATOS',

  -- SYSTEM subsystem (5 types)
  'SINCRONIZAR_DATOS',
  'ERROR_CRITICO',
  'IMPORTAR_DATOS',
  'CAMBIO_CONFIGURACION',
  'RESTAURAR_DATOS'
);

-- Alter AuditLog table: add accion column with new enum type
-- Keep old accion (string) column as 'accion_legacy' for migration safety
ALTER TABLE "AuditLog" ADD COLUMN "accion_enum" "AccionAudit";

-- Create 7 performance indexes on AuditLog
-- Index 1: Tenant + time range queries
CREATE INDEX "AuditLog_empresaId_fechaHora_idx" ON "AuditLog"("empresaId", "fechaHora" DESC);

-- Index 2: User activity queries
CREATE INDEX "AuditLog_usuarioId_fechaHora_idx" ON "AuditLog"("usuarioId", "fechaHora" DESC);

-- Index 3: Action type queries per tenant
CREATE INDEX "AuditLog_accion_empresaId_idx" ON "AuditLog"("accion_enum", "empresaId");

-- Index 4: Entity lookup queries
CREATE INDEX "AuditLog_entidadAfectada_entidadId_idx" ON "AuditLog"("entidadAfectada", "entidadId");

-- Index 5: Time-based archival / cleanup
CREATE INDEX "AuditLog_fechaHora_idx" ON "AuditLog"("fechaHora");

-- Index 6: Tenant-action-time (main query pattern)
CREATE INDEX "AuditLog_empresaId_accion_fechaHora_idx" ON "AuditLog"("empresaId", "accion_enum", "fechaHora" DESC);

-- Index 7: Authorization reference lookup
CREATE INDEX "AuditLog_autorizacionId_idx" ON "AuditLog"("autorizacionId");

-- Create index on createdAt for retention cleanup (not in main indexes but used by cleanup job)
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
