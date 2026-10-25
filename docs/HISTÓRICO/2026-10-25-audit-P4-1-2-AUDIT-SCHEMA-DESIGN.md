# P4-1 & P4-2: Audit Schema + Event Logging Design
## Wapsell Phase 2 Implementation Specification

**Status**: APPROVED FOR IMPLEMENTATION  
**Date**: 2026-10-25  
**Phase**: Phase 2 P4 (Audit/Reporting subsystem)  
**Scope**: Schema design, event taxonomy, logging integration, retention policy

---

## EXECUTIVE SUMMARY

P4-1 & P4-2 implement the core audit infrastructure for Wapsell:

- **P4-1: AuditLog Schema** — Prisma migration + AccionAudit enum + 7 performance indexes + 1-year retention cleanup
- **P4-2: Event Logging** — AuditService + logging integration in 6 subsystems + 20+ event types

### Key Deliverables

| Item | Count | Status |
|------|-------|--------|
| Prisma migration files | 1 | TBD |
| AccionAudit enum values | 31 | TBD |
| Performance indexes | 7 | TBD |
| AuditService methods | 4 | TBD |
| Integrated subsystems | 6 | TBD |
| Event types logged | 20+ | TBD |
| Unit + integration tests | 24+ | TBD |
| Multi-tenant test cases | 3+ | TBD |

---

## P4-1: AUDITLOG SCHEMA DESIGN

### Current State (AS-IS)

The existing AuditLog model in schema.prisma:

```prisma
model AuditLog {
  id                 String        @id
  empresaId          String
  usuarioId          String?
  fechaHora          DateTime      @default(now())
  accion             String        // Currently a free-form string
  entidadAfectada    String
  entidadId          String?
  valoresAnteriores  Json?
  valoresPosteriores Json?
  motivo             String?
  autorizacionId     String?
  ventaId            String?
  createdAt          DateTime      @default(now())
  updatedAt          DateTime
  Autorizacion       Autorizacion? @relation(fields: [autorizacionId], references: [id])
  Empresa            Empresa       @relation(fields: [empresaId], references: [id])
  Usuario            Usuario?      @relation(fields: [usuarioId], references: [id])
  Venta              Venta?        @relation(fields: [ventaId], references: [id])
}
```

### Target State (TO-BE)

#### 1. AccionAudit Enum (31 event types)

```prisma
enum AccionAudit {
  // SALES subsystem (4 types)
  CREAR_VENTA
  ACTUALIZAR_VENTA
  CANCELAR_VENTA
  DEVOLVER_VENTA

  // INVENTORY subsystem (5 types)
  CREAR_AJUSTE_STOCK
  APLICAR_AJUSTE_STOCK
  REVERTIR_AJUSTE_STOCK
  CAMBIAR_PRECIO
  CREAR_MOVIMIENTO_STOCK

  // PURCHASES subsystem (4 types)
  CREAR_COMPRA
  RECIBIR_COMPRA
  CANCELAR_COMPRA
  CREAR_ORDEN_COMPRA

  // ORDERS subsystem (3 types)
  CREAR_ORDEN
  CONFIRMAR_ORDEN
  CANCELAR_ORDEN

  // CASH REGISTER subsystem (4 types)
  APERTURA_CAJA
  CIERRE_CAJA
  MOVIMIENTO_CAJA
  ARQUEO_CAJA

  // AUTHENTICATION subsystem (4 types)
  LOGIN
  LOGOUT
  CAMBIO_CONTRASENA
  CAMBIO_PERMISO

  // REPORTING subsystem (2 types)
  ACCESO_REPORTE
  EXPORTAR_DATOS

  // SYSTEM subsystem (5 types)
  SINCRONIZAR_DATOS
  ERROR_CRITICO
  IMPORTAR_DATOS
  CAMBIO_CONFIGURACION
  RESTAURAR_DATOS
}
```

#### 2. Enhanced AuditLog Model

```prisma
model AuditLog {
  // Primary key
  id                 String        @id

  // Tenant & actor context
  empresaId          String
  usuarioId          String?
  
  // Timestamps
  fechaHora          DateTime      @default(now())
  createdAt          DateTime      @default(now())
  
  // Action & entity details
  accion             AccionAudit
  entidadAfectada    String
  entidadId          String?
  
  // Values for audit trail
  valoresAnteriores  Json?
  valoresPosteriores Json?
  
  // Context & rationale
  motivo             String?
  autorizacionId     String?
  
  // Legacy relations (for backward compatibility during Phase 2)
  ventaId            String?
  
  // Relations
  Autorizacion       Autorizacion? @relation(fields: [autorizacionId], references: [id])
  Empresa            Empresa       @relation(fields: [empresaId], references: [id])
  Usuario            Usuario?      @relation(fields: [usuarioId], references: [id])
  Venta              Venta?        @relation(fields: [ventaId], references: [id])

  // Indexes for performance
  @@index([empresaId, fechaHora])          // Tenant + time range queries
  @@index([usuarioId, fechaHora])          // User activity queries
  @@index([accion, empresaId])             // Action type queries per tenant
  @@index([entidadAfectada, entidadId])    // Entity lookup queries
  @@index([fechaHora])                     // Time-based archival / cleanup
  @@index([empresaId, accion, fechaHora])  // Tenant-action-time (main query)
  @@index([autorizacionId])                // Authorization reference lookup
}
```

#### 3. Retention Policy (1-year cleanup)

**Trigger**: Daily job runs at 02:00 UTC

**Policy**: Delete AuditLog records older than 1 year

```sql
DELETE FROM "AuditLog"
WHERE "fechaHora" < NOW() - INTERVAL '1 year'
RETURNING id;
```

**Implementation**:
- Async task scheduled via NestJS @Cron('0 2 * * *')
- Logs deletion counts to console
- Includes batch processing (1000 records/batch) to avoid locking
- Idempotent (safe to run multiple times)

---

## P4-2: EVENT LOGGING DESIGN

### AuditService Architecture

```typescript
// apps/api/src/audit/audit.service.ts
@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  // Synchronous logging (most events)
  async log(event: CreateAuditLogDto): Promise<AuditLog> {
    return this.prisma.auditLog.create({
      data: {
        empresaId: event.empresaId,
        usuarioId: event.usuarioId,
        accion: event.accion,
        entidadAfectada: event.entidadAfectada,
        entidadId: event.entidadId,
        valoresAnteriores: event.valoresAnteriores,
        valoresPosteriores: event.valoresPosteriores,
        motivo: event.motivo,
        autorizacionId: event.autorizacionId,
      },
    });
  }

  // Async logging (bulk/heavy operations)
  async logAsync(event: CreateAuditLogDto): Promise<void> {
    // Fire-and-forget with error logging
    this.log(event).catch(err => {
      console.error('Audit log error:', err);
    });
  }

  // Bulk logging (batch operations)
  async logBatch(events: CreateAuditLogDto[]): Promise<number> {
    if (events.length === 0) return 0;
    const result = await this.prisma.auditLog.createMany({
      data: events,
      skipDuplicates: false,
    });
    return result.count;
  }

  // Query logs
  async getLogs(filters: AuditLogFilterDto): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({
      where: {
        empresaId: filters.empresaId,
        accion: filters.accion,
        fechaHora: {
          gte: filters.startDate,
          lte: filters.endDate,
        },
      },
      orderBy: { fechaHora: 'desc' },
      take: filters.limit || 100,
    });
  }
}
```

### Logging Integration Points (6 subsystems)

#### 1. SALES Subsystem

**File**: `apps/api/src/sales/sales.service.ts`

**Events**:
- `CREAR_VENTA`: When new sale is created
- `ACTUALIZAR_VENTA`: When sale is modified
- `CANCELAR_VENTA`: When sale is canceled
- `DEVOLVER_VENTA`: When sale is returned (Phase 3)

**Code Pattern**:
```typescript
async createVenta(dto: CreateVentaDto, userId: string, empresaId: string): Promise<Venta> {
  const venta = await this.prisma.venta.create({ data: {...} });
  
  await this.auditService.log({
    empresaId,
    usuarioId: userId,
    accion: AccionAudit.CREAR_VENTA,
    entidadAfectada: 'Venta',
    entidadId: venta.id,
    valoresPosteriores: venta,
  });
  
  return venta;
}
```

#### 2. INVENTORY Subsystem

**File**: `apps/api/src/inventory/inventory.service.ts`

**Events**:
- `CREAR_AJUSTE_STOCK`: Adjustment created
- `APLICAR_AJUSTE_STOCK`: Adjustment applied
- `REVERTIR_AJUSTE_STOCK`: Adjustment reversed
- `CAMBIAR_PRECIO`: Product price changed
- `CREAR_MOVIMIENTO_STOCK`: Stock movement recorded

#### 3. PURCHASES Subsystem

**File**: `apps/api/src/purchases/purchases.service.ts`

**Events**:
- `CREAR_COMPRA`: Purchase order created
- `RECIBIR_COMPRA`: Goods received
- `CANCELAR_COMPRA`: Purchase canceled
- `CREAR_ORDEN_COMPRA`: Formal order generated

#### 4. ORDERS Subsystem

**File**: `apps/api/src/orders/orders.service.ts`

**Events**:
- `CREAR_ORDEN`: Order created (from cart)
- `CONFIRMAR_ORDEN`: Order confirmed
- `CANCELAR_ORDEN`: Order canceled (with stock reversal)

#### 5. AUTHENTICATION Subsystem

**File**: `apps/api/src/auth/auth.service.ts`

**Events**:
- `LOGIN`: User authenticated
- `LOGOUT`: User session ended
- `CAMBIO_CONTRASENA`: Password changed
- `CAMBIO_PERMISO`: Permissions modified

#### 6. CASH REGISTER Subsystem

**File**: `apps/api/src/cash-register/cash-register.service.ts`

**Events**:
- `APERTURA_CAJA`: Register opened
- `CIERRE_CAJA`: Register closed
- `MOVIMIENTO_CAJA`: Cash movement recorded
- `ARQUEO_CAJA`: Register reconciliation performed

### Event Details (20+ types)

| Subsystem | Event | Entity | Logged Fields | Async? |
|-----------|-------|--------|---------------|--------|
| Sales | CREAR_VENTA | Venta | montoTotal, items, cliente | No |
| Sales | ACTUALIZAR_VENTA | Venta | cambios, motivo | No |
| Sales | CANCELAR_VENTA | Venta | motivo, stock_reversal | Yes |
| Inventory | CREAR_AJUSTE_STOCK | AjusteStock | cantidad, producto | No |
| Inventory | APLICAR_AJUSTE_STOCK | AjusteStock | estado_anterior | No |
| Inventory | CAMBIAR_PRECIO | Producto | precio_anterior, precio_nuevo | No |
| Orders | CREAR_ORDEN | Orden | cartId, items | No |
| Orders | CONFIRMAR_ORDEN | Orden | paymentId | No |
| Orders | CANCELAR_ORDEN | Orden | motivo, stock_reversal_id | Yes |
| Auth | LOGIN | Usuario | ip, userAgent | No |
| Auth | CAMBIO_CONTRASENA | Usuario | - | No |
| Cash | APERTURA_CAJA | AperturaCaja | montoInicial | No |
| Cash | CIERRE_CAJA | CierreCaja | montoFinal, diferencia | No |

---

## IMPLEMENTATION SCHEDULE

### P4-1: AuditLog Schema (1–2 days)

- [ ] Create Prisma migration (add enum, indexes, retention trigger)
- [ ] Apply migration
- [ ] Test data integrity

### P4-2: Event Logging (2–3 days)

- [ ] Create `AuditModule` with `AuditService`
- [ ] Integrate into 6 subsystems
- [ ] Add integration tests per subsystem
- [ ] Test multi-tenant isolation
- [ ] Verify retention policy works

---

## ACCEPTANCE CRITERIA

### P4-1 Complete

- ✅ Prisma migration created and applied
- ✅ AccionAudit enum defined (31 values)
- ✅ 7 performance indexes created
- ✅ Retention policy configured
- ✅ No data loss or corruption
- ✅ Tests verify indexes work and cleanup runs

### P4-2 Complete

- ✅ AuditService implemented (log, logAsync, logBatch methods)
- ✅ All 6 subsystems integrated (Sales, Inventory, Purchases, Orders, Auth, Cash)
- ✅ 20+ event types logged with correct context
- ✅ Multi-tenant isolation verified
- ✅ 24+ tests pass (unit, integration, retention, multi-tenant)
- ✅ Build compiles without errors
- ✅ No audit log leakage between tenants

---

## MULTI-TENANT ISOLATION

### Design Principles

1. **Tenant Context**: Every AuditLog entry includes `empresaId`
2. **Query Scoping**: All audit queries filter by `empresaId` first
3. **Log Separation**: Logs for different tenants never mixed
4. **Access Control**: Reporting API checks permission before returning logs

### Test Scenarios

- ✅ Audit log created with correct `empresaId`
- ✅ Cross-tenant queries return zero results
- ✅ Cleanup policy does not delete other tenant's logs
- ✅ User from Tenant A cannot read Tenant B's logs

---

## TECHNICAL SPECIFICATIONS

### Database Schema

**Prisma Migration**:
```
apps/api/prisma/migrations/[timestamp]_add_audit_schema/
├── migration.sql        # Creates enum, indexes, trigger
└── migration_lock.toml
```

**SQL Components**:
1. CREATE TYPE AccionAudit AS ENUM
2. ALTER TABLE AuditLog ADD COLUMN accion AccionAudit (from string)
3. CREATE 7 indexes
4. Retention policy (1-year DELETE)

### Files to Create/Modify

| File | Type | Action |
|------|------|--------|
| `apps/api/prisma/schema.prisma` | Schema | Add AccionAudit enum, indexes |
| `apps/api/prisma/migrations/[id]_add_audit_schema/migration.sql` | Migration | DDL for enum + indexes |
| `apps/api/src/audit/audit.service.ts` | Service | Create AuditService |
| `apps/api/src/audit/audit.module.ts` | Module | Create AuditModule |
| `apps/api/src/audit/dto/create-audit-log.dto.ts` | DTO | Input validation |
| `apps/api/src/sales/sales.service.ts` | Service | Add logging calls |
| `apps/api/src/inventory/inventory.service.ts` | Service | Add logging calls |
| `apps/api/src/purchases/purchases.service.ts` | Service | Add logging calls |
| `apps/api/src/orders/orders.service.ts` | Service | Add logging calls |
| `apps/api/src/auth/auth.service.ts` | Service | Add logging calls |
| `apps/api/src/cash-register/cash-register.service.ts` | Service | Add logging calls |
| `apps/api/src/audit/audit.service.spec.ts` | Test | Unit tests (10+) |
| `apps/api/src/audit/audit.integration.spec.ts` | Test | Integration tests (14+) |

---

## TESTING STRATEGY

### Unit Tests (10+)

- AuditService.log() creates entry with correct fields
- AuditService.logAsync() queues asynchronously
- AuditService.logBatch() creates multiple entries
- AuditService.getLogs() filters by tenantId
- Retention policy deletes old entries
- Indexes exist and are used

### Integration Tests (14+)

- SALES: Event logged on create, update, cancel
- INVENTORY: Event logged on adjustment, price change
- PURCHASES: Event logged on create, receive, cancel
- ORDERS: Event logged on create, confirm, cancel
- AUTH: Event logged on login/logout
- CASH: Event logged on open/close/movement
- Multi-tenant: Logs isolated per tenant
- Retention: Only entries >1 year deleted

---

## RISK MITIGATION

| Risk | Mitigation |
|------|-----------|
| High audit log volume | Indexes on (empresaId, fechaHora) for efficient queries; batch cleanup |
| Tenant data leakage | Explicit empresaId filter in all queries; test cases |
| Lock contention | Batch DELETE with LIMIT to avoid long locks |
| Missing events | Integration tests verify each subsystem logs |

---

## ROLLBACK STRATEGY (Phase 2)

If implementation fails, rollback is safe:

1. Rollback Prisma migration (restores previous schema)
2. Remove AuditService and module
3. Remove audit logging calls from services
4. Existing AuditLog table remains (backward compatible)

---

## REFERENCES

- **P4-1-2-AUDIT-SCHEMA-DESIGN.md**: This document
- **PHASE-2-DESIGN-APPROVAL-SUMMARY-2026-10-25.md**: Approval authority
- **apps/api/prisma/schema.prisma**: Current schema
- **Wapsell multi-tenant architecture**: CompanyScopedPrisma pattern

