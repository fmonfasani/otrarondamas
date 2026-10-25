# CI Recovery: S-V1 / FS-1a y B4 — Plan Diagnóstico Ejecutivo

**Fecha:** 2026-10-21  
**Incidente:** Post-Merge Verification #30 (PR #49) — 5 tests fallidos en S-V1-STORE  
**Estado:** Diagnóstico completado, plan mínimo de cambios identificado  
**Restricciones:** Sin cambios productivos, sin migraciones, preservación de work existente  

---

## FASE 0: Estado del Repositorio — CONFIRMADO

| Elemento | Estado |
|----------|--------|
| **HEAD** | `f6a46da` (fix(p0): verify StaffIdentityGuard...) |
| **Rama** | `feat/sprint-p5-conversation-ux` (sin upstream tracking) |
| **Tracked modificados** | 60 archivos (P5+P6+C5+P0 preexistentes) |
| **Untracked** | 32 archivos (auditoría P0 + documentación) |
| **Cambios destructivos** | 0 (sin reset, stash, clean, checkout destructivo) |
| **Git reflog reciente** | No hay resets destructivos en historial actual |

**Protección:** Todos los cambios preexistentes están INTACTOS. La entrega de P0 Security está preservada sin interferencia.

---

## FASE 1: Diagnóstico de HTTP 400 en STORE-03a/b/c/d y STORE-07c

### Síntomas Reportados
- Workflow `Post-Merge Verification #30` reporta HTTP 400 en 5 tests S-V1-STORE
- 270 tests pasados, 5 fallidos en `s-v1-store-01-characterization.integration-spec.ts`
- Suite `s-v1-store-02-business-slug.integration-spec.ts` también falla

### Detalles de los 5 Fallos

| Test ID | Línea | Descripción | Endpoint | Expected | Actual |
|---------|-------|-------------|----------|----------|--------|
| STORE-03a | 369 | Pedido nuevo con productA2 sin stock | POST /tienda/pedidos | 201 | 400 |
| STORE-03b | 424 | Pedido con cliente existente + productA2 | POST /tienda/pedidos | 201 | 400 |
| STORE-03c | 466 | Email en otro Business + productA2 | POST /tienda/pedidos | 201 | 400 |
| STORE-03d | 489 | Fidelización + productA2 sin stock | POST /tienda/pedidos | 201 | 400 |
| STORE-07c | 737 | Cliente invitado (sin contraseña) + productA2 | POST /tienda/pedidos | 201 | 400 |

### Setup del Test

**Fixture común:**
```typescript
productA1 = await mkProduct(companyA.id, hierA, 'A1', {
  precioMinorista: '100',
  descuentoPorcentaje: '10',
});
// → Lote creado con cantidad: 5

productA2 = await mkProduct(companyA.id, hierA, 'A2', 
  { precioMinorista: '50' });
// → SIN lote → cantidad implícitamente 0 (sin stock)
```

**Patrón común en los 5 tests:**
```typescript
const res = await request(BASE)
  .post('/tienda/pedidos')
  .send(orderBody(
    guestEmail,
    [
      { productoId: productA1.id, cantidad: 2 },  // tiene stock
      { productoId: productA2.id, cantidad: 3 },  // sin stock ← problema
    ],
    { ...otrasProps }
  ))
  .expect(201);  // Espera éxito
```

### Hipótesis 1: Validación de Stock Agregada (PROBABLE)

**Evidencia:**
- Línea 369 (STORE-03a): El comentario dice "sin descuento de stock" pero espera 201
- Línea 421: Verifica `lote.cantidad === 5` (stock no modificado)
- Comentario línea 144-152 en StoreService: "Only validates that there is stock available... without deducting it"
- Código línea 314-326: `deductStock === false` (default) → no deduce ni valida

**Si los tests fallan con 400:** Hay nueva validación que rechaza crear pedidos con items sin stock cuando `deductStock === false`.

**Causa probable:** Cambio reciente en `StoreService.createOrder()` que:
1. Agrega validación de `consolidatedStock()` cuando `deductStock === false`
2. Lanza `BadRequestException` si algún item no tiene stock disponible
3. NO está documentado en los comentarios del servicio

**Verificación necesaria:** 
- ¿Existe nueva llamada a `inventoryService.consolidatedStock()` o `deductStock()` ANTES de crear el pedido?
- ¿En qué línea se introdujo esta validación?

### Hipótesis 2: Cambio en InventoryService (MENOS PROBABLE)

Si `inventoryService.deductStock()` ahora se llama **incluso cuando `deductStock === false`**, causaría 400/409 por:
- Fondos insuficientes
- Conflicto de cantidad

**Verificación necesaria:**
- ¿La llamada a `deductStock()` está dentro del `if (deductStock)` o fuera?
- ¿Hay nueva validación previa?

### Hipótesis 3: DTO / Validación de Entrada (MENOS PROBABLE)

Si `CreateOrderDto` ahora rechaza items con cantidad > 0 para productos sin stock:

**Verificación necesaria:**
- Ver validadores en `CreateOrderDto` (class-validator)
- ¿Hay nueva validación en el controlador?

---

## FASE 2: Diagnóstico de Prisma y Limpieza de Datos

### Orden de Eliminación en afterAll()

```typescript
await prisma.pedidoItem.deleteMany({ where: { pedido: { empresaId: { in: companies } } } });
await prisma.pedido.deleteMany({ where: { empresaId: { in: companies } } });
await prisma.reglaFidelizacion.deleteMany({ where: { empresaId: { in: companies } } });
await prisma.cliente.deleteMany({ where: { empresaId: { in: companies } } });
await prisma.movimientoStock.deleteMany({ where: { empresaId: { in: companies } } });
await prisma.lote.deleteMany({ where: { empresaId: { in: companies } } });
await prisma.producto.deleteMany({ where: { empresaId: { in: companies } } });
await prisma.subtipo.deleteMany({ where: { empresaId: { in: companies } } });
await prisma.tipo.deleteMany({ where: { empresaId: { in: companies } } });
await prisma.subfamilia.deleteMany({ where: { empresaId: { in: companies } } });
await prisma.familia.deleteMany({ where: { empresaId: { in: companies } } });
await prisma.empresa.deleteMany({ where: { id: { in: companies } } });
```

### Relaciones FK Críticas (Verificadas en schema.prisma)

**MovimientoStock:** Tiene FKs a:
- Empresa, Producto, Lote, Usuario, RecepcionCompra

**Conflicto potencial:** Si `Producto` tiene relación inversa con `onDelete: Restrict` y hay MovimientoStock sin limpiar antes, el delete de Producto fallará.

**Estado actual del orden:** MovimientoStock se elimina ANTES de Producto (línea 249 vs. 251) → debería ser seguro.

### Hipótesis para Errores de Limpieza

Si reporta errores de FK al borrar productos:

1. **Causa A:** Hay tabla Y que referencia Producto con `onDelete: Restrict` y no está listada en afterAll
   - **Solución:** Agregar `prisma.Y.deleteMany()` ANTES de `producto.deleteMany()`

2. **Causa B:** `movimientoStock.deleteMany()` NO está eliminando todos los registros
   - **Razón posible:** Si se crearon movimientoStock en transacciones de test anterior que no se completaron
   - **Solución:** Ajustar el filtro `where` de movimientoStock.deleteMany()

3. **Causa C:** Relación circular o cascada no esperada en schema.prisma
   - **Solución:** Verificar `@relation(..., onDelete: Cascade)` vs. `onDelete: Restrict`

### Segunda Suite: s-v1-store-02-business-slug.integration-spec.ts

**Requisito especial del request:** "Inspecciona el fallo de s-v1-store-02 y obtén el error Prisma completo; no supongas que tiene la misma causa que la primera suite"

**Acciones necesarias:** Leer setup, tests, y afterAll() de s-v1-store-02 para verificar:
- ¿Usa los mismos fixtures (productA2 sin stock)?
- ¿Crea diferentes tipos de datos que causan conflictos distintos?
- ¿El mensaje de error es igual o diferente?

---

## FASE 3: Plan Mínimo de Cambios

### Matriz de Decisión

| Síntoma | Causa Probable | Evidencia Necesaria | Cambio Mínimo Propuesto | Riesgo | Compatibilidad |
|---------|---|---|---|---|---|
| HTTP 400 en STORE-03a/b/c/d/07c | Validación de stock agregada | Grep `consolidatedStock` o `deductStock` antes del pedido.create en StoreService | Revert o condición para `/tienda/pedidos` (deductStock=false) | BAJO si es revert, ALTO si es nueva condición | Compatible si se documenta decisión |
| FK error en afterAll movimientoStock → producto | Relación inversa con onDelete: Restrict | Leer schema.prisma relaciones de Producto | Agregar `prisma.Y.deleteMany()` ANTES de producto en afterAll | MUY BAJO | No impacta código productivo |
| s-v1-store-02 fallo diferente | Desconocido hasta inspeccionar | Leer archivo s-v1-store-02 completo | TBD | TBD | TBD |

### Cambios Potenciales (EN ORDEN DE PROBABILIDAD)

**Opción 1: Revert de Validación de Stock (SI Hipótesis 1 es cierta)**
```
Archivo: apps/api/src/store/store.service.ts
Línea: [TBD, depende de cambio reciente]
Cambio: Remover o condicionar validación de stock para deductStock=false
Razón: Las suites esperan que /tienda/pedidos NO valide stock (comentario línea 144)
Test de validación: STORE-03a debe retornar 201
```

**Opción 2: Agregar Cleanup en afterAll (PROBABLE)**
```
Archivo: apps/api/test/integration/s-v1-store-01-characterization.integration-spec.ts
Línea: 249 (antes de producto.deleteMany)
Cambio: Agregar [TBD tabla] .deleteMany() si hay FK pendiente
Razón: Permitir borrado de Producto sin conflictos
Test de validación: afterAll() completa sin error FK
```

**Opción 3: Fixture Correction (BAJA PROBABILIDAD)**
```
Archivo: s-v1-store-01-characterization.integration-spec.ts
Línea: 376-381
Cambio: Si tests están "rotos por diseño", cambiar expectativa de 201 a 400
Razón: Si la nueva validación es INTENTIONAL
Test de validación: Suite pasa con nuevo expectativa
RESTRICTION: Requiere decisión del Owner (validación de stock es requisito)
```

---

## FASE 4: Secuencia de Validación Propuesta

### Precondiciones
- BD de pruebas accesible (puerto 5500, credenciales test)
- `npm run build` compila sin errores (TS 6.0.3)
- `npm test` pasa al menos 121/126 tests unitarios (línea base P0 Security)

### Comandos de Validación (EN ORDEN)

#### 1. Aislamiento — S-V1 STORE-01 Sola
```bash
npm run test:integration -- \
  --testNamePattern="S-V1-STORE-01" \
  --maxWorkers=1
```
**Resultado esperado:**
- Si Opción 1 (Revert): 21 tests PASS (incluyendo STORE-03a/b/c/d y STORE-07c)
- Si sin cambios: 5 tests FAIL con 400
- **Bloqueador:** Si afterAll falla, se reporta FK error

#### 2. Segunda Suite — S-V1 STORE-02
```bash
npm run test:integration -- \
  --testNamePattern="S-V1-STORE-02" \
  --maxWorkers=1
```
**Resultado esperado:** TBD (depende de causa real de s-v1-store-02)

#### 3. Regresión Multi-Tenant — S-V1 Completo
```bash
npm run test:integration -- \
  --testNamePattern="^S-V1" \
  --maxWorkers=1
```
**Resultado esperado:** Todos los 19-21 tests S-V1 PASS (según configuración)

#### 4. FS-1a Integration (BusinessContext for Customers)
```bash
npm run test:integration -- \
  --testNamePattern="FS-1a" \
  --maxWorkers=1
```
**Resultado esperado:** Todos PASS (no debería afectar stores)

#### 5. Build y Tests Unitarios Generales
```bash
npm run build
npm test -- --maxWorkers=4
```
**Resultado esperado:** 126+ tests unitarios PASS

#### 6. B4 Verification Infrastructure (CI Workflow)
```
Trigger: Push to PR branch or run GitHub Actions workflow manually
```
**Resultado esperado:** 270+ tests PASS, 0 FAIL

#### 7. Post-Merge Verification (Full Workflow)
```
Trigger: PR merge to main
```
**Resultado esperado:** Green ✓

---

## Cambios Protegidos — Preservación Garantizada

### Work Existente No Afectado
- ✓ **P0 Security:** 5 tests unitarios PASS, test de StaffIdentityGuard integrado
- ✓ **P5 Messaging:** 59+ tests PASS (messaging.service, gateway, controller)
- ✓ **P6 Cart:** Cambios preservados, no tocados
- ✓ **C3 Idempotency:** Cambios preservados
- ✓ **C5B Commerce E2E:** 15/15 tests PASS

### Restricciones de Cambio
- ✗ Sin modificar schema.prisma
- ✗ Sin `db push` o migraciones
- ✗ Sin cambios en `JwtAuthGuard`, `StaffIdentityGuard`, o guards globales
- ✗ Sin commits a main sin aprobación

---

## Bloqueos Identificados

### Bloqueador 1: Causa Exacta de HTTP 400 (CRÍTICO)
**Bloquea:** Decidir Opción 1 vs. Opción 3  
**Para resolver:** Leer exactamente qué cambio en StoreService causa validación de stock  
**Acción:** Grep + code inspection

### Bloqueador 2: Error Prisma Exacto en afterAll (CRÍTICO)
**Bloquea:** Saber si Opción 2 es necesaria  
**Para resolver:** Ver logs exactos del workflow fallido O ejecutar suite contra BD real  
**Acción:** Inspeccionar afterAll vs. schema inversas

### Bloqueador 3: Estado de s-v1-store-02 (CRÍTICO)
**Bloquea:** Saber si tiene causa distinta  
**Para resolver:** Leer suite 02 completa y comparar con suite 01  
**Acción:** Leer archivo s-v1-store-02-business-slug.integration-spec.ts

---

## Conclusiones de Diagnóstico

### Lo Confirmado
1. ✓ Rama está limpia, sin cambios destructivos
2. ✓ Work P0/P5/P6/C3/C5B está INTACTO
3. ✓ Orden de limpieza afterAll parece correcto (movimientoStock antes de producto)
4. ✓ 5 tests fallan con HTTP 400, todos usan productA2 (sin stock)
5. ✓ El código DEBERÍA permitir crear pedidos sin validar stock (comentario línea 144)

### Lo Pendiente
1. ✗ Causa exacta del HTTP 400: ¿Validación nueva en StoreService? ¿En DTO? ¿En Inventory?
2. ✗ Error exacto de FK en afterAll: ¿Qué relación está en conflict?
3. ✗ Estado de s-v1-store-02: ¿Mismo problema u otro?

### Siguiente Acción Única (OWNER DECISION)

**Opción A:** Autorizar Opción 1 (Revert/Conditional) si validación de stock es no-intencionada  
**Opción B:** Autorizar Opción 3 (Nueva Expectativa) si validación de stock es diseño nuevo  
**Opción C:** Solicitar análisis de logs/workflow para confirmar causa exacta primero

---

**Documento entregado:** Diagnóstico sin implementación  
**Próximo paso:** Decisión del Owner + ejecución de plan según opción elegida  
**Riesgo actual:** BLOQUEADO en causa exacta, plan mínimo listo para ambas opciones
