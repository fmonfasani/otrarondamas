# B3 — ISO-008 PATH INDEPENDENCE AUDIT — 2026-10-04

**Estado:** AUDITORÍA TÉCNICA — CANDIDATE DESIGN — NO VERIFICADO  
**Invariant:** ISO-008 — Isolation obligations are independent of the execution path  
**Contract:** B3-CON-023  
**Evidence:** [C] code / [T] test / [E] execution / [D] documented / [ND] not determinable

## 1. Objective

Determine whether ISO-008 can be converted into a valid PostgreSQL/Prisma integration candidate without inventing an exhaustive execution-path inventory.

ISO-008 states that a Business-scoped operation is subject to the same isolation obligations regardless of the path by which it is executed.

The invariant is **CONDITIONAL** by design: "every path" is not itself enumerable without the separate surface-enumerability process rule.

## 2. Verified AS-IS facts

1. Business-scoped persistence is normally obtained through `EmpresaScopedPrismaService.forEmpresa(empresaId)`. [C]
2. The factory is singleton and receives `empresaId` from its caller. [C]
3. `PrismaService` remains directly injectable and is used by authentication, invitations and legajo code. [C]
4. The B3 AS-IS audit identified **15 files using `forEmpresa` and 29 files mentioning `PrismaService`**, with **46 raw model calls** concentrated in auth, invitations and legajo. [C/D]
5. Pre-context authentication access is intentionally outside ISO-008's scope. [C/D]
6. The legajo paths use the raw client but apply manual tenant checks at controller boundaries; this is a separate, fragile path and is not evidence that the raw client is globally safe. [C]
7. The production raw SQL surface is already covered separately by ISO-006 and must not be duplicated here. [C/D]
8. Existing integration suites prove several concrete relation-isolation paths, but they do not establish path independence globally. [E]

## 3. What can legitimately be tested

A valid ISO-008 candidate must compare the **same Business-scoped operation** through two or more independently enumerable application paths and verify:

- same Business A context;
- Business B target exists;
- the operation cannot expose or mutate B;
- A positive control succeeds;
- persisted state is equivalent after each path.

The comparison must be at the application-path level, not merely two calls to the same `forEmpresa()` factory.

## 4. Current limitation

The repository documentation explicitly states that the complete set of execution paths is not an invariant and cannot be claimed exhaustive.

Therefore this audit **does not claim global path independence**.

The strongest currently supportable candidate is a **bounded path-comparison test** over concrete, independently identifiable Business-scoped application paths. Its result can establish:

> ISO-008 verified for the enumerated paths exercised by the candidate.

It cannot establish:

> ISO-008 globally verified for every possible execution path.

That distinction is mandatory.

## 5. Exclusions

The candidate must not:

- modify production isolation code;
- modify the relation ownership registry;
- duplicate ISO-006 transaction/raw-SQL coverage;
- treat pre-context auth/invitation access as a tenant-isolation bypass;
- invent an execution path that does not exist in the code;
- declare ISO-008 globally VERIFIED;
- modify the canonical B3 reconciliation document.

## 6. Candidate acceptance criteria

Before writing the candidate test, the selected paths must be confirmed in code as:

1. the same logical Business-scoped operation;
2. independently reachable application paths;
3. both intended to operate under Business Context;
4. both capable of being executed against the same A/B fixture;
5. distinguishable enough that the comparison tests path independence rather than merely duplicating the same persistence call.

If those conditions cannot be established, the correct result is **NOT TESTABLE FOR THE PROPOSED PATH**, not an invented test.

## 7. Current classification

**ISO-008: CONDITIONAL / SPECIFIED / NOT VERIFIED [ND].**

**Next authorized technical step:** identify and document the smallest valid pair of independently enumerable Business-scoped execution paths, then create an integration candidate. No production change is indicated by this audit.

## 8. Evidence index

- [C] `empresa-scope.extension.ts`: scoped operation mechanism and fail-closed behavior.
- [C] `empresa-scoped-prisma.service.ts`: `forEmpresa(empresaId)` factory.
- [C] `prisma.module.ts`: raw `PrismaService` export.
- [C] `ventas.service.ts`, `pedidos.service.ts`, `tienda.service.ts`: concrete Business-scoped application paths.
- [C] `legajo.controller.ts` / `legajo.cliente.controller.ts`: raw-client paths with manual tenant validation.
- [E] Existing B3 candidate suites: relation slices and ISO-006.
- [D] B3 invariant/test reconciliation: ISO-008 is CONDITIONAL and its path-enumerability prerequisite is a process rule.
