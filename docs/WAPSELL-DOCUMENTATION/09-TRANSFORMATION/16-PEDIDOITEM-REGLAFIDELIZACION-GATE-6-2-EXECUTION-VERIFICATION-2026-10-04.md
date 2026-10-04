# Relation Isolation — Gate 6.2 Test Execution & Verification

**Fecha:** 2026-10-04  
**Estado:** GATE 6.2 — VERIFIED BY EXECUTION  
**Slice:** PedidoItem → ReglaFidelizacion  
**Scope:** Wapsell Core — Multi-Tenant Persistence / Relation Isolation  
**Audit:** `15-PEDIDOITEM-REGLAFIDELIZACION-GATE-6-2-AUDIT-2026-10-04.md`  
**Test candidates:** Gate 6.2 R-01…R-08  
**Implementation:** `fix(b3): enforce PedidoItem fidelity rule relation isolation`  
**Implementation commit:** `fe34d70b26691f93775329b060408bff902fc953`  
**Validation workflow:** B4 Verification Infrastructure #58  
**Run:** `37219020274`  
**Job:** `api-verification` (`111485368123`)  
**Result:** SUCCESS

## 1. Purpose

Registrar la ejecución real de los casos R-01…R-08 definidos por el audit de Gate 6.2 y cerrar la evidencia de la relación `PedidoItem → ReglaFidelizacion`.

Este registro no declara B3 global como VERIFIED ni completa Gate 6 global.

## 2. Pre-fix evidence

La primera ejecución real de Gate 6.2 sobre la baseline confirmó un gap:

- R-01 y R-07 pasaron;
- R-02, R-03, R-04, R-05, R-06 y R-08 fallaron porque las operaciones cross-Business no fueron rechazadas;
- la protección existente no verificaba ownership de `ReglaFidelizacion` en el persistence boundary para esta relación.

**Classification:** CONFIRMED GAP [E].

## 3. Implementation

Se extendió exclusivamente el registro declarativo existente:

```ts
RELACIONES_CON_OWNERSHIP = {
  VentaItem: ['producto'],
  PedidoItem: ['producto', 'reglaFidelizacion'],
};
```

El cambio correspondió únicamente a:

- agregar `reglaFidelizacion` a la entrada de `PedidoItem`;
- reutilizar el mecanismo existente de DMMF traversal + relation ownership preflight.

No se modificaron:

- Prisma schema;
- migrations;
- seed;
- auth/JWT;
- User/Membership;
- API contracts;
- servicios de dominio;
- B4 infrastructure;
- fixtures o semántica de los tests de Gate 6.2.

## 4. Execution matrix

| Test | Scenario | Expected | Result |
|---|---|---|---|
| R-01 | Same-Business nested create con Regla A | Persist Pedido + PedidoItem | **PASS [E]** |
| R-02 | Nested create usando Regla B desde Business A | Reject; no persistence | **PASS [E]** |
| R-03 | Direct PedidoItem.create A→Regla B | Reject; no item | **PASS [E]** |
| R-04 | Direct PedidoItem.createMany A→Regla B | Reject; no item | **PASS [E]** |
| R-05 | Mixed nested write con referencias A+B | Reject whole operation; no partial persistence | **PASS [E]** |
| R-06 | Pedido.update agregando Regla B | Reject; no invalid item | **PASS [E]** |
| R-07 | `reglaFidelizacionId = null` | Persist without rule relation | **PASS [E]** |
| R-08 | Negative + positive interactive transaction | Reject negative; persist positive | **PASS [E]** |

## 5. Infrastructure evidence

GitHub Actions workflow:

**B4 Verification Infrastructure #58**

- Run ID: `37219020274`
- Job: `api-verification`
- Job ID: `111485368123`
- Head: `fe34d70b26691f93775329b060408bff902fc953`
- Conclusion: **SUCCESS**

The verification environment used PostgreSQL 15 as a disposable service database.

The completed job reported:

- Prisma generate: **PASS**
- Prisma db push: **PASS**
- Unit test suites: **2/2 PASS**
- Unit tests: **17/17 PASS**
- E2E/integration suites: **2/2 PASS**
- E2E/integration tests: **32/32 PASS**
- `b3-tenant-isolation.integration-spec.ts`: **PASS**
- `tenant-isolation.integration-spec.ts`: **PASS**

The relevant E2E command completed successfully with all 32 tests passing.

## 6. Invariant evidence for this slice

| Invariant | Slice evidence |
|---|---|
| RI-01 | [C] server-bound Business Context remains authoritative |
| RI-02 | [E] Business A cannot persist PedidoItem → ReglaFidelizacion B |
| RI-03 | [E] Business A → ReglaFidelizacion A persists |
| RI-04 | [E] cross-Business cases reject |
| RI-05 | [E] negative/mixed operations do not persist the invalid relation |
| RI-06 | [C][E] registered relation uses fail-closed ownership verification |
| RI-07 | [C] same reusable registry/mechanism used by existing relation-isolation slices |
| RI-08 | [E] negative and positive cases execute within the transaction coverage defined by R-08 |

## 7. Gate 6.2 verdict

**VERIFIED BY EXECUTION [E].**

The relation `PedidoItem → ReglaFidelizacion` is now covered by the reusable relation-isolation enforcement and its Gate 6.2 positive, negative, null, mixed-write and transaction scenarios pass against the B4 PostgreSQL verification environment.

The closure is specifically for this relation slice. It does not imply that all relation-isolation edges or all B3 invariants are verified.

## 8. Scope boundary

This closure does NOT cover:

- VentaItem → ReglaFidelizacion;
- CompraItem → Producto;
- DevolucionProveedorItem relations;
- PedidoItem → Pedido;
- other Gate 6 relations not yet executed;
- global B3 verification;
- ISO-009 physical enforcement;
- full Relation Isolation capability closure.

Those remain separate audit/test targets.

## 9. Next state

Gate 6.2 is closed.

Gate 6 remains in **COVERAGE EXPANSION**.

The next candidate must be audited before implementation: **Gate 6.3 — VentaItem → ReglaFidelizacion**.

Gate 7 B3 regression and Gate 8 evidence closure remain pending.

## 10. Evidence classification

- **[C] VERIFIED BY CODE:** relation registry and reusable ownership mechanism.
- **[E] VERIFIED BY EXECUTION:** Gate 6.2 R-01…R-08 execution in B4 PostgreSQL CI, Run #58.
- **[T] VERIFIED BY TEST:** not used as the primary classification here; the relevant closure is based on CI execution against the real PostgreSQL verification target.
- **[D] DOCUMENTED:** this execution verification record.
- **[ND] NOT DETERMINABLE:** no claim is made here about unexecuted relation edges or global B3 completeness.
