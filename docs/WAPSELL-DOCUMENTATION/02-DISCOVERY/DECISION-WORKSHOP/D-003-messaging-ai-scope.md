# D-003 — ¿Cuál es el alcance funcional detallado de Messaging y Asistentes de IA para una primera iteración (canales, capacidades específicas, límites de automatización)?

Status: APPROVED — DERIVED / RECONSTRUCTED (see Post-Workshop Decision Reconciliation)
Criticality: BLOCKING

Domain: Messaging, Product, UI/UX, Integrations

Related conflicts: CON-011 (Ausencia de Messaging y Asistentes de IA (AS-IS) vs. Característica Core (DEC-001/SPEC))

## Decision Question
Define el alcance funcional específico para la iteración inicial de Messaging y Asistentes de IA. Esto incluye la identificación de canales soportados (e.g., WhatsApp, chat in-app), capacidades específicas (e.g., respuestas automatizadas, traspaso a humano, tipos de mensajes), y límites claros sobre la automatización versus la intervención humana requerida.

## AS-IS Evidence
- `05-ASIS/00-ASIS-OVERVIEW.md`: "**Qué NO existe (verificado por código, según SRC-011):** messaging, conversaciones, asistentes, WhatsApp..." (DOCUMENTED)
- `05-ASIS/01-ASIS-PRODUCT.md`: "Explícitamente NO implementado... Messaging, conversaciones, asistentes de IA — ausencia total confirmada por grep exhaustivo." (VERIFIED BY CODE)
- `05-ASIS/04-ASIS-IDENTITY.md`: "No existe ningún concepto de "Business", "Tenant" ni "Membership" en el código... Se buscó explícitamente `Conversacion`, `Mensaje`, `Asistente` en todo el código... **ninguna coincidencia real**." (VERIFIED BY CODE)
- `05-ASIS/08-ASIS-INTEGRATIONS.md`: "**WhatsApp** — NO IMPLEMENTADO. Ninguna integración ni SDK relacionado a WhatsApp Business API... `Pedido.canalOrigen` acepta el string libre "WhatsApp" como valor posible, pero es solo un dato descriptivo sin integración funcional detrás." (VERIFIED BY CODE)

## Why This Decision Exists
El codebase AS-IS presenta una ausencia completa de funcionalidades de mensajería y asistentes de IA. Sin embargo, DEC-001 las aprueba explícitamente como características centrales del producto Wapsell TO-BE (CON-011). Esto representa un significativo **GAP + MISSING_DECISION (SCOPE_CONFLICT)**. Definir el alcance funcional detallado es crítico para cualquier diseño arquitectónico y planificación de implementación.

## Alternatives
- **Comenzar con mensajería mínima viable:** e.g., chat in-app solo de texto con respuesta humana manual, sin IA. (ALTERNATIVES NOT DOCUMENTED)
- **Integrar con WhatsApp Business API con respuestas básicas de IA:** Centrarse en un solo canal externo con automatización básica. (ALTERNATIVES NOT DOCUMENTED)
- **Centrarse en asistentes de IA internos para el personal:** Automatizar procesos internos antes de las interacciones externas con clientes. (ALTERNATIVES NOT DOCUMENTED)

## Consequences Known From Sources
- **DOCUMENTED (DEC-001):** "La conversación es la interfaz comercial central... Asistentes de IA son parte del producto..."
- **DOCUMENTED (CON-011):** "Brecha funcional crítica que impacta la arquitectura, UI/UX e integraciones."
- **DOCUMENTED (DEC-001 - Qué NO decide):** "3. **Alcance funcional de messaging y asistentes de IA.** SRC-012/013 son visión de producto, no especificación funcional al nivel de detalle de SRC-001/SRC-007. Falta definir: canales soportados, qué hace un asistente de IA concretamente, límites de automatización vs. intervención humana."
- **INFERRED:** Requiere nuevos módulos backend, endpoints API, componentes UI frontend, y potencial integración con plataformas de mensajería externas (e.g., WhatsApp, Twilio).

## Dependencies
- Blocks: D-017 (INDIRECT)
- Depends On: D-001 (INDIRECT), D-002 (INDIRECT)

## Affected Documents
- `05-ASIS/00-ASIS-OVERVIEW.md`
- `05-ASIS/01-ASIS-PRODUCT.md`
- `05-ASIS/04-ASIS-IDENTITY.md`
- `05-ASIS/08-ASIS-INTEGRATIONS.md`
- `02-CANONICAL-SPEC/04-MESSAGING-SPEC.md`
- `03-CONFLICTS/00-CONFLICT-REGISTER.md` (CON-011)
- Nuevos módulos backend para mensajería.
- Diseños UI/UX para interfaces conversacionales.
- Especificaciones de integración para plataformas de mensajería externas.

## Implementation Impact
- Requiere diseñar e implementar nuevos módulos centrales para mensajería e IA.
- Integración con APIs externas (e.g., WhatsApp Business API).
- Desarrollo frontend significativo para interfaces de chat e interacciones con asistentes.
- Modelado de datos para conversaciones, mensajes y estados de asistentes.

## Open Questions
- ¿Cuáles son los canales de mensajería prioritarios para el MVP (e.g., in-app, WhatsApp, otros)?
- ¿Qué nivel de asistencia de IA se espera inicialmente (e.g., FAQs básicas, soporte transaccional)?
- ¿Cuáles son los requisitos no funcionales (e.g., latencia, volumen de mensajes) para la mensajería?

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
**`DEC-001 DERIVED` (partial).** Source: `04-DECISIONS/02-MULTITENANCY.md:23-25`

> **Asistentes de IA son parte del producto**, no un descarte del MVP -- esto revierte explicitamente el criterio de trabajo inicial de la Fase 1 ("los asistentes de IA estan fuera del MVP actual salvo que una fuente demuestre lo contrario"): SRC-012/013, ahora aprobadas, son esa fuente.

**DECIDED — activation state per iteration.** D-003 reconstructed text: *"Messaging estará activo en el MVP inicial como sistema de mensajería propio de Wapsell. Los asistentes de IA estarán preparados técnicamente para incorporarse posteriormente, pero permanecerán inactivos durante el MVP inicial. El MVP inicial no depende de WhatsApp como canal."* (`WAPSELL-SPEC-GENERAL-v1.0-RECONSTRUIDA.md:107-113`, mirrored in `v1.1-REVISADA.md:121-127`). Provenance: `DERIVED / RECONSTRUCTED` — consistent with the workshop register summary, **not** yet Owner-verified verbatim. **STILL `OPEN`:** supported channels, what an assistant concretely does, and the automation-vs-human-intervention boundary (DEC-001 `02-MULTITENANCY.md:61-65`).

**CONFLICT — RESOLVED 2026-09-28 (previously: CONFLICT).** This entry previously claimed that the General spec's statement was *"the opposite of the DEC-001 direction"*, and that it was unsupported by any D-003 text. **Both claims were wrong.** D-003 and DEC-001 are **compatible**: DEC-001 places AI assistants *in product scope*; D-003 fixes their *activation state per iteration* (inactive during the first MVP). "In product scope" and "inactive in the first iteration" are orthogonal — no contradiction exists. The D-003 text was present in the root-level audit artifacts and had been missed by the first inventory pass. **GRF-01 downgraded CRITICAL → MEDIUM**; the statement has been restored in `00-WAPSELL-SPEC-GENERAL.md` §9/§22/§23 with corrected attribution. **CON-011: the scope question is CLOSED**; its functional sub-items remain `OPEN`.

### Reconciled status

| Field | Value |
|---|---|
| ID | `D-003` |
| Status | **APPROVED — DERIVED / RECONSTRUCTED** |
| Owner | fmonfasani (attribution per `03-CONFLICTS/07-DECISION-REGISTER.md`; no signed approval record found) |
| Date | **NOT DOCUMENTED** (DEC-001's 2026-09-25 is DEC-001's date, not this decision's) |
| Canonical register | `04-DECISIONS/00-DECISION-REGISTER.md` |
| Conflict | See `03-CONFLICTS/00-CONFLICT-REGISTER.md` |
| Implementation detail | **OPEN** -- an APPROVED decision does not define its implementation |

**This ficha must not be cited as normative authority until its decision text is reconstructed.**

---