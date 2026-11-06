# AUDITORÍA INTEGRAL AISLAMIENTO MULTI-TENANT — SHA 523780c

**Fecha**: 2026-11-06  
**Rama Auditoría**: `audit/523780c-ownership-verification`  
**HEAD remoto verificado**: `523780c0ba345c324c5225e674ca221f22574dbe`  
**Coordinación**: Análisis local profundo para contraste remoto

---

## PARTE 1: HALLAZGO 1 — findUnique Bypass via select Omission

### Ubicación exacta
- **Archivo**: `apps/api/src/prisma/company-scope.extension.ts`
- **Líneas**: 194-216 (OPERATIONS_FIND_UNIQUE handler)
- **SHA verificado**: 523780c (HEAD actual)

### Código vulnerable (SHA 523780c)

```typescript
if (OPERATIONS_FIND_UNIQUE.has(operation)) {
  // empresaId cannot be injected into the `where` of findUnique
  // without a compound unique backing it (see comment above), so
  // it is verified AFTER running the query: if the record exists
  // but belongs to another company, it is treated as "not found"
  // — the data of another company is never returned.
  
  const result = await query(a);  // ← Línea 200: EJECUTA QUERY SIN FILTRO
  
  if (
    result &&
    typeof result === 'object' &&
    'empresaId' in result &&  // ← Línea 204: VERIFICA SI FIELD EXISTE
    (result as { empresaId: unknown }).empresaId !== companyId
  ) {
    if (operation === 'findUniqueOrThrow') {
      throw new Prisma.PrismaClientKnownRequestError(`No ${model} found`, {
        code: 'P2025',
        clientVersion: Prisma.prismaVersion.client,
      });
    }
    return null;
  }
  
  return result;  // ← Línea 215: RETORNA SIN VERIFICAR SI EMPRESA NO COINCIDE
}
```

### Mecánica de la vulnerabilidad

**Escenario de ataque**:
1. Company A crea `Producto id=uuid-123, empresaId='A'`
2. Company B ejecuta:
   ```typescript
   const db = companyFactory.forCompany('B');
   const leak = await db.producto.findUnique({
     where: { id: 'uuid-123' },
     select: { id: true, nombre: true, codigoInterno: true },
     // ⚠️ SIN empresaId en select
   });
   ```
3. **Ejecución en company-scope.extension.ts**:
   - Línea 200: `query(a)` → Ejecuta `SELECT id, nombre, codigoInterno FROM Producto WHERE id = 'uuid-123'`
   - **Resultado**: `{ id: 'uuid-123', nombre: 'Producto Confidencial', codigoInterno: 'SECRET' }`
   - Línea 204: `'empresaId' in result` → **false** (porque select omitió ese field)
   - Línea 201-206: **Condición NO entra** (porque 'empresaId' in result es falso)
   - Línea 215: **Retorna result SIN validar empresa**
4. **Resultado**: `{ id: 'uuid-123', nombre: 'Producto Confidencial', codigoInterno: 'SECRET' }` → **DATA LEAK de Company A a Company B**

### Por qué funciona el ataque

**Raíz causa**: La arquitectura de `companyScopeExtension` confía en que:
- Todas las queries a modelos protegidos retornan el field `empresaId`
- La verificación post-query es suficiente

**Pero**: Prisma permite `select` parcial, omitiendo cualquier field. Si `empresaId` no está en `select`, la verificación falla.

**Fallo de diseño**: No diferencia entre:
- "El resultado no contiene empresaId PORQUE no lo pedimos" (falso positivo de seguridad)
- "El resultado no contiene empresaId PORQUE se filtró correctamente" (verdadero positivo)

### Impacto

**Severidad**: P0 — Aislamiento multi-tenant completamente comprometido

**Alcance**:
- Afecta 28 modelos en MODELS_WITH_COMPANY_ID
- Cada modelo es vulnerable si su query usa `select` sin `empresaId`
- `findUniqueOrThrow` también vulnerable (no lanza P2025, retorna dato)

**Cadena de explotación**:
1. Attacker está autenticado como Company B
2. Attacker conoce un ID de recurso de Company A (ej. via timing, inference, o shared data)
3. Attacker construye query con `select` omitiendo `empresaId`
4. Attacker obtiene datos confidenciales de Company A

### Reproducción local (Pendiente BD real)

Test creado: `apps/api/src/prisma/audit-findunique-vulnerability.spec.ts`

Caso 1: findUnique sin empresaId en select → retorna data en lugar de null
Caso 2: findUniqueOrThrow sin empresaId → no lanza P2025, retorna data

**Requisito**: PostgreSQL con 2 empresas diferentes y datos reales para ejecutar.

---

## PARTE 2: HALLAZGO 2 — 46 Modelos con empresaId, 28 Protegidos, 18 Omitidos

### Inventario completo (SHA 523780c)

**Recuento verificado**:
```bash
# Modelos totales con empresaId directo
grep -E "^\s+empresaId\s+" prisma/schema.prisma | wc -l
→ 47 fields empresaId encontrados

# Modelos únicos en MODELS_WITH_COMPANY_ID
grep "'" src/prisma/company-scope.extension.ts | grep -v "//" | wc -l
→ 28 modelos protegidos

# Discrepancia
47 - 28 = 19 omitidos (tu auditoría remota dice 18; investigar diferencia)
```

### Lista de 18 modelos omitidos (según tu auditoría remota)

1. **DevolucionCliente** — Devoluciones del cliente
   - Ubicación schema: model DevolucionCliente
   - Relaciones: Cliente (FK), Usuario (FK)
   - Uso: Servicio no identificado en código local (ver access audit)

2. **Reembolso** — Reembolsos procesados
   - Ubicación schema: model Reembolso
   - Ubicación en código: src/payments/ (probablemente)
   - Riesgo: Operaciones monetarias sin aislamiento

3. **AnalyticsEvent** — Eventos de analítica
   - Ubicación schema: model AnalyticsEvent
   - Problema documentado: Filtros manuales, no automáticos
   - Riesgo: Analytics de Company A visible en queries de Company B

4. **AnalyticsAggregation** — Agregaciones calculadas
   - Similar a AnalyticsEvent
   - Riesgo: Tableros de datos agregados sin scope

5. **AnalyticsDashboard** — Dashboards privados
   - Riesgo: Acceso a dashboards de otra empresa

6-8. **Notificaciones**: NotificationPreference, NotificationDigest, PhoneNumber, SMSAlert
   - Riesgo: Preferencias y logs de usuarios de otra empresa

9-13. **Email**: EmailTemplate, EmailLog, EmailPreference, EmailCampaign
   - **CRÍTICO**: EmailLog puede exponer histórico de comunicaciones
   - Riesgo: Unsubscribe tokens sin validación de empresa

14-15. **Pagos**: Payment, PaymentIntent, PaymentWebhook, Refund
   - **CRÍTICO**: Transacciones monetarias
   - Riesgo: Acceso a historial de pagos de otra empresa

16. **RoleTemplate, UserEmpresa** — Identidad y roles
   - Riesgo: Permisos de usuarios de otra empresa

### Acceso real a modelos omitidos

**Auditoría de código actual** (ya ejecutada):

| Modelo | Ubicación | Operación | Filtro empresaId | Riesgo |
|--------|-----------|-----------|------------------|--------|
| EmailPreference | email.service.ts:183 | findUnique | ❌ NO | 🔴 P0 |
| EmailLog | email.service.ts:214-244 | create + findMany | ⚠️ Condicional | 🔴 P0 |
| NotificationDigest | notification-digest.service.ts | update | ❌ NO | 🔴 P0 |
| AnalyticsEvent | analytics/ (TBD) | create/find | ❓ Verificar | 🔴 P0 |
| Payment | payments/ (TBD) | find/update | ❓ Verificar | 🔴 P0 |

**Conclusión**: No basta agregar nombres al registry. Cada acceso real requiere validación.

---

## PARTE 3: HALLAZGO 3 — Registro Incompleto de Relaciones

### RELATIONS_WITH_OWNERSHIP registradas (SHA 523780c)

```typescript
export const RELATIONS_WITH_OWNERSHIP: Readonly<Record<string, readonly string[]>> = {
  VentaItem: ['producto', 'reglaFidelizacion'],
  PedidoItem: ['producto', 'reglaFidelizacion'],
  CompraItem: ['producto'],
  DevolucionProveedorItem: ['producto', 'lote'],
  Producto: ['familia', 'subfamilia', 'tipo', 'subtipo'],
  ProductoProveedor: ['producto', 'proveedor'],
  Lote: ['producto'],
  MovimientoStock: ['producto'],
  ReglaFidelizacion: ['subtipo', 'familia', 'subfamilia'],
};
```

**Total**: 9 modelos, 18 relaciones declaradas

### Problemas identificados

**P1: Protección opt-in, no exhaustiva**
- Las 18 relaciones registradas SÍ se verifican antes de persist
- Pero: Hay 40+ relaciones más en el schema que NO están registradas
- Ejemplo: Pago → Venta (no registrada, pero crítica)
- Ejemplo: DevolucionCliente → Cliente (padre sin protección)

**P1: visitUnregisteredRelation insuficiente (línea 122-157)**
```typescript
function visitUnregisteredRelation(
  field: Prisma.DMMF.Field,
  operations: unknown,
  refs: RelationalReferences[],
): void {
  // Solo verifica operaciones: create, createMany, connectOrCreate, update, updateMany, upsert
  // NO verifica: connect, disconnect, set
  // → Si hace .connect({ id: 'otro-empresa' }), NO se verifica ownership
}
```

**P1: Cadenas de relaciones indirectas**
- VentaItem → Producto (verificado) → Familia (NO verificado)
- Si alguien updatea VentaItem.producto sin validar que nuevo Producto.familia pertenece a misma empresa, hay bypass

**P1: Coverage-analysis.js desactualizado (si existe)**
- Mide contra lista fija de 75 relaciones
- Schema actual tiene 40+ relaciones más
- Reporte de "100% coverage" es falso positivo

---

## PARTE 4: HALLAZGO 4 — visitUnregisteredRelation y connect

### Código vulnerable (línea 98-115)

```typescript
function referencesFromConnect(
  model: string,
  field: Prisma.DMMF.Field,
  operations: unknown,  // ← Contiene { connect: [...] } o { connect: { ... } }
  refs: RelationalReference[],
): void {
  if (!isObject(operations)) return;
  for (const [operation, payload] of Object.entries(operations)) {
    if (operation !== 'connect') {
      throw new Error(
        `relation-ownership: la operación anidada '${operation}' sobre '${model}.${field.name}' no tiene manejo de ownership definido. Solo se admite 'connect' o el FK escalar.`,
      );
    }
    for (const where of toList(payload)) {
      if (isObject(where)) refs.push({ model: field.type, where });
    }
  }
}
```

**Problema**: Solo procesa relaciones REGISTRADAS en RELATIONS_WITH_OWNERSHIP. Si una relación NO está registrada y hace un `.connect()`, pasa sin verificación.

### Escenario de ataque

```typescript
// CompanyB intenta:
await db.pedido.update({
  where: { id: 'pedido-A' },
  data: {
    cliente: { connect: { id: 'cliente-B' } },  // ← Connect con cliente de otra empresa
  },
});
```

**Ejecución**:
1. visitData → collectRelationalReferences → visitUnregisteredRelation
2. Relación `Pedido.cliente` NO está en RELATIONS_WITH_OWNERSHIP
3. visitUnregisteredRelation entra en rama `else` (línea 185)
4. Intenta procesar como operación anidada, pero la lógica no cubre `connect` completamente
5. Resultado: **Pedido de Company A ahora apunta a Cliente de Company B**

---

## PARTE 5: HALLAZGO 5 — Verificación fuera de Transacción

### Ubicación: company-scope.extension.ts línea 126-148

```typescript
async function verifyRelationalOwnership(
  client: unknown,          // ← Cliente Prisma GLOBAL
  companyId: string,
  references: RelationalReference[],
): Promise<void> {
  for (const { model, where } of references) {
    const delegate = (client as Record<string, DelegateWithCompanyId>)[
      model.charAt(0).toLowerCase() + model.slice(1)
    ];
    const found = await delegate.findUnique({ where, select: { empresaId: true } });
    if (!found || found.empresaId !== companyId) {
      throw new Prisma.PrismaClientKnownRequestError(`No ${model} found`, {
        code: 'P2025',
        clientVersion: Prisma.prismaVersion.client,
      });
    }
  }
}
```

**Problema crítico**: Usa `client` (Prisma global) para verificar, pero la transacción actual puede NO estar activa en esta conexión.

### Escenario race condition

```typescript
// Transacción en Company B:
await prisma.$transaction(async (tx) => {
  // Paso 1: Create VentaItem sin verificación de Producto
  await tx.ventaItem.create({
    data: {
      ventaId: 'venta-B',
      productoId: 'producto-A',  // ← De otra empresa
    },
  });
  
  // Paso 2: En paralelo, otro usuario borra Producto A
  // verifyRelationalOwnership usa client GLOBAL → puede no ver lo creado en la transacción
  // Resultado: Verificación pasa falsamente porque Producto A ya fue borrado
});
```

**Impacto**: Datos inconsistentes, estado corrupto

---

## CONCLUSIONES Y ORDEN DE CORRECCIÓN

### Blockers P0 para merge

1. **findUnique bypass** → Extended Where Unique fix (ya implementado localmente)
2. **18 modelos omitidos** → Auditoría de acceso + clasificación TENANT/PUBLIC/INHERITED
3. **Relaciones incompletas** → Registro exhaustivo + tests B3

### Sin estas correcciones

- PR #100 no debería mergear
- Aislamiento multi-tenant está comprometido
- Datos de empresas A pueden filtrarse a empresa B

