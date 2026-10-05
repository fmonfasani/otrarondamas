# Producto.subfamilia → Subfamilia — RELATION OWNERSHIP AUDIT — 2026-10-04

**Tipo:** auditoría previa al cambio de producción (slice único).
**Política aplicada:** `03-DECISIONS/51-B3-RELATION-OWNERSHIP-COVERAGE-POLICY-OWNER-DECISION-2026-10-04.md`.
**Alcance:** únicamente `Producto.subfamilia`. Quedan fuera `Producto.tipo`, `Producto.subtipo`, `MovimientoStock`, `Lote`.
**Estado al momento de la auditoría:** HEAD `2e0c3ee`; registry con `Producto: ['familia']`.
**Evidencia:** [C] código · [T] test · [E] ejecución · [D] documentado · [ND] no determinable.

---

## 1. Schema `[C]`

`apps/api/prisma/schema.prisma`:

- `Producto.subfamiliaId` + `subfamilia Subfamilia @relation("ProductoSubfamilia", fields:[subfamiliaId], references:[id])` — **FK simple, una columna** (E-3).
- `Subfamilia` tiene `empresaId` y está en `MODELOS_CON_EMPRESA_ID`: el preflight puede verificar el destino.
- `Producto` ya está en el registry (`['familia']`); el walker admite múltiples relaciones por modelo.
- La FK de BD valida **existencia** de la Subfamilia, no su `empresaId`.
- Existe además la jerarquía Subfamilia→Familia, Tipo→Subfamilia, Subtipo→Tipo; esas relaciones **no** están registradas y quedan fuera de este slice.

## 2. Write paths de `Producto.subfamiliaId` `[C]`

Búsqueda sobre `apps/api/src` y `prisma/seed.ts`: `producto.create|createMany|update|updateMany|upsert` y `productos: {…}`.

| # | Ubicación | Operación | Escribe `subfamiliaId` | Cliente |
|---|---|---|---|---|
| W-1 | `catalogo/catalogo.controller.ts:125` (`createProducto`) | `db.producto.create({ data })`, `subfamiliaId: dto.subfamiliaId` (línea 114) | **Sí, desde el DTO** | scoped |
| W-2 | `catalogo/catalogo.controller.ts:153` (`updateProducto`) | `db.producto.update({ where, data: { ...dto } })` | **Sí, desde el DTO** (opcional) | scoped |
| W-3 | `prisma/seed.ts:227` (`upsert`), `:457` (`createMany`) | upsert / createMany | Sí | `new PrismaClient()` base (no scoped) |
| W-4 | specs `b3-*` | `prisma.producto.create` fixtures | Sí | base |

No hay otro writer de `Producto` en `src` (compras, ventas, inventario, tienda solo leen). No hay escritura anidada (`productos: { create }`) ni `subfamilia: { connect }` en `src`.

**A diferencia de `Lote.producto`, aquí el FK llega del input del cliente** (`CreateProductoDto.subfamiliaId`, `@IsUUID()`; `UpdateProductoDto` es `PartialType` del anterior con `ValidationPipe({ whitelist: true, transform: true })`, `main.ts:8`).

## 3. Validación compensatoria `[C]`

`verificarJerarquia` (`catalogo.controller.ts:163-183`), invocada en W-1 siempre y en W-2 cuando el body trae alguno de los 4 niveles (se completa con los valores existentes):

1. `db.subtipo.findUnique` con el cliente **scoped** → un Subtipo de otra empresa no se encuentra (404).
2. `subtipo.tipoId === ids.tipoId`.
3. `subtipo.tipo.subfamiliaId === ids.subfamiliaId`.
4. `subtipo.tipo.subfamilia.familiaId === ids.familiaId`.

Alcance real de la garantía sobre `subfamiliaId`:

- Es **transitiva**: el `subfamiliaId` aceptado es el que cuelga de un Subtipo del Business (paso 1) a través de Tipo. No verifica el `empresaId` de la Subfamilia ni del Tipo directamente; depende de que las filas del catálogo (Subfamilia/Tipo/Subtipo) estén bien encadenadas por Business.
- Esas filas **no tienen writers en `src`** (solo `seed.ts`, cliente base), por lo que hoy no hay un path de la API que pueda crear una cadena inconsistente `[C]`. Pero `Tipo.subfamilia`, `Subtipo.tipo`, `Subfamilia.familia` no están registradas, así que la integridad de esa cadena **no está garantizada por el mecanismo** `[C]`.
- Es **de aplicación**: vive en el controller. Cualquier uso del cliente scoped sobre `Producto` fuera de W-1/W-2 no la ejecuta.
- Ejecutada contra el cliente scoped sin ella (candidato SP-02..SP-05), la relación no se verifica `[E]` (§6).

## 4. Tests existentes `[C]`

`b3-producto-familia.integration-spec.ts` (PF-01..PF-05) cubre `Producto.familia` y usa un único `subfamiliaA` fijo; **no** cubre `Producto.subfamilia`. No hay spec de `catalogo.controller`. Las suites unitarias (17) no ejercitan `createProducto`/`updateProducto`.

## 5. Clasificación frente a la política

| Criterio (decisión 51) | Resultado |
|---|---|
| E-3 FK simple, destino con `empresaId` | **Cumple** `[C]` |
| E-1 persistencia puede introducir referencia cross-Business desde una superficie de escritura | **Cumple**: el FK llega del DTO en W-1/W-2 y se persiste por el cliente scoped `[C]`; el candidato lo demuestra `[E]` §6 |
| E-2 sin garantía equivalente establecida | **Cumple en la capa de persistencia**: la validación compensatoria (§3) es de aplicación, transitiva y solo cubre W-1/W-2; no es equivalente al enforcement del cliente scoped (decisión 51 §6.3) |
| E-4 compatible con todos los write paths conocidos | W-1/W-2: la Subfamilia ya está confirmada y es del Business (el preflight, otra conexión, la ve) → compatible `[C]`, y SP-01/SP-07 lo ejecutan `[E]`. W-3/W-4: cliente base, sin extensión: sin cambio. |
| Clase de §5 de la decisión | **Validación específica de dominio** (análisis específico). Resuelto en §3: no es equivalente. No es server-derived (el FK viene del cliente). |

**Admisión:** se admite `Producto: ['familia', 'subfamilia']`, condicionada a confirmar el gap por ejecución sin el fix (§6).

## 6. Ejecución del candidato — baseline sin cambio de producción `[E]`

Spec `apps/api/test/integration/b3-producto-subfamilia.integration-spec.ts` (SP-01..SP-08), BD descartable `otrarondamas_b3sub` (postgres:15, `db push`). Registry con `Producto: ['familia']`.

Diseño del candidato:

- Cada test usa su propio `codigoInterno` (`codigoUnico`), sin colisión con `@@unique([empresaId, codigoInterno])`.
- Los rechazos se afirman por **código Prisma** con `codigoDeRechazo`, no solo con `rejects.toThrow()`: P2025 para el rechazo de ownership. SP-08 es un control que produce P2002 real y demuestra que la aserción distingue ambos.
- Cada test negativo funciona aislado (verificado con `-t` por test, con el fix).

| Test | Baseline (sin fix) |
|---|---|
| SP-01 create mismo-Business | pasa |
| SP-02 create cross-Business | **FALLA** — `RESOLVED` (persistió) |
| SP-03 update cross-Business | **FALLA** — `RESOLVED` |
| SP-04 transacción: cross-Business + rollback del válido | **FALLA** — `RESOLVED` |
| SP-05 `createMany` mixto | **FALLA** — `RESOLVED` |
| SP-06 destino inexistente | **FALLA** — recibe `P2003` (FK de BD), no `P2025` |
| SP-07 positivo transaccional | pasa |
| SP-08 control P2002 | pasa |

Resultado baseline: 5 fallos / 3 pasan. **Gap confirmado `[E]`** en la capa de persistencia: el cliente scoped persiste un Producto de A con la Subfamilia de B.

## 7. Límites de esta auditoría

- El gap se demuestra sobre el cliente scoped; **no** se demuestra un exploit por la API HTTP (no hay spec de `createProducto`/`updateProducto`). En W-1/W-2, `verificarJerarquia` rechaza un `subfamiliaId` de otro Business **siempre que** la cadena Subtipo→Tipo→Subfamilia esté bien encadenada por Business; eso es `[C]` por lectura, no `[E]`.
- Las relaciones `Tipo.subfamilia`, `Subtipo.tipo`, `Subfamilia.familia` no se evalúan (fuera de alcance).
- No se cubrió `[E]`: `connect`/forma anidada, `upsert`, `updateMany`, raw SQL.
- TOCTOU del preflight `[ND]`.
- `Producto.tipo` y `Producto.subtipo` **no** se registran en este slice (el Red Team confirmó gap para ambos; quedan para slices propios).
- Un slice verificado no equivale a B3 globalmente verificado.
