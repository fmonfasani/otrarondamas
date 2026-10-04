# WAPSELL — B2 OWNER DECISION CLOSURE / PROPAGATION — 2026-10-04

**Status:** OWNER ACCEPTED — CLOSED FOR DOWNSTREAM PROPAGATION  
**Date:** 2026-10-04  
**Scope:** B2 — Identity / Authorization / Legacy / Session reconciliation  
**Implementation:** NOT AUTHORIZED  
**Schema / migration / runtime:** NOT AUTHORIZED

## 1. Purpose

Registrar la aceptación del Owner de las recomendaciones de cierre B2 y fijar su propagación documental.

Este documento no implementa ninguna decisión ni selecciona mecanismos técnicos no resueltos.

## 2. Authority

Primary:
- Owner acceptance issued in the current B2 decision closure session.
- B2 Controlled Invariant Reconciliation 2026-10-04.

Supporting:
- R8-ID-002 / R8-ID-003.
- R8-AUTH-001.
- R8-ARCH-003.
- Canonical Contracts and Invariants.

## 3. Accepted closure decisions

| ID | Subject | Accepted direction | Classification |
|---|---|---|---|
| 1 | Membership ACTIVE uniqueness | At most one ACTIVE Membership per \`(User, Business)\`. | Normative closure |
| 2 | Customer response boundary | Preserve as a cross-cutting security principle: responses must not expose secrets or authorization-sensitive data. | Cross-cutting normative closure |
| 3 | Legacy retirement | Treat legacy retirement as a separate process gate/cutover task, not as a runtime invariant. | Process closure |
| 4 | Membership Role cardinality | A Membership has exactly one effective Role in the MVP authorization model. | Normative closure |
| 5 | Permission catalogue | Approve permission domains conceptually; keep atomic identifiers, exact Role→Permission rows and persistence open. | Normative boundary + technical OPEN |
| 6 | Legacy permission mapping | Require an explicit, reviewed mapping from legacy \`UsuarioPermiso\`/\`Permiso\` semantics to target Role→Permission before the affected legacy authorization path is retired. | Normative migration closure |
| 7 | Legacy coexistence window | Coexistence is bounded and temporary; final duration/cutover mechanics remain task-local technical details. | Normative boundary |
| 8 | Revocation / inactive Membership | Protected operations revalidate current server-side authorization state; no fixed latency/SLA is established by this decision. | Normative boundary + technical OPEN |
| 9 | Endpoints without explicit Permission | Public/pre-context authentication paths may operate without Business Permission; protected Business-scoped operations fail closed when no applicable authorization is established. | Normative boundary |
| 10 | D-006 / CON-018 authorization control | Preserve the concept of additional authorization control for critical operations, but redesign and specify its exact actors, triggers, states and enforcement in a dedicated downstream contract. | Owner ruling + technical OPEN |

## 4. Interpretation rule

The acceptance closes the normative direction stated above. It does not close:
- physical schema;
- atomic Permission IDs;
- exact Role→Permission persistence rows;
- JWT claims;
- token/session lifetime;
- revocation storage mechanism;
- Business Switch transport;
- MFA technology;
- endpoint-to-permission mapping;
- technical enforcement mechanism;
- cutover implementation.

No implementation detail may be inferred from this document.

## 5. B2 invariant consequences

The following B2 candidate states are now resolved for downstream derivation:

- \`MEM-001\`: stable — at most one ACTIVE Membership per \`(User, Business)\`.
- \`ROLE-004\`: stable — exactly one effective Role per Membership in MVP.
- \`PRM-003\`: domain boundary closed; atomic IDs and exact matrix remain open.
- \`LEG-004\`: bounded coexistence closed conceptually; duration/mechanics remain open.
- \`LEG-005\`: process rule — retirement/cutover is a separate controlled task.
- \`LEG-006\`: explicit legacy-to-target authorization mapping required before retirement.
- \`AUT-005\` / \`MEM-004\`: current server-side authorization state governs protected operations; no timing SLA fixed.
- \`AUT-004\`: Business-scoped protected operations fail closed; pre-context/public paths are separately classified.
- \`CUS-004\`: retained as cross-cutting response-security principle.
- \`AUT-009\`: remains dependent on \`item 10\` and its downstream dedicated authorization contract.

## 6. Evidence status

All decisions in this document are:

**DOCUMENTED — OWNER ACCEPTANCE**

They are not:
- VERIFIED BY CODE;
- VERIFIED BY TEST;
- VERIFIED BY EXECUTION.

## 7. Propagation status

| Layer | Status |
|---|---|
| Decision register | Propagate |
| Authorization Contract | Propagate |
| Identity/Legacy Contract | Propagate |
| Authentication/Session Contract | Propagate |
| Canonical Invariants | Propagate |
| Tests/Evals | Propagate |
| Transformation Plan | Propagate |
| Code / schema / migrations | NOT AUTHORIZED |

## 8. Gate

**B2 OWNER DECISION CLOSURE: ACCEPTED.**

**B2 downstream propagation: AUTHORIZED.**

**Implementation: NOT AUTHORIZED.**
