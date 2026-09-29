# D-009 — ¿Cómo se garantizará la adherencia al proceso de aprobación de características para evitar la implementación de funcionalidades no aprobadas (como se observó en CON-018)?

Status: APPROVED — DERIVED / RECONSTRUCTED (see Post-Workshop Decision Reconciliation)
Criticality: MEDIUM

Domain: Governance, Sales, Quality

Related conflicts: CON-018 (Incumplimiento del Proceso: Implementación de Características de Ventas Pendientes de Aprobación (CON-006))

## Decision Question
Define un proceso robusto y mecanismos de cumplimiento para garantizar la adherencia estricta a la aprobación de características antes de su implementación. Esto debe prevenir escenarios donde las funcionalidades son codificadas y desplegadas a pesar de que sus decisiones o especificaciones asociadas estén marcadas como "Pendientes" o no aprobadas, tal como se documentó en CON-018.

## AS-IS Evidence
- `05-ASIS/11-ASIS-QUALITY.md`: "`spec-modulos_ventas.md` §1 declara "nada de esta SPEC se implementa sin aprobación de la sección 14"; su propia sección 14 marca **todas** las decisiones D-VTA como "Pendiente" — pero los commits de los incrementos Inc-1..4 de Ventas ya implementan comportamiento correspondiente a varias de esas decisiones..." (DOCUMENTED - CON-006 de SRC-011).

## Why This Decision Exists
El AS-IS demuestra una ruptura en el proceso de desarrollo donde las características para el módulo de Ventas se implementaron a pesar de la documentación explícita que exigía aprobación previa (CON-018). Esto es un **PROCESS_CONFLICT / STATUS_CONFLICT** que indica un problema de gobernanza. Se necesita una decisión clara para reforzar la adherencia al proceso y evitar que funcionalidades no aprobadas entren en el sistema.

## Alternatives
- **Implementar puertas de revisión/aprobación de código obligatorias:** Requerir un "sign-off" explícito en las ramas de características antes de fusionar a main, vinculado a aprobaciones documentadas. (ALTERNATIVES NOT DOCUMENTED, inferido)
- **Verificaciones automatizadas en el pipeline CI/CD:** Integrar verificaciones para asegurar que las características implementadas tengan documentación/decisiones aprobadas correspondientes. (ALTERNATIVES NOT DOCUMENTED, inferido)
- **Auditorías periódicas de implementación vs. especificaciones aprobadas:** Revisiones periódicas para identificar y abordar discrepancias. (ALTERNATIVES NOT DOCUMENTED, inferido)

## Consequences Known From Sources
- **DOCUMENTED (CON-018):** "Indica una falla en la adherencia al proceso de desarrollo, lo que podría llevar a la implementación de funcionalidades no aprobadas o inestables."
- **INFERRED:** Mayor control sobre la evolución del producto, reducción del riesgo de retrabajo, mayor transparencia y responsabilidad en el desarrollo.

## Dependencies
- Blocks: NONE
- Depends On: NONE

## Affected Documents
- `05-ASIS/11-ASIS-QUALITY.md`
- `03-CONFLICTS/00-CONFLICT-REGISTER.md` (CON-018)
- `SRC-007` (spec-modulos_ventas.md)
- Documentación de gobernanza y proceso de desarrollo del proyecto.
- Configuración del pipeline CI/CD (si se elige la automatización).

## Implementation Impact
- Cambios en el flujo de trabajo de desarrollo (e.g., políticas de pull request, definición de "terminado").
- Potencial integración de herramientas de gestión de proyectos con plataformas de desarrollo.
- Capacitación para los equipos de desarrollo sobre la adherencia a nuevos procesos.

## Open Questions
- ¿Quién es el responsable de aprobar las características?
- ¿Qué nivel de documentación se requiere para la aprobación?
- ¿Cómo se medirá y reportará el cumplimiento?

## Decision: PENDING
## Approval: PENDING

---

## POST-WORKSHOP DECISION RECONCILIATION (2026-09-28)

> Everything above this line is the **historical workshop record**, preserved verbatim. The
> original `Status: PENDING` / `## Decision: PENDING` / `## Approval: PENDING` markers were
> the document state as produced in Phase 3.5. They are retained as history, not as current state.

**Owner confirmation:** the Owner confirms this decision was APPROVED during the Decision Workshop.

**Repository evidence of decision text:** none, beyond what DEC-001 provides (below).
### Reconstructable decision text
**NOT DETERMINABLE.** RECONSTRUCTED TEXT NOW EXISTS - see 04-DECISIONS/00-DECISION-REGISTER.md section 4 (provenance: DERIVED / RECONSTRUCTED, not Owner-verified). DEC-001 does not address it. The question, AS-IS evidence, alternatives and Open Questions above are preserved verbatim as the historical workshop record and remain unresolved.

### Reconciled status

| Field | Value |
|---|---|
| ID | `D-009` |
| Status | **APPROVED — DERIVED / RECONSTRUCTED** |
| Owner | fmonfasani (attribution per `03-CONFLICTS/07-DECISION-REGISTER.md`; no signed approval record found) |
| Date | **NOT DOCUMENTED** (DEC-001's 2026-09-25 is DEC-001's date, not this decision's) |
| Canonical register | `04-DECISIONS/00-DECISION-REGISTER.md` |
| Conflict | See `03-CONFLICTS/00-CONFLICT-REGISTER.md` |
| Implementation detail | **OPEN** -- an APPROVED decision does not define its implementation |

**This ficha must not be cited as normative authority until its decision text is reconstructed.**

---