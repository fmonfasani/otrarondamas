# Membership Revocation — Specialized Specification v0.1

**Status:** PROPOSED — PENDING REVIEW/GATE

## Objective
Provide a canonical Business-scoped capability to suspend and reactivate Memberships and emit a domain event from the Identity & Membership revocation capability, consumed by dependent capabilities such as M4 Realtime Messaging.

## In Scope
- Owner-authorized suspension and reactivation.
- BusinessContext-based authority.
- ACTIVE ↔ SUSPENDED transitions only.
- Domain event membership.status.changed.
- Fail-closed cross-Business behavior.
- Runtime and regression tests.

## Out of Scope
- New Membership states.
- Changes to Usuario.activo.
- User deletion.
- Authentication/session redesign.
- Socket.IO implementation.
- Customer membership.
- New global authorization mechanism.
- Schema changes unless implementation proves an approved dependency.

## Authorization
The acting identity must resolve through canonical BusinessContext. The target Membership must belong to the same Business. Only an Owner may mutate it. An Owner cannot suspend their own Membership.

## Suspension
Precondition: target Membership is ACTIVE and belongs to the actor's Business. Effect: target becomes SUSPENDED.

## Self-suspension
The target Membership must not be the actor's own Membership. Self-suspension is rejected to prevent leaving the Business without its active Owner.

## Reactivation
Precondition: target Membership is SUSPENDED and belongs to the actor's Business. Effect: target becomes ACTIVE.

## Domain Event
After a successful status transition, emit membership.status.changed with the approved minimum payload. Membership remains the domain authority.

## Transactionality
The state change must be committed before dependent consumers treat the event as authoritative. Event delivery failure does not roll back a valid Membership transition under this baseline.

## Compatibility
Existing BusinessContext, Membership resolution, legacy JWT and Usuario.activo behavior outside this capability remain intact.

## Exit Criteria
Implementation, tests, invariants, regression, evidence, review and Gate pass with no unresolved blocker in scope.
