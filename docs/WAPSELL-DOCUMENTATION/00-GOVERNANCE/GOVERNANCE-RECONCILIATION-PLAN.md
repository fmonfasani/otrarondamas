# Wapsell — Governance Reconciliation Plan

**Fecha de creación:** 2026-09-28
**Autoridad:** instrucción del Owner — Reconciliation Governance de D-001…D-018 y DEC-001
**Naturaleza:** documental exclusivamente. NO código, NO base de datos, NO deploy, NO commit.
**Estado:** APROBADO PARA EJECUCIÓN

> ## ⚠️ DOCUMENTO SUPERADO — RETRACTADO 2026-09-28
>
> Este plan **se conserva íntegro como registro histórico** de la primera pasada. Su §0
> («el texto de D-001…D-018 NO EXISTE en el repositorio») **quedó RETRACTADO** y su
> clasificación de evidencia es **obsoleta**: el texto existe y está registrado.
>
> **Causa de la retractación (GRF-09):** el inventario de la primera pasada enumeró
> únicamente los subdirectorios y **omitió los 5 documentos `.md` de la raíz** de
> `docs/WAPSELL-DOCUMENTATION/`, donde viven
> `WAPSELL-SPEC-GENERAL-v1.0-RECONSTRUIDA.md`, `WAPSELL-SPEC-GENERAL-v1.1-REVISADA.md`,
> `WAPSELL-IDENTITY-AND-TENANCY-SPEC-v0.1-DERIVADA.md` y
> `WAPSELL-DECISION-REGISTER-D001-D018.md`.
>
> **Clasificación vigente:** D-001, D-002 y la resolución `Customer` (`D-002-bis`) =
> `OWNER-VERBATIM`; D-003…D-018 = `DERIVED / RECONSTRUCTED`.
> Ver `00-GOVERNANCE/GOVERNANCE-RECONCILIATION-REPORT.md` §3, §4 y §5.
> El literal `APPROVED — TEXT RECONSTRUCTION REQUIRED` que aún aparece en este archivo
> se conserva **como evidencia del estado anterior**, no como clasificación actual.

---

## 0. Hallazgo rector (determina todo el plan)

**El texto de decisión de D-001…D-018 NO EXISTE en el repositorio.**

Evidencia verificada:

| Fuente | Contenido real |
|---|---|
| `03-DECISION-WORKSHOP/D-001…D-018.md` (18 fichas) | `Status: PENDING` · `## Decision: PENDING` · `## Approval: PENDING` — las 18, sin excepción |
| `03-DECISION-WORKSHOP/01-DECISION-MATRIX.md` | 18 filas en `PENDING` |
| `03-DECISION-WORKSHOP/02-DECISION-DEPENDENCIES.md` | titled *"pending decisions (D-XXX)"* |
| `03-CONFLICTS/07-DECISION-REGISTER.md` | marca `APPROVED` pero la columna "Decision" contiene la **pregunta**, no la resolución |
| `03-CONFLICTS/08-DECISIONS-REQUIRED.md` | columna `QUESTION` — documento de *preguntas*, no de decisiones |
| `04-DECISIONS/00-DECISION-REGISTER.md` | **única** decisión con texto real: `DEC-001` |
| `04-DECISIONS/04-COMMERCE.md` | `_To be populated._` |
| `03-DECISION-WORKSHOP/00-DECISION-WORKSHOP.md:4,80` | *"NO DECISION HAS BEEN MADE IN PHASE 3.5."* |

Única fuente documental con texto de decisión aprobada: `04-DECISIONS/02-MULTITENANCY.md` (**DEC-001**, APPROVED 2026-09-25, decisor fmonfasani).

**Consecuencia:** las ~82 afirmaciones normativas de `00-WAPSELL-SPEC-GENERAL.md`, `01-IDENTITY-AND-TENANCY-SPEC.md` y `02-COMMERCE-SPEC.md` que citan `(D-0xx)` como autoridad no son trazables. Usar las SPECs como evidencia de las decisiones sería **razonamiento circular** (las specs derivan de las decisiones).

**Acción conforme al mandato del Owner:** marcar `APPROVED — TEXT RECONSTRUCTION REQUIRED` y **no inventar formulaciones**.

---

## 1. Problema → evidencia → cambio propuesto

| # | Problema | Evidencia | Archivo afectado | Cambio propuesto | Riesgo | Impacto | Dependencia | Estado |
|---|---|---|---|---|---|---|---|---|
| P-01 | Register canónico no contiene D-001…D-018 | `04-DECISIONS/00-DECISION-REGISTER.md` solo DEC-001 | `04-DECISIONS/00-DECISION-REGISTER.md` | Añadir filas D-001…D-018 con `APPROVED — TEXT RECONSTRUCTION REQUIRED`, columnas completas, sin fecha inventada | Bajo | Alto | — | PENDIENTE |
| P-02 | `07-DECISION-REGISTER.md` usa preguntas como si fueran decisiones | `:4-21` columna "Decision" = pregunta | `03-CONFLICTS/07-DECISION-REGISTER.md` | Mover a anexo histórico; dejar puntero al register canónico | Bajo | Medio | P-01 | PENDIENTE |
| P-03 | 18 fichas dicen `PENDING` sin registrar la aprobación del Owner | 18/18 fichas L3 + última sección | `03-DECISION-WORKSHOP/D-001…D-018.md` | Preservar histórico; añadir bloque *Post-Workshop Decision Reconciliation* con estado real y contenido DEC-001 disponible | Bajo | Alto | P-01 | PENDIENTE |
| P-04 | Master del workshop afirma "NO DECISION HAS BEEN MADE" | `00-DECISION-WORKSHOP.md:4,80` | `03-DECISION-WORKSHOP/00-DECISION-WORKSHOP.md` | Corregir afirmación sin borrar el histórico (§10 del mandato) | Bajo | Alto | P-03 | PENDIENTE |
| P-05 | Decision Matrix marca `PENDING` | 18 filas | `03-DECISION-WORKSHOP/01-DECISION-MATRIX.md` | Estados según evidencia reconstruida | Bajo | Medio | P-03 | PENDIENTE |
| P-06 | Dependencias no distinguirán decisión aprobada vs detalle abierto | `02-DECISION-DEPENDENCIES.md` | `03-DECISION-WORKSHOP/02-DECISION-DEPENDENCIES.md` | Añadir columnas estado decisión / dependencia satisfecha / detalle abierto | Bajo | Medio | P-01 | PENDIENTE |
| P-07 | Impact Map sin estado | `03-DECISION-IMPACT-MAP.md` | `03-DECISION-WORKSHOP/03-DECISION-IMPACT-MAP.md` | Añadir estado + SPEC/arquitectura/contrato/invariante/test con evidencia | Bajo | Medio | P-01 | PENDIENTE |
| P-08 | CON-002…CON-027 siguen `OPEN` sin vínculo a decisión | `00-CONFLICT-REGISTER.md` | `03-CONFLICTS/00-CONFLICT-REGISTER.md` | Mapear conflicto → decisión que lo resuelve/mantiene abierto, **sin** marcar RESOLVED sin causalidad | Medio | Alto | P-01 | PENDIENTE |
| P-09 | 3 SPECs declaran `APPROVED` sin texto de decisión detrás | `00`,`01`,`02` línea 2 | `02-CANONICAL-SPEC/*.md` | `Status` → `DRAFT — DECISION TEXT NOT RECONSTRUCTED`; reetiquetar AS-IS→AS-IS y OPEN DETAIL no cerradas | **Alto** | **Alto** | P-01 | PENDIENTE |
| P-10 | Commerce SPEC: estados de `Order` inventados | `02-COMMERCE-SPEC.md:33` vs `03-ASIS-DATA.md:9` (`EstadoPedido` 10, no enumerados) | `02-COMMERCE-SPEC/02-COMMERCE-SPEC.md` | Eliminar estados inventados → `OPEN DETAIL` | Medio | Alto | P-09 | PENDIENTE |
| P-11 | AI scope contradictorio | `DEC-001` (AI parte del producto, revierte Fase 1) vs `00-WAPSELL-SPEC-GENERAL.md:46,106` ("MVP no incluye IA activa", atribuido a D-003) | `00-WAPSELL-SPEC-GENERAL.md` | Marcar OPEN GOVERNANCE FINDING; revertir a OPEN lo no decidido | **Alto** | **Alto** | P-01 | PENDIENTE |
| P-12 | Trazabilidad integral ausente | `08-TRACEABILITY/*` = stubs | `08-TRACEABILITY/00-MASTER-TRACEABILITY.md` | Crear matriz con evidencia real o `NOT DOCUMENTED` | Bajo | Alto | P-01 | PENDIENTE |
| P-13 | Reporte ausente | — | `00-GOVERNANCE/GOVERNANCE-RECONCILIATION-REPORT.md` | Crear con las 13 secciones del mandato | Bajo | Alto | Todos | PENDIENTE |

---

## 2. Colisión de namespaces de decisión (§4)

**Verificado:**

- `D-001…D-018` → **Decision Workshop** (`03-DECISION-WORKSHOP/`). Artifacts: fichas, matrix, dependencies, impact map, initial traceability. Estas son *preguntas prepared para el Owner*.
- `DEC-001…` → **Decision Register canónico** (`04-DECISIONS/`). `00-DECISION-REGISTER.md:12` reserva explícitamente `DEC-002, DEC-003, ...` para "las decisiones derivadas necesarias para ejecutar DEC-001".
- `DEC-001` (`04-DECISIONS/02-MULTITENANCY.md:53`) dice literalmente: *"Qué NO decide este documento (pendiente, a numerar como DEC-002 en adelante)"* — 5 ítems, que corresponden a D-001, D-002, D-003, y partially D-004.

**Conclusión:** son **dos namespaces distintos con una relación semántica declarada**, no un error de tipografía. La relación documental es: `DEC-001` (dirección de producto, APPROVED) → `D-001…D-018` (decisiones derivadas, preguntas de workshop). La numeración `DEC-002…DEC-019` que el propio DEC-001 anticipa **NO fue aplicada**; nadie la numeró.

**Estrategia de normalización (preserva IDs históricos):**
1. `DEC-001` se queda donde está, sin cambios. Es la única decisión con texto.
2. `D-001…D-018` conservan sus IDs. Se registran en el register canónico con estado real.
3. **NO** se asigna `DEC-002…DEC-019` — sería inventar IDs (prohibido §22).
4. Se documenta la equivalencia conceptual en el register, marcada como no resuelta.

**Origen de la confusión:** `03-CONFLICTS/07-DECISION-REGISTER.md` mezcla `DEC-001` y `D-001…D-018` en **una sola tabla** bajo la columna "DEC ID". Eso hace que `D-0xx` parezca decisiones de registro cuando son fichas de workshop. Y al marcarlas `APPROVED` sin texto, autoriza circularmente las SPECs.

---

## 3. Clasificación AS-IS / Transformation / TO-BE (§17)

Regla a aplicar sin excepción:

- `DEC-001` permite definir **dirección de producto** (orientación TO-BE), **no** detalles de implementación.
- `D-001…D-018` **no permiten nada** hasta que su texto se reconstruya.
- Todo atributo citado desde `05-ASIS/*` es **AS-IS** y no puede presentarse como requisito TO-BE.
- `OPEN DETAIL` no se cierra por inferencia.

---

## 4. Orden de ejecución

1. P-01 → P-02 (register canónico primero: establish source of truth)
2. P-03 → P-04 → P-05 → P-06 → P-07 (workshop layer)
3. P-08 (conflicts)
4. P-09 → P-10 → P-11 (specs)
5. P-12 (traceability)
6. P-13 (report)
7. Validación final global

## 5. Archivos NO tocados (garantizado)

Código (`apps/`, `packages/`), `schema.prisma`, migraciones, infra, tests, `05-ASIS/*` (evidencia), `01-SOURCE-INVENTORY/SOURCES/*` (histórico), `07-TOBE/*`, `06-TRANSFORMATION/*`, assets.

Ningún archivo histórico será borrado. Ningún `git commit`.

## 6. Criterio de detención

Si la reconstrucción exige inventar contenido → **detenerse y marcar**, nunca fabricar.
