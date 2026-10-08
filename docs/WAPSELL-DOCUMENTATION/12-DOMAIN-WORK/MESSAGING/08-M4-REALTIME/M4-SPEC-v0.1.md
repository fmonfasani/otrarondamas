# WAPSELL — Messaging M4 — Realtime Specification v0.1

**Status:** APPROVED — SPEC BASELINE
**Scope:** Realtime transport for the implemented Messaging domain.

## 1. Objective

Provide authenticated, Business-scoped realtime delivery for Messaging without moving domain authority or persistence into the Socket.IO layer.

## 2. In scope

- Socket.IO gateway lifecycle.
- JWT handshake authentication.
- BusinessContext resolution.
- Conversation room authorization.
- Owner global read visibility.
- Active-participant authorization for non-Owners.
- Membership revocation.
- Explicit domain events.
- Persistence-before-emit ordering.
- HTTP recovery after missed/failed realtime delivery.
- Realtime integration of read receipts.
- Connection, join, leave, disconnect and error handling.
- Tests for tenant isolation and authorization.

## 3. Out of scope

Presence, typing indicators, notification delivery, attachments, voice, forwarding, archive, pinning, search, link previews, commercial association workflows and blocking remain separate capabilities unless explicitly added to M4.

## 4. Connection

1. Client opens Socket.IO connection with JWT handshake credentials.
2. Server validates the JWT using the existing authentication mechanism.
3. Server resolves BusinessContext using the canonical mechanism.
4. No client-supplied Business ID becomes tenant authority.
5. Connection is rejected fail-closed if identity or BusinessContext cannot be resolved.

## 5. Conversation rooms

The client requests subscription to a conversation.
The server resolves the conversation inside the authenticated Business before joining the room.

Authorization:
- Owner: may subscribe to any non-deleted conversation in the current Business.
- Non-Owner: requires active participation in that conversation.
- Cross-Business conversation: rejected.
- Deleted conversation: rejected.

Room membership is not an authorization primitive by itself; every protected operation remains domain-authorized.

## 6. Membership revocation

Realtime access depends on active Membership.

When a Membership becomes inactive/revoked, the Membership domain service emits a domain event. The Socket.IO Gateway consumes that event and immediately invalidates protected realtime access affected by that Membership, including authorized room subscriptions as applicable.

Membership remains the authority. The event is a notification path to the realtime transport, not a second authorization or Membership mechanism.

M4 does not introduce a second Membership store.

## 7. Event model

Events are explicit domain events, including at minimum:

- `conversation.message.created`
- `conversation.message.updated`
- `conversation.message.deleted`
- `conversation.message.read`

Events are emitted only after the underlying operation has been successfully persisted.

The event payload must contain sufficient identifiers for the client to reconcile state but must not disclose data outside the authorized Business/conversation scope.

## 8. HTTP and realtime relationship

Existing HTTP endpoints and Messaging Services remain the authoritative mutation path.

Example:

`POST message → service validation → PostgreSQL commit → realtime emit`

The gateway must not implement a parallel message-creation path.

## 9. Delivery failure

Failure to emit after a successful database commit does not roll back the persisted domain operation.

The client can recover authoritative state through existing HTTP reads.

M4 does not introduce durable event infrastructure.

## 10. Read receipts

The existing read-receipt service remains authoritative.

Flow:

`markMessageRead() → persist receipt → emit conversation.message.read`

Read-preference rules remain unchanged. Realtime must not bypass the preference or tenant authorization rules.

## 11. Security requirements

- Fail closed on missing/invalid authentication.
- Never trust client-supplied Business ID as authority.
- Never allow cross-Business room subscription.
- Revalidate authorization at protected domain boundaries.
- Do not expose deleted-message content.
- Do not expose receipts hidden by actor preference.
- Do not emit an event before persistence succeeds.

## 12. Acceptance

M4 is technically acceptable only when the contracts, invariants, required tests/evals and CI evidence all pass. Implementation alone is insufficient.
