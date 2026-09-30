# WAPSELL-DOCUMENTATION

Documentación canónica del proyecto Wapsell. **Actualizado 2026-09-28.**

Este paquete dejó de ser un starter: las fases 1 a 7 están pobladas con contenido real derivado del repositorio y de las fuentes inventariadas.

## Regla fundamental

> **Una especificación no es prueba de que la funcionalidad esté implementada.**

La jerarquía de autoridad está en [`00-GOVERNANCE/01-SOURCE-OF-TRUTH.md`](00-GOVERNANCE/01-SOURCE-OF-TRUTH.md). En resumen: para saber **qué existe**, manda el código; para saber **qué se decidió**, manda el registro de decisiones; para saber **hacia dónde va**, manda la SPEC canónica. Nunca se sustituyen entre sí.

## Estado de las fases

| Fase | Contenido | Estado |
|---|---|---|
| [`00-GOVERNANCE/`](00-GOVERNANCE/) | Reglas del proceso: fuente de verdad, política de evidencia, resolución de conflictos, versionado, convenciones de ID | **COMPLETA** (+ reconciliación 2026-09-28) |
| [`01-SOURCE-INVENTORY/`](01-SOURCE-INVENTORY/) | 24 fuentes (SRC-001…SRC-024) clasificadas, con los originales en `SOURCES/` | **COMPLETA** (2026-09-24) |
| [`02-CANONICAL-SPEC/`](02-CANONICAL-SPEC/) | SPEC de Wapsell: general, identidad y tenancy, comercio, operaciones, mensajería, plataforma, branding | **DRAFT** |
| [`03-CONFLICTS/`](03-CONFLICTS/) | 32 conflictos (CON-001…CON-032) y su mapeo a decisiones | **COMPLETA** — mayoría `OPEN` |
| [`03-DECISION-WORKSHOP/`](03-DECISION-WORKSHOP/) | Material de trabajo de las sesiones de decisión | Histórico |
| [`04-DECISIONS/`](04-DECISIONS/) | Registro canónico de decisiones (DEC-001, D-001…D-018) por dominio | **PARCIAL** — decisiones abiertas en `10-OPEN-DECISIONS.md` |
| [`05-ASIS/`](05-ASIS/) | **Estado real del sistema**, 13 documentos con evidencia clasificada | **COMPLETA** (2026-09-25, actualizada 2026-09-28) |
| [`06-TRANSFORMATION/`](06-TRANSFORMATION/) | Qué debe cambiar para pasar de Otra Ronda Más a Wapsell, y en qué orden | **DRAFT** |
| [`07-TOBE/`](07-TOBE/) | Estado objetivo por dominio | **DRAFT** |
| [`08-TRACEABILITY/`](08-TRACEABILITY/) | Requirement → Spec → Dominio → Módulo → Entidad → API/UI → Test → Evidencia | **DRAFT** |
| [`09-ANNEXES/`](09-ANNEXES/) | Anexos, incluido el [registro de deuda técnica](09-ANNEXES/TECHNICAL-DEBT-REGISTER.md) (TD-001…TD-007) | **PARCIAL** |
| [`10-AUDIT/`](10-AUDIT/) | Auditorías de evidencia en código (41 hallazgos sobre D-010/D-014) | **COMPLETA** para su alcance |

## Owner Rulings vigentes (trazabilidad R1, 2026-09-30 — nota aditiva)

- **Source / Authority: OR-001 — Owner Ruling Closure, 2026-09-28** → [`04-DECISIONS/13-OR-001-OWNER-RULING-CLOSURE.md`](04-DECISIONS/13-OR-001-OWNER-RULING-CLOSURE.md) (`CLOSED`). Alcance: P1-A `Empresa` → `Business`, P2-C coexistencia temporal, P3 continuidad sin downtime, P4 `"Roonda"` → `"Otra Ronda Más"`, P5-B especificar antes de implementar. Modelo físico, migraciones, compatibilidad, deploy, rollback, cutover y fin de la coexistencia siguen `OPEN`.
- **Source / Authority: OR-002-A — Owner Ruling, 2026-09-28** → [`04-DECISIONS/15-OR-002-A-OWNER-RULING.md`](04-DECISIONS/15-OR-002-A-OWNER-RULING.md) (`CLOSED`). Dirección conceptual `User` → `Membership` N:N → `Business`; `Customer` independiente con vínculo opcional (CON-010 `RESOLVED` en dirección conceptual). No autoriza implementación física.
- Solo OR-002-A tiene ruling primario dentro de OR-002; OR-002-B…F no lo tienen. *(Estado R1 — reemplazado por la sección R3 de abajo; se preserva como histórico.)*
- **R2/R3 (2026-09-30):** OR-002-B, C, D, E, F, P1-A (opción C), P5-B, CON-010/ISS-07 (conceptual), ISS-08 (precedencia) y D-003/WhatsApp (`RESOLVED`: "Wapsell Messaging MVP no depende de WhatsApp") tienen ruling del Owner. Autoridad: [`04-DECISIONS/18-R2-OWNER-DECISION-CLOSURE-REPORT.md`](04-DECISIONS/18-R2-OWNER-DECISION-CLOSURE-REPORT.md) y `04-DECISIONS/00-DECISION-REGISTER.md` §8. Propagación: [`04-DECISIONS/19-R3-CANONICAL-PROPAGATION-REPORT.md`](04-DECISIONS/19-R3-CANONICAL-PROPAGATION-REPORT.md) (no normativo).
- Siguen `OPEN`/pendientes: matching Customer↔User por "mismo email"; D-005, OR-003, OR-005, D-006, D-008, D-011, D-013, D-015, D-016, D-017 (`NO CONSULTED`); Especificación Técnica `NOT APPROVED`; implementación `NOT AUTHORIZED`; F1 no es una autorización.
- Registro de esta reconciliación: [`04-DECISIONS/17-R1-DOCUMENTAL-RECONCILIATION-RECORD.md`](04-DECISIONS/17-R1-DOCUMENTAL-RECONCILIATION-RECORD.md) (no normativo).
- Un ruling aprobado **no** es autorización de implementación.

## Por dónde empezar

1. [`05-ASIS/00-ASIS-OVERVIEW.md`](05-ASIS/00-ASIS-OVERVIEW.md) — qué existe realmente hoy, y qué no.
2. [`03-CONFLICTS/00-CONFLICT-REGISTER.md`](03-CONFLICTS/00-CONFLICT-REGISTER.md) — las contradicciones registradas.
3. [`04-DECISIONS/00-DECISION-REGISTER.md`](04-DECISIONS/00-DECISION-REGISTER.md) — qué está decidido y con qué autoridad.
4. [`02-CANONICAL-SPEC/00-WAPSELL-SPEC-GENERAL.md`](02-CANONICAL-SPEC/00-WAPSELL-SPEC-GENERAL.md) — hacia dónde va el producto.

## Advertencias vigentes

- **CON-028 (`CRÍTICO`)** — nada de esta carpeta está versionado en Git. `git ls-files docs/WAPSELL-DOCUMENTATION/` devuelve 0 resultados. Hasta que se commitee, esta documentación no es alcanzable por nadie más que su autor en su propia máquina, y los identificadores `CON-*`/`DEC-*`/`SRC-*` no son resolubles. Ver [`03-CONFLICTS/11-REPOSITORY-HYGIENE-CONFLICTS.md`](03-CONFLICTS/11-REPOSITORY-HYGIENE-CONFLICTS.md).
- **CON-030** — `03-CONFLICTS/` tiene prefijos numéricos duplicados (dos `01-`, dos `02-`, …). El número no identifica unívocamente: citar por nombre completo de archivo.
- **DEC-001 aprobó una dirección de producto, no una implementación.** La migración de código hacia la plataforma multi-tenant **no fue iniciada**. Toda la capa Wapsell (multi-tenancy real, mensajería, asistentes) es documental.
- Varias decisiones registradas tienen texto `DERIVED / RECONSTRUCTED`, no verbatim del Owner. No son citables como redacción aprobada — ver [`03-CONFLICTS/10-CONFLICT-RESOLUTION-MAPPING.md`](03-CONFLICTS/10-CONFLICT-RESOLUTION-MAPPING.md).

## Relación con el resto de `docs/`

Esta carpeta es la **única** autoridad documental. El resto de `docs/` es material fuente e insumo histórico, ya inventariado — ver [`../README.md`](../README.md). En particular, `docs/WapSell docs/` es el insumo crudo del que se derivó este proceso y **no debe editarse**.
