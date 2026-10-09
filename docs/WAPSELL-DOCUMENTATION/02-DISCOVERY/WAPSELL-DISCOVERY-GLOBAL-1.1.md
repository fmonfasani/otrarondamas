# WAPSELL — DISCOVERY GLOBAL 1.1
## Manual oficial de procedimiento para Discovery global

| Campo | Valor |
|---|---|
| Versión | 1.1 |
| Estado | **OFICIAL — GUÍA VIGENTE DE PROCEDIMIENTO** |
| Fecha de referencia | 2026-10-09 |
| Baseline histórico | WAPSELL — STEP 1 — DISCOVERY GLOBAL; preservar la versión histórica |
| Ubicación | `docs/WAPSELL-DOCUMENTATION/02-DISCOVERY/` |
| Restricción | Discovery read-only; no autoriza implementación |

**Autoridad:** por instrucción expresa del Owner, esta versión 1.1 es la guía oficial a utilizar en adelante para las tareas de Wapsell. Esta designación establece el procedimiento vigente, pero no autoriza implementación ni resuelve automáticamente las contradicciones documentales que se registran en este manual.

## 0. Regla de uso y autoridad

- Antes de cualquier tarea Wapsell, recuperar el último checkpoint y consultar esta guía, la gobernanza documental aplicable, las decisiones relevantes, las SPEC y los artefactos de evidencia.
- Si no puede verificarse la versión vigente o la autoridad de una fuente, declarar la limitación. No reconstruir directivas de memoria ni asumir autoridad sin fundamento.
- Discovery es un procedimiento de comprensión y preparación. No autoriza cambios de código, tests, schema, datos, arquitectura, commits, pushes, despliegues ni aprobación de Gate.
- No asumir que un documento está aprobado por el solo hecho de existir o de estar en GitHub.
- No reconciliar contradicciones en silencio. Registrar las fuentes, las afirmaciones incompatibles, el impacto y la autoridad requerida; detener el trabajo dependiente cuando corresponda.

## 1. Objetivo

Obtener un mapa verificable del sistema Wapsell —con Otra Ronda Más como primer Business/tenant— para determinar qué Foundations y Capabilities están listas, cuáles pueden avanzar en paralelo y cuáles están bloqueadas por dependencias, contratos, invariants, decisiones o evidencia insuficiente.

## 2. Alcance y restricciones

### 2.1 Dentro de alcance

- Inspeccionar documentos normativos e históricos, decisiones, SPEC, arquitectura, contracts/invariants, tests/evals, código, configuración CI y reportes.
- Construir mapas AS-IS, TRANSITION y TO-BE; identificar dependencias, consumidores, áreas protegidas, brechas, riesgos y critical path.
- Clasificar contradicciones, preguntas abiertas, dependencias descubiertas, deuda técnica, blockers y decisiones requeridas.
- Recomendar Foundation Streams y Capability Streams sin autorizar su implementación.
- Generar evidencia reproducible y un checkpoint que permita continuar sin redescubrir trabajo verificado.

### 2.2 Fuera de alcance

- Implementar o corregir código, tests, configuración o infraestructura.
- Modificar Prisma/schema, migrations, indexes, constraints, seed contracts o datos persistidos.
- Crear adapters, refactors o arquitectura nueva.
- Cambiar requirements, SPEC, contracts, invariants, scope o decisiones aprobadas por inferencia.
- Ejecutar commit, push, merge, deploy, reset, rebase, borrado de ramas o cambios destructivos, salvo autorización explícita separada.
- Declarar una slice CLOSED, aprobar Gate o convertir un reporte de agente en evidencia verificada.

## 3. Terminología canónica

- **Wapsell / Platform-Core:** plataforma SaaS; no confundir con un tenant.
- **Business / Tenant:** unidad de negocio y frontera de aislamiento.
- **Brand:** identidad comercial/visual del Business.
- **User:** identidad global.
- **Membership:** relación User ↔ Business; roles, permisos y estado contextualizados al Business.
- **BusinessContext:** mecanismo canónico para resolver contexto de negocio; no crear mecanismos paralelos.
- **Authorization:** autorización contextual al Business, conforme a contratos vigentes.
- **AS-IS:** estado existente observado y sustentado por evidencia.
- **TRANSITION:** coexistencia temporal y migración entre mecanismos legacy y objetivo.
- **TO-BE:** estado objetivo respaldado por autoridad documental; no se infiere solo del código.
- **Foundation Stream:** trabajo sobre una foundation compartida que habilita consumidores.
- **Capability Stream:** trabajo acotado sobre una capacidad de negocio.
- **Gate:** decisión formal PASS / BLOCKED / NEEDS DECISION; no equivale a test, build o CI.
- **Fulfillment:** ejecución física de una operación comercial; el detalle aprobado debe verificarse en la decisión/SPEC correspondiente.

Conservar nombres legacy cuando sean contratos, claims JWT, claves de permisos, campos/modelos persistidos, rutas o integraciones externas. No hacer renombrados masivos por uniformidad lingüística.

## 4. Source of Truth y resolución de contradicciones

Se registra el siguiente conflicto documental sin resolverlo por inferencia:

- Jerarquía de trabajo: Requirements → Decisions → SPEC → Contracts/Invariants → Architecture → Tests/Evals → Code AS-IS → Reports/Logs.
- Jerarquía citada por `docs/WAPSELL-DOCUMENTATION/00-GOVERNANCE/01-SOURCE-OF-TRUTH.md` bajo ISS-08 / OR-B2-023: OWNER RULING > DECISION REGISTER > CANONICAL SPEC > TO-BE > AUDIT > WORKSHOP/PREPARATION > HISTORICAL.
- La gobernanza citada deja abierta la ubicación exacta de Requirements, Specialized Specs, Contracts y AS-IS.

**Clasificación:** NEEDS DECISION / DOCUMENTARY CONFLICT. No elegir silenciosamente una jerarquía ni alterar el documento de gobernanza. La designación de esta guía como procedimiento oficial no resuelve este conflicto de precedencia.

Procedimiento ante contradicciones:

1. Registrar documentos, versiones, secciones, fechas/SHAs y afirmaciones incompatibles.
2. Identificar decisión, contrato, invariant o slice afectada y el trabajo que depende de la resolución.
3. Clasificar: CONTRADICTION, OPEN QUESTION, DISCOVERED DEPENDENCY, TECHNICAL DEBT, BLOCKER o NEEDS DECISION.
4. No modificar SPEC ni código para hacer coincidir las fuentes sin decisión autorizada.

## 5. Procedimiento de ejecución

1. **Preparar contexto y checkpoint:** recuperar lo completado/pendiente, decisiones, PR/branch/HEAD y siguiente paso. No reiniciar trabajo verificado.
2. **Fijar baseline:** registrar repositorio, rama/ref, SHA exacto, fecha/hora, entorno y limitaciones. Si no es verificable, marcar NOT DETERMINABLE.
3. **Revisar fuentes normativas:** Owner Rulings/decisiones aplicables, Decision Register, Requirements, SPEC General y especializadas, contracts/invariants y arquitectura según autoridad aprobada. Identificar documentos PROPOSED/DRAFT.
4. **Inspeccionar AS-IS:** revisar implementación, dependencias, módulos, APIs, persistencia y tests. El código describe AS-IS; no modifica implícitamente la SPEC.
5. **Mapear Foundations:** propósito, AS-IS, TRANSITION, TO-BE, fuente, contratos, invariants, dependencias, consumidores, áreas protegidas, estado, evidencia, gaps y blockers.
6. **Mapear Capabilities:** objetivo, implementación, dependencias, consumidores, contratos/invariants, tests, CI, áreas protegidas, transición, estado y brechas.
7. **Construir matrices:** Capability × Dimension, Foundation × Capability y Capability × Evidence. No inventar porcentajes; usar NOT DETERMINABLE si falta evidencia.
8. **Construir el grafo real de dependencias y critical path:** documentar Depends On, Consumed By, dependencias bloqueantes, foundations/contracts/data compartidos e integración/schema.
9. **Evaluar paralelización:** clasificar READY FOR PARALLEL EXECUTION, SEQUENTIAL, BLOCKED o NEEDS DECISION. Evitar trabajo concurrente conflictivo sobre una misma foundation/contrato.
10. **Recomendar orden y streams:** justificar dependencias y condiciones de desbloqueo. No implementar ni ampliar scope.
11. **Validar criterios de salida:** revisar trazabilidad y clasificación de evidencia; registrar limitaciones y riesgos.
12. **Emitir checkpoint:** estado, trabajo completado/pendiente, archivos, SHA, pruebas/resultados, errores, decisiones, blockers y siguiente paso exacto.

## 6. Foundation Map

Investigar sin asumir que existen correctamente: Platform/Core; Business/Tenancy; BusinessContext; Global Identity; Membership; Authorization; External Identity; Brand; API/Contracts; Data/Persistence; Verification/Quality.

Por foundation registrar propósito, AS-IS, fuente canónica, contracts, invariants, dependencias, consumidores, TRANSITION, TO-BE, protected areas, estado, evidencia, gaps, blockers y confidence.

## 7. Capability Map

Investigar según evidencia: Customer, Catalog, Store, Cart, Orders, Sales, Stock/Inventory, Purchases, Suppliers, Cash, Loyalty, Deliveries/Fulfillment, Messaging, Promotions y Reporting. La lista es un punto de partida, no un catálogo normativo cerrado.

Por capability registrar objetivo, AS-IS, TRANSITION, TO-BE, implementación, dependencias, consumidores, protected areas, contracts/invariants, tests, CI, estado y gaps.

## 8. Dimension Matrix

Evaluar, cuando aplique: Tenancy; Identity; BusinessContext; Authorization; Domain Logic; Persistence/Data; API/Contracts; Integration; Security; Verification; Compatibility/Transition; Observability/Operations; UX/Experience.

Estados: 100%/GREEN, 75%, 50%/YELLOW, 25%, 0%/RED, N/A y NOT DETERMINABLE. Todo porcentaje requiere criterio reproducible y evidencia.

## 9. AS-IS → TRANSITION → TO-BE

- **AS-IS** describe comportamiento existente con evidencia de código, tests o ejecución y SHA/ref.
- **TRANSITION** identifica mecanismos legacy, adapters, fallbacks, coexistencia, compatibilidad, migración y puntos no resueltos.
- **TO-BE** cita definición aprobada; si no existe, registrar NEEDS DECISION.
- Una capability no está migrada solo porque exista código objetivo: requiere contratos, invariants, coexistencia resuelta, evidencia, revisión y Gate.

## 10. Dependency Graph y Critical Path

Por capability registrar Depends On, Consumed By, Blocking Dependencies, Shared Foundations, Shared Contracts, Shared Data e Integration Dependencies. Clasificar READY, BLOCKED, PARTIAL, DISCOVERED DEPENDENCY, TECHNICAL DEBT y NEEDS DECISION.

Evaluar critical path mediante centralidad de dependencias, cantidad de consumidores downstream, importancia arquitectónica, impacto bloqueante, readiness y riesgo. Documentar el razonamiento.

## 11. Parallelization Analysis

Por stream registrar ID, objetivo/capability, dependencias, foundations compartidas, condiciones de bloqueo, si puede iniciar y por qué, conflictos y protected areas. Clasificar READY FOR PARALLEL EXECUTION, SEQUENTIAL, BLOCKED o NEEDS DECISION.

## 12. Evidence Policy

- **VERIFIED BY CODE:** código inspeccionado; archivo/sección y SHA/ref.
- **VERIFIED BY TEST:** test identificado ejecutado; comando/artefacto, scope y resultado.
- **VERIFIED BY EXECUTION:** comportamiento observado; entorno, pasos y límites.
- **VERIFIED BY CI:** workflow/run, commit SHA y job identificados.
- **DOCUMENTED:** la fuente expresa el claim; no prueba por sí sola implementación.
- **AGENT REPORTED:** reporte de agente sin verificación independiente disponible.
- **NOT DETERMINABLE:** la evidencia accesible no permite concluir.

Reglas: Local test ≠ CI. Build PASS ≠ functional correctness. Typecheck PASS ≠ runtime correctness. Runtime PASS ≠ proof of tenant isolation. NOT RUN / NOT DETERMINABLE ≠ PASS.

## 13. Blockers, dependencies, debt y decisiones

- **BLOCKER:** impide avanzar en el trabajo afectado.
- **DISCOVERED DEPENDENCY:** dependencia descubierta; evaluar si bloquea la tarea actual.
- **TECHNICAL DEBT:** problema conocido que no bloquea necesariamente el trabajo actual.
- **OPEN QUESTION:** pregunta sin respuesta suficiente.
- **NEEDS DECISION:** requiere decisión formal.
- **CONTRADICTION:** fuentes incompatibles que no pueden reconciliarse sin autoridad/evidencia adicional.

No resolver automáticamente estos casos. No implementar dependencias fuera de scope. Reportar impacto y siguiente paso.

## 14. Current Roadmap Position

Ubicar proyecto/capability en Discovery, Specification, Foundation, Capability Transformation, Integration, Validation, Review, Gate o Closed. Sustentar estado con evidencia actual y SHA; no reutilizar snapshots antiguos como estado vigente.

## 15. Output contract

Todo Discovery global debe emitir:

1. Executive Summary y baseline.
2. Fuentes revisadas y estado/autoridad.
3. Foundation Map y Capability Map.
4. Dimension Matrix.
5. AS-IS → TRANSITION → TO-BE Matrix.
6. Foundation × Capability Matrix.
7. Dependency Graph y Critical Path.
8. Parallelization Analysis.
9. Evidence Matrix.
10. Blockers, Discovered Dependencies y Technical Debt.
11. Open Questions, Needs Decision y Contradictions.
12. Recommended Foundation Streams y Capability Streams.
13. Proposed Execution Order, riesgos y protected areas.
14. Evidence Classification, conclusión y siguiente paso.
15. Checkpoint de continuidad.

## 16. Exit Criteria

- Foundations y capabilities identificadas con alcance y límites.
- AS-IS documentado; TRANSITION y TO-BE distinguidos sin inferencias no autorizadas.
- Dependencias, critical path y paralelización justificados.
- Blockers, contradicciones, dependencias, deuda y decisiones pendientes clasificados.
- Toda conclusión relevante incluye tipo de evidencia, fuente, archivo/sección, SHA cuando corresponda, confianza y limitaciones.
- No se realizaron cambios durante Discovery.
- Se emitió checkpoint con el siguiente paso exacto.
- Los conflictos de autoridad que afecten el trabajo están resueltos o expresamente bloquean el trabajo dependiente.

## 17. Handoff / continuidad

Al pausar, guardar objetivo/scope; estado; completado/pendiente; repositorio, rama/ref y SHA; archivos inspeccionados; comandos/tests y resultados; errores; decisiones; blockers; protected areas y próximo paso exacto. Al reanudar, verificar checkpoint y estado actual.

## 18. Relación con el SDD

Discovery es una etapa de comprensión/readiness y no reemplaza ni salta la secuencia aplicable:

REQUIREMENTS → SPEC → SPECIALIZED SPECS → ARCHITECTURE → CONTRACTS → INVARIANTS → TESTS/EVALS → PLAN → TASKS → IMPLEMENTATION → VALIDATION → REVIEW → GATE → DELIVERY.

La secuencia y jerarquía documental deben reconciliarse formalmente antes de utilizarlas para resolver conflictos de precedencia.

## 19. Historial de revisión

| Versión | Cambio | Estado |
|---|---|---|
| 1.0 | WAPSELL — STEP 1 — DISCOVERY GLOBAL; documento histórico que debe preservarse. | Histórico; versión canónica exacta a verificar |
| 1.1 | Claridad del manual, glosario, separación de estados/evidencia/Gate, contradicciones, baseline dinámico, outputs y checkpoint. | Oficial por instrucción expresa del Owner |

## 20. Issues registrados

- **NEEDS DECISION:** reconciliar la jerarquía de precedencia usada en las directivas con OWNER RULING > DECISION REGISTER > CANONICAL SPEC > TO-BE > AUDIT > WORKSHOP/PREPARATION > HISTORICAL, citada por `00-GOVERNANCE/01-SOURCE-OF-TRUTH.md` como ISS-08 / OR-B2-023.
- **NEEDS DECISION:** resolver la ubicación exacta de Requirements, Specialized Specs, Contracts y AS-IS dentro de la jerarquía; el documento de gobernanza declara esta cuestión abierta.
- **NEEDS VERIFICATION:** localizar el artefacto exacto de Discovery 1.0 en el repositorio. La carpeta `02-DISCOVERY` inspeccionada contiene CONFLICTS y DECISION-WORKSHOP; no se ha verificado allí el manual histórico.
- **Restricción:** esta guía no autoriza implementación, cambios destructivos ni aprobación de Gate. La designación como guía oficial no altera esas restricciones.

---
**Fin de WAPSELL — DISCOVERY GLOBAL 1.1 — GUÍA OFICIAL DE PROCEDIMIENTO**
