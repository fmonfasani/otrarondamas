# WAPSELL — Messaging M4 — Tests / Evals v0.1

**Status:** APPROVED — TEST/EVAL BASELINE

## Unit

- Gateway authenticates valid JWT and rejects invalid credentials.
- BusinessContext is resolved through the canonical mechanism.
- Owner authorization is accepted for any non-deleted conversation in Business.
- Non-Owner authorization requires active participation.
- Cross-Business authorization fails closed.
- Deleted conversations cannot be subscribed.
- Membership revocation invalidates protected realtime access.
- Event construction does not leak unauthorized fields.

## Integration / HTTP + realtime

- Connect User in Business A and reject access to Business B conversation.
- Connect Customer in Business A and reject Business B conversation.
- Owner reads a conversation without participation.
- Non-Owner cannot read a conversation without active participation.
- Removing/revoking Membership prevents further protected access.
- Create HTTP message, then verify persisted state and emitted event ordering.
- Edit HTTP message, then verify update event.
- Delete HTTP message, then verify delete event without deleted content.
- Mark read through existing service, then verify read event.
- Disabled read preference prevents read event publication for that actor.
- Missed realtime event is recoverable through HTTP GET.
- Reconnection does not create unauthorized room membership.

## Regression

Run existing:
- API tests;
- tenant isolation regression;
- B3 tenant isolation candidate;
- S-V1 verification suites;
- FS-1a verification suite.

## Security / tenant isolation

Required cross-tenant cases:
- conversation subscription;
- message event delivery;
- read receipt event;
- revoked Membership;
- Owner access constrained to current Business.

## Failure evaluation

- invalid JWT;
- unresolved BusinessContext;
- inactive Membership;
- nonexistent conversation;
- conversation from another Business;
- deleted conversation;
- failed event emission after successful persistence.

The last case must prove that the database remains authoritative and the client can recover through HTTP.

## Evidence classification

Every result must be classified as VERIFIED BY TEST, VERIFIED BY CI, VERIFIED BY EXECUTION, NOT DETERMINABLE, or BLOCKED. Local success must not be reported as CI success.
