# WAPSELL — B3 POST-OWNER-APPROVAL / READINESS CLOSURE
## Block 3 — Tenant Isolation

**Fecha:** 2026-10-04
**Estado:** READY FOR TEST EXECUTION — NOT VERIFIED — IMPLEMENTATION NOT AUTHORIZED
**Scope:** Cierre posterior a la aprobación del Owner de las decisiones de B3 y preparación de la ejecución de Tests/Evals.

## 1. Propósito

Registrar el resultado del control posterior a la aprobación del Owner y determinar si B3 puede avanzar desde derivación/reconciliación hacia ejecución de Tests/Evals.

Este documento no declara B3 VERIFIED y no autoriza cambios de producto, schema, migrations, datos ni implementación de ISO-009.

## 2. Owner approval

El Owner aprobó el paquete completo de recomendaciones presentado para el cierre de B3:

1. aprobar ISO-001…ISO-009;
2. aprobar el conjunto de Tests/Evals B3 para ejecución;
3. unit tests primero + PostgreSQL/Prisma integration tests después; E2E diferido;
4. crear Businesses dinámicamente dentro de las suites;
5. exigir resultado esperado + estado persistido para PASS de mutaciones;
6. mantener ISO-009 normativamente aprobado y diferir su mecanismo físico;
7. verificar el boundary relevante de acceso Prisma directo;
8. verificar la superficie Raw SQL relevante existente;
9. verificar explícitamente operaciones unsupported/fail-closed;
10. verificar contexto ausente e inválido;
11. declarar B3 VERIFIED solamente con PASS de los TE obligatorios + evidencia [T]/[E] + reconciliación;
12. mantener la autorización de implementación separada de la verificación.

**Clasificación:** [D] Owner approval.

## 3. Control-point prerequisites

| Condición | Estado | Evidencia |
|---|---|---|
| B1/B2 upstream decisions required by B3 available | PASS | [D] canonical B1/B2 baseline |
| B3 Owner decisions closed | PASS | [D] decisions 48 + Owner approval recorded here |
| T-01 persistence isolation contract | PASS — CLOSED | [D] 28-B3-PERSISTENCE-ISOLATION-CONTRACT-CLOSURE-2026-10-04.md |
| B3 invariants ISO-001…ISO-009 | PASS — APPROVED FOR DOWNSTREAM VERIFICATION | [D] Owner approval + canonical invariant set |
| B3 Tests/Evals | PASS — APPROVED FOR EXECUTION | [D] reconciliation + Owner approval |
| B4 verification infrastructure | PASS — COMPLETED / VERIFIED | [T][E] B4 CI evidence already recorded |
| Code/schema/migration/data change required for this closure | NO | [C][D] |
| Product implementation authorized | NO | [D] explicit boundary in this closure |

## 4. B3 invariant disposition

The canonical B3 set contains ISO-001…ISO-009. The Owner approval does not change their wording or introduce new invariants.

- ISO-001 — approved for verification.
- ISO-002 — approved for verification.
- ISO-003 — approved for verification, including its ISO-002 dependency for AplicacionPago.
- ISO-004 — retained as conditional and not testable until classification is a system artefact; it is not a blocker to executing the stable subset.
- ISO-005 — approved for verification.
- ISO-006 — approved for verification; runtime transaction continuity is a priority and requires real execution evidence.
- ISO-007 — approved for verification.
- ISO-008 — retained as conditional; execution may cover the enumerable surface only and must not claim complete path coverage.
- ISO-009 — normatively approved; physical ownership mechanism remains downstream and is not implemented by this closure.

**Invariant state:** approved for downstream verification; not verified.

## 5. Tests/Evals execution set

### B3-specific

- TE-B3-001 → ISO-001
- TE-B3-002 → ISO-002
- TE-B3-003 → ISO-003
- TE-B3-004 → ISO-004 (conditional / not currently testable)
- TE-B3-005 → ISO-005
- TE-B3-006 → ISO-006
- TE-B3-007 → ISO-007
- TE-B3-008 → ISO-008 (conditional / enumerable subset only)
- TE-B3-009 → ISO-009

### Inherited B1 criteria

B3 reuses, source-qualified, without duplicating ownership:

- B1-BASE:TE-ID-004
- B1-BASE:TE-ID-005
- B1-BASE:TE-ID-006
- B1-BASE:TE-ID-008
- B1-BASE:TE-ID-009
- B1-BASE:TE-ID-010
- B1-BASE:TE-ID-011

The documented numeric collision in upstream Tests/Evals IDs remains an upstream discrepancy and is not silently resolved here. B3 uses the source-qualified B1-BASE namespace already established by the reconciliation.

## 6. Execution order

The approved execution order is:

1. unit tests for applicable isolation mechanisms;
2. PostgreSQL/Prisma integration tests;
3. real execution evidence for transaction/raw-SQL cases where required;
4. failure classification before any corrective change;
5. reconciliation of results against ISO-001…ISO-009 and inherited criteria;
6. only after all mandatory criteria pass, determine whether B3 can be declared VERIFIED.

E2E remains deferred.

## 7. Fixture rules

The execution suites must:

- create two Businesses inside the suite;
- retain their runtime IDs in variables;
- not depend on hardcoded Business IDs or seed ordering;
- preserve the existing seed;
- create only the related entities required by each criterion;
- verify persisted state after mutations;
- include positive controls where needed to avoid vacuous rejection tests.

## 8. Special verification gates

### 8.1 ISO-006 / transaction continuity

TE-B3-006 is the highest-priority execution row because the runtime preservation of Business Context across the transaction client remains [ND] until real execution.

### 8.2 Cross-Business negative verification

R8-ARCH-002 property 12 remains a verification gate, not an invariant. It is currently NOT MET because no B3 isolation test has yet been executed.

The gate is now executable because B4 verification infrastructure is completed.

### 8.3 ISO-009

ISO-009 is normatively closed by Owner Decision 49. Its physical enforcement mechanism remains open and must not be invented during test execution.

If the current AS-IS implementation cannot provide a deterministic ownership surface for Legajo/DocumentoLegajo, classify the result as an implementation/specification boundary issue rather than silently creating a schema rule.

## 9. Known non-blocking documentary discrepancies

The following do not prevent the B3 execution stage:

- upstream TE-ID-004/005/006/007 numeric collision; B3 uses source-qualified inherited IDs;
- TE-ORD collision outside B3 scope;
- ISO-009 historical naming discrepancy; canonical name is ISO-009;
- historical B3 audit remains unchanged;
- duplicate audit numbering in 13-AUDIT/ remains untouched;
- transaction call-site count discrepancy is to be reconciled when TE-B3-006 is implemented.

No contradiction with the approved T-01 contract or the Owner-approved B3 decisions was identified.

## 10. Readiness verdict

**B3: READY FOR TEST EXECUTION.**

This verdict means only that the documentary prerequisites and verification infrastructure are sufficient to begin the approved Tests/Evals execution stage.

It does **not** mean:

- tenant isolation passes;
- B3 is VERIFIED;
- any [T] or [E] evidence exists for B3;
- ISO-009 has a physical implementation;
- product implementation is authorized.

Current B3 execution evidence remains:

- [T] = 0
- [E] = 0

## 11. Next controlled task

The next task is the execution of the approved B3 Tests/Evals against the current implementation using the B4 infrastructure.

The execution must begin with the stable/unit-testable criteria and then proceed to PostgreSQL/Prisma integration, with TE-B3-006 prioritized for real execution evidence.

Any failure must be classified before modification. No test may be altered merely to obtain PASS.

## 12. Change control

This closure changes documentation only.

It does not modify application code, Prisma schema, migrations or data. It does not implement tenant isolation. It does not implement ISO-009. It does not authorize product implementation.

**Final state:**

> **B3 READY FOR TEST EXECUTION — NOT VERIFIED — IMPLEMENTATION NOT AUTHORIZED.**