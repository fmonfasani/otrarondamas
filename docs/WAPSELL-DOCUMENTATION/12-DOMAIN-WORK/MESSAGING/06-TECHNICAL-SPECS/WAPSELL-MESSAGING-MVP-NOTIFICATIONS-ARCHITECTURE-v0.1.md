# WAPSELL MESSAGING MVP — NOTIFICATIONS ARCHITECTURE v0.1

**Task:** TASK-MSG-006  
**Status:** APPROVED  
**Purpose:** technical architecture for Messaging notifications.  
**Implementation status:** documentation approved; implementation not authorized by this document alone.

## 1. Functional basis

Approved Messaging rules:

- **G21:** notify always except when the conversation is muted.
- **G22:** mute suppresses notification; messages still arrive and unread continues.
- **G25:** message states are sent → delivered → read.
- **G26–G27:** read receipts are an independent preference.
- **G70–G75:** joining, leaving, expulsion and rejoin affect access and therefore notification eligibility.
- **D-003:** Wapsell Messaging MVP is its own messaging channel and does not depend on WhatsApp.

## 2. Core architecture

Notification is a derived effect, not the source of truth.

```
Messaging Event
    ↓
Visibility / Authorization
    ↓
Notification Policy
    ↓
Mute Check
    ↓
Notification Creation / Dispatch
    ↓
Delivery State
```

Message persistence remains authoritative. Notification failure must not invalidate or modify the message.

## 3. Message delivery vs notification delivery

They are independent.

Mute produces:

```
message delivered
unread incremented
notification suppressed
```

Therefore message delivery state and notification delivery state must not be represented as the same state.

## 4. Mute

Mute is contextual to:

```
User ↔ Conversation
```

Mute does not:

- block messages;
- stop persistence;
- stop unread;
- remove realtime delivery;
- change authorization;
- delete the conversation.

It only suppresses notification delivery for that user/conversation.

## 5. Authorization

Authorization precedes notification generation.

```
Event
 ↓
Conversation belongs to Business
 ↓
Recipient has valid access
 ↓
Recipient is eligible
 ↓
Check mute
 ↓
Create / dispatch notification
```

A user must never receive a notification revealing a resource to which the user has no current access.

Cross-Business notification leakage is prohibited.

## 6. Participation

A participant who leaves or is expelled is no longer eligible for new notifications from that conversation.

A participant who is re-added becomes eligible for new activity according to the Messaging access rules. Rejoining does not reconstruct old notification history.

## 7. Conversation deletion

Once a conversation is functionally deleted for users, no new user-visible notifications may expose it.

Internal audit retention, where applicable, is distinct from user-visible notification delivery.

## 8. Event classes

The architecture supports notification decisions for:

- new messages;
- group activity;
- participant events;
- other Messaging events when a functional requirement establishes notification behavior.

Message edit/delete and reactions must not receive invented notification behavior. Their exact policy remains open unless explicitly specified.

## 9. Customer and Business members

Customers and authorized Business members may participate in conversations. Notification eligibility is determined by access, participation and mute state.

Owner/Admin access to a Business does not automatically imply subscription to every conversation's notifications unless a specific requirement establishes that behavior.

## 10. Realtime

Realtime and notifications are separate effects:

```
Message persisted
   ├── Realtime event
   └── Notification policy
```

Loss of a WebSocket connection must not erase the underlying message or notification obligation.

## 11. In-app notification model

The architecture requires a logical notification representation containing, as applicable:

- recipient;
- Business;
- Conversation;
- source Message/Event;
- notification type;
- creation time;
- read state;
- delivery state.

Physical table names, columns and identifiers are not fixed by this document.

## 12. External channels

Messaging MVP does not depend on WhatsApp.

No external notification provider is approved by this task. Push, Web Push, email and future mobile notification channels remain technical decisions to be evaluated separately.

## 13. Storage

Notifications must not duplicate Messaging binaries.

Images/files referenced by a notification continue to use the Wapsell Storage abstraction and its authorization controls.

Wapsell Storage remains on Wapsell-controlled infrastructure on Hetzner according to MSG-003.

## 14. Idempotency and asynchronous delivery

Notification processing must tolerate repeated event processing without producing equivalent duplicate notifications.

A logical deduplication identity may use event, recipient and notification type; the physical key is not approved here.

Notification delivery may be asynchronous and must not block the consistency of the Message transaction.

## 15. Failures and retries

Notification failure must not:

- revert a Message;
- delete a Conversation;
- alter unread;
- alter Message state;
- alter authorization.

Transient delivery failures require retry support. Exact retry count, backoff, queue/worker and dead-letter policy remain open.

## 16. Security

Notification previews, titles, participant names, attachment metadata and deep links must respect current authorization.

A deep link is not authorization:

```
Notification → Deep Link → Authentication → Authorization → Conversation
```

If access has been revoked when the user opens the link, the resource must remain inaccessible.

## 17. Observability

The architecture must distinguish at least:

- notification created;
- notification suppressed by mute;
- delivery attempted;
- delivery succeeded;
- delivery failed;
- retry performed.

Useful future metrics include generation, suppression, success/failure, retries, latency and duplicate prevention.

## 18. Open technical decisions

Not fixed by this artifact:

- notification provider;
- Web Push/PWA strategy;
- mobile push;
- email;
- queue/event bus;
- worker model;
- retry/backoff;
- physical notification persistence;
- retention;
- deduplication implementation;
- browser permission model;
- offline behavior;
- preview policy;
- rate limiting;
- notification center implementation.

## 19. Evidence

**VERIFIED BY CODE**

The AS-IS Prisma schema contains a legacy `Notificacion` model linked to `Empresa`, optionally `Pedido`, and fields including `evento`, `canal`, `destinatario` and `estadoEnvio`. This model is historical AS-IS evidence and is not automatically the TO-BE Messaging notification model.

**DOCUMENTED**

G21, G22, G25, G26–G27, G70–G75 and D-003.

**NOT DETERMINABLE / OPEN**

Physical persistence, provider, queue, workers, retry strategy and other implementation details listed above.

## 20. Implementation boundary

This document approves the architecture. It does not by itself authorize:

- Prisma schema changes;
- migrations;
- new dependencies;
- endpoints;
- event names;
- infrastructure changes;
- deployment.

Those require the corresponding technical implementation gates.
