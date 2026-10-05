# Producto.tipo → Tipo — RELATION OWNERSHIP AUDIT — 2026-10-05

**Tipo:** auditoría previa al cambio de producción (slice único).
**Política aplicada:** `03-DECISIONS/51-B3-RELATION-OWNERSHIP-COVERAGE-POLICY-OWNER-DECISION-2026-10-04.md`.
**Alcance:** únicamente `Producto.tipo`. Quedan fuera `Producto.subtipo`, `MovimientoStock`, `Lote`.
**Estado al momento de la auditoría:** HEAD `f7906dd`; registry con `Producto: ['familia', 'subfamilia']`.
**Evidencia:** [C] código · [T] test · [E] ejecución · [D] documentado · [ND] no determinable.

---

## 1. Schema `[C]`

`apps/api/prisma/schema.prisma`:

- `Producto.tipoId` + `tipo Tipo @relation("ProductoTipo", fields:[tipoId], references:[id])` — **FK simple, una columna, obligatoria** (E-3).
- `Tipo` tiene `empresaId` y figura en `MODELOS_CON_EMPRESA_ID` (`empresa-scope.extension.ts`): el preflight puede verificar el destino.
- La FK de BD valida **existencia** del Tipo, no su `empresaId`. No hay FKs compuestas.
- `Producto` ya está en el registry; el walker admite varias relaciones por modelo (precedente: `familia`, `subfamilia`).
- `Tipo.subfamilia` y `Subtipo.tipo` **no** están registradas (fuera de este slice).

## 2. Write paths de `Producto.tipoId` `[C]`

Búsqueda sobre `apps/api/src` y `prisma/seed.ts`.

| # | Ubicación | Operación | Escribe `tipoId` | Cliente |
|---|---|---|---|---|
| W-1 | `catalogo/catalogo.controller.ts:125` (`createProducto`) | `db.producto.create({ data })`, `tipoId: dto.tipoId` (`:115`) | **Sí, desde el DTO** (`@IsUUID()`, `create-producto.dto.ts:46`) | scoped |
| W-2 | `catalogo/catalogo.controller.ts:153` (`updateProducto`) | `db.producto.update({ where, data: { ...dto } })` | **Sí, desde el DTO** (opcional; `UpdateProductoDto` es `PartialType`) | scoped |
| W-3 | `prisma/seed.ts:227` (`upsert`), `:457` (`createMany`) | upsert / createMany | Sí | `new PrismaClient()` base (sin extensión) |
| W-4 | specs `b3-*` | `prisma.producto.create` (fixtures) | Sí | base |

No hay otro writer de `Producto` en `src` (los demás módulos solo leen `producto.tipoId`: ventas, tienda, inventario, fidelización). No hay escrituras anidadas (`productos: { create }`) ni `tipo: { connect }` en `src` `[C]`. Como en `Producto.subfamilia`, **el FK llega del input del cliente**, no está derivado en el servidor.

## 3. Validación compensatoria `[C]`

`verificarJerarquia` (`catalogo.controller.ts:163-183`), invocada en W-1 siempre y en W-2 cuando el body trae alguno de los 4 niveles (completa con los valores existentes). Para `tipoId`:

1. `db.subtipo.findUnique({ where: { id: subtipoId }, include: { tipo: { include: { subfamilia: true } } } })` con el cliente **scoped** → un Subtipo de otro Business no se encuentra (404).
2. `subtipo.tipoId === ids.tipoId` (`:174`).

Alcance real de la garantía sobre `tipoId`:

- Es **transitiva**: el `tipoId` aceptado es igual al `tipoId` del Subtipo encontrado en el Business. No consulta el `empresaId` del Tipo directamente; depende de que `Subtipo.tipoId` apunte a un Tipo del mismo Business, relación **no registrada** (`Subtipo.tipo`).
- Es **de aplicación**: vive en el controller y solo cubre W-1/W-2. Cualquier otro uso del cliente scoped sobre `Producto` no la ejecuta.
- El doc `13-AUDIT/32-RED-TEAM-PRODUCTO-SUBFAMILIA-ADVERSARIAL-REVIEW` (Red Team) llega a la misma conclusión para Subfamilia (defensa de call site, no garantía equivalente) `[D]`. Para Tipo el candidato la confirma por ejecución sobre el cliente scoped (§6).
- Aporta algo que el registry no verifica: el encadenamiento Subtipo→Tipo→Subfamilia→Familia. Por eso es **complementaria**; esta auditoría no decide si debe conservarse (decisión abierta, fuera de alcance).

## 4. Tests existentes `[C]`

`b3-producto-familia` (PF-01..PF-05) y `b3-producto-subfamilia` (SP-01..SP-08) cubren esas relaciones; ninguno ejerce `Producto.tipo` con un `tipoId` de otro Business (usan un `tipoId` propio fijo). No hay spec de `catalogo.controller`.

## 5. Clasificación frente a la política

| Criterio (decisión 51) | Resultado |
|---|---|
| E-3 FK simple, destino con `empresaId` | **Cumple** `[C]` |
| E-1 la persistencia puede introducir una referencia cross-Business desde una superficie de escritura | **Cumple**: el FK llega del DTO en W-1/W-2 y se persiste por el cliente scoped `[C]`; el candidato lo demuestra `[E]` §6 |
| E-2 sin garantía equivalente establecida | **Cumple en la capa de persistencia**: §3 (de aplicación, transitiva, solo W-1/W-2) |
| E-4 compatible con todos los write paths conocidos | W-1/W-2: el Tipo ya existe y es del Business (el preflight, en otra conexión, lo ve) → compatible `[C]`; TP-01/TP-04 lo ejecutan `[E]`. W-3/W-4: cliente base, sin cambio |
| Clase de exclusión de §5 | Ninguna aplica: no server-derived, no heredado del padre, no destino de la misma transacción, destino con `empresaId`, no raw SQL. "Validación de dominio" resuelta en §3: no equivalente |

**Admisión:** se admite `Producto: ['familia', 'subfamilia', 'tipo']`, condicionada a confirmar el gap por ejecución sin el cambio (§6).

## 6. Candidato y baseline sin cambio de producción `[E]`

Spec `apps/api/test/integration/b3-producto-tipo.integration-spec.ts` (TP-01..TP-08), BD descartable `otrarondamas_b3tipo` (postgres:15, `db push`), registry sin `tipo`.

Diseño:

- Cada test pide su propio `codigoInterno` (`codigoUnico`) y jerarquías propias A/B creadas con prefijos distintos a los de otros specs; no hay counts globales (solo `count` por `codigoInterno` del propio test).
- Los rechazos se afirman por **código Prisma** (`codigoDeRechazo`), no con `rejects.toThrow()`. TP-08 provoca un `P2002` real y un `P2025` real en el mismo test, para demostrar que se distinguen.
- Cada test funciona aislado (verificado con `-t` por test, con el cambio).
- El Producto cross-Business usa familia, subfamilia y subtipo propios de A y **solo** el `tipoId` de B, para que el único eje que falla sea `tipo`.

| Test | Forma | Baseline (sin cambio) |
|---|---|---|
| TP-01 | create mismo-Business | pasa |
| TP-02 | create cross-Business | **FALLA** — `RESOLVED` (persistió) |
| TP-03 | update cross-Business | **FALLA** — `RESOLVED` |
| TP-04 | transacción positiva (commit) | pasa |
| TP-05 | transacción: válido + cross-Business → rollback total | **FALLA** — `RESOLVED` |
| TP-06 | destino inexistente | **FALLA** — recibe `P2003` (FK de BD), no `P2025` |
| TP-07 | `createMany` mixto | **FALLA** — `RESOLVED` |
| TP-08 | control P2002 vs P2025 | **FALLA** — el segmento P2025 recibe `RESOLVED` (el P2002 sí pasa) |

Resultado baseline: **6 fallos / 2 pasan.** **Gap confirmado `[E]`** en la capa de persistencia: el cliente scoped persiste un Producto de A con el Tipo de B.

## 7. Límites de esta auditoría

- El gap se demuestra sobre el cliente scoped; **no** se demuestra un exploit por la API HTTP (no hay spec de `createProducto`/`updateProducto`). En W-1/W-2, `verificarJerarquia` debería rechazar un `tipoId` de otro Business mientras la cadena de catálogo esté bien encadenada por Business; eso es `[C]` por lectura, no `[E]`.
- `Tipo.subfamilia`, `Subtipo.tipo`, `Subfamilia.familia` no se evalúan.
- No cubierto `[E]` en este candidato: forma anidada y `connect`, `upsert`, `updateMany`, raw SQL. (El doc 32 del Red Team indica que `upsert` falla cerrado por ISO-007 `[D]`; no lo reverifiqué.)
- TOCTOU del preflight: `[ND]`.
- `Producto.subtipo` **no** se registra en este slice (gap confirmado por el Red Team; slice propio).
- Un slice verificado no equivale a B3 globalmente verificado.
