# R3 — Canonical Propagation Report

**Fecha:** 2026-09-30
**Estado:** REGISTRO DE PROPAGACIÓN — NO NORMATIVO. No crea decisiones, no aprueba nada, no autoriza implementación.
**Alcance del cambio:** solo documentación (`docs/WAPSELL-DOCUMENTATION/`). Sin commit. Sin push.

Clasificaciones usadas: `RECONCILED` · `PROPAGATED` · `OPEN` · `NOT CONSULTED` · `NOT AUTHORIZED` · `NOT APPROVED` · `OWNER APPROVAL REQUIRED` · `CONTRADICTION`.

---

## 1. Scope

Propagar únicamente las decisiones del Owner cerradas en R2 (2026-09-30) a los documentos canónicos y derivados: OR-002-B, C, D, E, F; P1-A (opción C); P5-B; CON-010/ISS-07; ISS-08; D-003/WhatsApp.

Método: notas aditivas fechadas ("R3") y anotaciones en línea que **preservan el texto histórico**. No se reescribió ni eliminó evidencia. No se definió schema, tablas, columnas, FK, índices, constraints, endpoints, eventos, tokens, guards, migraciones, infraestructura ni deploy.

Fuera de alcance (no tocado): `apps/`, schema, Prisma, migraciones, seed, API, DB, infraestructura, código funcional.

## 2. Authority

| Fuente | Rol |
|---|---|
| `04-DECISIONS/18-R2-OWNER-DECISION-CLOSURE-REPORT.md` | Registro de las decisiones R2 (autoridad primaria de esta propagación) |
| `04-DECISIONS/00-DECISION-REGISTER.md` (§8 añadido en R3) | Registro canónico; §8.1 tabla de rulings posteriores a D-001…D-018 |
| Rulings previos cerrados | D-001, D-002, D-002-bis (`OWNER-VERBATIM`); OR-001 (`13-…`); OR-002-A (`15-…`) |

Precedencia (ISS-08): Owner Ruling > Decision Register > canonical SPEC > TO-BE > Audit (evidencia únicamente) > Workshop/preparation > histórico.

## 3. Files inspected

Inspeccionados por lectura/grep antes de modificar: `README.md`; `00-GOVERNANCE/*`; `02-CANONICAL-SPEC/*`; `03-CONFLICTS/*`; `04-DECISIONS/00…18`; `05-ASIS` (lectura, sin modificar); `06-TRANSFORMATION/*`; `07-TOBE/*`; `08-CONTRACTS/*`; `08-TRACEABILITY/*`; `09-INVARIANTS/*`; `10-ARCHITECTURE/*`; `10-AUDIT/13, 14, 19, 20`; `11-PLAN/*`; `12-TASKS/*`.

## 4. Files modified

39 archivos de docs con cambios sin commitear (incluye los 14 de R1 aún sin commitear). Modificados o re-tocados en R3:

- **Governance:** `00-GOVERNANCE/01-SOURCE-OF-TRUTH.md`, `03-CONFLICT-RESOLUTION.md` (nota ISS-08; siguen `PROPOSED`).
- **Canonical SPEC:** `02-CANONICAL-SPEC/01-IDENTITY-AND-TENANCY-SPEC.md`, `02-COMMERCE-SPEC.md`.
- **Conflicts:** `03-CONFLICTS/00-CONFLICT-REGISTER.md`.
- **Decisions:** `00-DECISION-REGISTER.md` (§8 nuevo + anotaciones), `01-IDENTITY.md`, `08-MESSAGING.md`, `11-DECISION-CLOSURE-REPORT.md`, `12-ARCHITECTURAL-DECISION-CLOSURE.md`.
- **Transformation:** `06-TRANSFORMATION/01, 02, 03, 08, 09`.
- **TO-BE:** `07-TOBE/00, 01, 02, 05`.
- **Contracts:** `08-CONTRACTS/00-CONTRACTS-AUDIT-RECONCILIATION.md`, `01-IDENTITY-AND-TENANCY-CONTRACTS.md`, `05-MESSAGING-CONTRACTS.md`.
- **Traceability:** `08-TRACEABILITY/00, 05, 06`.
- **Invariants/Tests:** `09-INVARIANTS/00-INVARIANTS-v0.1.md`, `00-INVARIANTS-AUDIT-RECONCILIATION.md`, `01-TESTS-EVALS-DERIVATION-v0.1.md`, `02-TESTS-EVALS-AUDIT-RECONCILIATION.md` (notas D-003; **ningún invariante ni test creado**).
- **Architecture:** `10-ARCHITECTURE/00-…BASELINE-v0.1.md`, `01-…AUDIT.md`, `02-…REAUDIT-v0.2.md`.
- **Audit (nota de revalidación):** `10-AUDIT/13-…`, `14-…`.
- **Plan/Tasks:** `11-PLAN/00-…v0.2.md`, `01-…AUDIT.md`; `12-TASKS/00-…v0.1.md`, `01-…AUDIT.md`.
- **README.md.**
- **Nuevo:** este informe.

**No modificados a propósito:** `11-PLAN/00-IMPLEMENTATION-PLAN-v0.1.md` (versión antigua superseded), `05-ASIS/*`, `03-DECISION-WORKSHOP/*`, `10-AUDIT/19, 20` (evidencia histórica), `04-DECISIONS/14, 16` (preparación, no normativos), `07-TOBE/08-TOBE-COVERAGE-AUDIT.md` (su fila D-003 "DERIVED; implementation OPEN" sigue siendo correcta).

Fuera de docs: solo las 5 eliminaciones **preexistentes** en `apps/pos-admin` (`favicon.svg`, `icons.svg`, `hero.png`, `react.svg`, `vite.svg`), no producidas por R3.

## 5. OR-002 propagation

| ID | Texto propagado (conceptual) | Estado |
|---|---|---|
| OR-002-B | Transición incremental; coexistencia temporal y acotada; compatible con OR-001 P2-C; sin coexistencia prolongada/permanente | PROPAGATED |
| OR-002-C | `User` identidad global con email globalmente único (mecanismo de unicidad = detalle `OPEN`) | PROPAGATED |
| OR-002-D | `Usuario` → `User` + `Membership`; `Cliente` → `Customer` independiente de `User`, vínculo opcional | PROPAGATED |
| OR-002-E | Compatibilidad temporal de sesiones/tokens legacy (respeta OR-001 P3); al final se invalidan y se exige nuevo login | PROPAGATED (solo conceptual) |
| OR-002-F | `especificación → aprobación del Owner → implementación` | PROPAGATED |

Los enunciados R1 "OR-002-B…F sin ruling" se **marcaron como superseded** (no se borraron) en `README.md`, `02-CANONICAL-SPEC/01, 02`, `07-TOBE/01`, `04-DECISIONS/12`. Estado: RECONCILED.

## 6. P1-A / P5-B propagation

- **P1-A opción C:** `Empresa` → `Business` como destino final, en terminología documental y en modelo persistente. **No** implica que la migración física esté diseñada ni autorizada. PROPAGATED (`Register §8.1/§8.2`, `06-TRANSFORMATION/*`, `07-TOBE/01`, `03-CONFLICTS`, `08-TRACEABILITY`). Cuándo y cómo = `OPEN`.
- **P5-B:** `especificación → aprobación del Owner → implementación`. PROPAGATED (mismos documentos + `11-PLAN`/`12-TASKS`). `APPROVED ≠ IMPLEMENTATION AUTHORIZED`.

## 7. CON-010 / ISS-07 / ISS-08 propagation

- **CON-010 / ISS-07:** `RESOLVED` conceptualmente (D-002 + D-002-bis + OR-002-A). Fila `OPEN` de `03-CONFLICTS/00` preservada como registro histórico; nota R3 con autoridad. Implementación `OPEN`. RECONCILED.
- **ISS-08:** precedencia documental registrada en Register §8.4 y notas en `00-GOVERNANCE/01, 03`. La **aprobación formal** de los 7 documentos de `00-GOVERNANCE` (siguen `PROPOSED`) = `OWNER APPROVAL REQUIRED`.
- Las auditorías `10-AUDIT/13, 14` (que rotulan B2/C1/D1/E2/F1 como "decididas") recibieron nota de revalidación: solo los textos R2 están confirmados; D1 y F1 **no**. Su contenido histórico no se modificó.

## 8. D-003 propagation

D-003 / WhatsApp: **RESOLVED — OWNER-RULED (2026-09-30)**: "Wapsell Messaging MVP no depende de WhatsApp." No se integra ni elimina nada; no crea prohibición permanente sobre integraciones futuras. Otros detalles de D-003 (modelo Conversation/Message, realtime, etc.) siguen `OPEN`.

Propagado a: Register (fila D-003, §4.3.2, §8.1), `07-TOBE/00, 05`, `08-CONTRACTS/00, 05`, `09-INVARIANTS/*`, `10-ARCHITECTURE/*`, `11-PLAN/*`, `12-TASKS/*`, `04-DECISIONS/08, 11`. Textos "pendiente" previos conservados con marca `historical / superseded R3`. No se creó ningún invariante ni test.

## 9. Downstream impact

- **Contracts:** ningún contrato modificado; siguen `DRAFT`. `01-IDENTITY-AND-TENANCY-CONTRACTS` recibió una nota de autoridad. AUD-CON-001 pasa a RECONCILED.
- **Invariants/Tests:** solo notas; ningún invariante ni test nuevo.
- **Architecture:** nota de autoridad con límites conceptuales; baseline sigue `NOT APPROVED`.
- **Plan/Tasks:** dependencias documentales actualizadas; las tareas bloqueadas siguen bloqueadas; no se abrió ninguna tarea.
- **Transformation:** notas R3; las propuestas de fases/gates (incluida la "F1 = Target structures") no se tratan como decisiones.

## 10. Validation

Greps ejecutados (todo `docs/WAPSELL-DOCUMENTATION`): OR-002-B…F, P1-A, P5-B, CON-010, ISS-07, ISS-08, D-003, WhatsApp, F1, `IMPLEMENTATION AUTHORIZED`, "mismo email"/"same email", `NO CONSULTED`, `NOT AUTHORIZED`, `NOT APPROVED`, términos físicos (tabla, FK, índice, endpoint, JWT, guard, migración) en líneas añadidas.

Revisión de diff (`git diff --ignore-cr-at-eol`): 39 archivos, +455 / −26. Las 26 líneas "eliminadas" son líneas reescritas para insertar una anotación; se verificó automáticamente que el texto original de cada una sigue presente en la línea nueva (2 revisadas a mano: fila D-003 del Register y fila PLAN-SPEC-001). Nota menor: en 4 archivos (`04-DECISIONS/01-IDENTITY.md`, `08-MESSAGING.md`, `08-CONTRACTS/05-MESSAGING-CONTRACTS.md`, `08-TRACEABILITY/06-API-UI.md`) la primera línea tenía un `\r\r\n` espurio que el editor normalizó a `\r\n`; cambio solo de whitespace, sin efecto de contenido.

| # | Verificación | Resultado |
|---|---|---|
| 1 | Autoridad trazable en cada propagación | PASS — todas citan `18-…` y/o Register §8 |
| 2 | Sin estados normativos viejos contradictorios sin marcar | PASS — remanentes marcados `historical/superseded`; ver nota abajo |
| 3 | D-003 no `PENDING` en documentos normativos | PASS — los "pending" restantes son texto histórico marcado, o las cláusulas de D-006/D-008/D-009/D-011/D-013/D-015/D-017 |
| 4 | OR-002-B…F no "sin ruling" en documentos normativos vigentes | PASS — las 4 apariciones son R1 marcadas superseded + `17-R1-…` (registro histórico) |
| 5 | F1 nunca como autorización | PASS — `10-AUDIT/13:39` conserva "F1 … implementación autorizada" como cita histórica, con nota de revalidación al inicio |
| 6 | Customer↔User "mismo email" = OPEN | PASS |
| 7 | Sin detalle físico inventado | PASS — las únicas coincidencias son negaciones ("sin tokens, guards, tablas…") |
| 8 | Implementación NOT AUTHORIZED | PASS |
| 9 | Especificación Técnica NOT APPROVED | PASS |

Nota (2): `17-R1-DOCUMENTAL-RECONCILIATION-RECORD.md` (líneas 56–61, 93–95, 130) y `10-AUDIT/13/14` (cuerpo) conservan textos anteriores a R2; son registros históricos/de evidencia y no se reescribieron (regla 2).

## 11. Remaining OPEN items

| Ítem | Estado |
|---|---|
| Customer↔User: criterio "mismo email" | OPEN |
| Modelo físico, mecanismo de compatibilidad, criterio/tiempo de fin de coexistencia, mecánica de tokens/sesiones, cuándo/cómo se aplica P1-A | OPEN |
| D-005, OR-003, OR-005, D-006, D-008, D-011, D-013, D-015, D-016, D-017 | NOT CONSULTED |
| Aprobación formal de `00-GOVERNANCE` (7 docs `PROPOSED`) | OWNER APPROVAL REQUIRED |
| Corrección del typo `"Roonda"` en código/seed (CON-008) | OPEN (no corregido; fuera de alcance de R3) |
| G5, G7, G8, G9 | OPEN |

## 12. Implementation authorization status

- Implementación: **NOT AUTHORIZED**.
- F1: **NOT AUTHORIZED** (no es una autorización).
- Especificación Técnica (`10-AUDIT/13, 14` y derivados): **NOT APPROVED**.
- Ningún cambio en `apps/`, schema, Prisma, migraciones, seed, API, DB ni infraestructura.

## 13. Gate status

| Gate | Estado |
|---|---|
| G5, G7, G8, G9 | OPEN |
| G1 (Arquitectura) | NOT APPROVED — sin cambios |
| G4 (Implementación) | CLOSED — sin cambios |

## 14. R3 result

**R3 COMPLETADA (PROPAGACIÓN DOCUMENTAL).** Las decisiones R2 están propagadas de forma aditiva y trazable, sin borrar evidencia histórica, sin convertir decisiones conceptuales en detalle técnico y sin autorizar implementación.

Sin `CONTRADICTION` nuevas. Preexistentes y preservadas: la coexistencia de la fila `CON-010 OPEN` con el encabezado `RESOLVED` en `03-CONFLICTS/00` (ahora anotada con su autoridad) y la discrepancia entre `10-AUDIT/13/14` (D1/F1) y los rulings R2 (anotada). Cambios sin commitear a la espera de revisión del Owner.
