# Membership Revocation — Contracts v0.1

**Status:** PROPOSED — PENDING REVIEW/GATE

## Suspend Membership
Input: membershipId.
Preconditions: authenticated User, canonical BusinessContext, actor Owner, target Membership in current Business, target ACTIVE.
Result: target becomes SUSPENDED.

## Reactivate Membership
Input: membershipId.
Preconditions: authenticated User, canonical BusinessContext, actor Owner, target Membership in current Business, target SUSPENDED.
Result: target becomes ACTIVE.

## Event Contract
Event: membership.status.changed

Payload:
- membershipId
- userId
- businessId
- previousStatus
- newStatus
- occurredAt

## Error Contract
Unauthenticated → authentication failure.
Unresolved BusinessContext → fail closed.
Non-Owner → authorization failure.
Foreign Membership → authorization-safe not-found/failure.
Invalid transition → conflict/business-rule failure.

Exact HTTP mapping reuses existing project conventions.

## Event Semantics
Emitted only after a successful persisted transition; contains only approved fields; never crosses Business boundaries; consumers do not become a Membership store.
