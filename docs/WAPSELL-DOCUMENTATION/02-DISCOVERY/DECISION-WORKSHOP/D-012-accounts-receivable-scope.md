# D-012 — ¿Cuál es el alcance y los requisitos funcionales para la gestión de Cuentas por Cobrar / Cobro de Deudas (RF-10) en la plataforma Wapsell?

Status: APPROVED — DERIVED / RECONSTRUCTED (see Post-Workshop Decision Reconciliation)
Criticality: BLOCKING

Domain: Payments, Commerce, Data, Accounting

Related conflicts: CON-021 (Ausencia de Funcionalidad de Cuentas por Cobrar (RF-10))

## Decision Question
Define el alcance integral y los requisitos funcionales detallados para las Cuentas por Cobrar y el Cobro de Deudas dentro de la plataforma Wapsell. Esto incluye especificar el ciclo de vida de las deudas, los procesos de aplicación de pagos, los informes y la integración con los módulos de comercio y contabilidad generales (RF-10).

## AS-IS Evidence
- `05-ASIS/01-ASIS-PRODUCT.md`: "**Cuenta corriente / cobro de deudas** (RF-10) — los modelos (`CuentaCorriente`, `Deuda`, `AplicacionPago`) existen en el schema, sin ningún service que los use." (VERIFIED BY CODE)
- `05-ASIS/03-ASIS-DATA.md`: "`CuentaCorriente`/`Deuda`/`AplicacionPago` — **modelos completos, sin ningún service que los use** (RF-10 sin implementar)." (VERIFIED BY CODE)
- `05-ASIS/07-ASIS-FLOWS.md`: "Cobro de deuda / cuenta corriente — modelos existen, sin flujo real (RF-10)." (VERIFIED BY EXECUTION)

## Why This Decision Exists
El AS-IS tiene modelos de datos para Cuentas por Cobrar (`CuentaCorriente`, `Deuda`, `AplicacionPago`) pero no servicios o flujos correspondientes (RF-10 no está implementada, CON-021). Esto representa un significativo **GAP + MISSING_DECISION (SCOPE_CONFLICT / DATA_MODEL_CONFLICT)**. Implementar esta funcionalidad es crítico para la gestión financiera y el seguimiento del crédito del cliente, lo que la convierte en una decisión bloqueante para la integridad financiera.

## Alternatives
- **Seguimiento manual básico de deudas:** La implementación inicial se centra en el registro simple de deudas y pagos, con conciliación manual. (ALTERNATIVES NOT DOCUMENTED, inferido)
- **Recordatorios automatizados de vencimiento y pago:** Implementar procesos automatizados para el seguimiento de deudas vencidas. (ALTERNATIVES NOT DOCUMENTED, inferido)
- **Integración con sistemas contables externos:** Delegar las Cuentas por Cobrar a un sistema externo especializado. (ALTERNATIVES NOT DOCUMENTED, inferido)

## Consequences Known From Sources
- **DOCUMENTED (CON-021):** "Imposibilidad de gestionar el crédito de clientes y la conciliación financiera. Bloqueante para la gestión financiera."
- **INFERRED:** Mejora del control financiero, mejor gestión del flujo de caja, mejora de la gestión de la relación con el cliente para cuentas de crédito.

## Dependencies
- Blocks: D-008
- Depends On: D-001 (INDIRECT), D-002 (INDIRECT)

## Affected Documents
- `05-ASIS/01-ASIS-PRODUCT.md`
- `05-ASIS/03-ASIS-DATA.md`
- `05-ASIS/07-ASIS-FLOWS.md`
- `03-CONFLICTS/00-CONFLICT-REGISTER.md` (CON-021)
- `apps/api/prisma/schema.prisma` (modelos `CuentaCorriente`, `Deuda`, `AplicacionPago`).
- Módulos backend de Ventas, Pagos y Contabilidad.
- UI frontend para estados de cuenta de clientes y gestión de deudas.

## Implementation Impact
- Desarrollo de nuevos servicios y APIs para gestionar el ciclo de vida de Cuentas por Cobrar.
- Integración con el procesamiento de ventas y pagos para rastrear la creación de deudas y la aplicación de pagos.
- Componentes UI para visualizar y gestionar el crédito y las deudas de los clientes.

## Open Questions
- ¿Cuáles son las políticas de crédito para los clientes (e.g., límites de crédito, condiciones de pago)?
- ¿Cómo se manejarán las deudas vencidas (e.g., proceso de cobro, acciones legales)?
- ¿Qué informes se requieren para Cuentas por Cobrar?

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
| ID | `D-012` |
| Status | **APPROVED — DERIVED / RECONSTRUCTED** |
| Owner | fmonfasani (attribution per `03-CONFLICTS/07-DECISION-REGISTER.md`; no signed approval record found) |
| Date | **NOT DOCUMENTED** (DEC-001's 2026-09-25 is DEC-001's date, not this decision's) |
| Canonical register | `04-DECISIONS/00-DECISION-REGISTER.md` |
| Conflict | See `03-CONFLICTS/00-CONFLICT-REGISTER.md` |
| Implementation detail | **OPEN** -- an APPROVED decision does not define its implementation |

**This ficha must not be cited as normative authority until its decision text is reconstructed.**

---