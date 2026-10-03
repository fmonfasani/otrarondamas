# WAPSELL — DESIGN & SPECIFICATION PROCESS LEDGER

**Document type:** Process / traceability record  
**Status:** ACTIVE — TRACEABILITY BASELINE  
**Purpose:** Preserve the documented path used to design Wapsell so that future work can reconstruct what was analyzed, decided, specified, implemented and validated.

> This ledger does not replace the canonical SPEC, Decision Register, specialized specifications, contracts, invariants, tests or implementation artifacts. It records the process and points to the authoritative artifact for each stage.

## 1. Operating rule

From this point forward, every significant approved artifact produced during the Wapsell design/construction procedure must be persisted in the repository in the appropriate documentation area.

The workflow remains:

REQUIREMENTS → SPEC GENERAL → SPECIALIZED SPECS → ARCHITECTURE → CONTRACTS → INVARIANTS → TESTS/EVALS → PLAN → TASKS → IMPLEMENTATION → VALIDATION → REVIEW → DELIVERY

Approval, repository persistence, implementation and validation remain distinct states.

## 2. Product model established

- Wapsell is the platform.
- Business is the tenant/business using Wapsell.
- Brand is the commercial/visual identity of a Business.
- User is the global identity.
- Membership represents User ↔ Business and carries role/permission context.
- A User can have different roles in different Businesses.
- Customer is a commercial identity separate from User, with an optional User relationship.
- The ERP/commerce engine is operational infrastructure; conversation is the primary commercial UX.
- AI assistants are future scope and are not active in the current MVP.
- Wapsell Messaging MVP uses its own messaging channel and does not depend on WhatsApp.

## 3. Documentation transformation

The project adopted three explicit documentary layers:

1. AS-IS BASELINE — verifiable current state.
2. TRANSFORMATION SPEC — changes required to move from AS-IS to target.
3. TO-BE SPEC — approved/proposed target state.

Evidence is classified as:
- VERIFIED BY CODE
- VERIFIED BY TEST
- VERIFIED BY EXECUTION
- DOCUMENTED
- DERIVED / RECONSTRUCTED
- NOT DETERMINABLE
- CONTRADICTION

## 4. Canonical decision history preserved

The reconciled Decision Register contains D-001 through D-018 and the subsequent closure/propagation records.

### D-001
Business = Tenant. Empresa is transformed into Business as the multi-tenant isolation unit.

### D-002
User is global. User ↔ Business is N:N through Membership. Roles and permissions belong to Membership.

### D-002-bis
Customer is separate from User. Customer belongs to the Business commercial relationship and may exist without a User. A Customer may optionally link to a global User.

### D-003
Wapsell Messaging is active in MVP. AI is inactive initially. Messaging MVP does not depend on WhatsApp.

### D-004
Wapsell has a canonical Design System. A Business configures its Brand over that system. Customer-facing experience identifies the Business brand while Wapsell remains the underlying platform.

### D-005
Roles and permissions belong to Membership. The same User may have different roles in different Businesses.

### D-006
Authenticated access validates global User, target Business, valid Membership and required roles/permissions. Exact technical sequence remains an implementation concern.

### D-007
Order and Sale are conceptually distinct. Order represents request/intent and preparation/confirmation; Sale represents the confirmed commercial operation. Not every Order becomes a Sale.

### D-008
Sale has an explicit lifecycle. Confirmation is the point at which commercial/operational/economic effects apply. Confirmed Sales are not deleted; cancellation is explicit and produces applicable reversals/adjustments transactionally.

### D-009
SPEC is the source of truth. Unapproved functionality, scope, architecture or behavior must not be introduced. Implementation must be traceable.

### D-010
Stock integrity must be transactional and concurrency-safe. Invalid quantities are rejected and movement/result consistency is required.

### D-011
External payment gateways use an abstraction, with Mercado Pago as priority. External payments have independent states and traceability.

### D-012
Accounts receivable belongs to the Business. Partially/unpaid Sales may create Customer-associated AR and later collections must remain traceable.

### D-013
Each Business manages its own Cash with lifecycle Apertura → Operaciones/Movimientos → Arqueo → Cierre.

### D-014
Inventory belongs exclusively to a Business. There is no global shared stock and no inter-Business transfer unless explicitly defined later.

### D-015
Purchases occur within a Business from a Supplier. Outstanding purchase amounts generate AP associated with Business/Supplier and later payments remain traceable.

### D-016
Fulfillment belongs to Orders. Delivery assignment and delivery states are explicit and traceable; Fulfillment is not necessarily a top-level navigation module.

### D-017
Initial architecture is a modular monolith with clear domain/application responsibility boundaries.

### D-018
CI/CD is progressively automated with code validation, build, tests and appropriate integration/E2E validation; failed required validations cannot advance.

## 5. Decision closure and reconciliation milestones

The process produced and propagated:

- R1 — Documentary Reconciliation.
- R2 — Owner Decision Closure.
- R3 — Canonical Propagation.

R2 closed the identified Owner decision questions without authorizing implementation by itself.

The following were explicitly closed:
- OR-002-B — incremental transition with bounded temporal coexistence.
- OR-002-C — global User identity with globally unique email.
- OR-002-D — User + Membership; Customer independent with optional Customer → User.
- OR-002-E — temporary legacy session/token compatibility, followed by invalidation and new login.
- OR-002-F — technical specification → Owner approval → implementation.
- P1-A — Empresa → Business also applies to persistent model; final destination is option C.
- P5-B — specification → approval → implementation.
- CON-010 / ISS-07 — conceptually resolved.
- ISS-08 — seven-level precedence rule confirmed.
- Customer/User linking rules A1–A7 confirmed.

## 6. Messaging specification pipeline

Messaging was taken through the approved pipeline:

Messaging functional Owner Decision Pack
→ Messaging MVP SPEC
→ Messaging Contracts
→ Messaging Invariants
→ Messaging Tests/Evals
→ Messaging Implementation Plan
→ Messaging Tasks
→ technical task specifications.

Functional decisions covered:
- 1:1 and group conversations;
- text, images, files and voice;
- history, unread/read state and delivery state;
- participant management;
- group administration;
- message edit/delete;
- reactions;
- mute;
- archive/pin/search;
- forwarding;
- attachments and file limits;
- Customer/Order/Sale/Product/Purchase associations;
- Business isolation;
- temporal participation access;
- blocking;
- audit/history;
- realtime;
- notifications.

## 7. Approved technical Messaging tasks

### MSG-001 — Persistence
Approved physical persistence baseline at logical level:
Business → Conversation → Participants/Messages → Attachments/Reactions/Associations.

Physical table names, Prisma schema, IDs, deletion mechanism, storage implementation, realtime and search engine were intentionally left open.

### MSG-002 — Realtime
Approved realtime architecture:
- WebSocket as main transport direction;
- Socket.IO + NestJS Gateway as a technical option;
- persistence remains source of truth;
- authorization applies to realtime;
- rooms, durable/ephemeral events, reconnect, presence and typing are considered;
- no broker was selected.

Repository inspection verified NestJS/RxJS and absence of current Nest WebSocket/Socket.IO implementation.

### MSG-003 — Storage
Approved Owner rule:
- Wapsell-controlled storage on Hetzner VPS;
- no external object-storage provider for Wapsell data;
- Wapsell owns the Storage abstraction conceptually equivalent to buckets, objects, metadata, policies, lifecycle and audit;
- domains consume Wapsell Storage abstraction;
- physical engine remains to be evaluated.

### MSG-004 — Authorization
Approved authorization architecture:
User → Membership → Business → resource.

Authorization must cover membership validity, Business scope, role/permission, participant/resource relationship, search, realtime and Storage access. Object IDs alone must not authorize access.

### MSG-005 — Search
Approved query architecture:
- authorization scope first, query second;
- global search only across accessible conversations;
- date/participant/conversation/content filters;
- TEXT/IMAGE/FILE filters, excluding voice;
- deleted messages not normally searchable;
- historical audit content not exposed as normal search;
- temporal participation restrictions apply;
- no search engine selected yet.

### MSG-006 — Notifications
Approved after creation in this process.

Core rules:
- notify except when muted;
- mute suppresses notification only;
- messages still arrive;
- unread continues;
- authorization precedes notification;
- notification state is distinct from message state;
- participation/expulsion/rejoin rules apply;
- no WhatsApp dependency;
- notification and realtime are separate effects;
- Storage remains the source for binary resources;
- idempotency, asynchronous delivery, retries and observability are required architecturally;
- provider, queue/worker, retry policy, persistence details and other implementation specifics remain open.

## 8. Current approved pipeline

SPEC
→ Contracts
→ Invariants
→ Tests/Evals
→ Plan
→ Tasks
→ MSG-001 Persistence APPROVED
→ MSG-002 Realtime APPROVED
→ MSG-003 Storage APPROVED
→ MSG-004 Authorization APPROVED
→ MSG-005 Search APPROVED
→ MSG-006 Notifications APPROVED
→ Messaging Functional Owner Decision Register G001–G105 PERSISTED

## 9. Repository traceability rule

A significant artifact reaches the repository after its status is established. The repository must preserve:

- the artifact;
- its status;
- its scope;
- its relationship to requirements/decisions;
- relevant evidence;
- historical versions where necessary.

Canonical documents must not be silently overwritten by reconstructed or draft material.

## 10. Implementation boundary

Approval of documentation does not authorize implementation unless the applicable technical specification and implementation gate explicitly authorize it.

No schema, migration, endpoint, event name, dependency, infrastructure component or physical identifier is considered approved merely because it appears in a proposal.

## 11. Current state

This ledger is a traceability record for the Wapsell design process as reconstructed from the approved project history and current workflow.

It is not a substitute for the canonical Decision Register or specialized specifications.

Next work continues from the same procedure at the next approved Messaging task, while preserving each significant artifact in the repository.
