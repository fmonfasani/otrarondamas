# WAPSELL — R8-ID-003 OWNER DECISION — LEGACY IDENTITY COEXISTENCE

**Fecha:** 2026-10-03  
**Task:** R8-ID-003  
**Decision:** CLOSED — OWNER APPROVED DIRECTION  
**Implementation:** NOT AUTHORIZED

## 1. Owner ruling

The Owner accepts the incremental coexistence direction for identity/tenancy transformation.

The transition must preserve existing functionality while introducing the approved:

`User → Membership → Business`

boundary over the current:

`Usuario → Empresa`

physical model.

## 2. Approved coexistence principles

1. Coexistence is **temporary and bounded**, not a permanent dual security model.
2. Existing `Usuario`, `Empresa`, legacy identifiers and current authentication behavior remain AS-IS evidence/compatibility inputs during transition.
3. The canonical authorization boundary is the approved User/Membership/Business model, not the legacy `Usuario.empresaId` relationship.
4. Legacy `empresaId` may exist as a transition compatibility field/mechanism while the migration is in progress, but it must not override the approved active Business Context.
5. New Business-scoped operations must preserve application-level tenant isolation.
6. A legacy session/token must not be treated as a permanent substitute for the new Membership authorization model.
7. Cutover from legacy identity/session semantics to the approved model is a separate controlled activity.
8. Rollback/containment must be explicitly designed before any destructive cutover.
9. Existing functionality is preserved unless an approved transformation explicitly changes it.
10. No destructive removal of legacy identity fields or flows is implied by this decision.

## 3. Authorization boundary during coexistence

The target security chain remains:

`Authenticated User → Active Business Context → ACTIVE Membership → Role → Permission → Authorized Operation`

The coexistence layer must therefore adapt legacy identity information into the approved context rather than establish a parallel authorization authority.

## 4. Session/authentication boundary

R8-ARCH-003 establishes JWT-centric authentication with application-controlled Business Context.

Therefore:

- legacy JWT evidence can be adapted;
- `empresaId` in an existing token cannot become the final authorization authority;
- Membership validity must control Business operation;
- exact token migration, refresh, revocation and logout mechanics remain downstream technical work.

## 5. Cutover and rollback

The decision requires:

- explicit cutover criteria;
- bounded coexistence period;
- compatibility containment;
- rollback/containment procedure;
- evidence that legacy and target authorization boundaries do not diverge.

The exact operational procedure is **not** invented here. It belongs to the later migration/cutover task.

## 6. Explicit non-approval

This decision does not authorize:

- schema migration;
- data backfill;
- token migration;
- token invalidation;
- deletion of `Usuario.empresaId`;
- deletion of legacy auth;
- code refactoring;
- production cutover;
- rollback execution.

## 7. Evidence

- DOCUMENTADO: R8-ARCH-002 and R8-ARCH-003 Owner decisions.
- DOCUMENTADO: R8-ID-002 physical model decision.
- VERIFICADO POR CÓDIGO: current Usuario→Empresa and legacy JWT/empresaId coupling.
- DOCUMENTADO: incremental migration direction already accepted in prior Owner decisions.

**R8-ID-003: CLOSED — OWNER APPROVED DIRECTION.**
