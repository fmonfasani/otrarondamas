# Producto.subtipo → Subtipo — RELATION OWNERSHIP AUDIT — 2026-10-05

**Tipo:** auditoría previa al cambio de producción (slice único).
**Política aplicada:** `03-DECISIONS/51-B3-RELATION-OWNERSHIP-COVERAGE-POLICY-OWNER-DECISION-2026-10-04.md`.
**Alcance:** únicamente `Producto.subtipo`. Quedan fuera `MovimientoStock.*`, `Subtipo→Tipo`, `Tipo→Subfamilia`, `Subfamilia→Familia` y cualquier otra relación.
**Estado al momento de la auditoría:** HEAD `9f7abb8`; registry con `Producto: ['familia', 'subfamilia', 'tipo']` (7 modelos / 13 relaciones antes del cambio, ver §8).
**Evidencia:** [C] código · [T] test · [E] ejecución · [D] documentado · [ND] no determinable.
**Contexto documental:** `09-TRANSFORMATION/32-B3-COVERAGE-RECONCILIATION-POLICY-51-2026-10-05.md` clasifica esta relación como REGISTRY_REQUIRED `[D]`; esta auditoría re-inspecciona el código y no depende de esa clasificación.

---

## 1. Schema `[C]`

`apps/api/prisma/schema.prisma`:

- `Producto.subtipoId` + `subtipo Subtipo @relation("ProductoSubtipo", fields:[subtipoId], references:[id])` — **FK simple, una columna, obligatoria** (E-3).
- `Subtipo` tiene `empresaId` y figura en `MODELOS_CON_EMPRESA_ID` (`empresa-scope.extension.ts`): el preflight puede verificar el destino.
- La FK de BD valida **existencia** del Subtipo, no su `empresaId`. No hay FKs compuestas.
- El walker del registry admite varias relaciones por modelo (precedente: `familia`, `subfamilia`, `tipo`).
- `Subtipo.tipo` **no** está registrada (fuera de este slice).

## 2. Write paths de `Producto.subtipoId` `[C]`

Búsqueda sobre `apps/api/src` y `prisma/seed.ts` (`producto.create|createMany|update|updateMany|upsert`, `productos: {…}`, `subtipo: { connect|create }`).

| # | Ubicación | Operación | Escribe `subtipoId` | Cliente |
|---|---|---|---|---|
| W-1 | `catalogo/catalogo.controller.ts:125` (`createProducto`) | `db.producto.create({ data })`, `subtipoId: dto.subtipoId` (`:116`) | **Sí, desde el DTO** (`@IsUUID()`, `create-producto.dto.ts:49`) | scoped |
| W-2 | `catalogo/catalogo.controller.ts:153` (`updateProducto`) | `db.producto.update({ where, data: { ...dto } })` | **Sí, desde el DTO** (opcional; `UpdateProductoDto` es `PartialType`) | scoped |
| W-3 | `prisma/seed.ts:227` (`producto.upsert`), `:457` (`producto.createMany`) | upsert / createMany | Sí | `new PrismaClient()` base (sin extensión) |
| W-4 | specs `b3-*` | `prisma.producto.create` (fixtures) | Sí | base |

No hay `createMany`, `updateMany`, `upsert`, escritura anidada ni raw SQL sobre `Producto` en `src`. No existe `subtipo.create/update/delete` en `src`: los únicos writers de `Subtipo` son `seed.ts:216` (`upsert`) y `:374` (`createMany`), con cliente base `[C]`. En consecuencia el Subtipo referenciado siempre es **preexistente** respecto del write de Producto (condición favorable para E-4). El FK llega del input del cliente, no está derivado en el servidor.

## 3. Validación compensatoria `[C]`

`verificarJerarquia` (`catalogo.controller.ts:163-183`), invocada en W-1 siempre y en W-2 cuando el body trae alguno de los 4 niveles (completa con los valores existentes). Para `subtipoId`:

1. `db.subtipo.findUnique({ where: { id: ids.subtipoId }, … })` con el cliente **scoped** → un Subtipo de otro Business no se encuentra y responde 404.
2. Luego encadena `subtipo.tipoId`, `tipo.subfamiliaId` y `subfamilia.familiaId` contra los otros 3 ids.

A diferencia de `familia`/`subfamilia`/`tipo` (cuya pertenencia al Business se infiere transitivamente), `subtipoId` es el único de los 4 niveles que se **consulta directamente** con el cliente scoped. Esa es la defensa más fuerte del controller sobre este FK. Aun así:

- Es **de aplicación**: vive en el controller y solo cubre W-1/W-2. Cualquier otro uso del cliente scoped sobre `Producto` no la ejecuta.
- No hay garantía de persistence-layer independiente del controller: sin el registry, el cliente scoped persiste el Producto con un Subtipo ajeno (§6 `[E]`).
- Aporta lo que el registry no verifica: el encadenamiento de los 4 niveles. Es **complementaria**, no redundante. Si debe conservarse como defensa en profundidad queda como decisión abierta (ND-4), fuera de alcance.

## 4. Tests existentes `[C]`

`b3-producto-familia` (PF), `b3-producto-subfamilia` (SP) y `b3-producto-tipo` (TP) cubren sus relaciones; ninguno ejerce `Producto.subtipo` con un `subtipoId` de otro Business (usan un `subtipoId` propio fijo). No hay spec de `catalogo.controller`.

## 5. Clasificación frente a la política

| Criterio (decisión 51) | Resultado |
|---|---|
| E-3 FK simple, destino con `empresaId` | **Cumple** `[C]` |
| E-1 la persistencia puede introducir una referencia cross-Business desde una superficie de escritura | **Cumple**: el FK llega del DTO en W-1/W-2 y se persiste por el cliente scoped `[C]`; el candidato lo demuestra `[E]` §6 |
| E-2 sin garantía equivalente establecida | **Cumple en la capa de persistencia**: §3 (de aplicación, solo W-1/W-2) |
| E-4 compatible con todos los write paths conocidos | W-1/W-2: el Subtipo ya existe y es del Business (el preflight, en otra conexión, lo ve) → compatible `[C]`; ST-01/ST-04 lo ejecutan `[E]`. W-3/W-4: cliente base, sin cambio |
| Clases de exclusión de §5 | Ninguna aplica: no server-derived, no heredado del padre, no destino de la misma transacción, destino con `empresaId`, no raw SQL. "Validación de dominio" resuelta en §3: no equivalente |

**Admisión:** se admite `Producto: ['familia', 'subfamilia', 'tipo', 'subtipo']`, condicionada a confirmar el gap por ejecución sin el cambio (§6).

## 6. Candidato y baseline sin cambio de producción `[E]`

Spec `apps/api/test/integration/b3-producto-subtipo.integration-spec.ts` (ST-01..ST-08), BD descartable `otrarondamas_b3subtipo` (postgres:15, `db push`), registry sin `subtipo`.

Diseño:

- Cada test pide su propio `codigoInterno` (`codigoUnico`) y las jerarquías A/B son propias del spec; ningún test depende de filas de otro ni de counts globales (cada `count` filtra por el/los `codigoInterno` del propio test).
- Los rechazos se afirman por **código Prisma** (`codigoDeRechazo`), no con `rejects.toThrow()`.
- El Producto cross-Business usa familia, subfamilia y tipo propios de A y **solo** el `subtipoId` de B, de modo que el único eje que puede fallar es `subtipo`.
- ST-08 prueba tres cosas: duplicado → `P2002`; Subtipo ajeno con código nuevo → `P2025`; Subtipo ajeno **con código duplicado** → `P2025`, es decir, el ownership check se evalúa antes que el unique y no queda enmascarado por él.

| Test | Forma | Baseline (sin cambio) |
|---|---|---|
| ST-01 | create mismo-Business | pasa |
| ST-02 | create cross-Business | **FALLA** — `RESOLVED` (persistió) |
| ST-03 | update cross-Business | **FALLA** — `RESOLVED` |
| ST-04 | transacción positiva (commit) | pasa |
| ST-05 | transacción: válido + cross-Business → rollback total | **FALLA** — `RESOLVED` |
| ST-06 | destino inexistente | **FALLA** — recibe `P2003` (FK de BD), no `P2025` |
| ST-07 | `createMany` mixto | **FALLA** — `RESOLVED` |
| ST-08 | control P2002 vs P2025 | **FALLA** — el segmento P2025 recibe `RESOLVED` (el P2002 sí pasa) |

Resultado baseline: **6 fallos / 2 pasan.** **Gap confirmado `[E]`** en la capa de persistencia: el cliente scoped persiste un Producto de A con el Subtipo de B, sin pasar por el controller.

## 7. Límites de esta auditoría

- El gap se demuestra sobre el cliente scoped; **no** se demuestra un exploit por la API HTTP (no hay spec de `createProducto`/`updateProducto`). Por lectura `[C]`, `verificarJerarquia` rechazaría un `subtipoId` ajeno en W-1/W-2.
- `Subtipo.tipo`, `Tipo.subfamilia`, `Subfamilia.familia` no se evalúan.
- No cubierto `[E]` en este candidato: forma anidada y `connect`, `upsert`, `updateMany`, raw SQL.
- TOCTOU del preflight: `[ND]`.
- Un slice verificado no equivale a B3 globalmente verificado.

## 8. Conteo del registry `[C]`

Antes del cambio: 7 modelos y 13 relaciones (VentaItem 2, PedidoItem 2, CompraItem 1, DevolucionProveedorItem 2, Producto 3, ProductoProveedor 2, Lote 1), coherente con el estado canónico del brief y con el doc 31. Después del cambio: 7 modelos y **14 relaciones** (Producto 4).
