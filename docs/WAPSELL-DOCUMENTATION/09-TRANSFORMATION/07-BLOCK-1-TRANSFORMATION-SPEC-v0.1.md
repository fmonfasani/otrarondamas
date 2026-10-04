# WAPSELL — BLOCK 1 TRANSFORMATION SPEC v0.1

**Status:** DRAFT — BLOCK 1 TRANSFORMATION / NOT APPROVED  
**Date:** 2026-10-04  
**Scope:** Wapsell MVP — Block 1  
**Sources:** AS-IS evidence + TO-BE reconciled + Block 1 Architecture + Contracts + Invariants + Tests/Evals  
**Implementation:** NOT AUTHORIZED

---

## 1. Purpose

This document defines the controlled transformation from the current AS-IS system toward the Block 1 TO-BE state.

It does not implement the transformation.

It establishes:

- what exists today where evidence is available;
- what the target state requires;
- the gap between both;
- the permitted transformation disposition;
- coexistence requirements;
- validation requirements;
- conditions that must be closed before an implementation task becomes executable.

The transformation is incremental, bounded and traceable.

No AS-IS behavior is considered obsolete merely because the TO-BE model differs from it.

---

# 2. Authority and evidence

Authority precedence:

```
OWNER RULING
    >
DECISION REGISTER
    >
CANONICAL SPEC
    >
TO-BE
    >
CONTRACT
    >
INVARIANT
    >
TEST / EVAL
    >
AS-IS
    >
HISTORICAL / WORKSHOP
```

AS-IS is evidence of current state.

AS-IS is not evidence of TO-BE compliance.

The following evidence classifications are used:

- **VERIFIED BY CODE**
- **VERIFIED BY TEST**
- **VERIFIED BY EXECUTION**
- **DOCUMENTED**
- **NOT DETERMINABLE WITH AVAILABLE INFORMATION**

---

# 3. Transformation principles

## T-001 — Incremental transformation

Transformation is performed in bounded increments.

No big-bang replacement is assumed.

---

## T-002 — Temporal coexistence

Where legacy behavior must continue operating while the target model is introduced, bounded temporal coexistence is permitted.

Coexistence must have:

- explicit scope;
- compatibility rules;
- validation;
- containment;
- eventual cutover criteria.

---

## T-003 — Preservation by default

Existing functionality is preserved unless an approved transformation explicitly changes its semantics.

Every affected behavior must be classified as:

- PRESERVED;
- ADAPTED;
- DEPRECATED;
- REPLACED — EXPLICITLY APPROVED.

---

## T-004 — Legacy identity is transitional

The current `Empresa` / `Usuario` / legacy identity/session structures may remain during the transition as compatibility mechanisms.

They are not the canonical TO-BE authorization model.

---

## T-005 — No inferred technical mechanism

A conceptual target rule does not select:

- schema;
- ORM;
- JWT claims;
- session storage;
- RLS;
- API style;
- event broker;
- locking mechanism;
- deployment topology.

These require separate specification/approval.

---

# 4. Transformation target

The Block 1 target chain is:

```
Global User
     ↓
Business
     ↓
Membership
     ↓
Active Business Context
     ↓
Role / Permission
     ↓
Customer
     ↓
Product / BusinessProduct
     ↓
Cart
     ↓
Order
     ↓
ORDER_CONFIRM
     ├── Sale
     └── Reservation
            ↓
       Physical Exit
            ↓
          Payment
          ↙   ↘
       Cash    AR
```

Messaging is an authorized conversational entry point:

```
Conversation
    ↓
Customer
    ↓
Commerce Context
    ↓
Cart / Order
```

Fulfillment remains within Orders.

Brand remains associated with Business.

---

# 5. AS-IS baseline relevant to Block 1

Only evidence relevant to the current transformation slice is included here.

## 5.1 Legacy identity and tenancy

**Evidence:** VERIFIED BY CODE / DOCUMENTED through the existing AS-IS and architecture audits.

Current implementation contains:

- `Empresa` as the existing business/tenant-like persistence boundary;
- `Usuario` coupled to the legacy business context;
- legacy `empresaId` usage;
- legacy role/permission information;
- JWT authentication carrying legacy Business-related context;
- existing Empresa-scoped Prisma services/extensions.

Current physical model therefore does not equal the canonical User/Membership/Business target model.

---

## 5.2 Existing tenant-scoping mechanism

**Evidence:** VERIFIED BY CODE.

Existing:

```
EmpresaScopedPrismaService.forEmpresa(empresaId)
empresaScopeExtension(empresaId)
```

The existing mechanism:

- forces Business/Empresa scope on applicable creates;
- scopes reads/writes/deletes;
- validates returned Business ownership on relevant unique lookup behavior;
- rejects unsupported operations;
- relies on parent-scoped discipline for some child relationships.

**Transformation disposition:** ADAPTED.

R8-ARCH-002 explicitly approved application-level tenant isolation and identified the existing mechanism as a component to adapt, not replace by default.

---

## 5.3 Authentication

**Evidence:** VERIFIED BY CODE.

Current authentication is JWT-based and uses the legacy User/Empresa model.

Current JWT payload contains legacy Business/role/permission context.

Google authentication can provision legacy users using the existing Empresa context.

**Transformation disposition:** ADAPTED / COEXISTENCE.

R8-ARCH-003 approved JWT-centric authentication with application-controlled active Business context.

Exact target claims, session lifecycle, revocation, Google onboarding and Business Switch mechanics remain OPEN.

---

## 5.4 Current authorization model

**Evidence:** VERIFIED BY CODE / DOCUMENTED.

Current implementation contains legacy role/permission concepts.

The AS-IS role vocabulary does not equal the canonical MVP Membership Role catalogue.

The target is:

```
Membership → Role → Permission
```

with:

- Owner;
- Admin;
- Vendedor;
- Gestor de Stock.

**Transformation disposition:** ADAPTED.

No legacy role is deleted or renamed solely by this specification.

---

## 5.5 Current Commerce / Inventory / Payment behavior

The existing repository contains operational Commerce, Inventory and Payment/Cash capabilities.

The canonical target introduces semantic boundaries that are not assumed to be already implemented.

Relevant known transformation gaps include:

- Order/Sale separation;
- commercial confirmation boundary;
- stock reservation distinct from physical stock exit;
- BusinessProduct commercial boundary;
- Payment independent from Sale;
- explicit Payment/Cash/AR separation;
- Location target model.

**Transformation disposition:** ADAPTED where existing functionality can be preserved; new target behavior requires task-local implementation readiness.

No current implementation is declared compliant merely because a similarly named feature exists.

---

## 5.6 Messaging

**Evidence:** DOCUMENTED / AS-IS audit evidence.

The target requires Wapsell-owned first-class Messaging.

The current system does not establish full canonical Conversation/Message functionality as an implemented TO-BE Messaging domain.

**Transformation disposition:** NEW CAPABILITY / LATER BLOCK.

Block 1 establishes the integration boundary; complete Messaging implementation is Block 2.

---

# 6. Transformation matrix

| Area | AS-IS | TO-BE | Gap | Disposition | Readiness |
|---|---|---|---|---|---|
| User identity | Legacy Usuario identity | Global User | Identity scope differs | ADAPTED | Spec/architecture closure |
| Business | Empresa | Business canonical tenant | Terminology/model differ | ADAPTED | Physical model OPEN |
| Membership | No canonical N:N Membership model evidenced | User↔Business Membership | Relationship model gap | NEW/ADAPTED | Spec closure |
| Business Context | Legacy empresaId context | Active Business Context | Context authority differs | ADAPTED | Auth/session closure |
| Tenant isolation | Empresa-scoped application mechanism | Business-scoped application isolation | Canonical boundary changes | ADAPTED | Architecture approved direction; technical validation pending |
| Authentication | JWT + legacy context | JWT-centric User auth + active Business context | Auth/authz boundary differs | ADAPTED | Session contract OPEN |
| Authorization | Legacy role/permission coupling | Membership→Role→Permission | Role ownership/context differs | ADAPTED | Permission matrix OPEN |
| Roles | Legacy role vocabulary | Owner/Admin/Vendedor/Gestor de Stock | Catalogue mismatch | ADAPTED | Role mapping OPEN |
| Customer | Existing commercial Customer model | Business Customer distinct from User | Controlled User association | ADAPTED | Association mechanics OPEN |
| Product | Existing product/catalog behavior | Global Product + BusinessProduct | Ownership/configuration boundary | ADAPTED | Physical model OPEN |
| Cart | Existing cart capability/evidence | Anonymous Cart permitted; Customer before Order | Ownership semantics | ADAPTED | Detailed contract OPEN |
| Order | Existing Order behavior | Order distinct from Sale; ORDER_CONFIRM | Lifecycle/effect boundary | ADAPTED | State/effect specs OPEN |
| Sale | Existing Sale behavior | Sale at confirmation; immutable after confirmation | Semantic boundary | ADAPTED | State/effect specs OPEN |
| Inventory | Existing stock operations | Reservation + physical stock-out distinction | Reservation model gap | ADAPTED | Transaction/locking OPEN |
| Location | Existing inventory persistence | Generic Business Location, MAIN minimum | Target model not physically closed | ADAPTED/NEW | Physical model OPEN |
| Payment | Existing Pago lifecycle | Payment independent from Sale | Cross-domain semantics | ADAPTED | Reconciliation OPEN |
| Cash | Existing cash operations | Business Cash + sensitive permissions + lifecycle | Target authorization/state semantics | ADAPTED | Cash spec OPEN |
| AR | Existing/partial financial capability | Business/Customer AR | Allocation semantics | ADAPTED | AR spec OPEN |
| Messaging | No complete canonical TO-BE domain evidenced | First-class Wapsell Messaging | Capability gap | NEW CAPABILITY | Block 2 |
| Fulfillment | Existing order/delivery-related behavior may exist | Fulfillment under Orders | Boundary must be normalized | ADAPTED | Detailed spec OPEN |
| Brand | Existing business-facing branding | Business Brand over Wapsell platform | Formal boundary | ADAPTED | Brand spec OPEN |
| Purchases/AP | Existing historical capability/specification | Outside initial MVP implementation | Scope exclusion | PRESERVED / DEFERRED | No MVP implementation |

---

# 7. Identity / Tenancy transformation

## 7.1 Target

```
User
  ↕
Membership
  ↕
Business
```

with:

```
Membership
  → Role
  → Permission
```

and an active Business Context derived from valid Membership.

---

## 7.2 Coexistence

During migration:

- legacy `Usuario` and `Empresa` may remain physically present;
- legacy identifiers may remain available for compatibility;
- legacy JWT/session compatibility may temporarily coexist;
- the canonical authorization decision must not depend permanently on legacy direct User→Empresa coupling;
- `empresaId` is transitional and not the canonical authorization relationship.

---

## 7.3 Required transformation controls

Before changing runtime identity behavior:

1. establish AS-IS identity evidence;
2. define target physical mapping;
3. define User/Membership mapping;
4. define Business mapping;
5. define legacy compatibility behavior;
6. define Business Context resolution;
7. define authorization behavior;
8. define session/token transition;
9. validate cross-Business isolation;
10. define cutover and rollback.

No physical migration is authorized by this document.

---

# 8. Authorization transformation

## AS-IS

Legacy authorization is coupled to existing User/Empresa/role/permission structures.

## TO-BE

```
Authenticated User
      ↓
Active Business Context
      ↓
ACTIVE Membership
      ↓
Role
      ↓
Permission
      ↓
Operation
```

## Transformation

**ADAPTED**, not replaced by deletion.

The existing authorization mechanisms should be reused where they can enforce the canonical boundary without contradicting the target model.

The exact Permission catalogue, Role→Permission matrix, MFA and technical enforcement remain OPEN.

---

# 9. Commerce transformation

## 9.1 Customer

Preserve Customer as a commercial Business relationship.

Transform identity association so that:

```
Customer ≠ User
```

Association becomes controlled rather than automatic by equal email.

---

## 9.2 Catalog

Transform toward:

```
Global Product
      +
BusinessProduct
```

Business-specific commercial configuration must not become global Product identity.

---

## 9.3 Cart

Preserve Cart capability while adapting ownership semantics:

- anonymous Cart permitted;
- Customer required before Order;
- optional User association does not replace Customer.

---

## 9.4 Order / Sale

Transform the semantic boundary:

```
Order
  ↓
ORDER_CONFIRM
  ├── Sale
  └── Reservation
```

Do not use delivery as the Sale creation boundary.

Do not use Payment completion as the Sale creation boundary.

Confirmed Sale becomes immutable as historical fact.

Exact state transitions and correction effects remain OPEN.

---

# 10. Inventory transformation

The critical transformation is:

### AS-IS risk

Existing implementation evidence indicates stock can be directly affected by confirmation flows without a canonical persisted reservation mechanism.

### TO-BE

```
Order confirmation
       ↓
Reservation
       ↓
Physical fulfillment
       ↓
Stock-out movement
```

Reservation and physical stock exit are distinct.

Required properties:

- reservation cannot exceed available stock;
- concurrent confirmations cannot oversubscribe;
- failed reservation leaves no partial reservation;
- physical stock-out represents actual physical exit;
- cancellation before physical exit releases reservation;
- FEFO/FIFO remains authoritative.

The physical Reservation entity/model, transaction boundary and locking mechanism are OPEN.

---

# 11. Payment / Cash / AR transformation

Transformation must preserve historical financial traceability.

Target boundaries:

```
Sale ← independent → Payment
                    ↓
             Cash effect
                    ↘
                      AR application
```

The exact relationship between these domains remains specification-dependent.

Therefore:

- do not erase historical Payment records;
- do not make Payment the Sale lifecycle authority;
- do not directly mutate historical Sale to correct financial history;
- do not infer Cash/AR effects where the specialized contract is OPEN.

---

# 12. Messaging transformation

Block 1 does not implement full Messaging.

It establishes the target integration:

```
Conversation
     ↓
Customer
     ↓
Commerce context
     ↓
Cart / Order
```

Messaging must:

- belong to one Business;
- permit Customer participation without User;
- use underlying domain authorization;
- not depend on WhatsApp;
- keep AI inactive in MVP.

The physical Messaging model is a later specification/implementation activity.

---

# 13. Fulfillment transformation

Fulfillment remains associated with Orders.

The transformation must not create an independent top-level MVP domain merely to model delivery.

Repartidor is not introduced as an MVP Membership Role.

Detailed delivery behavior remains OPEN.

---

# 14. Brand transformation

Brand becomes an explicit Business-owned customer-facing boundary.

Target:

```
Wapsell Platform
      ↓
Business
      ↓
Brand
      ↓
Customer-facing experience
```

Otra Ronda Más is the first Business/Brand implementation.

It does not receive special architectural treatment.

---

# 15. Preservation / adaptation / deferral rules

## PRESERVED

Existing functionality that remains semantically compatible with the approved TO-BE.

Examples:

- existing commerce capabilities where boundaries remain compatible;
- existing Business-scoped persistence discipline where it can be adapted;
- historical data required for continuity.

## ADAPTED

Existing functionality whose purpose remains but whose ownership or semantic boundary changes.

Examples:

- Usuario/Empresa identity context;
- authorization;
- Order/Sale boundary;
- inventory reservation;
- Payment/Cash boundaries;
- Customer/User association.

## DEPRECATED

Only after:

- replacement is validated;
- coexistence period is complete;
- rollback/containment is defined;
- explicit retirement authorization exists.

No specific component is declared deprecated by this document.

## REPLACED — EXPLICITLY APPROVED

None at this stage.

---

# 16. Transformation gates

## TG-01 — Canonical readiness

Requirements, Decisions, Contracts, Invariants and Tests/Evals aligned.

**Current:** DRAFT / controlled.

---

## TG-02 — Architecture readiness

Affected structural architecture approved.

**Current:** Block 1 architecture exists as DRAFT; implementation authorization remains absent.

---

## TG-03 — AS-IS evidence

Affected code/data behavior inspected before transformation.

**Current:** bounded evidence exists; task-local inspection still required.

---

## TG-04 — Specification closure

All changed normative behavior has an applicable closed specification.

**Current:** PARTIAL.

---

## TG-05 — Test readiness

Every transformed behavior has applicable verification criteria.

**Current:** SPECIFIED at Block 1 level; implementation tests not created/executed.

---

## TG-06 — Coexistence readiness

Legacy/target interaction is explicitly defined where both must operate simultaneously.

**Current:** Identity/Tenancy direction documented; detailed physical migration remains OPEN.

---

## TG-07 — Cutover readiness

Cutover requires:

- validation evidence;
- regression assessment;
- isolation validation;
- authorization validation;
- reconciliation;
- explicit approval.

**Current:** NOT REACHED.

---

# 17. Transformation sequence

The controlled order is:

```
P0 Canonical readiness
        ↓
P1 Architecture closure
        ↓
P2 Identity / Tenancy
        ↓
P3 Authorization
        ↓
P4 Customer / Catalog / Cart
        ↓
P5 Inventory
        ↓
P6 Order / Sale
        ↓
P7 Payment / Cash / AR
        ↓
P8 Fulfillment
        ↓
P9 Returns / Refunds
        ↓
P10 Messaging
        ↓
P11 Brand / Experience / Cross-cutting
        ↓
P12 Cutover / Legacy retirement
```

This sequence is a planning dependency model, not implementation authorization.

---

# 18. Task-local readiness

No transformation task becomes executable merely by referencing this document.

Every future task must identify:

- transformation scope;
- non-scope;
- AS-IS evidence;
- TO-BE rule;
- Contract;
- Invariant;
- Test/Eval;
- dependencies;
- blockers;
- preservation classification;
- expected evidence;
- rollback/containment;
- validation result.

A task remains blocked if it would require inventing:

- schema;
- API;
- event;
- identifier;
- permission;
- state;
- transaction boundary;
- migration behavior.

---

# 19. Evidence matrix

| Transformation claim | Evidence |
|---|---|
| Legacy Empresa/User coupling exists | VERIFIED BY CODE / AS-IS documentation |
| Existing Empresa-scoped Prisma mechanism exists | VERIFIED BY CODE |
| JWT-centric AS-IS authentication exists | VERIFIED BY CODE |
| User/Business/Membership is approved TO-BE direction | OWNER-RULED / DOCUMENTED |
| Application-level tenant isolation is approved | OWNER-APPROVED ARCHITECTURAL DECISION |
| JWT-centric target authentication direction is approved | OWNER-APPROVED ARCHITECTURAL DECISION |
| Product/BusinessProduct target direction | OWNER-RULED |
| Order/Sale boundary | OWNER-RULED |
| Reservation/physical-exit separation | OWNER-RULED |
| Location target direction | OWNER-RULED |
| Payment/Cash/AR conceptual boundaries | OWNER-RULED |
| Messaging MVP boundary | OWNER-RULED |
| Full physical Messaging model | NOT DETERMINABLE |
| Physical User/Membership schema | NOT DETERMINABLE |
| Exact migration implementation | NOT DETERMINABLE |
| Current TO-BE compliance | NOT DETERMINABLE WITHOUT EXECUTION |

---

# 20. Explicitly out of scope for this Transformation Spec

This document does not authorize:

- Prisma/schema migration;
- JWT/session implementation;
- Permission catalogue implementation;
- MFA implementation;
- Business Switch implementation;
- inventory locking implementation;
- Payment provider integration;
- Cash state-machine implementation;
- AR implementation;
- full Messaging implementation;
- Return/Refund implementation;
- deployment;
- legacy deletion;
- production cutover.

---

# 21. Transformation readiness gate

### READY

The documentary transformation boundary is sufficiently defined to derive controlled task-local work.

### NOT READY

The project is not generally implementation-ready.

The following remain prerequisite closures for affected implementation slices:

- architecture approval;
- exact authorization catalogue/matrix;
- authentication/session technical contract;
- physical User/Business/Membership model;
- tenant isolation implementation contract;
- exact Order/Sale states;
- cancellation/reversal/refund effects;
- Payment/Cash/AR detailed contracts;
- reservation transaction/locking semantics;
- physical Location model;
- Messaging physical contract;
- detailed Fulfillment contract.

---

# 22. Conclusion

The Block 1 transformation is defined as an incremental adaptation of the existing Wapsell/Otra Ronda Más system rather than a replacement.

The central transformation is:

```
LEGACY AS-IS
Usuario + Empresa + legacy auth context
              ↓
        bounded coexistence
              ↓
TO-BE
User + Business + Membership
              ↓
Active Business Context
              ↓
Role / Permission
              ↓
Business-scoped Commerce
```

and, for the commercial core:

```
Cart
 ↓
Order
 ↓
ORDER_CONFIRM
 ├── Sale
 └── Reservation
       ↓
 Physical Exit
       ↓
 Payment
       ↓
 Cash / AR
```

The existing system is not declared compliant with this target.

The transformation specification defines the target transition and its controls; implementation and cutover remain separate authorized activities.

**Status: DRAFT — BLOCK 1 TRANSFORMATION**

**Technical Specification: NOT APPROVED**

**Implementation: NOT AUTHORIZED**
