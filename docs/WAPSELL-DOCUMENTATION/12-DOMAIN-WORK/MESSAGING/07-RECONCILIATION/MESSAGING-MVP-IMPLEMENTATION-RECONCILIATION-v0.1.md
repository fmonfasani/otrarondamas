# WAPSELL — Messaging MVP — Implementation Reconciliation v0.1

**Estado:** APPROVED — RECONCILED IMPLEMENTATION BASELINE  
**Fecha:** 2026-10-08  
**Scope:** Messaging M1–M3 + Read Receipts  
**Business/Tenant:** Otra Ronda Más / Wapsell  
**Branch baseline:** `main`  
**Merge SHA:** `8d5c2bb0cd125bb86c910b968a1e702e8c0470e3`  
**Post-merge verification commit:** `8fd5e4c13ad448a6f02faa889b4ab2c6c236f017`

---

## 1. Purpose

This document reconciles the approved Messaging functional baseline, technical decisions, implementation, validation evidence and repository state.

It does **not** replace the historical functional specification, contracts, invariants, tests/evals, implementation plan or task baseline. Those artifacts remain traceability sources for the decisions and criteria that preceded implementation.

This document establishes the current implementation status without rewriting historical claims as if they had been true after implementation.

---

## 2. Source-of-truth chain

The reconciled chain is:

`Requirements → Owner Decisions → Functional SPEC → Contracts → Invariants → Tests/Evals → Technical Decisions → Plan/Tasks → Implementation → Validation → Review → Gate → Delivery`

### Functional authority

`G1–G105` remains the approved functional decision source.

### Technical authority for the implemented slice

The approved technical decision set MSG-D01–MSG-D25 governs the implemented persistence and lifecycle baseline, including:

- UUID identifiers;
- conversation soft deletion;
- participation history;
- User/Customer actor XOR;
- DIRECT/GROUP;
- 50-participant transactional limit;
- message soft deletion;
- no MessageRevision;
- replies within the same Conversation;
- reaction uniqueness;
- object-storage direction for attachments;
- signed access model;
- commercial association model;
- AuditLog reuse direction;
- Socket.IO direction;
- BusinessContext authorization;
- PostgreSQL search direction;
- in-app notifications;
- clientMessageId idempotency;
- per-Conversation sequence;
- existing observability;
- retention remaining OPEN/DEFERRED.

Read Receipts were additionally authorized as MVP scope by the Owner, including the required database changes.

---

## 3. Historical documents versus current state

The original v0.1 artifacts were written before implementation and contain statements such as:

- Messaging models do not yet exist;
- implementation is not authorized;
- physical persistence remains open;
- the technical persistence baseline is proposed rather than approved.

Those statements are preserved as historical baseline statements. They are **not** interpreted as the current repository state.

Current state is established by implementation commits, CI evidence, merge evidence and this reconciliation artifact.

---

## 4. Current implementation scope

### 4.1 Implemented

The merged Messaging slice contains:

1. Conversation creation and retrieval.
2. DIRECT/GROUP conversation model.
3. Participant lifecycle.
4. Participant history and re-entry periods.
5. Group administration.
6. Conversation deletion using functional soft deletion.
7. Text messages.
8. Per-Conversation message sequence.
9. clientMessageId idempotency.
10. Replies constrained to the same Conversation.
11. Message retrieval with participation-period visibility.
12. Message editing by author.
13. Message deletion with audit-oriented retention fields.
14. Owner global conversation/message visibility within the Business.
15. Canonical BusinessContext resolution.
16. Physical Business isolation in critical persistence relationships.
17. Read Receipts.
18. Per-actor read-receipt preferences.
19. User/Customer actor support for read receipts.
20. Idempotent read marking.
21. Filtering of receipts for actors who disabled read confirmations.

### 4.2 Explicitly not implemented by this slice

The following functional areas remain outside the implemented slice:

- realtime transport;
- presence;
- typing indicator;
- notification delivery;
- attachments as functional messaging flows;
- image processing;
- voice recording/playback;
- forwarding;
- archive;
- pinning;
- search;
- external link previews;
- internal commercial previews;
- functional commercial association workflows;
- blocking.

Their existence in the functional SPEC does not imply implementation.

---

## 5. Persistence implementation

The Messaging persistence foundation is present in Prisma and PostgreSQL.

Implemented models include:

- `Conversation`
- `ConversationParticipant`
- `Message`
- `Attachment`
- `Reaction`
- `ConversationAssociation`
- `MessagingReadPreference`
- `MessageReadReceipt`

Critical tenant relationships use Business-aware enforcement.

Read Receipts use:

- per-Business preference;
- User or Customer actor identity;
- tenant-aware foreign-key structure;
- actor XOR constraints;
- unique receipt per message and actor;
- indexes required by the implemented access paths.

A dedicated migration was created for Read Receipts:

`apps/api/prisma/migrations/20261008233000_messaging_read_receipts/migration.sql`

---

## 6. Authorization and tenant invariants

The implementation uses the canonical BusinessContext mechanism.

It does not introduce a second tenancy or authorization mechanism.

The implemented access rules include:

### Owner

An authenticated Owner may read any non-deleted conversation and its messages within the current Business without requiring an active ConversationParticipant record.

This does not automatically make the Owner a participant.

### Other actors

Non-Owner actors require active participation for protected conversation/message access.

### Cross-Business

Conversation, participant, message and read-receipt access remains Business-scoped.

### Customer/User

Messaging preserves the existing Wapsell distinction between:

- global User identity + Membership;
- Customer identity scoped to Business.

---

## 7. Read Receipts reconciliation

Read Receipts are part of the implemented MVP slice because the Owner explicitly authorized them.

Functional source:

- G25 — ENVIADO → ENTREGADO → LEÍDO;
- G26 — actor can disable read confirmations;
- G27 — disabled actors do not expose their own reads but can see allowed reads of others.

Technical implementation:

- `MessagingReadPreference`;
- `MessageReadReceipt`;
- `POST /messaging/conversations/:id/messages/:messageId/read`;
- `GET /messaging/conversations/:id/messages/:messageId/read-receipts`;
- `GET /messaging/conversations/read-receipts/preferences`;
- `PATCH /messaging/conversations/read-receipts/preferences`.

The existing `Message.readAt` field is not treated as the authoritative per-actor receipt state. `MessageReadReceipt` is the authoritative representation for per-actor read state.

---

## 8. Validation evidence

### Pre-merge CI

Candidate commit:

`c8db4bc447499d3dfd23a3e937d90e6512e1eafe`

- B3 Tenant Isolation Candidate — run `37770921667` — **SUCCESS**
- B4 Verification Infrastructure — run `37770921729` — **SUCCESS**

These runs verified the candidate before merge.

### Merge

PR #15:

`https://github.com/fmonfasani/otrarondamas/pull/15`

Merged into `main`.

Merge SHA:

`8d5c2bb0cd125bb86c910b968a1e702e8c0470e3`

### Post-merge verification

An explicit post-merge verification workflow was added in:

`8fd5e4c13ad448a6f02faa889b4ab2c6c236f017`

The existence of this workflow is **not by itself evidence that the workflow passed**. Its execution result must remain classified according to the actual GitHub run/status evidence.

---

## 9. Governance status

| Gate item | Status | Evidence |
|---|---|---|
| Functional scope | PASS | Owner Decisions G1–G105 + slice scope |
| Technical decisions | PASS | MSG-D01–D25 |
| Implementation | PASS | merged implementation |
| Tenant isolation | VERIFIED | B3 candidate CI |
| Regression | VERIFIED | B4 candidate CI |
| Read Receipts | VERIFIED | implementation + CI |
| Review | APPROVED | Owner approval |
| Gate | APPROVED | Owner approval |
| PR integration | VERIFIED | GitHub merge |
| Post-merge verification | CHECK REQUIRED | dedicated workflow exists; result must be checked |
| CLOSED | NOT YET | Definition of Done requires final evidence reconciliation |

---

## 10. Exit criteria for this reconciliation

This documentation reconciliation is complete when:

1. this document exists on the repository;
2. PR #15 evidence references the current verification workflow state;
3. historical documents are not silently rewritten as current-state documents;
4. the implemented slice is clearly distinguished from the complete functional MVP;
5. Read Receipts are explicitly traced from Owner decision to schema, service, controller and validation;
6. no unapproved functionality is declared implemented.

---

## 11. Final classification

**Messaging M1–M3 + Read Receipts: IMPLEMENTED / VERIFIED BY PRE-MERGE CI / MERGED TO MAIN**

**Documentation: RECONCILED**

**Review: APPROVED**

**Gate: APPROVED**

**Full Messaging MVP: NOT CLOSED**

**Reason:** the current slice does not implement every functional capability defined by the complete Messaging MVP baseline, and final closure remains dependent on the applicable verification evidence and future slices.

