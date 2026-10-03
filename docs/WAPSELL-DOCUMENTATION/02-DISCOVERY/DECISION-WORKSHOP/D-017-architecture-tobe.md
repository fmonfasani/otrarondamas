# D-017 — ¿Cuál es la arquitectura TO-BE para Wapsell (por ejemplo, el uso de Kubernetes, GraphQL, colas de mensajes, y características de seguridad como 2FA/PCI DSS)?

Status: APPROVED — DERIVED / RECONSTRUCTED (see Post-Workshop Decision Reconciliation)
Criticality: BLOCKING

Domain: Architecture, Platform, Security

Related conflicts: CON-002 (Arquitectura técnica: stack simple ya decidido vs. stack enterprise propuesto), CON-026 (Arquitectura de Stack: Simple (AS-IS) vs. Enterprise-Grade (SRC-018 Propuesta))

## Decision Question
Define la arquitectura TO-BE objetivo para la plataforma Wapsell. Esto incluye tomar decisiones explícitas sobre componentes y patrones arquitectónicos centrales, como la adopción de orquestación de contenedores (e.g., Kubernetes), tecnologías de API (e.g., GraphQL), comunicación entre servicios (e.g., colas de mensajes), y características de seguridad críticas (e.g., 2FA, cumplimiento PCI DSS, ELK Stack para observabilidad).

## AS-IS Evidence
- `05-ASIS/02-ASIS-ARCHITECTURE.md`: "Stack real: NestJS 10, Prisma 5.22, PostgreSQL... React 18.2, Vite 4.4... **sin lerna/nx/turborepo**. No hay gRPC, colas de mensajes, WebSocket ni comunicación server-to-server entre las apps." (VERIFIED BY CODE). "Este stack **coincide** con lo que SRC-003 (prompt de scaffolding) fijó como decisión." (DOCUMENTED)
- `05-ASIS/02-ASIS-ARCHITECTURE.md`: "Confirma además que SRC-018 (System Design v2.0, que propone Kubernetes/GraphQL/2FA/PCI DSS) describe algo que **no existe** en el código real (ver CON-002 en `03-CONFLICTS`)." (DOCUMENTED)

## Why This Decision Exists
El AS-IS tiene un stack técnico relativamente simple. Sin embargo, existe una propuesta documentada (`SRC-018`) para una arquitectura de nivel empresarial que no está implementada (CON-002, CON-026). Esto representa una **PROPOSAL + MISSING_DECISION (ARCHITECTURE_CONFLICT)** que es bloqueante para la escalabilidad, resiliencia y seguridad de la plataforma. Se requiere una visión arquitectónica clara para el TO-BE.

## Alternatives
- **Evolucionar el AS-IS incrementalmente:** Introducir gradualmente nuevas tecnologías (e.g., colas de mensajes) según sea necesario, sin una revisión completa de la plataforma. (ALTERNATIVES NOT DOCUMENTED, inferido)
- **Adoptar SRC-018 completamente:** Implementar la arquitectura propuesta de nivel empresarial. (PROPOSAL - SRC-018)
- **Enfoque híbrido:** Adoptar selectivamente elementos de SRC-018 manteniendo partes del stack actual. (ALTERNATIVES NOT DOCUMENTED, inferido)

## Consequences Known From Sources
- **DOCUMENTED (CON-026):** "Diferencia fundamental en la visión arquitectónica, impactando la escalabilidad, resiliencia, seguridad y complejidad operativa. Bloqueante para el diseño futuro."
- **INFERRED:** Esfuerzo de desarrollo significativo para cambios arquitectónicos, necesidad potencial de nueva infraestructura y experiencia operativa, mejora de las características no funcionales (escalabilidad, seguridad).

## Dependencies
- Blocks: D-018 (DIRECT)
- Depends On: D-001 (INDIRECT), D-002 (INDIRECT), D-003 (INDIRECT)

## Affected Documents
- `05-ASIS/02-ASIS-ARCHITECTURE.md`
- `02-CANONICAL-SPEC/00-WAPSELL-SPEC-GENERAL.md` (Sección 11. Plataforma y Gobernanza)
- `02-CANONICAL-SPEC/05-PLATFORM-AND-GOVERNANCE-SPEC.md`
- `03-CONFLICTS/00-CONFLICT-REGISTER.md` (CON-002, CON-026)
- `SRC-018` (System Design v2.0 - propuesta)
- Todas las aplicaciones backend, configuración de infraestructura (`docker-compose*`), scripts de despliegue.

## Implementation Impact
- Grandes cambios en la configuración de la infraestructura (e.g., manifiestos de Kubernetes, configuraciones de la nube).
- Refactorización de los patrones de comunicación entre servicios.
- Potencial para nuevas capas de API (e.g., servidor GraphQL).
- Implementación de nuevas características de seguridad en toda la plataforma.

## Open Questions
- ¿Cuáles son los requisitos no funcionales (e.g., objetivos de rendimiento, escalabilidad, resiliencia) que impulsan la elección arquitectónica?
- ¿Cuál es el proveedor de nube o el entorno de despliegue deseado?
- ¿Cuál es la estrategia de migración para las aplicaciones existentes a la nueva arquitectura?

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
| ID | `D-017` |
| Status | **APPROVED — DERIVED / RECONSTRUCTED** |
| Owner | fmonfasani (attribution per `03-CONFLICTS/07-DECISION-REGISTER.md`; no signed approval record found) |
| Date | **NOT DOCUMENTED** (DEC-001's 2026-09-25 is DEC-001's date, not this decision's) |
| Canonical register | `04-DECISIONS/00-DECISION-REGISTER.md` |
| Conflict | See `03-CONFLICTS/00-CONFLICT-REGISTER.md` |
| Implementation detail | **OPEN** -- an APPROVED decision does not define its implementation |

**This ficha must not be cited as normative authority until its decision text is reconstructed.**

---