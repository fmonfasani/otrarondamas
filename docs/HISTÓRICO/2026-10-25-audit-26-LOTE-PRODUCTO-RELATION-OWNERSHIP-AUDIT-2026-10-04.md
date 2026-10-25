# Lote.producto → Producto — RELATION OWNERSHIP AUDIT — 2026-10-04

**Tipo:** auditoría previa al cambio de producción (slice único).
**Política aplicada:** `03-DECISIONS/51-B3-RELATION-OWNERSHIP-COVERAGE-POLICY-OWNER-DECISION-2026-10-04.md` (v0.1, Owner-approved).
**Alcance:** únicamente `Lote.producto`. No se auditan `MovimientoStock.lote`, `MovimientoStock.producto`, `Legajo`, ISO-009.
**Estado al momento de esta auditoría:** HEAD `72e794d`; registry sin entrada `Lote`.
**Evidencia:** [C] código · [T] test · [E] ejecución · [D] documentado · [ND] no determinable.

---

## 1. Schema `[C]`

`apps/api/prisma/schema.prisma`, `model Lote` (línea 449):

- `empresaId` + relación a `Empresa`; `productoId` + `producto Producto @relation(fields:[productoId], references:[id])` — **FK simple, una columna** (E-3 de la política).
- `@@unique([productoId, numeroLote, empresaId])`.
- Back-relations: `movimientosStock`, `devolucionProveedorItems`.
- Sin FK compuesta: la BD no impide `Lote.empresaId = A` con `productoId` de B. La FK de BD (`Lote_productoId_fkey`, migración `20260919224959_init`) valida solo **existencia** del Producto, no su `empresaId`.
- `Producto.lotes Lote[]` existe (línea 420): una escritura anidada `producto.update({ data: { lotes: { create } } })` es posible a nivel de Prisma.
- `Lote` está en `MODELOS_CON_EMPRESA_ID` (`empresa-scope.extension.ts`), y `Producto` también: el preflight puede verificar el destino.

## 2. Write paths de `Lote` `[C]`

Búsqueda sobre `apps/api` (excluye `node_modules`, `dist`): `lote.create|createMany|upsert|update|updateMany` y `lotes: {…}`.

| # | Ubicación | Operación | Escribe `productoId` | Cliente |
|---|---|---|---|---|
| W-1 | `compras/compras.service.ts:226` (`recibirCompra`) | `tx.lote.create` dentro de `db.$transaction` (línea 207) | **Sí** — `productoId: item.productoId` (línea 221) | scoped |
| W-2 | `compras/compras.service.ts:389` (`crearDevolucion`) | `tx.lote.update` `cantidad: { decrement }` | No | scoped |
| W-3 | `inventario/inventario.service.ts:332` (`descontarStock`) | `tx.lote.update` `cantidad: { decrement }` | No | scoped |
| W-4 | `inventario/inventario.service.ts:267` (`aplicarAjusteAtomico`) | `$executeRaw` `UPDATE "Lote" SET "cantidad"…` | No | raw (no interceptado) |
| W-5 | `prisma/seed.ts:494` | `prisma.lote.createMany` | Sí | `new PrismaClient()` base (no scoped) |
| W-6 | specs `b3-iso-006` (129, 139) y `b3-devolucion-proveedor-item` (168, 178) | `prisma.lote.create` fixtures | Sí | base (no scoped) |

No se encontró (en `src`) ningún `lote.upsert`, `lote.updateMany`, `lote.createMany`, ni escritura anidada vía `lotes: { create | connect }`. Las únicas apariciones de `lotes:` en `src` son lecturas (`ventas.service.ts:489`, `select`).

**Superficie que puede escribir `Lote.productoId` desde el cliente scoped en producción: solo W-1.**

### 2.1 Origen de `productoId` en W-1 `[C]`

- `recibirCompra` obtiene la compra con `this.getCompra(empresaId, compraId)` (línea 185, `getCompra` en línea 73, filtra por `empresaId`).
- `item.productoId` proviene de `compra.items` (la fila `CompraItem` ya persistida), **no del DTO**: `recibir-compra-item.dto.ts` declara que referencia `CompraItem.id` ("no productoId").
- `CompraItem.producto` **ya está en el registry** (`CompraItem: ['producto']`), por lo que ese `productoId` fue verificado al persistirse el `CompraItem`.

### 2.2 DTOs con `loteId` / `productoId` `[C]`

`registrar-ajuste.dto.ts` (`loteId`), `crear-devolucion-proveedor.dto.ts` (`loteId?`, `productoId`). Ninguno escribe `Lote.productoId`: `loteId` se usa para **leer/ajustar** (`cantidad`), no para crear un Lote.

## 3. Validaciones compensatorias `[C]`

- W-1: derivación server-side del `productoId` desde un `CompraItem` de la misma compra y empresa (2.1). Es una garantía **de aplicación** y **transitiva** (depende de que `CompraItem.producto` esté verificado).
- Ninguna validación compensatoria protege `Lote.productoId` en la **capa de persistencia**: cualquier código que use el cliente scoped y pase un `productoId` ajeno lo persiste (ver §6).

## 4. Tests existentes que tocan `Lote` `[C]`

`b3-iso-006` (RAW-01..03, fixtures de Lote con cliente base) y `b3-devolucion-proveedor-item` (`DevolucionProveedorItem.lote`). **Ninguno** ejercita `Lote.producto` como relación escrita por el cliente scoped. No hay spec para `recibirCompra`.

## 5. Clasificación frente a la política

| Criterio (decisión 51) | Resultado |
|---|---|
| E-3 FK simple, destino con `empresaId` | **Cumple** `[C]` |
| E-1 persistencia puede introducir referencia cross-Business desde una superficie de escritura | **Cumple en la capa de persistencia** `[E]` (§6). **No** alcanzable por el input del cliente en los write paths productivos actuales `[C]` (2.1, 2.2). |
| E-2 sin garantía equivalente establecida | **Cumple en la capa de persistencia** (no existía verificación en el cliente scoped, §6). La única garantía es de aplicación y transitiva. |
| E-4 estrategia compatible con todos los write paths conocidos | W-1: el Producto es un `CompraItem.productoId` ya confirmado; el preflight (otra conexión) lo ve → compatible `[C]`, ejecutado en forma equivalente por LP-07 `[E]`. W-2/W-3: solo `cantidad`, no tocan `productoId`: no disparan referencia. W-4: raw, no pasa por la extensión: sin cambio. W-5/W-6: cliente base, sin extensión: sin cambio. |
| Clase de §5 de la decisión | **Ownership derivado por servidor** (W-1). La política indica **análisis específico, no registro automático**. |

### 5.1 Cómo se resuelve la tensión
El análisis específico que exige §6.2 de la decisión 51 arroja:

(a) el valor sale de `CompraItem.productoId` (server-derived);
(b) la fuente **sí está verificada** (`CompraItem.producto` registrada);
(c) **sí existe una superficie sin la derivación**: el cliente scoped acepta cualquier `productoId` en `Lote` — verificado por ejecución `[E]` (§6) — y `Producto.lotes` habilita además la forma anidada.

Por tanto la brecha **no es explotable por el input de la API actual** `[C]`, pero **sí** por cualquier write path futuro o interno que use el cliente scoped. Esta auditoría **no afirma** que exista un vector de explotación hoy. La admisión se apoya en la instrucción del slice (registrar solo si el gap se confirma en el candidato aislado) y en E-1/E-2 sobre la capa de persistencia, **no** en un vector productivo demostrado.

> **Punto para el Owner `[ND]`:** si la política debe admitir relaciones cuya única superficie de escritura productiva es server-derived pero cuya capa de persistencia no está protegida (defensa en profundidad), o si debe exigir un vector productivo demostrado. La decisión 51 §6.2 admite la entrada solo con análisis documentado; este documento es ese análisis. Si el Owner decide que no alcanza, la entrada `Lote: ['producto']` es reversible con una línea.

## 6. Ejecución del candidato — baseline sin cambio de producción `[E]`

Spec: `apps/api/test/integration/b3-lote-producto.integration-spec.ts` (LP-01..LP-08). BD descartable `otrarondamas_b3lote` (postgres:15, `db push`). HEAD `72e794d` sin `Lote` en el registry.

| Test | Baseline (sin fix) |
|---|---|
| LP-01 create mismo-Business | pasa |
| LP-02 create cross-Business | **FALLA** — el create **resolvió**: persistió un `Lote` con `empresaId`=A y `productoId` de B (en la salida: `"empresaId": "275f…", "productoId": "4210…"`) |
| LP-03 update cross-Business | **FALLA** |
| LP-04 create cross-Business en `$transaction` | **FALLA** |
| LP-05 sin persistencia parcial | **FALLA** |
| LP-06 Producto inexistente | pasa (la FK de BD lo rechaza, no el registry) |
| LP-07 positivo transaccional mismo-Business | pasa |
| LP-08 `createMany` cross-Business | **FALLA** |

Resultado baseline: 5 fallos / 3 pasan. **Gap confirmado `[E]`** en la capa de persistencia.

Nota: LP-06 pasa sin el cambio porque lo cubre la FK de BD; no demuestra el registry. LP-07 es el positivo que replica la forma de W-1 (`$transaction` interactiva + create con Producto confirmado).

## 7. Límites de esta auditoría

- No se verificó el path productivo W-1 de punta a punta (`recibirCompra` real): no hay spec; la compatibilidad se apoya en lectura de código y en LP-07.
- La forma anidada `producto.update({ lotes: { create } })` **no** se ejecutó (no es un write path productivo y no está en el conjunto mínimo). El walker recorre relaciones no registradas, pero esto es inferencia `[C]`, no `[E]`.
- TOCTOU del preflight (verificación en otra conexión) sigue siendo `[ND]` como en el resto del registry.
- `MovimientoStock.lote` y `MovimientoStock.producto` **no** se tocan ni se evalúan.
- Un slice verificado no equivale a B3 globalmente verificado.
