# WAPSELL — Messaging M4 — Realtime Contracts v0.1

**Status:** APPROVED — CONTRACT BASELINE

## Connection contract

Input: existing JWT authentication credentials in Socket.IO handshake.

Success: authenticated socket with resolved BusinessContext.

Failure: connection rejected; no unauthenticated socket enters protected Messaging rooms.

## Room contract

Client command: request subscription to a conversation.

Server preconditions:
- authenticated identity;
- resolvable BusinessContext;
- conversation exists in current Business;
- conversation is not deleted;
- Owner or active participant authorization.

Success: socket joins the authorized conversation room.

Failure: room is not joined and no cross-tenant information is disclosed.

## Event contract

| Event | Trigger | Persistence prerequisite |
|---|---|---|
| `conversation.message.created` | message successfully created | committed Message |
| `conversation.message.updated` | message successfully edited | committed Message update |
| `conversation.message.deleted` | message successfully deleted | committed soft-delete |
| `conversation.message.read` | read receipt successfully persisted | committed MessageReadReceipt |

Event payloads are versionable application contracts. They must include conversation/message identifiers and only authorized state.

## Mutation contract

M4 does not add Socket.IO mutation commands for message creation/edit/delete. Existing HTTP endpoints remain authoritative.

## Recovery contract

If a client misses an event, HTTP retrieval remains the source of truth. Event delivery is not the persistence guarantee.

## Error contract

Authentication, tenant resolution, conversation lookup and authorization failures are fail-closed. Error responses must not reveal cross-Business existence.

## Compatibility contract

M4 must preserve all existing M1–M3 and Read Receipts HTTP behavior and authorization semantics.
