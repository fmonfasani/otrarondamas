# ReglaFidelizacion.familia → Familia — RELATION OWNERSHIP AUDIT — 2026-10-05

**Tipo:** auditoría previa al cambio de producción (slice único).
**Política aplicada:** `03-DECISIONS/51-B3-RELATION-OWNERSHIP-COVERAGE-POLICY-OWNER-DECISION-2026-10-04.md`.
**Alcance:** únicamente `ReglaFidelizacion.familia`. Quedan fuera `ReglaFidelizacion.subfamilia`, `ReglaFidelizacion.tipo` y cualquier otra relación: comparten los write paths pero no quedan decididas por extensión.
**Estado al momento de la auditoría:** HEAD `0b359c8`; registry con 8 modelos / 16 relaciones, sin `ReglaFidelizacion.familia` (ver §8).
**Evidencia:** [C] código · [T] test · [E] ejecución · [D] documentado · [ND] no determinable.

---

## 1. Schema `[C]`

`apps/api/prisma/schema.prisma:588-589`:

- `ReglaFidelizacion.familiaId` + `familia Familia? @relation(fields:[familiaId], references:[id])` — **FK simple, una columna, opcional** (E-3).
- `Familia` tiene `empresaId` y figura en `MODELOS_CON_EMPRESA_ID` (`empresa-scope.extension.ts:46`): el preflight puede verificar el destino.
- La FK de BD valida **existencia** de la Familia, no su `empresaId`. No hay FKs compuestas.
- DTO: `familiaId` opcional (`create-regla-fidelizacion.dto.ts`); update = `PartialType`.

## 2. Write paths de `ReglaFidelizacion.familiaId` `[C]`

Barrido exhaustivo en `apps/api/src`: **exactamente 2 write paths**, ambos directos por cliente scoped, ambos con FK escalar del DTO. Cero `createMany`, `updateMany`, `upsert`, escritura anidada, `connect`, raw SQL y seed sobre esta relación.

| # | Ubicación | Operación | Escribe `familiaId` | Cliente |
|---|---|---|---|---|
| R-1 | `fidelizacion.service.ts:79` (`crear`, vía `POST /reglas-fidelizacion`) | `db.reglaFidelizacion.create({ data })`, FK del DTO (opcional) | **Sí, desde el DTO** | scoped |
| R-2 | `fidelizacion.service.ts:89` (`actualizar`, vía `PATCH /reglas-fidelizacion/:id`) | `db.reglaFidelizacion.update({ where, data: dto })` | **Sí, desde el DTO** (opcional; si no viene, no se cambia) | scoped |

## 3. Validación compensatoria `[C]`

`verificarNivelesCatalogo` (`fidelizacion.service.ts:100-121`), invocada en R-1 siempre y en R-2 siempre (con el DTO parcial — si el body no trae niveles, no verifica nada). Para `familiaId`: `db.familia.findUnique` con cliente scoped → una Familia ajena responde 404/`NotFoundException`.

- Es **de aplicación**: vive en el servicio y solo cubre R-1/R-2. Cualquier otro uso del cliente scoped sobre `ReglaFidelizacion` no la ejecuta.
- No hay garantía de persistence-layer independiente del servicio: sin el registry, el cliente scoped persiste la regla con una Familia ajena (§6 `[E]`).

## 4. Tests existentes `[C]`

Ningún spec ejercita `ReglaFidelizacion.familia` con un `familiaId` de otro Business. No hay spec del controller de fidelización.

## 5. Clasificación frente a la política

| Criterio (decisión 51) | Resultado |
|---|---|
| E-3 FK simple, destino con `empresaId` | **Cumple** `[C]` |
| E-1 la persistencia puede introducir una referencia cross-Business desde una superficie de escritura | **Cumple**: el FK llega del DTO en R-1/R-2 y se persiste por el cliente scoped `[C]`; el candidato lo demuestra `[E]` §6 |
| E-2 sin garantía equivalente establecida | **Cumple en la capa de persistencia**: §3 (de aplicación, solo R-1/R-2) |
| E-4 compatible con todos los write paths conocidos | R-1/R-2: la Familia ya existe (no hay `familia.create` en `src`; solo `seed.ts` con cliente base, fuera del plano request); sin `$transaction` en estos métodos; cero `connect`/`upsert`/nested/`createMany`/raw sobre esta relación `[C]` |
| Clases de exclusión de §5 | Ninguna aplica: no server-derived (FK del DTO), no heredado del padre, no destino de la misma transacción, destino con `empresaId`, no raw SQL |

**Admisión:** se admite `ReglaFidelizacion: ['subtipo', 'familia']`, condicionada a confirmar el gap por ejecución sin el cambio (§6).

## 6. Candidato y baseline sin cambio de producción `[E]`

Spec `apps/api/test/integration/b3-reglafidelizacion-familia.integration-spec.ts` (RF-F-01..RF-F-07), BD descartable `otrarondamas_b3rffam` (postgres:15, `db push`), registry sin `ReglaFidelizacion.familia`.

Diseño:

- Empresas A/B con jerarquía propia; nombre único por test; ningún test depende de filas de otro.
- Los rechazos se afirman por **código Prisma** (`codigoDeRechazo`), no `rejects.toThrow()`.
- RF-F-06/07 (controles de ruta) usan los **servicios reales** (`crear`, `actualizar`) y pasan antes y después del fix: la protección de la ruta no cambia.

| Test | Forma | Baseline (sin cambio) |
|---|---|---|
| RF-F-01 | create mismo-Business | pasa |
| RF-F-02 | create cross-Business | **FALLA** — `RESOLVED` (persistió) |
| RF-F-03 | update cross-Business | **FALLA** — `RESOLVED` |
| RF-F-04 | destino inexistente | **FALLA** — recibe `P2003` (FK de BD), no `P2025` |
| RF-F-05 | transacción: válido + cross-Business → rollback total | **FALLA** — `RESOLVED` |
| RF-F-06 | control: servicio `crear()` con ajena | pasa (`NotFoundException`, sin persistencia) |
| RF-F-07 | control: servicio `actualizar()` con ajena | pasa (`NotFoundException`, relación intacta) |

Resultado baseline: **4 fallan / 3 pasan. Gap confirmado `[E]`** en la capa de persistencia: el cliente scoped persiste una `ReglaFidelizacion` de A con la `Familia` de B, en create, update y dentro de transacción.

## 7. Límites de esta auditoría

- El gap se demuestra sobre el cliente scoped; **no** se demuestra exploit por la API HTTP (el servicio rechazaría con 404).
- `ReglaFidelizacion.subfamilia/tipo` no se evalúan (mismos paths, admisión propia pendiente).
- No cubierto `[E]` en este candidato: forma anidada y `connect`, `upsert`, `updateMany`, `createMany`, raw SQL, flujo HTTP real.
- TOCTOU del preflight: `[ND]`.
- Un slice verificado no equivale a B3 globalmente verificado.

## 8. Conteo del registry `[C]`

Antes del cambio: 8 modelos y 16 relaciones. Después del cambio: 8 modelos y **17 relaciones** (`ReglaFidelizacion: ['subtipo', 'familia']`). Ninguna entrada existente se modifica.
