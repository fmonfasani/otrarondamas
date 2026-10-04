# WAPSELL — MASTER OWNER DECISION CLOSURE — 2026-10-03

**Fecha:** 2026-10-03  
**Estado:** CLOSED — OWNER ACCEPTED THE MASTER RECOMMENDATION PACKAGE  
**Naturaleza:** cierre documental de las recomendaciones aceptadas por el Owner  
**Implementación:** NOT AUTHORIZED unless separately approved

## 1. Purpose

The Owner explicitly accepted **all recommendations** contained in the previously presented Master Decision Package.

This document records that acceptance as a single governance artifact and converts the recommendation package into an Owner-approved direction set.

This document does not erase or rewrite historical evidence. Where a previous canonical decision already exists, this closure confirms or consolidates it. Where a technical mechanism was explicitly left open by a prior Owner ruling, that openness remains unless the recommendation itself was an explicit mechanism decision.

## 2. Governance rule

The acceptance means:

1. The recommended direction is accepted as the product/architecture decision.
2. Existing Owner rulings remain authoritative.
3. Technical implementation must still respect the approved architectural boundaries.
4. No schema, migration, destructive code change, deployment or production cutover is authorized by this document alone.
5. Any implementation detail that remains explicitly OPEN in a higher-authority Owner decision remains OPEN until separately closed.

## 3. Master accepted decision set

| # | Decision area | Owner-accepted direction | Implementation status |
|---:|---|---|---|
| 1 | Physical Business model | Incremental transition: retain existing Empresa as the physical Business representation during transition, introduce Membership and preserve IDs where practical; physical migration/cutover later. | Direction closed; physical model/migration detail remains task-specific |
| 2 | Role placement | Roles are properties of Membership, not global User. | Closed |
| 3 | Membership lifecycle | Membership has conceptual ACTIVE/INACTIVE lifecycle; inactive Membership cannot operate. | Closed |
| 4 | Business Switch | User may operate across multiple Businesses through a controlled active Business context established by the application. | Direction closed; protocol/mechanism remains implementation detail |
| 5 | Access-token strategy | JWT-centric authentication is accepted as the incremental session/authentication direction. | Closed at architectural direction |
| 6 | Refresh/session continuation | Use a controlled session-continuation mechanism when required by the final authentication implementation; it must not bypass Membership authorization. | Direction accepted; exact mechanism remains implementation detail where not otherwise closed |
| 7 | Session revocation | Protected sessions must support controlled invalidation/revocation semantics appropriate to the selected session mechanism. | Direction accepted; mechanism remains implementation detail |
| 8 | JWT claims | JWT is authentication context, not the sole authorization source. Claims must not replace Membership→Role→Permission evaluation. | Closed principle; exact claim set remains implementation detail |
| 9 | MFA | MFA/2FA is mandatory for Owner/Admin. Technical mechanism remains implementation detail unless separately specified. | Closed requirement |
| 10 | Google authentication | Google OAuth remains an authentication path and must onboard/reconcile through global User + Membership semantics rather than legacy Empresa authorization. | Closed direction; onboarding mechanics remain implementation detail |
| 11 | Permission catalogue | Authorization is Membership→Role→Permission. A canonical permission catalogue and matrix must be established before implementation of authorization-sensitive slices. | Direction closed; catalogue is controlled downstream work |
| 12 | Role-permission matrix | Roles receive permissions through the canonical permission model; no global Profile/Capability/Overrides model is introduced for MVP. | Closed direction; matrix derivation is downstream work |
| 13 | Customer↔User association | Hybrid controlled association: detect/propose, then explicit confirmation; no automatic association solely because emails match. | Closed |
| 14 | Customer unlink/merge | Customer and User remain distinct; association/unlink/merge operations require explicit controlled semantics and traceability. | Direction closed; exact workflow downstream |
| 15 | Product / BusinessProduct | Hybrid model: global Product identity plus BusinessProduct commercial configuration. Business-specific price, visibility, SKU and similar commercial data belong to the Business relation. | Closed conceptually; exact field allocation remains specialized work |
| 16 | Cart | Anonymous Cart is permitted; Customer becomes required before Order creation. When Customer exists, Cart is associated to that Customer, with optional User link. | Closed |
| 17 | Order confirmation | Commercial confirmation is a Business-authorized action governed by ORDER_CONFIRM; Customer intent alone does not constitute Business authorization. | Closed |
| 18 | Stock reservation | Confirmation of an Order reserves stock. Physical stock decrement occurs later through the actual stock-out movement representing physical exit. | Closed conceptually; transaction boundaries downstream |
| 19 | Stock concurrency | Inventory operations must preserve atomicity, concurrency safety, non-negative stock and transactional consistency. Existing integrity controls must be preserved/verified. | Closed requirement; technical mechanism downstream |
| 20 | Location | Generic Location model; MAIN/default minimum; multiple Locations permitted. No separate mandatory Branch/Warehouse concepts are introduced at this decision level. | Closed conceptually; physical model downstream |
| 21 | Order states | Order has an explicit lifecycle distinct from Sale; exact states/effects are defined in specialized Commerce/Order work. | Direction closed; detailed state machine downstream |
| 22 | Sale correction | Confirmed Sale is immutable; corrections occur through explicit cancellation, reversal and/or refund operations with traceability. | Closed |
| 23 | Payment lifecycle | Payment is a distinct lifecycle from Sale and must preserve authorization/approval/rejection/cancellation/reconciliation semantics as applicable. | Closed direction; detailed state machine downstream |
| 24 | Payment↔Sale | Payment is associated with the commercial operation without collapsing Payment and Sale into one entity/lifecycle. | Closed |
| 25 | Payment↔Cash | Cash effects must be explicit, Business-scoped and traceable; Payment/Cash integration must preserve authorization and reconciliation controls. | Closed direction; exact accounting/cash effects downstream |
| 26 | Accounts Receivable | AR/Cuentas por Cobrar is part of the MVP; outstanding balances belong to the Business and are associated with the Customer where applicable. | Closed |
| 27 | Cash lifecycle | Cash follows Apertura → Operaciones/Movimientos → Arqueo → Cierre; closed cash is not directly modified and corrections use compensating/authorized adjustment operations. | Closed direction; exact state/adjustment rules downstream |
| 28 | Sensitive Cash authorization | Sensitive Cash operations require explicit Permissions. | Closed |
| 29 | Fulfillment lifecycle | Fulfillment remains under Orders and has an explicit preparation/delivery lifecycle. | Closed direction; detailed lifecycle downstream |
| 30 | Repartidor boundary | Repartidor is not an MVP Membership Role. Fulfillment can exist without introducing that role into MVP authorization. | Closed |
| 31 | Returns | Returns belong to Commerce TO-BE and are handled through explicit traceable operations. | Closed scope; detailed rules downstream |
| 32 | Refunds | Refunds belong to Commerce TO-BE and are explicit corrective/economic operations with traceability. | Closed scope; detailed rules downstream |
| 33 | Conversation model | Messaging is a first-class functional domain; each commercial Conversation belongs to exactly one Business. | Closed |
| 34 | Conversation participants | Participants may be Users and/or Customers; Customer participation does not require a User account. | Closed |
| 35 | Realtime | Messaging should support timely conversation state updates; exact realtime transport remains an implementation concern unless separately specified. | Direction accepted; mechanism downstream |
| 36 | Messaging↔Commerce | Commercial actions may be contextualized in Conversations, while Commerce remains authoritative for commercial state. | Closed |
| 37 | Attachments/notifications | Messaging may support attachments and notifications as product capabilities; exact model, storage and delivery mechanisms remain downstream. | Scope accepted; implementation detail downstream |
| 38 | Brand | Business Brand is the customer-facing identity over a common Wapsell Design System; Wapsell remains the underlying platform. | Closed |
| 39 | Audit | Security-sensitive and commercially relevant operations require traceability/auditability appropriate to the domain. | Closed requirement; exact audit model downstream |
| 40 | Notifications | Notifications are a cross-cutting capability and must not bypass Business context or authorization. | Direction accepted; delivery/channel details downstream |
| 41 | First implementation slice | Start from the approved architectural boundary: Identity/Tenancy + Authorization + Application orchestration + persistence boundary + cross-cutting controls, followed by one selected domain capability. | Closed direction; slice selection/readiness remains controlled task |
| 42 | Migration strategy | Incremental transformation with temporary coexistence where required; preserve existing functionality and traceability; cutover/rollback are separately designed. | Closed direction |
| 43 | Legacy empresaId | Treat current empresaId as AS-IS evidence/transition mechanism, not final authorization truth; adapt existing scoped mechanisms rather than replacing them by assumption. | Closed direction; migration mechanics downstream |

## 4. Explicit preservation of higher-authority constraints

The following remain binding:

- Membership → Role → Permission.
- JWT alone does not authorize Business access.
- Application-level tenant isolation is the approved technical isolation direction.
- Business context is server-established and cannot be overridden by a client-supplied Business identifier.
- Owner/Admin MFA is mandatory.
- Customer ≠ User.
- Customer↔User association is controlled; no email-only auto-link.
- Product identity is global conceptually; BusinessProduct carries Business-specific commercial configuration.
- Order ≠ Sale.
- Sale is born on commercial confirmation and is not contingent on delivery.
- Confirmed Order reserves stock.
- Physical stock decrement is represented by a stock-out movement for actual physical exit.
- Negative stock is prohibited.
- FEFO for expiring products; FIFO for products without expiry.
- Inventory is Business-owned; no shared global stock.
- Location is generic, with MAIN minimum.
- Messaging is first-class and does not depend on WhatsApp for MVP.
- AI is inactive in MVP.
- Fulfillment is under Orders; Repartidor is outside MVP Membership Roles.
- Modular Monolith is the approved architectural direction.
- Kubernetes/GraphQL remain technical choices, not mandatory stack decisions.
- Technical Specification remains subject to its own approval gate.
- Implementation remains NOT AUTHORIZED until implementation-readiness gates are satisfied.

## 5. Important distinction: accepted direction vs implementation detail

The Owner's acceptance of all recommendations does **not** authorize silently inventing technical mechanisms.

The following examples remain derivable technical work unless a higher-level decision explicitly closes them:

- exact database schema;
- exact ORM usage;
- exact API protocol;
- exact JWT claims;
- token transport;
- refresh-token/session implementation;
- revocation storage;
- Business Switch endpoint/protocol;
- MFA provider/mechanism;
- transaction boundaries;
- locking/concurrency primitives;
- event broker/outbox;
- realtime transport;
- attachment storage;
- notification provider;
- physical Product/BusinessProduct field allocation;
- physical Location schema;
- exact Order/Sale state machine;
- Payment reconciliation mechanics;
- Cash adjustment mechanics;
- Messaging physical model;
- deployment/infrastructure.

These are not rejected. They are controlled downstream design work.

## 6. Effect on previous recommendation package

The previous 43-item package is now treated as **OWNER-ACCEPTED RECOMMENDATION DIRECTION** rather than an informal suggestion.

Where an item overlaps an existing Owner ruling, the existing ruling remains the authoritative record and this document provides consolidated closure.

Where an item proposes an implementation mechanism that conflicts with an explicit earlier OPEN or NON-DECISION statement, the earlier explicit boundary prevails until a dedicated decision closes it.

## 7. Implementation gate

This closure does not move the project directly to implementation.

Required next sequence:

1. propagate accepted decisions into the canonical Decision Register;
2. reconcile affected canonical Specifications;
3. reconcile Contracts;
4. reconcile Invariants;
5. reconcile Tests/Evals;
6. update Transformation/TO-BE traceability;
7. execute remaining R8 readiness tasks;
8. define the first implementation slice;
9. only then authorize implementation through the applicable gate.

## 8. Evidence

- **DOCUMENTADO:** Owner acceptance in the current session.
- **DOCUMENTADO:** R8-ARCH-001 Owner approval.
- **DOCUMENTADO:** R8-ARCH-002 Owner decision.
- **DOCUMENTADO:** R8-ARCH-003 Owner decision.
- **DOCUMENTADO:** OR-B2 and OR-B3 rulings already present in the Decision Register.
- **NOT CLAIMED:** implementation of any of the accepted directions.
- **NOT CLAIMED:** schema migration, deployment or production cutover.

## 9. Closure

**MASTER OWNER RECOMMENDATION PACKAGE: CLOSED — ACCEPTED.**

The project may proceed to controlled canonical propagation and R8 readiness work.

**Implementation remains NOT AUTHORIZED.**
