# R2 — OWNER DECISION CLOSURE REPORT

**Fecha:** 2026-09-30
**Owner:** Federico Monfasani (fmonfasani)
**Tipo:** registro de cierre de decisiones. **Autoridad primaria** para las decisiones de §1 (ver "Fuente primaria").
**Modo:** solo registro. **Nada fue propagado** al Registro, TO-BE, Contracts, Invariants, Architecture, Plan ni Tasks (propagación = R3). Sin código, schema, Prisma, migraciones, seed, API, base de datos, deploy, commit ni push.

**Fuente primaria de todas las decisiones de §1:** confirmación textual del Owner en la sesión de Claude Code del 2026-09-30, repositorio `OtraRondaMas` (transcripción de sesión `38a50095-f8b5-4d6a-999b-f5830df6e7d7`). Cada texto se propuso y el Owner respondió "sí" / "ok" / "A". Los textos de abajo son los confirmados, sin ampliación.
**Limitación explícita:** las decisiones B–F no tenían ruling primario previo (búsqueda en `04-DECISIONS/`, Registro y transcripciones locales: ninguna fuente). Los rótulos B2/C1/D1/E2/F1 de `10-AUDIT/13` y `14` **no** se ratifican por sí mismos; solo valen los textos confirmados aquí.

## 1. Decisions confirmed

| ID | Decisión del Owner (texto confirmado) | Status | Fecha | Implementación |
|---|---|---|---|---|
| OR-002-B | La transición de identidad se realiza de forma incremental, con coexistencia temporal y acotada de ambos modelos, compatible con OR-001 P2-C. No se establece una coexistencia prolongada ni permanente. | OWNER-RULED | 2026-09-30 | NOT AUTHORIZED |
| OR-002-C | `User` es una identidad global con email único a nivel global. | OWNER-RULED | 2026-09-30 | NOT AUTHORIZED |
| OR-002-D | `Usuario` pasa a `User` más `Membership`, y `Cliente` pasa a `Customer`, manteniendo `Customer` independiente de `User` con vínculo opcional (OR-002-A). | OWNER-RULED | 2026-09-30 | NOT AUTHORIZED |
| OR-002-E | Durante la transición existe compatibilidad temporal de sesiones y tokens legacy, respetando la continuidad de Auth de OR-001 P3. Al finalizar la transición se invalidan las sesiones y se requiere un nuevo login. | OWNER-RULED | 2026-09-30 | NOT AUTHORIZED |
| OR-002-F | Para OR-002 rige `especificación técnica → aprobación del Owner → implementación`, igual que OR-001 P5-B. | OWNER-RULED | 2026-09-30 | NOT APPLICABLE (es régimen) |
| OR-002-F (autorización) | **NOT AUTHORIZED.** No hay autorización para modificar schema, Prisma, migraciones, código ni datos hasta que el Owner apruebe explícitamente una versión concreta de la especificación técnica, identificada por documento y fecha. Owner: "no implementar hasta terminar spec técnicos". | OWNER-RULED | 2026-09-30 | NOT AUTHORIZED |
| R2.2 P1-A | `Empresa` → `Business` aplica tanto a la terminología documental y conceptual como al modelo persistente, como destino final de la transformación (opción C). | OWNER-RULED | 2026-09-30 | NOT AUTHORIZED |
| R2.3 P5-B | Para la transformación `Empresa` → `Business` rige `ESPECIFICACIÓN → APROBACIÓN → IMPLEMENTACIÓN`. | OWNER-RULED | 2026-09-30 | NOT AUTHORIZED |
| R2.4 CON-010 / ISS-07 | OR-002-A es la resolución normativa posterior de CON-010. Estado canónico actual: `RESOLVED` en dirección conceptual (D-002 + D-002-bis + OR-002-A). La implementación sigue OPEN. Las referencias históricas OPEN se conservan como evidencia y no se borran. | OWNER-RULED | 2026-09-30 | NOT APPLICABLE |
| R2.5 ISS-08 | Precedencia (mayor a menor): 1 Owner Ruling primario; 2 Decision Register; 3 SPEC canónica; 4 TO-BE y derivados; 5 Audit (solo evidencia, no crea decisiones); 6 Workshop y preparation (no normativos); 7 Documentación histórica (solo evidencia). Entre dos rulings del Owner prevalece el posterior. Un documento posterior que use una decisión no prueba su aprobación. Las contradicciones no se resuelven en silencio: se registran como conflicto. | OWNER-RULED | 2026-09-30 | NOT APPLICABLE |
| R2.6 Re-login / invalidación | Resuelto por OR-002-E: existe ruling desde 2026-09-30 (invalidación de sesiones y nuevo login al finalizar la transición). No es anterior a esa fecha. | OWNER-RULED (vía OR-002-E) | 2026-09-30 | NOT AUTHORIZED |
| R2.7 D-003 / WhatsApp | Opción A: Wapsell Messaging MVP no depende de WhatsApp. | OWNER-RULED | 2026-09-30 | NOT AUTHORIZED |

## 2. Decisions not confirmed

Ninguna de las 12 preguntas quedó sin respuesta. No se solicitó ni confirmó ninguna de estas, por lo que permanecen como estaban:

- **D1 "mismo email normalizado = misma persona"** (`10-AUDIT/13`): **no confirmado**. OR-002-D no lo incluye. OPEN.
- **F1 "implementación autorizada"** (`10-AUDIT/13`): **no confirmado**; reemplazado por NOT AUTHORIZED.
- **B2 "sin coexistencia prolongada"** tal cual: reformulado como coexistencia temporal y acotada.
- D-005, OR-003, OR-005, D-006, D-008, D-011, D-013, D-015, D-016, D-017: no consultados en R2, siguen OPEN.

## 3. Primary authority (matriz de fuentes)

| Decisión | Fuente con autoridad |
|---|---|
| OR-001 (P1-A…P5-B) | `13-OR-001-OWNER-RULING-CLOSURE.md` (2026-09-28); P1-A alcance: este reporte |
| OR-002-A, CON-010 conceptual | `15-OR-002-A-OWNER-RULING.md` (2026-09-28); D-002, D-002-bis |
| OR-002-B, C, D, E, F; autorización; P5-B; CON-010 canónico; ISS-08; re-login; D-003 WhatsApp | Este reporte (Owner, 2026-09-30) |
| `10-AUDIT/13`, `14`, `14`/`16` preparation | Evidencia / preparatorio; no autoridad (regla R2.5 #5-#6) |

## 4. Implementation authorization status

**IMPLEMENTATION NOT AUTHORIZED**, para todo: OR-001 (D-001 IMPL = `SPECIFICATION REQUIRED`), OR-002-A a F, P1-A, D-003. La autorización requiere la aprobación explícita de una versión concreta de la spec técnica (documento + fecha). Las specs existentes están en borrador: `10-AUDIT/13` (preparada para revisión), `10-AUDIT/14` (DRAFT), `06-TRANSFORMATION/01,02,03,08` (PROPOSAL NOT APPROVED); gates G5, G7, G8, G9 abiertos. Deben revalidarse contra los textos de §1.

## 5. Remaining open details

- OR-001/P1-A: tablas, columnas, FK, índices, constraints, compatibilidad, coexistencia, migración, rollback, deploy, cutover, fin de coexistencia.
- OR-002-B: mecanismo técnico, duración, criterio de fin.
- OR-002-C: normalización de email, tratamiento de duplicados, constraint física.
- OR-002-D: criterio para vincular Customer existente con User; destino de las filas existentes; lifecycle de Customer.
- OR-002-E: diseño del token, formato, duración de la compatibilidad, momento del corte (OR-005).
- OR-002-F: cuándo y sobre qué versión se aprueba la spec.
- D-003: integraciones futuras y proveedores externos; modelo Conversation/Message y demás `IMPLEMENTATION DETAIL`.

## 6. Conflicts resolved

- **B–F sin ruling primario vs `10-AUDIT/13`/`14` "decididos"**: resuelto por los textos de §1; los rótulos del audit no se ratifican más allá de ellos.
- **B2 "sin coexistencia prolongada" vs P2-C "convivencia temporal"**: resuelto por el texto de OR-002-B (coexistencia temporal y acotada).
- **P1-A físico vs conceptual**: resuelto, opción C.
- **Origen del "OWNER RULING" de re-login (`06/02` §2 y §10)**: respaldado desde 2026-09-30 por OR-002-E.
- **ISS-08**: se fija regla de precedencia (§1). No aprueba por sí mismo los 7 documentos de `00-GOVERNANCE`, que siguen `PROPOSED`.
- **D-003 WhatsApp pendiente vs TO-BE lo afirma sin pendiente**: resuelto en contenido (opción A); el estado pendiente del Registro se actualiza en R3.
- **Regla P5-B en OR-001 vs F1 "implementación autorizada"**: resuelto; NOT AUTHORIZED.

## 7. Conflicts preserved

- **CON-010 (ISS-07)**: el estado histórico `OPEN` se conserva como evidencia en todos los documentos; no se editan hasta R3.
- CON-008 (`"Roonda"`): OR-001 P4 decide corregir; el cambio de estado de CON-008/TD-002 no fue consultado en R2. OPEN.
- Fin de la coexistencia: sigue OPEN, salvo que OR-002-B fija que es temporal y acotada.

## 8. Documents requiring propagation (R3)

`04-DECISIONS/00-DECISION-REGISTER.md` (D-001 IMPL; entradas OR-002-B…F; D-003 §4.3.2; ISS-07/08), `10-OPEN-DECISIONS.md`, `12-ARCHITECTURAL-DECISION-CLOSURE.md` §13/§14; `03-CONFLICTS/00`, `10`; `07-TOBE/00`, `01`, `02`, `05`; `02-CANONICAL-SPEC/01`, `02`, `04-MESSAGING-SPEC`; `06-TRANSFORMATION/*`; `08-TRACEABILITY/*`; `08-CONTRACTS/05`; `09-INVARIANTS`; `10-ARCHITECTURE`; `11-PLAN`; `12-TASKS`; anotación aditiva de `10-AUDIT/13`, `14` (sin borrar). Orden posterior indicado por el Owner: Contracts → Invariants → Tests/Evals → Architecture → Plan → Tasks → Implementation readiness.

## 9. Documents requiring Owner approval

- Modificación del Registro canónico (`00-DECISION-REGISTER.md`): el Owner debe revisar y validar este reporte antes de R3.
- Los 7 documentos de `00-GOVERNANCE` (`PROPOSED`).
- La especificación técnica de OR-001/OR-002 (aprobación por versión).
- Estado de CON-008/TD-002 tras P4.

## 10. Explicit blockers

1. Especificación técnica de migración sin aprobar y con G5, G7, G8, G9 abiertos.
2. Revalidación de `10-AUDIT/13` y `14` contra los textos de §1 (D1 y F1).
3. Revisión y validación de este reporte por el Owner antes de R3.
4. Decisiones no consultadas: D-005, OR-003, OR-005, D-006, D-008, D-011, D-013, D-015, D-016, D-017.

## 11. Result matrix

| Elemento | Clasificación |
|---|---|
| OR-001 | OWNER-RULED (`13`) |
| OR-002-A | OWNER-RULED (`15`) |
| OR-002-B, C, D, E | OWNER-RULED (este reporte, 2026-09-30) |
| OR-002-F (régimen) | OWNER-RULED (este reporte) |
| Autorización de implementar, cualquier parte | IMPLEMENTATION NOT AUTHORIZED |
| P1-A alcance | OWNER-RULED (opción C); detalles físicos OPEN |
| P5-B | OWNER-RULED (regla canónica) |
| CON-010 estado canónico | OWNER-RULED (`RESOLVED` conceptual); históricos preservados |
| ISS-08 regla de precedencia | OWNER-RULED; aprobación de los 7 docs de gobernanza: OWNER APPROVAL REQUIRED |
| Re-login / invalidación | OWNER-RULED (vía OR-002-E) |
| D-003 WhatsApp | OWNER-RULED (opción A) |
| D1 "mismo email = misma persona" | OPEN |
| F1 "implementación autorizada" | NOT AUTHORIZED |
| Especificación técnica | OWNER APPROVAL REQUIRED / BLOQUEADO |
| D-005, OR-003, OR-005, D-006, D-008, D-011, D-013, D-015, D-016, D-017 | OPEN |
