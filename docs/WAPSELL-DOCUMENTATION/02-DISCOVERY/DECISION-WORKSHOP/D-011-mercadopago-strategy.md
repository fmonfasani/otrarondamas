# D-011 — ¿Cuál es la estrategia para la integración de Mercado Pago y otras pasarelas de pago críticas en la plataforma Wapsell (alcance, enfoque, cronograma)?

Status: APPROVED — DERIVED / RECONSTRUCTED (see Post-Workshop Decision Reconciliation)
Criticality: HIGH

Domain: Payments, Integrations

Related conflicts: CON-020 (Ausencia de Integración Mercado Pago)

## Decision Question
Define la estrategia integral para integrar Mercado Pago y otras pasarelas de pago críticas en la plataforma Wapsell. Esto incluye determinar el alcance de la funcionalidad (e.g., pagos únicos, suscripciones, reembolsos), el enfoque técnico (e.g., integración directa de API, SDKs, proveedores de servicios de pago), y un cronograma detallado para la implementación.

## AS-IS Evidence
- `05-ASIS/01-ASIS-PRODUCT.md`: "**Mercado Pago** — ni un stub que intente una llamada saliente; el DTO de pagos rechaza explícitamente el string \"Mercado Pago\" con 400 (D-03 sin definir)." (VERIFIED BY CODE)
- `05-ASIS/08-ASIS-INTEGRATIONS.md`: "**Mercado Pago** — NO IMPLEMENTADO. Ni un stub que intente una llamada saliente. El DTO de pagos rechaza explícitamente el string \"Mercado Pago\" con 400 (D-03 sin definir) — ausencia confirmada por grep, no solo por falta de mención." (VERIFIED BY CODE)

## Why This Decision Exists
El AS-IS rechaza explícitamente los pagos de Mercado Pago en el código, lo que indica una exclusión activa, mientras que es un método de pago crítico en muchos mercados (CON-020). La visión TO-BE para una plataforma de comercio requiere una estrategia clara para las integraciones de pago. Esto es una **DIRECT_CONTRADICTION + MISSING_DECISION (INTEGRATION_CONFLICT)**, que limita las opciones de pago e impacta las ventas.

## Alternatives
- **Priorizar Mercado Pago primero, luego expandir:** Centrarse inicialmente en una única pasarela de pago crítica. (ALTERNATIVES NOT DOCUMENTED, inferido)
- **Integrar un agregador de pagos:** Utilizar un servicio que proporcione acceso a múltiples métodos de pago a través de una única API. (ALTERNATIVES NOT DOCUMENTED, inferido)
- **Implementar integraciones directas de API para cada pasarela:** Mayor control pero mayor esfuerzo de desarrollo. (ALTERNATIVES NOT DOCUMENTED, inferido)

## Consequences Known From Sources
- **DOCUMENTED (CON-020):** "Limita las opciones de pago y podría impactar las ventas. Requiere un desarrollo significativo."
- **INFERRED:** Mayor tiempo y complejidad de desarrollo, potencial para requisitos de cumplimiento (e.g., PCI DSS si se manejan datos sensibles de tarjetas), mejora de la experiencia del cliente.

## Dependencies
- Blocks: NONE
- Depends On: D-001 (INDIRECT)

## Affected Documents
- `05-ASIS/01-ASIS-PRODUCT.md`
- `05-ASIS/08-ASIS-INTEGRATIONS.md`
- `03-CONFLICTS/00-CONFLICT-REGISTER.md` (CON-020)
- Módulos backend de pago (`pagos/`).
- Procesos de checkout frontend.

## Implementation Impact
- Nuevos endpoints API y servicios para manejar integraciones de pasarelas de pago.
- Actualizaciones en los DTOs de pago para soportar nuevos métodos de pago.
- Cambios en la UI del frontend para el checkout y la selección de pagos.
- Potencial para auditorías de seguridad y cumplimiento.

## Open Questions
- ¿Cuáles son las 3-5 principales pasarelas de pago críticas, además de Mercado Pago, que deben considerarse?
- ¿Cuáles son los requisitos regionales para los métodos de pago?
- ¿Cómo se manejarán los reembolsos, contracargos y pagos parciales con las pasarelas integradas?

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
| ID | `D-011` |
| Status | **APPROVED — DERIVED / RECONSTRUCTED** |
| Owner | fmonfasani (attribution per `03-CONFLICTS/07-DECISION-REGISTER.md`; no signed approval record found) |
| Date | **NOT DOCUMENTED** (DEC-001's 2026-09-25 is DEC-001's date, not this decision's) |
| Canonical register | `04-DECISIONS/00-DECISION-REGISTER.md` |
| Conflict | See `03-CONFLICTS/00-CONFLICT-REGISTER.md` |
| Implementation detail | **OPEN** -- an APPROVED decision does not define its implementation |

**This ficha must not be cited as normative authority until its decision text is reconstructed.**

---