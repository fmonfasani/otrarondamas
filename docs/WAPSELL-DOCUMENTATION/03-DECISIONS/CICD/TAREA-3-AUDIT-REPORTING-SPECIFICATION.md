# TAREA 3: Especificación Formal de Audit Log + Reporting

**Versión**: 1.0  
**Fecha**: 2026-10-25  
**Estado**: Especificación (NO implementado)  
**Responsable**: Federico Monfasani  
**Dueño de decisión**: Propietario Otra Ronda Más

---

## Resumen Ejecutivo

Este documento especifica formalmente la capacidad de Audit Log y Reporting para Otra Ronda Más. El sistema captura eventos auditables en transacciones, garantiza immutabilidad, y expone reportes según el rol del usuario.

**Scope**: Especificación completa sin implementación.

**Entrega**: 
- Estado actual (código + tests existentes)
- Especificación formal: eventos, schema, API, aislamiento multi-tenant, invariantes, casos de test
- Decisiones pendientes por el propietario
- Aceptación: aprobado ✅ o cambios requeridos

---

## 1. Estado Actual (AS-IS)

### 1.1 Modelo Prisma Existente

**Ubicación**: `apps/api/prisma/schema.prisma` línea 1298

```prisma
model AuditLog {
  id                 String        @id @default(uuid())
  empresaId          String
  empresa            Empresa       @relation(fields: [empresaId], references: [id])
  usuarioId          String?
  usuario            Usuario?      @relation(fields: [usuarioId], references: [id])
  fechaHora          DateTime      @default(now())
  accion             String
  entidadAfectada    String        // Nombre de la tabla o entidad
  entidadId          String?       // ID de la entidad afectada
  valoresAnteriores  Json?
  valoresPosteriores Json?
  motivo             String?
  autorizacionId     String?
  autorizacion       Autorizacion? @relation(fields: [autorizacionId], references: [id])
  ventaId            String?
  venta              Venta?        @relation("VentaAudits", fields: [ventaId], references: [id])
  createdAt          DateTime      @default(now())
  updatedAt          DateTime      @updatedAt
}
```

**Observaciones**:
- Modelo ya presente en schema: EXISTE
- Relación con `Empresa` (tenant-aware)
- Relación con `Usuario` (quién ejecutó la acción)
- `fechaHora` y `createdAt` duplicados — INCONSISTENCIA (ver §2.2)
- Campos JSON para antes/después: ✅
- Referencia a `Venta` específicamente: ACOPLAMIENTO (ver §2.2)

### 1.2 Eventos Auditables Actualmente Capturados

**Ubicación**: `apps/api/src/sales/sales.service.ts` líneas 189-205, 373-380

**Eventos observados**:
1. **CREATE Venta** (línea 190-205)
   - `accion`: 'CREATE'
   - `entidadAfectada`: 'Venta'
   - `entidadId`: sale.id
   - `valoresPosteriores`: { numero, total, canal, items }
   - `ventaId`: sale.id (referencia directa)

2. **PAGO** (línea 374-380)
   - `accion`: 'PAGO'
   - `entidadAfectada`: 'Pago'
   - `entidadId`: payment.id

**Conteo**: 2 ocurrencias de `auditLog.create()` en el código (grep)

### 1.3 Exposición Actual (API)

**Hallazgo**: NO hay endpoints públicos para audit o reporting

- Búsqueda: `@Get.*audit`, `@Post.*report`, `@Get.*report` → **0 resultados**
- No hay `audit.controller.ts` ni `reporting.controller.ts`
- No hay `audit.service.ts` ni `reporting.service.ts`

**Conclusión**: El sistema es write-only en transacciones, no hay lectura de audit log ni reportes públicos.

### 1.4 Tests Existentes

**Hallazgo**: NO hay tests unitarios o integración específicos

- Búsqueda: `**/*audit*.spec.ts` → **0 resultados**
- Búsqueda: `**/*report*.spec.ts` → **0 resultados**
- Búsqueda: `**/*audit*.ts` en `/test/integration/` → **0 resultados**

**Conclusión**: Auditing se logea pero no está testado.

### 1.5 Scoping Multi-tenant (Verificado)

**Ubicación**: `apps/api/src/prisma/company-scope.extension.ts` línea 64

```prisma
'AuditLog',  // ← enumerado en modelos company-scoped
```

**Hallazgo**: ✅ `AuditLog` está protegido por la extensión `CompanyScopedPrisma` (RF-03 del SDD)

**Implicación**: Todos los `auditLog.*()` dentro de `tx` o `db` (scoped) heredan automáticamente el filtro `empresaId` — no hay riesgo de cross-tenant leak a nivel de ORM.

---

## 2. Especificación TO-BE

### 2.1 Eventos Auditables (Enumeración Exhaustiva)

Eventos a capturar en transacciones con `AuditLog`:

#### **Módulo: Ventas (VENTA)**

| Evento | Acción | Entidad | Descripción | Campos en `valoresPosteriores` |
|--------|--------|---------|-------------|------|
| Crear venta | `CREATE` | Venta | Venta POS completada | `numero`, `total`, `descuento`, `canal`, `itemCount` |
| Registrar pago (venta) | `PAGO` | Pago | Pago aplicado a venta | `monto`, `medio`, `numero_referencia` |
| Revertir venta | `REVERT` | Venta | Anulación de venta | `motivo`, `total_original` |
| Aplicar descuento | `DESCUENTO` | Venta | Descuento manual en venta | `porcentaje`, `motivo` |

#### **Módulo: Inventario (INV)**

| Evento | Acción | Entidad | Descripción | Campos en `valoresPosteriores` |
|--------|--------|---------|-------------|------|
| Ajuste de stock | `AJUSTE` | MovimientoStock | Ajuste manual o recuento | `cantidad_anterior`, `cantidad_nueva`, `motivo` |
| Ingreso por compra | `INGRESO` | MovimientoStock | Stock recibido de proveedor | `cantidad`, `compra_numero`, `lote_id` |
| Egreso por venta | `EGRESO` | MovimientoStock | Stock deducido por venta | `cantidad`, `venta_numero` |
| Vencimiento detectado | `VENCIMIENTO` | MovimientoStock | Lote vencido identificado | `lote_id`, `fecha_vencimiento`, `cantidad` |
| Devolución de cliente | `DEVOLUCION_CLIENTE` | MovimientoStock | Producto devuelto a stock | `cantidad`, `pedido_id`, `motivo` |

#### **Módulo: Compras (COMPRA)**

| Evento | Acción | Entidad | Descripción | Campos en `valoresPosteriores` |
|--------|--------|---------|-------------|------|
| Crear compra | `CREATE` | Compra | Orden de compra creada | `numero`, `proveedor`, `total`, `itemCount` |
| Recibir compra | `RECEPCION` | RecepcionCompra | Recepción parcial/total | `cantidad_recibida`, `cantidad_esperada`, `lotes_creados` |
| Pago a proveedor | `PAGO_PROVEEDOR` | PagoProveedor | Pago registrado | `monto`, `medio_pago`, `saldo_pendiente` |
| Cancelar compra | `CANCELAR` | Compra | Compra cancelada | `motivo`, `total` |

#### **Módulo: Caja (CASH)**

| Evento | Acción | Entidad | Descripción | Campos en `valoresPosteriores` |
|--------|--------|---------|-------------|------|
| Apertura de caja | `APERTURA` | AperturaCaja | Caja abierta | `monto_inicial`, `usuario` |
| Cierre de caja | `CIERRE` | CierreCaja | Caja cerrada | `monto_inicial`, `monto_final`, `diferencia` |
| Movimiento interno | `MOVIMIENTO` | MovimientoCaja | Ingreso/egreso manual | `tipo`, `monto`, `descripcion` |
| Arqueo de caja | `ARQUEO` | ArqueoCaja | Conteo físico | `monto_sistema`, `monto_fisico`, `diferencia` |

#### **Módulo: Productos (PRODUCT)**

| Evento | Acción | Entidad | Descripción | Campos en `valoresPosteriores` |
|--------|--------|---------|-------------|------|
| Crear producto | `CREATE` | Producto | Producto agregado | `nombre`, `sku`, `precio_mayorista`, `precio_minorista` |
| Modificar precio | `UPDATE_PRECIO` | Producto | Cambio de precio | `precio_anterior`, `precio_nuevo`, `aplicable_desde` |
| Activar/Desactivar | `TOGGLE` | Producto | Cambio de estado | `activo_anterior`, `activo_nuevo` |
| Modificar categoría | `UPDATE_CATEGORIA` | Producto | Reclasificación | `familia_anterior`, `familia_nueva` |

#### **Módulo: Clientes (CUSTOMER)**

| Evento | Acción | Entidad | Descripción | Campos en `valoresPosteriores` |
|--------|--------|---------|-------------|------|
| Crear cliente | `CREATE` | Cliente | Cliente registrado | `nombre`, `email`, `tipo` |
| Cambio de fidelidad | `NIVEL_FIDELIDAD` | Cliente | Nivel recalculado | `nivel_anterior`, `nivel_nuevo`, `historial_compras` |
| Bloqueo de cliente | `BLOQUEAR` | Cliente | Cliente suspendido | `motivo` |

#### **Módulo: Seguridad (AUTH)**

| Evento | Acción | Entidad | Descripción | Campos en `valoresPosteriores` |
|--------|--------|---------|-------------|------|
| Login usuario | `LOGIN` | Usuario | Autenticación | `email`, `origen` |
| Cambio de permiso | `PERMISO_ASIGNADO` | UsuarioPermiso | Permiso otorgado | `permiso_nombre`, `usuario_email` |
| Revoke de permiso | `PERMISO_REVOCADO` | UsuarioPermiso | Permiso removido | `permiso_nombre`, `usuario_email` |
| Invitación | `INVITAR` | Invitacion | Usuario invitado | `rol`, `email`, `token_expira` |

---

### 2.2 Schema: Cambios Requeridos

#### **Problema 1: Duplicidad de Timestamps**

```prisma
// ACTUAL
fechaHora          DateTime      @default(now())
createdAt          DateTime      @default(now())
updatedAt          DateTime      @updatedAt
```

**Decisión requerida**: ¿Cuál es el timestamp canónico de la acción?

**Opción A (Recomendada)**: Usar solo `createdAt` (estándar Prisma)
```prisma
// PROPUESTO
model AuditLog {
  // ... otros campos ...
  createdAt          DateTime      @default(now())  // Timestamp de la acción
  // ELIMINAR: fechaHora, updatedAt
}
```

**Motivo**: Audit log no debe ser mutable. Si `updatedAt` existe, implica que los logs se pueden cambiar, violando inmutabilidad.

---

#### **Problema 2: Acoplamiento a `ventaId`**

```prisma
// ACTUAL
ventaId            String?
venta              Venta?        @relation("VentaAudits", fields: [ventaId], references: [id])
```

**Problema**: Solo ventas tienen referencia directa. Otros eventos (compra, pago a proveedor, etc.) quedan huérfanos sin way de linkearlos directamente.

**Solución**: Usar `entidadId` genérico (ya existe), eliminar `ventaId`.

```prisma
// PROPUESTO
model AuditLog {
  // ... otros campos ...
  // ELIMINAR: ventaId, venta relation
  // USAR: entidadId ya existente para todos los tipos
}
```

**Nota**: Si luego se necesita una relación específica Venta→AuditLog, se crea en Venta:

```prisma
model Venta {
  // ...
  audits              AuditLog[]    @relation("VentaAudits")
}
```

---

#### **Problema 3: Tipo de `accion` (String genérico)**

**Actual**: `accion: String` — sin restricción

**Propuesto**: Enum o validación en aplicación

```prisma
enum AccionAudit {
  CREATE
  UPDATE
  DELETE
  PAGO
  REVERT
  AJUSTE
  INGRESO
  EGRESO
  VENCIMIENTO
  DEVOLUCION_CLIENTE
  RECEPCION
  PAGO_PROVEEDOR
  CANCELAR
  APERTURA
  CIERRE
  MOVIMIENTO
  ARQUEO
  UPDATE_PRECIO
  TOGGLE
  UPDATE_CATEGORIA
  NIVEL_FIDELIDAD
  BLOQUEAR
  LOGIN
  PERMISO_ASIGNADO
  PERMISO_REVOCADO
  INVITAR
}

model AuditLog {
  // ...
  accion             AccionAudit
  // ...
}
```

---

#### **Schema Propuesto (Completo)**

```prisma
enum AccionAudit {
  // Ventas
  CREATE
  PAGO
  REVERT
  DESCUENTO

  // Inventario
  AJUSTE
  INGRESO
  EGRESO
  VENCIMIENTO
  DEVOLUCION_CLIENTE

  // Compras
  RECEPCION
  PAGO_PROVEEDOR
  CANCELAR

  // Caja
  APERTURA
  CIERRE
  MOVIMIENTO
  ARQUEO

  // Productos
  UPDATE_PRECIO
  TOGGLE
  UPDATE_CATEGORIA

  // Clientes
  NIVEL_FIDELIDAD
  BLOQUEAR

  // Auth
  LOGIN
  PERMISO_ASIGNADO
  PERMISO_REVOCADO
  INVITAR
}

model AuditLog {
  id                 String        @id @default(uuid())
  
  // Tenant & User
  empresaId          String
  empresa            Empresa       @relation(fields: [empresaId], references: [id], onDelete: Cascade)
  usuarioId          String?       // Null si fue sistema o cron
  usuario            Usuario?      @relation(fields: [usuarioId], references: [id], onDelete: SetNull)
  
  // Action
  accion             AccionAudit
  entidadAfectada    String        // Nombre lógico: 'Venta', 'Producto', 'Caja', etc.
  entidadId          String?       // ID de la entidad modificada
  
  // Change tracking
  valoresAnteriores  Json?         // Estado antes (si aplica)
  valoresPosteriores Json?         // Estado después
  motivo             String?       // Por qué (motivo de reversión, etc.)
  
  // Authorization context
  autorizacionId     String?       // Si requirió aprobación previa
  autorizacion       Autorizacion? @relation(fields: [autorizacionId], references: [id], onDelete: SetNull)
  
  // Immutable timestamp
  createdAt          DateTime      @default(now())
  
  // Índices de performance
  @@index([empresaId])
  @@index([usuarioId])
  @@index([createdAt])
  @@index([entidadAfectada])
  @@index([entidadId])
  @@unique([id])  // Explícitamente immutable
}
```

**Cambios clave**:
- ✅ Eliminado `fechaHora` (duplicate)
- ✅ Eliminado `updatedAt` (immutable)
- ✅ Eliminado `ventaId` (usar `entidadId` genérico)
- ✅ Enum `AccionAudit` (type safety)
- ✅ Índices para queries típicas
- ✅ `onDelete: Cascade/SetNull` para referential integrity

---

### 2.3 API: Endpoints de Lectura

#### **Prerequisitos**:
- Rol de usuario debe incluir permiso `audit.leer` (nuevo)
- Acceso multi-tenant: solo ver logs de `empresaId` autenticado
- Permiso adicional `audit.leer_otros` para Owner ver toda la empresa (vs. solo sus propias acciones)

---

#### **GET /api/audits**

**Descripción**: Listar audit log con filtros

**Autenticación**: Requerida (JWT)

**Autorización**:
- `audit.leer`: Mínimo requerido
- `audit.leer_otros` (Owner): Ver cualquier usuario de la empresa

**Query Parameters**:

| Param | Tipo | Requerido | Descripción |
|-------|------|----------|-------------|
| `empresaId` | UUID | Sí | Empresa del log (validado en backend contra JWT) |
| `usuarioId` | UUID | No | Filtrar por usuario (si `audit.leer_otros`) |
| `entidadAfectada` | String | No | Ej. `Venta`, `Producto`, `Caja` |
| `accion` | AccionAudit | No | Ej. `CREATE`, `PAGO` |
| `desde` | ISO8601 | No | Timestamp inicial (createdAt >= desde) |
| `hasta` | ISO8601 | No | Timestamp final (createdAt <= hasta) |
| `pagina` | Int | No | Paginación (default: 1, page size: 50) |
| `ordenar` | Enum | No | `createdAt_desc` (default), `createdAt_asc`, `usuario_asc` |

**Response (200 OK)**:

```json
{
  "data": [
    {
      "id": "uuid-1",
      "empresaId": "empresa-uuid",
      "usuario": {
        "id": "usuario-uuid",
        "nombre": "Juan Pérez",
        "email": "juan@otrarondamas.com"
      },
      "accion": "PAGO",
      "entidadAfectada": "Pago",
      "entidadId": "pago-uuid",
      "valoresAnteriores": null,
      "valoresPosteriores": {
        "monto": "150.50",
        "medio": "efectivo",
        "venta_numero": "VTA-001"
      },
      "motivo": null,
      "createdAt": "2026-10-25T14:30:22Z"
    }
  ],
  "pagination": {
    "pagina": 1,
    "totalItems": 542,
    "totalPaginas": 11,
    "itemsPorPagina": 50
  }
}
```

**Errores**:
- `401 Unauthorized`: Sin JWT válido
- `403 Forbidden`: Sin permiso `audit.leer` o intentando ver otra empresa
- `400 Bad Request`: Parámetros inválidos

---

#### **GET /api/audits/{id}**

**Descripción**: Obtener un audit log específico

**Autenticación**: Requerida

**Autorización**: `audit.leer` + pertenece a misma empresa

**Response (200 OK)**:

```json
{
  "id": "uuid-1",
  "empresaId": "empresa-uuid",
  "usuario": {
    "id": "usuario-uuid",
    "nombre": "Juan Pérez",
    "rol": "ASISTENTE_LOCAL"
  },
  "accion": "CREATE",
  "entidadAfectada": "Venta",
  "entidadId": "venta-uuid",
  "valoresAnteriores": null,
  "valoresPosteriores": {
    "numero": "VTA-0042",
    "total": "1250.00",
    "canal": "presencial",
    "items": 5
  },
  "motivo": null,
  "createdAt": "2026-10-25T10:15:00Z"
}
```

---

#### **POST /api/reports/audit-summary**

**Descripción**: Resumen agregado por período (reportes)

**Autenticación**: Requerida

**Autorización**: `audit.leer` + permiso `reportes.ejecutar`

**Request Body**:

```json
{
  "empresaId": "empresa-uuid",
  "desde": "2026-10-01T00:00:00Z",
  "hasta": "2026-10-31T23:59:59Z",
  "agruparPor": "dia" | "semana" | "mes",
  "filtrarEntidad": "Venta" | null
}
```

**Response (200 OK)**:

```json
{
  "periodo": {
    "desde": "2026-10-01T00:00:00Z",
    "hasta": "2026-10-31T23:59:59Z"
  },
  "resumen": [
    {
      "fecha": "2026-10-05",
      "totales": {
        "eventos": 127,
        "por_accion": {
          "CREATE": 42,
          "PAGO": 38,
          "AJUSTE": 21,
          "INGRESO": 26
        },
        "usuarios_unicos": 3
      }
    }
  ],
  "actividad_usuario": [
    {
      "usuarioId": "uuid-1",
      "nombre": "Juan Pérez",
      "email": "juan@...",
      "eventos_totales": 234,
      "acciones": {
        "CREATE": 120,
        "PAGO": 114
      }
    }
  ]
}
```

---

#### **GET /api/reports/activity/{usuarioId}**

**Descripción**: Actividad de un usuario específico

**Autenticación**: Requerida

**Autorización**:
- `audit.leer` + propio usuario: ver su propia actividad
- `audit.leer_otros` + OWNER: ver cualquiera

**Query Parameters**:

| Param | Tipo | Requerido |
|-------|------|----------|
| `desde` | ISO8601 | No (default: últimos 30 días) |
| `hasta` | ISO8601 | No (default: ahora) |

**Response**:

```json
{
  "usuario": {
    "id": "usuario-uuid",
    "nombre": "Juan Pérez",
    "email": "juan@otrarondamas.com",
    "rol": "ASISTENTE_LOCAL"
  },
  "periodo": {
    "desde": "2026-09-25T00:00:00Z",
    "hasta": "2026-10-25T23:59:59Z"
  },
  "estadisticas": {
    "eventos_totales": 342,
    "primer_evento": "2026-09-25T08:30:00Z",
    "ultimo_evento": "2026-10-25T18:45:00Z",
    "acciones": {
      "CREATE": 156,
      "PAGO": 140,
      "AJUSTE": 46
    }
  },
  "eventos_recientes": [
    {
      "accion": "PAGO",
      "entidadAfectada": "Pago",
      "createdAt": "2026-10-25T18:45:00Z",
      "monto": "320.00"
    }
  ]
}
```

---

### 2.4 Tenant Isolation & Authorization

#### **Invariante 1: Only Own Company's Logs**

```typescript
// Backend: todos los queries deben filtrar por empresaId
async listAudits(companyId: string, filters: AuditFilterDto) {
  return this.prisma.auditLog.findMany({
    where: {
      empresaId: companyId,  // ← OBLIGATORIO
      // ... otros filtros ...
    },
  });
}
```

**Validación**: 
- El `empresaId` de los filtros DEBE coincidir con el `empresaId` del usuario autenticado
- Si mismatch → `403 Forbidden` inmediato

#### **Invariante 2: Vendedor solo ve sus propias acciones**

```typescript
// Si usuario es ASISTENTE_LOCAL (vendedor) SIN permiso audit.leer_otros
async listAudits(companyId: string, user: AuthenticatedUser, filters: AuditFilterDto) {
  const hasViewOthers = user.permissions.includes('audit.leer_otros');
  
  return this.prisma.auditLog.findMany({
    where: {
      empresaId: companyId,
      usuarioId: hasViewOthers ? undefined : user.id,  // ← Restrict
      // ...
    },
  });
}
```

#### **Invariante 3: Audit Log es Immutable**

```typescript
// Bloqueado en la aplicación
if (request.method === 'PATCH' || request.method === 'DELETE') {
  if (request.path.includes('/audits/')) {
    throw new ForbiddenException('Audit logs no pueden ser modificados ni eliminados');
  }
}

// Bloqueado en BD: no hay triggers de UPDATE/DELETE en AuditLog
```

#### **Matriz de Acceso**

| Rol | Permiso | Puede ver | Comentario |
|-----|---------|-----------|-----------|
| **OWNER** | `audit.leer` | Solo ventas, caja, inventario| Base mínima |
| **OWNER** | `audit.leer` + `audit.leer_otros` | TODO: usuarios, acciones, admin | Control total |
| **ASISTENTE_LOCAL** | `audit.leer` | Sus propias acciones | Ver qué hizo hoy |
| **PROVEEDOR** | Sin permiso | Nada | No aplica |
| **REPARTIDOR** | Sin permiso | Nada | No aplica |

---

### 2.5 Invariantes Críticos

#### **I-1: Audit trail es completo y contínuo**

Cada transacción que modifica estado (Venta, Compra, Producto, Stock) DEBE crear un `AuditLog` en la misma transacción.

```typescript
// CORRECTO
await prisma.$transaction(async (tx) => {
  const venta = await tx.venta.create({ ... });
  await tx.auditLog.create({
    // ... registro del evento ...
  });
});

// INCORRECTO
await prisma.venta.create({ ... });  // SIN auditLog
```

**Validación**: Test que verifica que cada create/update de entidad crítica tiene un log asociado.

---

#### **I-2: Audit log no debe ser modificable**

Una vez creado, un registro de audit es de solo lectura.

- No UPDATE a `AuditLog`
- No DELETE a `AuditLog`
- No cambios en timestamps

**Validación**: 
- Test que intenta actualizar un audit log → `403 Forbidden`
- Test que intenta eliminar un audit log → `403 Forbidden`

---

#### **I-3: Change tracking completo**

Para operaciones UPDATE, AMBOS estados deben registrarse:

```json
{
  "valoresAnteriores": {
    "precio_minorista": "100.00",
    "activo": true
  },
  "valoresPosteriores": {
    "precio_minorista": "120.50",
    "activo": true
  }
}
```

**Validación**: Test verifica que UPDATE de producto captura antes y después.

---

#### **I-4: Tenant context no puede ser bypassable**

El `empresaId` viene del JWT, nunca del cliente.

```typescript
// CORRECTO
const companyId = user.empresaId;  // Del JWT

// INCORRECTO
const companyId = request.body.empresaId;  // Podría falsificarse
```

---

### 2.6 Retention Policy

**Decisión requerida del propietario**:

| Opción | Duración | Tradeoff |
|--------|----------|---------|
| **A: Corta** | 90 días | Bajo costo almacenamiento, perdiéndose historia |
| **B: Estándar** | 1 año | Estándar contable, archivos impositivos |
| **C: Indefinida** | Ilimitado | Máxima trazabilidad, crecimiento de BD |

**Recomendación**: Opción B (1 año) — balance entre compliance y costo.

**Implementación** (futura, no en spec):

```typescript
// CRONJOB (daily)
await prisma.auditLog.deleteMany({
  where: {
    createdAt: {
      lt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),  // > 1 año atrás
    },
  },
});
```

---

## 3. Test Cases (Aceptación)

### 3.1 Tests Unitarios

#### **U1: AuditLog creation en transacción**

```typescript
describe('SalesService.createSale - Auditing', () => {
  it('debe crear un AuditLog CREATE con valoresPosteriores correctos', async () => {
    const sale = await service.createSale(createSaleDto, companyId, userId);
    
    const audit = await prisma.auditLog.findFirst({
      where: { entidadId: sale.id, accion: 'CREATE' },
    });
    
    expect(audit).toBeDefined();
    expect(audit.accion).toBe('CREATE');
    expect(audit.entidadAfectada).toBe('Venta');
    expect(audit.valoresPosteriores.numero).toBeDefined();
    expect(audit.usuarioId).toBe(userId);
    expect(audit.empresaId).toBe(companyId);
  });
});
```

#### **U2: Venta con PAGO debe crear dos logs**

```typescript
it('debe crear logs tanto para Venta como para Pago', async () => {
  const sale = await service.createSale(createSaleDto, companyId, userId);
  await service.registerPayment(paymentDto, companyId, userId);
  
  const logs = await prisma.auditLog.findMany({
    where: { empresaId: companyId },
  });
  
  expect(logs.length).toBeGreaterThanOrEqual(2);
  expect(logs.some(l => l.accion === 'CREATE')).toBe(true);
  expect(logs.some(l => l.accion === 'PAGO')).toBe(true);
});
```

#### **U3: Immutability — UPDATE prohibido**

```typescript
it('debe rechazar UPDATE a AuditLog', async () => {
  const audit = await prisma.auditLog.findFirst();
  
  const attempt = prisma.auditLog.update({
    where: { id: audit.id },
    data: { motivo: 'modificado' },
  });
  
  // En Prisma: intentar updatear un registro con restricción de lectura
  // debería fallar; si no, fallaría en BD con trigger/constraint
  await expect(attempt).rejects.toThrow();
});
```

#### **U4: DELETE prohibido**

```typescript
it('debe rechazar DELETE a AuditLog', async () => {
  const audit = await prisma.auditLog.findFirst();
  
  const attempt = prisma.auditLog.delete({
    where: { id: audit.id },
  });
  
  await expect(attempt).rejects.toThrow();
});
```

---

### 3.2 Tests de Integración API

#### **I1: GET /api/audits con filtros**

```typescript
describe('AuditController - List', () => {
  it('debe listar audits de la empresa autenticada', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/audits')
      .set('Authorization', `Bearer ${ownerToken}`)
      .query({ empresaId: companyId })
      .expect(200);
    
    expect(response.body.data).toBeDefined();
    expect(response.body.data[0].empresaId).toBe(companyId);
    expect(response.body.pagination).toBeDefined();
  });

  it('debe filtrar por entidadAfectada', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/audits')
      .set('Authorization', `Bearer ${ownerToken}`)
      .query({ empresaId: companyId, entidadAfectada: 'Venta' })
      .expect(200);
    
    expect(response.body.data.every(a => a.entidadAfectada === 'Venta')).toBe(true);
  });

  it('debe rechazar acceso sin permiso audit.leer', async () => {
    // usuario SIN audit.leer
    await request(app.getHttpServer())
      .get('/api/audits')
      .set('Authorization', `Bearer ${noPermissionToken}`)
      .query({ empresaId: companyId })
      .expect(403);
  });
});
```

#### **I2: Vendedor solo ve sus propias acciones**

```typescript
it('ASISTENTE_LOCAL sin audit.leer_otros solo ve sus acciones', async () => {
  // Crear venta por usuario A
  await service.createSale(dto1, companyId, userAId);
  // Crear venta por usuario B
  await service.createSale(dto2, companyId, userBId);
  
  // A consulta su propio audit
  const response = await request(app.getHttpServer())
    .get('/api/audits')
    .set('Authorization', `Bearer ${userAToken}`)
    .query({ empresaId: companyId })
    .expect(200);
  
  // Debe ver solo sus acciones
  expect(response.body.data.every(a => a.usuario.id === userAId)).toBe(true);
});
```

#### **I3: GET /api/audits/{id} - Específico**

```typescript
it('debe obtener un audit específico', async () => {
  const audit = await prisma.auditLog.findFirst();
  
  const response = await request(app.getHttpServer())
    .get(`/api/audits/${audit.id}`)
    .set('Authorization', `Bearer ${ownerToken}`)
    .expect(200);
  
  expect(response.body.id).toBe(audit.id);
  expect(response.body.empresaId).toBe(companyId);
});
```

#### **I4: POST /api/reports/audit-summary**

```typescript
it('debe generar resumen de audits por período', async () => {
  // Crear 10 eventos variados
  for (let i = 0; i < 10; i++) {
    await service.createSale(dto, companyId, userId);
  }
  
  const response = await request(app.getHttpServer())
    .post('/api/reports/audit-summary')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({
      empresaId: companyId,
      desde: startDate,
      hasta: endDate,
      agruparPor: 'dia',
    })
    .expect(200);
  
  expect(response.body.resumen).toBeDefined();
  expect(response.body.resumen[0].totales.eventos).toBeGreaterThan(0);
});
```

#### **I5: Multi-tenant isolation en audits**

```typescript
it('no debe permitir ver audits de otra empresa', async () => {
  const otherCompanyId = 'other-uuid';
  
  await request(app.getHttpServer())
    .get('/api/audits')
    .set('Authorization', `Bearer ${ownerToken}`)
    .query({ empresaId: otherCompanyId })
    .expect(403);  // Forbidden o 404
});
```

---

### 3.3 Tests de Seguridad

#### **S1: Audit log no puede ser modificado**

```typescript
it('PATCH a /api/audits/{id} debe fallar', async () => {
  const audit = await prisma.auditLog.findFirst();
  
  await request(app.getHttpServer())
    .patch(`/api/audits/${audit.id}`)
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ motivo: 'modificado' })
    .expect(403 | 405);  // Forbidden o Method Not Allowed
});
```

#### **S2: usuarioId viene del JWT, no del body**

```typescript
it('usuarioId debe extraerse del JWT, no del request body', async () => {
  const saleDto = { ...createSaleDto, usuarioId: 'other-user' };
  
  const sale = await service.createSale(saleDto, companyId, authenticatedUserId);
  const audit = await prisma.auditLog.findFirst({ where: { entidadId: sale.id } });
  
  // El audit debe registrar el usuario autenticado, no el del body
  expect(audit.usuarioId).toBe(authenticatedUserId);
  expect(audit.usuarioId).not.toBe('other-user');
});
```

---

## 4. Índices de Performance

Para garantizar queries eficientes en tabla con millones de registros:

```prisma
model AuditLog {
  // ... campos ...
  
  @@index([empresaId])           // Queries por empresa
  @@index([usuarioId])            // Queries por usuario
  @@index([createdAt])            // Queries por rango de fecha
  @@index([entidadAfectada])      // Queries por tipo de entidad
  @@index([entidadId])            // Queries para un registro específico
  @@index([empresaId, createdAt]) // Combined: empresa + período
  @@index([usuarioId, accion])    // Combined: usuario + acción
}
```

**Estimación**:
- Tabla de 1M registros sin índices: query ~5s
- Con índices estratégicos: query <100ms

---

## 5. Decisiones Pendientes

| # | Decisión | Opciones | Impacto | Dueño |
|---|----------|----------|--------|-------|
| **D-AUD-01** | ¿Usar `createdAt` o mantener `fechaHora`? | A) Creado only, B) Keep both | Schema, queries | Propietario |
| **D-AUD-02** | ¿Eliminar `ventaId` o mantener para backward compat? | A) Eliminar, B) Deprecate | Migraciones | Propietario |
| **D-AUD-03** | ¿Usar Enum `AccionAudit` o String genérico? | A) Enum, B) String + validation | Type safety | Propietario |
| **D-AUD-04** | ¿Cuál es la política de retención? | A) 90 días, B) 1 año, C) Indefinido | Storage, compliance | Propietario |
| **D-AUD-05** | ¿Quién ve reportes por defecto? | A) Solo OWNER, B) Todos con permiso | Authorization | Propietario |
| **D-AUD-06** | ¿Guardar IP / User-Agent en audits? | A) Sí (más seguridad), B) No (más simple) | Privacy, schema | Propietario |

---

## 6. Aceptación

**Especificación**: ✅ COMPLETA

**Pendiente aprobación del propietario**:

- [ ] ¿Aprobado tal como está especificado?
- [ ] ¿Cambios requeridos? (Listar debajo)
- [ ] ¿Decisiones pendientes resueltas?

**Cambios requeridos** (si aplica):
```
[Aquí: comentarios del propietario]
```

---

## 7. Próximos Pasos (Post-Aprobación)

1. **Crear migración Prisma**
   - Agregar Enum `AccionAudit`
   - Modificar schema según decisiones (D-AUD-01 a D-AUD-06)
   - Generar y validar migración

2. **Implementar AuditService**
   - Servicio base para crear logs (con transacción asegurada)
   - Validación de eventos vs. enum

3. **Implementar AuditController**
   - Endpoints: GET /audits, GET /audits/{id}, POST /reports/*
   - Validación de permisos y tenant isolation

4. **Agregar Permiso `audit.leer` y `audit.leer_otros`**
   - Crear en tabla `Permiso`
   - Assign a OWNER por defecto

5. **Tests Completos**
   - Unit: SalesService, AuditService
   - Integration: AuditController endpoints
   - Security: Isolation, immutability

6. **Documentación de API**
   - OpenAPI / Swagger para endpoints
   - Guía de uso para roles

---

## Apéndice A: Correlación con Especificación Original (SDD)

El SDD no menciona explícitamente Audit Log, pero varias secciones lo implican:

- **RF-05 (In-person sales)**: "Todos los cambios deben ser trazables" → Audit
- **RF-18 (Reporting)**: "El dueño ve reportes de actividad" → Reports endpoint
- **D-06 (Owner authorization)**: "Cambios especiales requieren aprobación" → `autorizacionId` en AuditLog
- **RF-17 (Login & Roles)**: "Diferentes vistas por rol" → Access control en reports

---

## Apéndice B: Cambios al Código Existente (Resumen)

Para implementación futura:

| Archivo | Cambio | Razón |
|---------|--------|-------|
| `schema.prisma` | Enum `AccionAudit`, eliminé `fechaHora`, `updatedAt`, `ventaId` | Type safety + Immutability |
| `sales.service.ts` | Actualizar `auditLog.create()` a usar enum | Type safety |
| `*.service.ts` | Agregar `auditLog.create()` a todas las transacciones críticas | Completitud de trail |
| Crear: `audit.service.ts` | Crear servicio base para logs | Reutilización |
| Crear: `audit.controller.ts` | GET /audits, GET /audits/{id}, POST /reports/* | API pública |
| Crear: `audit.spec.ts` | Tests unitarios | Cobertura |
| Crear: `audit.integration-spec.ts` | Tests de integración | Aceptación |

---

**Documento preparado por**: Arquitecto de Ingeniería (Claude)  
**Fecha**: 2026-10-25  
**Estado**: LISTO PARA REVISIÓN DEL PROPIETARIO  
**Siguiente paso**: Aprobación de decisiones D-AUD-01 a D-AUD-06

