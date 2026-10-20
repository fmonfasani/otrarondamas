# PLAN MAESTRO — ORQUESTACIÓN P5 + P6 + C5 FASE B

**Fecha:** 2026-10-20  
**Objetivo:** Completar integración comercial E2E (venta reproducible)  
**Estado:** INSPECCIÓN COMPLETADA → PLAN LISTO  

---

## SITUACIÓN ACTUAL

### ✅ Verificado
- Rama: `integration/sprint-p5-p6-commerce` en `a7f31c4` (limpia)
- Worktrees: 4/4 presentes (C1, C2, C3, C4)
- CartService: Implementado con aislamiento
- StoreService: Idempotencia activada (idempotencyKey)
- Migración Prisma: 20261019214300 presente, no aplicada
- MessagingPage: Estructura de tipos lista
- SPEC: Canónicas localizadas en docs/WAPSELL-DOCUMENTATION

### ⏳ Pendiente
- Aplicar migración Prisma (requiere autorización)
- Implementar deducción de stock (determinar ubicación)
- Completar UI P5 (navegación, selección, historial)
- Conectar UI a endpoints (cart, pedidos, catálogo)
- Tests E2E (venta reproducible contra BD real)

---

## TRES FRENTES COORDINADOS

### Frente A — P5 UX de Conversación
**Líder:** P5 team (worktree C1: 59d5cad)  
**Archivos clave:**
- `apps/pos-admin/src/features/messaging/MessagingPage.tsx` (UI principal)
- `apps/pos-admin/src/lib/api.ts` (cliente API)
- `apps/api/src/messaging/messaging.controller.ts` (endpoints)
- Tests: `apps/api/test/integration/messaging-participation.integration-spec.ts`

**Tareas:**
1. ✅ Verificar componentes existentes (conversación, historial)
2. ⏳ Agregar selector de cliente
3. ⏳ Conectar búsqueda de catálogo
4. ⏳ Implementar carrito visual
5. ⏳ Agregar confirmación de pedido
6. ⏳ Evitar duplicación de mensajes ante reintentos

**Contrato:**
```
GET  /conversacoes/:id/messages → historial
POST /conversacoes/:id/messages → enviar (idempotent)
GET  /ventas/productos → catálogo
POST /cart → agregar item
POST /pedidos → crear orden (idempotent)
```

### Frente B — P6 Carrito y Órdenes
**Líder:** Commerce team (worktree C3: d9f2342, C2: 1b78ad9)  
**Archivos clave:**
- `apps/api/src/cart/cart.service.ts` (cart CRUD)
- `apps/api/src/store/store.service.ts` (orden + idempotencia)
- `apps/api/prisma/schema.prisma` (Cart, CartItem, Pedido models)
- Migración: `20261019214300_add_idempotency_key_to_pedido`

**Tareas:**
1. ✅ Verificar CartService implementado
2. ✅ Verificar idempotencia en StoreService
3. ⏳ **DECIDIR:** ¿Dónde se deduce stock?
   - Opción A: En StoreService.createOrder (después de crear Pedido)
   - Opción B: En CartService.removeItemAfterOrder (por ítem)
   - Opción C: Deferred trigger/job (C5 Fase C)
4. ⏳ Implementar deducción sin doble descuento
5. ⏳ Tests: concurrencia, reintentos, consistencia

**Contrato:**
```
POST /cart/{id}/items → agregar (validar stock)
DELETE /cart/{id}/items/{itemId} → remover
POST /cart/{id}/checkout → crear orden + deducir stock (idempotent)
GET  /pedidos/{id} → estado + total
```

### Frente C — QA y Seguridad
**Líder:** QA team (worktree C4: 8a7a015)  
**Tests:**
- Unitarias: Cart, Order, Idempotency
- Integración: Persistencia, concurrencia
- Seguridad: Multi-tenant isolation
- E2E: Venta completa reproducible

**Gate final:**
```
PASS cuando:
  ✅ Venta E2E reproducible
  ✅ Aislamiento multi-tenant verificado
  ✅ Persistencia OK
  ✅ Idempotencia OK
  ✅ Stock consistente
```

---

## DEPENDENCIAS Y SINCRONIZACIÓN

```
Frente A (P5)
  ├─ Requiere: Endpoints Frente B (cart, pedidos, catálogo)
  └─ Bloqueador: ❓ Migración Prisma (si stock es deferred)

Frente B (P6)
  ├─ Requiere: Aplicar migración Prisma
  ├─ Requiere: Decidir ubicación deducción stock
  └─ Bloqueador: ❓ Stock triggers/deferred (si C5 Fase C)

Frente C (QA)
  ├─ Requiere: Ambos frentes A y B listos
  └─ Bloqueador: ❓ BD real para E2E
```

---

## PUNTOS DE DECISIÓN CRÍTICOS

### Decisión 1: Aplicar migración Prisma
**Impacto:** Activa idempotencyKey en Pedido  
**Pendiente:** ¿Autorización? ¿BD aislada o compartida?  
**Acción:** Usar BD de tests aislada para E2E

### Decisión 2: Ubicación de deducción de stock
**Impacto:** Cuándo se restan unidades del inventario  
**Opciones:**
- A: `StoreService.createOrder()` (síncrono, antes de retorno)
- B: `CartService.removeItemAfterOrder()` (post-confirmación)
- C: Job/trigger async (C5 Fase C — deferred)

**Recomendación:** Opción A (síncrono, transacción única, garantiza consistencia)

### Decisión 3: BD para E2E
**Impacto:** Requiere migración aplicada + datos de prueba  
**Opción:** Usar docker-compose-test.yml si existe

---

## LÍNEA BASE DE VALIDACIÓN

### Build
```bash
npm run build --workspace=@otrarondamas/api
Esperado: TS compilation OK
Actual: ✅ (verificado en auditoría anterior)
```

### Lint
```bash
npm run lint --workspace=@otrarondamas/api --fix
Esperado: 0 errors after fix
Actual: ⏳ (32 warnings pre-audit, fixables)
```

### Tests
```bash
npm run test:e2e --workspace=@otrarondamas/api
Esperado: Tests pasan (E2E reproducible)
Actual: ⏳ (en progreso)
```

---

## MATRIZ DE REQUISITOS → PRUEBA → RESULTADO

| Requisito | SPEC | Implementación | Prueba | Status |
|-----------|------|---|---|---|
| Cart persistence | P6 SPEC | CartService | DB query | ⏳ |
| Multi-tenant isolation | P6 SPEC | CompanyScopedPrisma | Test multi-business | ⏳ |
| Idempotent message send | P5 SPEC | pendingSendRef | Retry test | ⏳ |
| Idempotent order creation | C3 SPEC | idempotencyKey @unique | Duplicate POST test | ⏳ |
| Stock validation | P6 SPEC | validateStockAvailable | Overage test | ⏳ |
| Stock deduction | C5A SPEC | ❓ Ubicación sin decidir | ❓ Concurrency test | ❓ BLOCKED |
| Conversation history | P5 SPEC | messaging.controller | GET messages | ⏳ |
| Catalog search | P5 SPEC | ventas/productos | Search test | ⏳ |
| Order confirmation | C3 SPEC | createOrder | POST /pedidos | ⏳ |
| E2E venta completa | C5B | Todos los anteriores | Flujo E2E | ⏳ |
| Authorization checks | All | Guards + asserts | 403 test | ⏳ |

---

## PRÓXIMOS PASOS

### Inmediatos (hoy):
1. **Decisión de stock:** Elegir ubicación (recomendación: Opción A)
2. **Setup BD pruebas:** Verificar docker-compose-test.yml
3. **Aplicar migración:** En BD de tests
4. **Arrancar desarrollo:**
   - Frente A: Completar UI P5
   - Frente B: Implementar stock deduction
   - Frente C: Escribir tests E2E

### Antes del gate:
- ✅ Todos los requisitos en PASS
- ✅ E2E reproducible (video/logs)
- ✅ Multi-tenant aislamiento verificado
- ✅ Defectos documentados o cerrados

---

## COMUNICACIÓN INTERFRENTES

**Contrato de cambios:**
- Frente A notifica a Frente B cuando cambia contracts API
- Frente B notifica a Frente C cuando stock deduction esté listo
- Frente C valida integridad antes de dar PASS

**Reconciliación diaria:**
- Verificar archivos modificados (evitar conflictos)
- Registrar bloqueadores
- Actualizar matriz de requisitos

---

**Plan aprobado:** 2026-10-20  
**Autoridad:** Orquestación P5 + P6 + C5B  
**Próxima revisión:** After Frente B stock decision

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
