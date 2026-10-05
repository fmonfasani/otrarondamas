# MovimientoStock.producto → Producto — RELATION OWNERSHIP AUDIT — 2026-10-05

**Tipo:** auditoría previa al cambio de producción (slice único).
**Política aplicada:** `03-DECISIONS/51-B3-RELATION-OWNERSHIP-COVERAGE-POLICY-OWNER-DECISION-2026-10-04.md`.
**Alcance:** únicamente `MovimientoStock.producto`. Quedan fuera `MovimientoStock.lote`, `MovimientoStock.recepcionCompra`, `MovimientoStock.usuario` y cualquier otra relación.
**Estado al momento de la auditoría:** HEAD `15d493f`; registry con 7 modelos / 14 relaciones, sin `MovimientoStock` (ver §8).
**Evidencia:** [C] código · [T] test · [E] ejecución · [D] documentado · [ND] no determinable.
**Contexto documental:** `09-TRANSFORMATION/35-…` clasifica esta relación como REGISTRY_REQUIRED `[D]`; esta auditoría re-inspecciona el código y no depende de esa clasificación.

---

## 1. Schema `[C]`

`apps/api/prisma/schema.prisma:977-1002`:

- `MovimientoStock.productoId` + `producto Producto @relation(fields:[productoId], references:[id])` — **FK simple, una columna, obligatoria** (E-3).
- `Producto` tiene `empresaId` y figura en `MODELOS_CON_EMPRESA_ID` (`empresa-scope.extension.ts:45`): el preflight puede verificar el destino.
- La FK de BD valida **existencia** del Producto, no su `empresaId`. No hay FKs compuestas.
- `loteId` es opcional; este slice no la toca.

## 2. Write paths de `MovimientoStock.productoId` `[C]`

Barrido exhaustivo en `apps/api/src`: `movimientoStock.(create|createMany|update|updateMany|upsert|…)` → **exactamente 4 coincidencias, todas `create`, todas dentro de `$transaction`**. Cero `createMany`, `updateMany`, `upsert`, escritura anidada (`movimientosStock: {…}` → cero) y cero raw SQL sobre `MovimientoStock` (los únicos `$executeRaw`/`$queryRaw` son `health: SELECT 1` y el UPDATE condicional de `Lote` en `inventario.service.ts:266`, que no toca `MovimientoStock`). `prisma/seed.ts` no escribe `MovimientoStock`. Ningún otro writer existe.

| # | Ubicación | Método / flujo | Origen del `productoId` | Tx | ¿Producto preexistente? |
|---|---|---|---|---|---|
| W-1 | `compras.service.ts:228` | `recibirCompra` (recepción) | `item.productoId` de `CompraItem` vía `getCompra(empresaId,…)` (lectura scoped) | sí | sí — el `CompraItem` ya existe |
| W-2 | `compras.service.ts:374` | `crearDevolucion` (devolución) | **`item.productoId` del DTO, sin validación** | sí | sí — ningún `Producto` se crea en la tx (se crea `DevolucionProveedor`) |
| W-3 | `inventario.service.ts:238` | `registrarAjuste` (ajuste) | `lote.productoId` de lectura scoped (`db.lote.findUnique`) | sí | sí — el `Lote` ya existe |
| W-4 | `inventario.service.ts:337` | `descontarStock` (FIFO; callers: `ventas.service.ts:209`, `pedidos.service.ts:99`) | parámetro, derivado de lecturas scoped (`resolverItems` valida contra cliente scoped y rechaza ajeno con `NotFoundException`; `pedidoItems` de pedido scoped) | sí (tx del caller) | sí — ningún `Producto` se crea en la tx |

**E-1 se cumple por W-2 y por la capa de persistencia:** el DTO de devolución aporta `productoId` sin verificación, y — decisivamente — el cliente scoped acepta hoy cualquier `productoId` en `movimientoStock.create/update` (§6 `[E]`).

**Hallazgo de interacción `[C]`+`[E]`:** en el flujo `crearDevolucion`, el `items.create` anidado atraviesa la relación registrada `DevolucionProveedorItem.producto` (el walker visita escrituras anidadas, `relation-ownership.ts:121-156`), por lo que un `productoId` ajeno en ese flujo **ya es rechazado hoy** (MS-P-10 del baseline pasa sin fix). La protección vive en la relación del ítem, no en `MovimientoStock.producto`: el `movimientoStock.create` directo de `:374` sigue desprotegido, como demuestra el baseline (§6).

## 3. Validación compensatoria `[C]`

No existe una garantía de persistence-layer para `MovimientoStock.producto`:

- W-1/W-3/W-4 derivan el `productoId` de lecturas scoped — reduce el riesgo (§51.6.2) pero **no lo demuestra nulo**: la garantía vive en el servicio, no en la capa de persistencia, y W-2 ni siquiera deriva.
- W-2 no valida el `productoId` del DTO (el comentario de `crearDevolucion` afirma validación lote↔producto, pero el código `:349-368` no la contiene — deriva doc/código reportada, fuera del alcance de este slice).
- `resolverItems` (`ventas.service.ts:59`) rechaza productos ajenos con `NotFoundException`, pero solo cubre la ruta de ventas.

**E-2 se cumple:** ninguna garantía equivalente cubre todos los write paths en la capa de persistencia.

## 4. Tests existentes `[C]`

Ningún spec ejercita `MovimientoStock.producto` con un `productoId` de otro Business. `b3-iso-006` instancia `InventarioService` pero no prueba ownership de esta relación.

## 5. Clasificación frente a la política

| Criterio (decisión 51) | Resultado |
|---|---|
| E-3 FK simple, destino con `empresaId` | **Cumple** `[C]` |
| E-1 superficie real introduce referencia cross-Business | **Cumple**: W-2 (DTO sin validar) + cliente scoped sin enforcement; el candidato lo demuestra `[E]` §6 |
| E-2 sin garantía equivalente establecida | **Cumple en la capa de persistencia**: §3 |
| E-4 compatible con todos los write paths conocidos | W-1..W-4: el Producto referenciado **siempre es preexistente**; ningún write path crea `Producto` en la misma tx; cero `connect`/`upsert`/nested/`createMany`/raw sobre esta relación `[C]`; MS-P-07/08/09/11 lo ejecutan `[E]` |
| Clases de exclusión de §5 | Ninguna aplica: no server-derived puro (W-2 es DTO), no heredado del padre, no destino de la misma transacción, destino con `empresaId`, no raw SQL |

**Admisión:** se admite `MovimientoStock: ['producto']`, condicionada a confirmar el gap por ejecución sin el cambio (§6).

## 6. Candidato y baseline sin cambio de producción `[E]`

Spec `apps/api/test/integration/b3-movimientostock-producto.integration-spec.ts` (MS-P-01..MS-P-12), BD descartable `otrarondamas_b3msprod` (postgres:15, `db push`), registry sin `MovimientoStock`.

Diseño:

- Empresas A/B con jerarquía y productos propios; `proveedorA`, `usuarioA`, `compraA` EMITIDA con 1 ítem, `loteA` (100 u.), `loteD` (10 u.).
- Motivo único por test: ningún conteo depende de filas de otro.
- Rechazos por **código Prisma** (`codigoDeRechazo`), no `rejects.toThrow()`.
- MS-P-07/08/09/11 ejercitan los **servicios reales** (`registrarAjuste`, `recibirCompra`, `crearDevolucion`, `descontarStock`), no solo el registry.
- MS-P-10 prueba el flujo real de devolución con `productoId` ajeno (cubre la interacción con `DevolucionProveedorItem.producto`).

| Test | Forma | Baseline (sin cambio) |
|---|---|---|
| MS-P-01 | create mismo-Business | pasa |
| MS-P-02 | create cross-Business | **FALLA** — `RESOLVED` (persistió) |
| MS-P-03 | update cross-Business | **FALLA** — `RESOLVED` |
| MS-P-04 | transacción positiva (commit) | pasa |
| MS-P-05 | transacción: válido + cross-Business → rollback total | **FALLA** — `RESOLVED` |
| MS-P-06 | destino inexistente | **FALLA** — recibe `P2003` (FK de BD), no `P2025` |
| MS-P-07 | flujo real `registrarAjuste` | pasa |
| MS-P-08 | flujo real `recibirCompra` | pasa |
| MS-P-09 | flujo real `crearDevolucion` mismo-Business | pasa |
| MS-P-10 | flujo real `crearDevolucion` cross-Business | pasa (ya bloqueado por `DevolucionProveedorItem.producto` — ver §2) |
| MS-P-11 | flujo real `descontarStock` en tx | pasa |
| MS-P-12 | control: update a inexistente | **FALLA** — `P2003`, no `P2025` |

Resultado baseline: **5 fallan / 7 pasan. Gap confirmado `[E]`** en la capa de persistencia: el cliente scoped persiste `MovimientoStock` de A con `Producto` de B (create, update y dentro de transacción).

## 7. Límites de esta auditoría

- El gap se demuestra sobre el cliente scoped; **no** se demuestra exploit por la API HTTP.
- `MovimientoStock.lote`, `MovimientoStock.recepcionCompra` y `MovimientoStock.usuario` no se evalúan.
- No cubierto `[E]` en este candidato: forma anidada y `connect`, `upsert`, `updateMany`, `createMany`, raw SQL, flujo HTTP real.
- TOCTOU del preflight: `[ND]`.
- Deriva doc/código en el comentario de `crearDevolucion` (afirma validación lote↔producto no encontrada en el código): reportada, no resuelta.
- Un slice verificado no equivale a B3 globalmente verificado.

## 8. Conteo del registry `[C]`

Antes del cambio: 7 modelos y 14 relaciones (VentaItem 2, PedidoItem 2, CompraItem 1, DevolucionProveedorItem 2, Producto 4, ProductoProveedor 2, Lote 1). Después del cambio: 7 modelos y **15 relaciones** (MovimientoStock 1). Ninguna entrada existente se modifica.
