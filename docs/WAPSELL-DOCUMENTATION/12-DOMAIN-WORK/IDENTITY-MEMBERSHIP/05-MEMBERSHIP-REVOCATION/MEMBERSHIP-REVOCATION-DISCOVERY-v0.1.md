# Membership Revocation — Discovery v0.1

**Status:** DISCOVERY — NOT APPROVED  
**Scope:** Identity & Membership / runtime revocation capability  
**Dependency:** M4 Realtime Messaging

## Objective
Define the missing runtime capability required by M4-D11: when a Membership becomes inactive/revoked, the Membership domain emits a domain event that the realtime Gateway can consume.

## AS-IS
- `MembershipService` is read-only.
- `MembershipModule` exports only `MembershipService`.
- `Membership.status` exists with states `ACTIVE | SUSPENDED`.
- Membership has unique `(userId, businessId)`.
- Current BusinessContext accepts only ACTIVE Memberships.
- Current documentation/code describes Membership status as derived from legacy `Usuario.activo`.
- No runtime Membership mutation endpoint/service was found.
- No Membership revocation domain event was found.
- `UsersController` is read-only.
- Dossier approval changes `Usuario.estadoLegajo`, not Membership status.

## TRANSITION CONSTRAINTS
- Membership remains the authority for Business membership validity.
- Do not create a second identity, tenancy, or authorization mechanism.
- Preserve legacy behavior outside this capability.
- Do not modify Prisma schema or migrations unless an approved requirement demonstrates a need.
- Do not implement realtime behavior in this slice.

## DISCOVERED GAP
M4-D11 requires a Membership-domain revocation event, but the current Membership capability has no runtime mutation path capable of producing it.

Therefore M4 implementation cannot correctly satisfy immediate revocation without this prerequisite.

## OPEN DECISIONS

### MR-D01 — Revocation authority
Who is authorized to suspend/revoke a Membership?

### MR-D02 — Runtime operation
What is the canonical operation: suspend Membership, deactivate Membership, or a broader revoke operation?

### MR-D03 — Legacy synchronization
When Membership is suspended/revoked, must legacy `Usuario.activo` also change, or does Membership become the sole authority for Business access?

### MR-D04 — Reactivation
Is `SUSPENDED → ACTIVE` in scope, and if so who may perform it?

### MR-D05 — Event contract
Proposed minimum event payload:
- event name
- membershipId
- userId
- businessId
- previousStatus
- newStatus
- occurredAt

No JWT, permissions, credentials, or unrelated personal data.

## NOT IN SCOPE
- Socket.IO Gateway implementation
- conversation authorization
- realtime event delivery
- schema redesign
- user deletion
- password/session management redesign
- multi-Business selector
- Customer identity changes

## EXIT CRITERIA
Discovery becomes implementation-ready only after MR-D01..MR-D05 are explicitly decided and documented in an approved specialized specification.
