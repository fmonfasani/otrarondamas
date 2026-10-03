# D-018 — Definir la estrategia y el roadmap para implementar CI/CD para la plataforma Wapsell, incluyendo automatización de pruebas, construcción, despliegue y procesos de liberación.

Status: APPROVED — DERIVED / RECONSTRUCTED (see Post-Workshop Decision Reconciliation)
Criticality: HIGH

Domain: DevOps/Deployment, Quality, Platform

Related conflicts: CON-027 (Ausencia de CI/CD (AS-IS) vs. Necesidad para Plataforma SaaS (TO-BE implícito))

## Decision Question
Define la estrategia integral y el roadmap detallado para implementar un pipeline robusto de Integración Continua/Despliegue Continuo (CI/CD) para la plataforma Wapsell. Esto debe incluir procesos para pruebas automatizadas (unitarias, de integración, E2E), construcción de código, despliegue seguro a entornos de producción y procedimientos claros de gestión de lanzamientos.

## AS-IS Evidence
- `05-ASIS/02-ASIS-ARCHITECTURE.md`: "Migraciones y deploy son **manuales**... sin CI/CD (ver `11-ASIS-QUALITY.md`)." (DOCUMENTED)
- `05-ASIS/11-ASIS-QUALITY.md`: "CI/CD: no existe. No hay carpeta `.github/` ni ningún archivo de pipeline (`.yml`/`.yaml`) fuera de los `docker-compose*.yml`. Sin GitHub Actions, GitLab CI, ni ningún otro sistema de integración continua." (VERIFIED BY CODE). "El script `test` de la raíz del monorepo solo hace `echo`." (VERIFIED BY CODE). "Qué reemplaza a los tests: verificación manual documentada contra entornos reales." (DOCUMENTED)

## Why This Decision Exists
El AS-IS no tiene ningún pipeline CI/CD, dependiendo de procesos manuales para todo, desde las pruebas hasta el despliegue (CON-027). Para una plataforma SaaS, un sistema CI/CD robusto es un requisito arquitectónico y operativo crítico, que representa un significativo **GAP + MISSING_DECISION (ARCHITECTURE_CONFLICT / QUALITY_CONFLICT)**. Definir esta estrategia es crucial para la velocidad de desarrollo, la calidad y la fiabilidad.

## Alternatives
- **Adoptar un servicio CI/CD nativo de la nube (e.g., GitHub Actions, GitLab CI, Azure DevOps):** Aprovechar las capacidades de la plataforma existente. (ALTERNATIVES NOT DOCUMENTED, inferido)
- **Solución CI/CD auto-alojada (e.g., Jenkins, Drone CI):** Mayor control, pero mayor sobrecarga de mantenimiento. (ALTERNATIVES NOT DOCUMENTED, inferido)
- **CI/CD mínimo viable:** Comenzar con construcciones automatizadas y pruebas unitarias, añadiendo gradualmente el despliegue y E2E. (ALTERNATIVES NOT DOCUMENTED, inferido)

## Consequences Known From Sources
- **DOCUMENTED (CON-027):** "Despliegues lentos y propensos a errores, dificultad para mantener la calidad del código y la consistencia, falta de retroalimentación de pruebas automatizadas. Alto riesgo operacional."
- **INFERRED:** Despliegues más rápidos y fiables, mejora de la calidad del código mediante verificaciones automatizadas, reducción de errores manuales, aumento de la productividad del desarrollador.

## Dependencies
- Blocks: NONE
- Depends On: D-017 (DIRECT)

## Affected Documents
- `05-ASIS/02-ASIS-ARCHITECTURE.md`
- `05-ASIS/11-ASIS-QUALITY.md`
- `03-CONFLICTS/00-CONFLICT-REGISTER.md` (CON-027)
- Documentación de gobernanza y proceso de desarrollo del proyecto.
- `.github/workflows` (o archivos de pipeline equivalentes).
- `package.json` (para scripts de prueba).

## Implementation Impact
- Selección y configuración de una plataforma CI/CD.
- Escritura de scripts de pipeline para construir, probar y desplegar todas las aplicaciones.
- Automatización de migraciones de bases de datos y configuración del entorno.
- Integración con repositorios de código y registros de artefactos.

## Open Questions
- ¿Cuál es la plataforma/herramienta CI/CD preferida?
- ¿Cuál es la frecuencia de despliegue objetivo?
- ¿Qué nivel de automatización de pruebas se requiere antes del despliegue?

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
| ID | `D-018` |
| Status | **APPROVED — DERIVED / RECONSTRUCTED** |
| Owner | fmonfasani (attribution per `03-CONFLICTS/07-DECISION-REGISTER.md`; no signed approval record found) |
| Date | **NOT DOCUMENTED** (DEC-001's 2026-09-25 is DEC-001's date, not this decision's) |
| Canonical register | `04-DECISIONS/00-DECISION-REGISTER.md` |
| Conflict | See `03-CONFLICTS/00-CONFLICT-REGISTER.md` |
| Implementation detail | **OPEN** -- an APPROVED decision does not define its implementation |

**This ficha must not be cited as normative authority until its decision text is reconstructed.**

---