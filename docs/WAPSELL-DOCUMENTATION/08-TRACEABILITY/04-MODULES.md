# Traceability - Modules

**Reconciled:** 2026-09-28

> ## Status: **NO MODULE INVENTORY EXISTS**
>
> The repository contains no module list, no NestJS module map, and no module-to-domain mapping.
> 00-WAPSELL-SPEC-GENERAL.md §20 asserts a **MODULAR MONOLITH** architecture, but D-017 has no
> text — so the architectural *shape* is a proposal too, not only the stack.

| Claim | Source | Status |
|---|---|---|
| Modular Monolith | 00 §20 | **PROPOSED** — D-017 undeterminable |
| NestJS / PostgreSQL / Docker / VPS | 00 §20 | **PROPOSED** — D-017 undeterminable |
| No microservices / Kubernetes / GraphQL in phase 1 | 00 §22 | **PROPOSED** — D-017 undeterminable |
| CI/CD TESTS→BUILD→VALIDATION→DEPLOY→RELEASE | 00 §22 | **PROPOSED** — D-018 undeterminable |
| Messaging is a first-class module | 00 §20 | **PROPOSED** |

## AS-IS baseline
05-ASIS/ documents the legacy wapsell-clientes / wapsell-pdv structure. The **fate of those
two repositories is explicitly NOT decided** (DEC-001:55-57), so no module can be asserted to
supersede them.

## Open
- No module inventory → no module-level traceability is possible. **OPEN.**
- Architecture decision evidence absent. CON-002, CON-026, CON-027 **OPEN**.