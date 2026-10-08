# WAPSELL — Messaging M4 — Realtime Decisions v0.1

**Status:** APPROVED — OWNER DECISION BASELINE
**Baseline:** main `d5e12a27bc0c67588f4b678d621bbb8e0dfcb9d9`

## Approved decisions

| ID | Decision | Approved baseline |
|---|---|---|
| M4-D01 | Socket authentication | JWT in Socket.IO handshake |
| M4-D02 | Business authority | Canonical BusinessContext |
| M4-D03 | Conversation authorization | Owner global read access within Business; non-Owner requires active participation |
| M4-D04 | Membership revocation | Realtime access revoked immediately when Membership is no longer active |
| M4-D05 | Subscription | Explicit conversation join; server authorizes before room entry |
| M4-D06 | Events | Explicit domain event names |
| M4-D07 | Persistence | Persist and commit before emitting |
| M4-D08 | Emit failure | Persisted operation remains valid; client recovers through HTTP |
| M4-D09 | Mutations | Existing HTTP/services remain mutation path; Socket.IO is event transport |
| M4-D10 | Read receipts | Reuse existing read service and emit realtime read event |

## Non-goals

No Redis, broker, outbox, second authorization system, second tenancy mechanism, socket-side domain implementation, or schema redesign is part of M4.

## Governance

These decisions are normative for M4 and must not be reopened without new evidence or an explicit new decision.
