# WAPSELL — MESSAGING MVP
## Tasks v0.1

**Estado:** APPROVED — TASK BASELINE  
**Fecha:** 2026-10-01  
**Prerequisite:** Implementation Plan v0.1

---

# 1. Gate A — Technical decisions

### TASK-MSG-001 — Persistence
Define and approve the physical persistence architecture for Messaging.

### TASK-MSG-002 — Realtime
Define and approve realtime transport, authorization, rooms/channels,
reconnect and event propagation.

### TASK-MSG-003 — Storage
Define and approve Wapsell Storage architecture for Messaging attachments,
including Hetzner-controlled infrastructure.

### TASK-MSG-004 — Authorization enforcement
Define and approve concrete enforcement of User → Membership → Business →
Conversation/resource authorization.

### TASK-MSG-005 — Search
Define and approve search/query architecture and authorization-aware
result generation.

### TASK-MSG-006 — Notifications
Define and approve Messaging notification architecture and integration
with existing notification capabilities.

### TASK-MSG-007 — Audit
Define and approve audit persistence/retention behavior required by
Messaging.

### TASK-MSG-008 — Consistency
Define and approve transactional/concurrency behavior for critical
Messaging operations.

---

# 2. Gate B — Consolidation

### TASK-MSG-009 — Technical baseline consolidation
Consolidate approved technical decisions into a single implementation
baseline.

### TASK-MSG-010 — Dependency reconciliation
Reconcile Messaging dependencies with Identity/Tenancy, Commerce,
Storage, Notifications and Audit.

### TASK-MSG-011 — Contract consolidation
Confirm that technical decisions do not contradict approved functional
contracts.

### TASK-MSG-012 — Invariant consolidation
Confirm all approved invariants are implementable and testable under the
selected architecture.

---

# 3. Gate C — Approval

### TASK-MSG-013 — Technical specification approval
Obtain explicit approval of the consolidated Messaging Technical
Specification.

No implementation before this gate.

---

# 4. M1 — Foundation

### TASK-MSG-014 — Messaging module boundary
Create the Messaging domain/application boundary within the modular
monolith.

### TASK-MSG-015 — Business context enforcement
Integrate Messaging operations with Business/Membership authorization.

### TASK-MSG-016 — Persistence foundation
Implement approved persistence structures and migrations.

---

# 5. M2 — Conversations

### TASK-MSG-017 — Conversation lifecycle
Implement conversation creation and deletion behavior.

### TASK-MSG-018 — Participants
Implement participant membership, join, leave, expulsion and rejoin.

### TASK-MSG-019 — Group administration
Implement creator succession, administration transfer and participant
capacity.

---

# 6. M3 — Messages

### TASK-MSG-020 — Text messages
Implement text message creation and retrieval.

### TASK-MSG-021 — Message operations
Implement replies, reactions, editing and deletion.

### TASK-MSG-022 — Delivery/read state
Implement sent/delivered/read behavior and read-receipt preferences.

---

# 7. M4 — Attachments

### TASK-MSG-023 — File/image attachments
Implement validation, metadata and secure attachment handling.

### TASK-MSG-024 — Voice messages
Implement voice recording/upload/playback behavior and limits.

### TASK-MSG-025 — Wapsell Storage integration
Integrate Messaging with the approved Wapsell Storage abstraction.

---

# 8. M5 — Realtime

### TASK-MSG-026 — Realtime transport
Implement approved realtime transport.

### TASK-MSG-027 — Presence/typing
Implement presence and typing behavior.

---

# 9. M6 — Notifications

### TASK-MSG-028 — Messaging notifications
Integrate Messaging events with the approved notification architecture,
including mute/unread behavior.

---

# 10. M7 — Search

### TASK-MSG-029 — Search
Implement authorized conversation/message search and filters.

### TASK-MSG-030 — Search security
Implement and test no-leak behavior for inaccessible conversations,
deleted content and cross-tenant queries.

---

# 11. M8 — Commercial context

### TASK-MSG-031 — Associations
Implement associations with Customer, Order, Sale, Product and Purchase.

### TASK-MSG-032 — Association history
Implement historical association traceability and terminal-state
behavior.

---

# 12. M9 — Privacy

### TASK-MSG-033 — Blocking
Implement 1:1 blocking/unblocking and group independence.

### TASK-MSG-034 — Administrative deletion
Implement conversation deletion and functional visibility rules.

---

# 13. M10 — Validation

### TASK-MSG-035 — Unit/integration validation
Execute the approved functional and technical test suites.

### TASK-MSG-036 — Security validation
Execute IDOR, tenant-isolation, authorization, storage and search
security evaluations.

### TASK-MSG-037 — Regression/build validation
Run existing regression suite, build and relevant execution checks.

---

# 14. Execution rule

Tasks must execute in dependency order.

A task that depends on an OPEN technical decision cannot be implemented
through assumption.

Each completed task must record:

- scope;
- source requirement;
- implementation evidence;
- tests;
- execution evidence;
- resulting commit;
- remaining gaps.

---

# 15. State

**APPROVED — TASK BASELINE**

This document does not authorize implementation by itself. Implementation
starts only after Gate C and explicit execution authorization.
