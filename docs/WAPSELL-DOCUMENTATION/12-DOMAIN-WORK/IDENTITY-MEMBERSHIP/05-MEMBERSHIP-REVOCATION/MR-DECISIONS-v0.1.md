# Membership Revocation — Decisions v0.1

**Status:** APPROVED — FUNCTIONAL/TECHNICAL BASELINE

## MR-D01 — Revocation authority
**Decision:** Owner only. Within a Business, the Owner may suspend and reactivate Memberships. No new authorization mechanism.

## MR-D02 — Canonical operation
**Decision:** suspendMembership(). Canonical transitions: ACTIVE → SUSPENDED and SUSPENDED → ACTIVE. No REVOKED status.

## MR-D03 — Legacy synchronization
**Decision:** Membership is the contextual authority. Suspension/reactivation changes Membership.status and does not change global legacy Usuario.activo. This preserves multi-Business semantics.

## MR-D04 — Reactivation
**Decision:** In scope. Owner may reactivate SUSPENDED → ACTIVE.

## MR-D05 — Domain event
**Decision:** Explicit event membership.status.changed with membershipId, userId, businessId, previousStatus, newStatus and occurredAt. No credentials, JWT, permissions or unrelated personal data.

## Rationale
Reuse the existing Membership status model, establish Membership as Business-scoped authority, avoid a second identity/authorization mechanism, preserve legacy Usuario.activo, and provide the signal required by M4-D11.
