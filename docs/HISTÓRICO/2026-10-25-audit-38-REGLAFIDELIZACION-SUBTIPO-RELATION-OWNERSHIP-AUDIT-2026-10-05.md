# ReglaFidelizacion.subtipo → Subtipo — RELATION OWNERSHIP AUDIT — 2026-10-05

**Tipo:** auditoría previa al cambio de producción (slice único).
**Política aplicada:** `03-DECISIONS/51-B3-RELATION-OWNERSHIP-COVERAGE-POLICY-OWNER-DECISION-2026-10-04.md`.
**Alcance:** únicamente `ReglaFidelizacion.subtipo`. Quedan fuera `ReglaFidelizacion.familia`, `ReglaFidelizacion.subfamilia`, `ReglaFidelizacion.tipo` y cualquier otra relación: comparten los write paths pero no quedan decididas por extensión.
**Estado al momento de la auditoría:** HEAD `65e104c`; registry con 7 modelos / 15 relaciones, sin `ReglaFidelizacion` (ver §8).
**Evidencia:** [C] código · [T] test · [E] ejecución · [D] documentado · [ND] no determinable.

---

## 1. Schema `[C]`

`apps/api/prisma/schema.prisma:594-595`:

- `ReglaFidelizacion.subtipoId` + `subtipo Subtipo? @relation(fields:[subtipoId], references:[id])` — **FK simple, una columna, opcional** (E-3).
- `Subtipo` tiene `empresaId` y figura en `MODELOS_CON_EMPRESA_ID` (`empresa-scope.extension.ts:49`): el preflight puede verificar el destino.
- La FK de BD valida **existencia** del Subtipo, no su `empresaId`. La migración fija `ON DELETE SET NULL`. No hay FKs compuestas.
- DTO: `subtipoId` opcional (`create-regla-fidelizacion.dto.ts`); update = `PartialType`.

## 2. Write paths de `ReglaFidelizacion.subtipoId` `[C]`

Barrido exhaustivo en `apps/api/src`: **exactamente 2 write paths**, ambos `create`/`update` directos por cliente scoped, ambos con FK escalar del DTO. Cero `createMany`, `updateMany`, `upsert`, escritura anidada, `connect`, raw SQL y seed sobre esta relación.

| # | Ubicación | Operación | Escribe `subtipoId` | Cliente |
|---|---|---|---|---|
| R-1 | `fidelizacion.service.ts:79` (`crear`, vía `POST /reglas-fidelizacion`) | `db.reglaFidelizacion.create({ data })`, FK del DTO (opcional) | **Sí, desde el DTO** | scoped |
| R-2 | `fidelizacion.service.ts:89` (`actualizar`, vía `PATCH /reglas-fidelizacion/:id`) | `db.reglaFidelizacion.update({ where, data: dto })` | **Sí, desde el DTO** (opcional; si no viene, no se cambia) | scoped |

## 3. Validación compensatoria `[C]`

`verificarNivelesCatalogo` (`fidelizacion.service.ts:100-121`), invocada en R-1 siempre y en R-2 siempre (con el DTO parcial — si el body no trae niveles, no verifica nada). Para `subtipoId`: `db.subtipo.findUnique` con cliente scoped → un Subtipo ajeno responde 404/`NotFoundException`.

- Es **de aplicación**: vive en el servicio y solo cubre R-1/R-2. Cualquier otro uso del cliente scoped sobre `ReglaFidelizacion` no la ejecuta.
- No hay garantía de persistence-layer independiente del servicio: sin el registry, el cliente scoped persiste la regla con un Subtipo ajeno (§6 `[E]`).
- A diferencia de `Producto` (4 niveles obligatorios encadenados), acá cada nivel es un filtro opcional independiente — la validación solo afirma existencia+pertenencia por nivel, sin cadena.

## 4. Tests existentes `[C]`

Ningún spec ejercita `ReglaFidelizacion.subtipo` con un `subtipoId` de otro Business. No hay spec del controller de fidelización.

## 5. Clasificación frente a la política

| Criterio (decisión 51) | Resultado |
|---|---|
| E-3 FK simple, destino con `empresaId` | **Cumple** `[C]` |
| E-1 la persistencia puede introducir una referencia cross-Business desde una superficie de escritura | **Cumple**: el FK llega del DTO en R-1/R-2 y se persiste por el cliente scoped `[C]`; el candidato lo demuestra `[E]` §6 |
| E-2 sin garantía equivalente establecida | **Cumple en la capa de persistencia**: §3 (de aplicación, solo R-1/R-2) |
| E-4 compatible con todos los write paths conocidos | R-1/R-2: el Subtipo ya existe (no hay `subtipo.create` en `src`; solo `seed.ts` con cliente base, fuera del plano request); sin `$transaction` en estos métodos; cero `connect`/`upsert`/nested/`createMany`/raw sobre esta relación `[C]` |
| Clases de exclusión de §5 | Ninguna aplica: no server-derived (FK del DTO), no heredado del padre, no destino de la misma transacción, destino con `empresaId`, no raw SQL. "Validación de dominio" resuelta en §3: no equivalente |

**Admisión:** se admite `ReglaFidelizacion: ['subtipo']`, condicionada a confirmar el gap por ejecución sin el cambio (§6).

## 6. Candidato y baseline sin cambio de producción `[E]`

Spec `apps/api/test/integration/b3-reglafidelizacion-subtipo.integration-spec.ts` (RF-P-01..RF-P-07), BD descartable `otrarondamas_b3rfsub` (postgres:15, `db push`), registry sin `ReglaFidelizacion`.

Diseño:

- Empresas A/B con jerarquía propia; nombre único por test; ningún test depende de filas de otro.
- Los rechazos se afirman por **código Prisma** (`codigoDeRechazo`), no `rejects.toThrow()`.
- RF-P-06/07 (controles de ruta) usan los **servicios reales** (`crear`, `actualizar`) y pasan antes y después del fix: la protección de la ruta no cambia.

| Test | Forma | Baseline (sin cambio) |
|---|---|---|
| RF-P-01 | create mismo-Business | pasa |
| RF-P-02 | create cross-Business | **FALLA** — `RESOLVED` (persistió) |
| RF-P-03 | update cross-Business | **FALLA** — `RESOLVED` |
| RF-P-04 | destino inexistente | **FALLA** — recibe `P2003` (FK de BD), no `P2025` |
| RF-P-05 | transacción: válido + cross-Business → rollback total | **FALLA** — `RESOLVED` |
| RF-P-06 | control: servicio `crear()` con ajeno | pasa (`NotFoundException`, sin persistencia) |
| RF-P-07 | control: servicio `actualizar()` con ajeno | pasa (`NotFoundException`, relación intacta) |

Resultado baseline: **4 fallan / 3 pasan. Gap confirmado `[E]`** en la capa de persistencia: el cliente scoped persiste una `ReglaFidelizacion` de A con el `Subtipo` de B, en create, update y dentro de transacción.

## 7. Límites de esta auditoría

- El gap se demuestra sobre el cliente scoped; **no** se demuestra exploit por la API HTTP (el servicio rechazaría con 404).
- `ReglaFidelizacion.familia/subfamilia/tipo` no se evalúan (mismos paths, admisión propia pendiente).
- No cubierto `[E]` en este candidato: forma anidada y `connect`, `upsert`, `updateMany`, `createMany`, raw SQL, flujo HTTP real.
- TOCTOU del preflight: `[ND]`.
- Un slice verificado no equivale a B3 globalmente verificado.

## 8. Conteo del registry `[C]`

Antes del cambio: 7 modelos y 15 relaciones. Después del cambio: **8 modelos y 16 relaciones** (`ReglaFidelizacion: ['subtipo']`). Ninguna entrada existente se modifica.
