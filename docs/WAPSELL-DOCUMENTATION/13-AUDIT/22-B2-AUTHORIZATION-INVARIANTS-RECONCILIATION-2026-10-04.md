# B2 — AUTHORIZATION INVARIANTS RECONCILIATION

**Estado:** INFORME DE RECONCILIACIÓN — DRAFT — NO CANÓNICO — NO APROBADO
**Fecha:** 2026-10-04
**Acción:** solo documentación. Sin cambios de código, schema, migraciones, commits ni deploys. No se ejecutó ningún test.
**Evidencia:** `[C]` código, `[D]` documentado, `[ND]` no determinable. No se declara `[T]` ni `[E]`.
**Veredicto:** READY WITH RECONCILIATION

---

## 1. Executive Summary

- **Result:** B2 can be derived from the closed contracts (R8-AUTH-001, R8-ARCH-003, R8-ID-003 and the B1 propagation C1–C6) with no conflict against any approved Owner decision.
- **Target invariants:** 31 B2 invariants (`INV-B2-*`).
  - 11 preserve or adapt invariants that already exist.
  - 14 are new derivations.
  - 6 are shared with B1 and stay here only as boundary statements.
- **Reconciliation items:**
  1. **ID collisions across three invariant families.** R5 (`INV-ID-*` / `INV-AUTH-*`), v0.2 and the Block 1 baseline reuse `INV-AUTH-00x` with different meanings. `INV-CUST-002` and `INV-CUST-003` are swapped between v0.2 and Block 1.
  2. **R5 `INV-AUTH-004` is superseded.** It is the Profile→Roles→Capabilities→Overrides composition. R6 §4 says it must not be propagated.
  3. **One uncovered AS-IS mechanism.** D-06 second-person approval (`autorizaciones`) is not covered by any MVP contract.
  4. **Wrong TE mapping in the B1 propagation report.** Several of its TC→TE-* labels were approximate. They are corrected in §8 using the real TE catalog.
- **Code state:** the AS-IS code contradicts 12 of the 31 target invariants (§9). The main cause is that the JWT `permisos[]` and `empresaId` are the authority for 8h, with no Membership, no revocation and no per-request re-check.
- **Tests:** every TE is SPECIFIED and none has been executed. Every TC is a candidate. No TC is declared PASSED.

## 2. Scope

**In scope:**
- User, Business, Membership, Membership status, Role, Permission and Role→Permission.
- The authorization boundary and Business Context as a precondition.
- The Customer vs User boundary.
- Legacy coexistence: `empresaId`, `Usuario.rol`, `UsuarioPermiso`, the legacy JWT and `PermissionsGuard`.
- Revocation/session interaction, only where it affects the authorization decision.

**Out of scope:**
- Commerce, Inventory, Payments, Cash, Messaging, Brand, Fulfillment and Returns. They are referenced only through cross-block dependencies.
- Session mechanics, MFA and Google. These stay in B1 and are referenced only.
- Tenant Isolation (persistence-level). It stays in B3.

**Authority precedence:** OWNER RULING > DECISION REGISTER > CANONICAL SPEC > TO-BE > CONTRACTS > AUDIT > HISTORICAL.

**Numbering note:** the brief's 30 decision bullets exist in the repo only through the 43-row master table in `03-DECISIONS/30-R8-MASTER-…`. That table is cited as `#n`. The provisional OD-01..30 of the B1 propagation are not used as authority. This corrects the earlier statement in the B1 report that the decisions were not in the repo.

## 3. Existing Invariants Inventory

**Sources:**
- **R5:** `BASELINE/00-R5-INVARIANTS-BASELINE-001-490.md`.
- **v0.2:** `DERIVED/00-INVARIANTS-v0.1.md` (internally "v0.2").
- **B1:** `DERIVED/05-BLOCK-1-INVARIANTS-BASELINE-v0.1.md`.

All are DRAFT, with no executed tests.

| Existing ID | Doc | Content | Status | Disposition |
|---|---|---|---|---|
| INV-IDENT-001 | v0.2, B1 | User is global | DOCUMENTED | Valid; shared with B1 (referenced) |
| INV-IDENT-002 | v0.2, B1 | Normalized email globally unique | DOCUMENTED | Valid; B1 owns |
| INV-TEN-001 | v0.2, B1 | Business isolation | DOCUMENTED | Valid; **B3** |
| INV-MEM-001 | v0.2, B1 | Membership A does not authorize Business B | DOCUMENTED | Valid; preserve |
| INV-MEM-002 | v0.2, B1 | INACTIVE Membership cannot operate | DOCUMENTED | Valid; preserve |
| INV-CONTEXT-001 | v0.2, B1 | One effective context; ACTIVE Membership; the client ID cannot override; fail-closed | DOCUMENTED | Valid but **too broad**; split (§5) |
| INV-AUTH-001 | v0.2, B1 | Authentication alone does not authorize | DOCUMENTED | Valid; strengthen (JWT-specific) |
| INV-AUTH-002 | v0.2, B1 | Membership→Role→Permission; 4 roles; no Profile/Capability/Override | DOCUMENTED | Valid; **too broad**, split |
| INV-AUTH-003 | v0.2, B1 | UI visibility is not authorization | DOCUMENTED | Valid; preserve |
| INV-AUTH-004 | v0.2, B1 | Messaging cannot bypass authorization | DOCUMENTED | Valid; **CROSS-BLOCK** (Messaging) |
| INV-CUST-001 | v0.2, B1 | Customer is distinct from User | DOCUMENTED | Valid; preserve |
| INV-CUST-002 / 003 | v0.2 vs B1 | **Swapped** (v0.2: 002=association, 003=Business-scoped; B1: reverse) | DOCUMENTED | **NEEDS RECONCILIATION** (ID collision); B1 numbering is the one TE-CUST follows |
| INV-ORD-002 | B1 | `ORDER_CONFIRM` needs an explicit Permission | DOCUMENTED | Valid; **CROSS-BLOCK** (Commerce); the B2 side is a general rule |
| INV-CASH-002 | B1 | Sensitive Cash needs a specific Permission | DOCUMENTED | Valid; **CROSS-BLOCK** (Cash) |
| INV-FUL-002 | B1 | Repartidor is not an MVP Role | DOCUMENTED | Valid; role-catalogue boundary stays in B2 |
| INV-X-001 / 002 | B1 | Cross-domain | DOCUMENTED | Valid; referenced |
| R5 INV-ID-001..005 | R5 | User global, contextual Membership, INACTIVE denies, isolation, Active Business Context | DOCUMENTED | **Duplicate** of IDENT/MEM/TEN/CONTEXT (different family); keep as historical alias |
| R5 INV-AUTH-001 | R5 | Authorization is contextual | DOCUMENTED | **Duplicate** of v0.2 AUTH-001 / INV-CONTEXT-001; alias |
| R5 INV-AUTH-002 | R5 | UI is not authorization | DOCUMENTED | Same meaning as v0.2/B1 **AUTH-003**; ID collision with v0.2/B1 AUTH-002 |
| R5 INV-AUTH-003 | R5 | Messaging cannot bypass | DOCUMENTED | Same meaning as v0.2/B1 **AUTH-004**; collision |
| R5 INV-AUTH-004 | R5 | Effective composition Profile→Roles→Capabilities→Overrides | BLOCKED | **OBSOLETE / SUPERSEDED** by INV-AUTH-002 (R6 §4, OR-B2). Do not propagate |
| R5 INV-XDOM-001 | R5 | Authorization before domain mutation | STABLE | Valid; preserve; **CROSS-BLOCK** |
| R5 INV-MIG-001/002/003 | R5 | Incremental coexistence; legacy session cutoff; no silent semantic loss | DOCUMENTED | Valid; map to LEG family |
| R5 INV-BIZ-003 | R5 | SaaS Admin boundary | BLOCKED | Not B2 (platform scope); unchanged |

**Findings from the inventory:**
- The numeric overlap of `INV-AUTH-00x` is a real hazard. The same ID means different things per document.
- Proposal: B2 uses a new prefix, `INV-B2-*`, and keeps an alias table to the old IDs (§13). This avoids renumbering existing documents.

## 4. Contract → Invariant Derivation

| Contract | Invariants derived |
|---|---|
| R8-AUTH-001 (roles, permission domains, sensitive ops, §9 no silent conversion) | B2-ROLE-001..004, B2-PRM-001..003, B2-LEG-002 |
| R8-ARCH-003 (chain User→Context→Membership→Role→Permission→Persistence) | B2-AUT-001..004, B2-CTX-001..004, B2-MEM-001..004 |
| R8-ID-003 (identity coexistence) | B2-LEG-001, 003..005, B2-MEM-005 |
| B1 C1 Identity/Membership (IM-) | B2-MEM-001..005 |
| B1 C2 Authentication/JWT (AJ-) | B2-AUT-001, B2-AUT-003, B2-LEG-001 |
| B1 C3 Session/Refresh/Revocation (SR-) | B2-AUT-005, B2-MEM-004 (decision interaction only) |
| B1 C4 Active Business Context/Switch (CX-) | B2-CTX-001..004 |
| B1 C5 Customer/User boundary (CB-) | B2-CUS-001..005 |
| B1 C6 Legacy Coexistence (LC-) | B2-LEG-001..006 |

## 5. Canonical B2 Invariants

**Common conventions:**
- Source codes: `A` = R8-AUTH-001, `R` = R8-ARCH-003, `I` = R8-ID-003, `C1`..`C6` = B1 propagation contracts.
- `OD #n` = row n of `30-R8-MASTER`.
- Status: DOC = documented only. DER = derived. VBC = verified by code.
- "VBC (contradicted)" means the current code contradicts the target.
- No invariant is marked implemented.

### 5.1 Authorization core (Authorization)

| ID | Name and normative statement | Source | OD | Prior INV | Violation consequence | Status |
|---|---|---|---|---|---|---|
| INV-B2-AUT-001 | **JWT authenticates, does not authorize.** A valid JWT proves identity only. Permissions, roles and Business scope in the token are never an authority. | R, C2 (INC-01/10) | #5, #8 | INV-AUTH-001 | Revoked or changed rights stay effective until expiry (8h today) | DOC; **VBC (contradicted)** |
| INV-B2-AUT-002 | **Authorization chain.** A Business-scoped operation is authorized only through Authenticated User → effective Business Context → ACTIVE Membership → Role → Permission, in that order, evaluated server-side. | R | #2, #3, #8, #11 | INV-AUTH-002, INV-CONTEXT-001 | Skipping any link yields access without a Membership or Role | DOC; **VBC (contradicted)**: the guard checks only the token's `permisos[]` |
| INV-B2-AUT-003 | **No global authorization from `Usuario.rol` or User alone.** No account-level attribute grants Business-scoped authority. | R, C2 (INC-10) | #2, #8 | INV-AUTH-001 | A single field becomes a cross-Business master key | DOC; partially true by code: `PermissionsGuard` ignores `rol`. `rol` still drives `type`/`rol` checks in legajo, so partially contradicted |
| INV-B2-AUT-004 | **Fail-closed.** If Context, Membership, Role or Permission is absent, invalid or ambiguous, the operation is denied. | R, C4 (INC-08) | #8 | INV-CONTEXT-001 | Default-open endpoints | DOC; **VBC (contradicted)**: an endpoint without `@RequierePermiso` passes with authentication alone |
| INV-B2-AUT-005 | **Current-state evaluation.** The authorization decision reflects server-side current Membership/Role state within a defined staleness bound, not a token snapshot. | R, C3 (INC-05/06) | #7, #8 | none | Revocation ineffective | DER; the bound is a technical delegation (§12) |
| INV-B2-AUT-006 | **UI visibility is not authorization.** | A | n/a | INV-AUTH-003 | Hidden-but-callable operations | DOC |
| INV-B2-AUT-007 | **Authorization precedes domain mutation.** | R5 | n/a | R5 INV-XDOM-001 (STABLE) | Mutation before the check | DOC; **CROSS-BLOCK** (applies to every domain) |
| INV-B2-AUT-008 | **No channel bypass.** Messaging (and any non-HTTP channel) cannot grant authority the Membership/Role/Permission chain denies. | A | n/a | INV-AUTH-004 | Messaging as a backdoor | DOC; **CROSS-BLOCK** (Messaging owns the detail) |

### 5.2 Membership (Membership)

| ID | Statement | Source | OD | Prior INV | Violation | Status |
|---|---|---|---|---|---|---|
| INV-B2-MEM-001 | **Unique Membership per (User, Business).** | C1 (INC-16) | #2 | INV-MEM-001 | Duplicate or ambiguous roles | DOC; **VBC (contradicted)**: no Membership entity exists |
| INV-B2-MEM-002 | **Only ACTIVE Membership authorizes.** INACTIVE (or absent) denies all Business-scoped operations. | R | #3 | INV-MEM-002 | Revoked people keep operating | DOC; **VBC (contradicted)**: only `Usuario.activo`, and live tokens survive (G-04) |
| INV-B2-MEM-003 | **A Membership never authorizes another Business.** | R | #2 | INV-MEM-001 | Cross-Business access | DOC; **CROSS-BLOCK** with B3 for enforcement, B2 owns the rule |
| INV-B2-MEM-004 | **Status change takes effect on authorization** within the AUT-005 bound; a deactivated Membership cuts sessions' authority for that Business. | C3 | #7 | none | Zombie access | DER; latency is a technical delegation |
| INV-B2-MEM-005 | **History keeps the User as actor** even if the Membership later becomes INACTIVE. | C1 (INC-25) | #39 | none | Loss of audit attribution | DER |

### 5.3 Role (Authorization)

| ID | Statement | Source | OD | Prior INV | Violation | Status |
|---|---|---|---|---|---|---|
| INV-B2-ROLE-001 | **Role belongs to Membership, not User.** | A, C1 (INC-17) | #2 | INV-AUTH-002 | The same User is "Admin" everywhere | DOC; **VBC (contradicted)**: `Usuario.rol` is user-level |
| INV-B2-ROLE-002 | **Closed MVP catalogue:** Owner, Admin, Vendedor, Gestor de Stock. Customer, Supplier and Repartidor are not Membership Roles. | A | #30 | INV-AUTH-002, INV-FUL-002 | Role proliferation, Customer as role | DOC; **VBC (contradicted)**: `rol` has `PROVEEDOR` as a placeholder; the Customer principal carries `rol:'OWNER'` |
| INV-B2-ROLE-003 | **No Profile / Capability / Individual Override layer; no direct Membership permission override** in the MVP. | A §9 | #11, #12 | INV-AUTH-002 (replaces R5 AUTH-004) | A parallel authority path | DOC. **Code:** `UsuarioPermiso` (per-user grants) is structurally an override layer, so this is contradicted by design |
| INV-B2-ROLE-004 | **Role cardinality per Membership** (one or several roles). | none | none | none | Ambiguous effective permission set | **NOT DETERMINABLE** `[ND]`; see §12 |

### 5.4 Permission (Permission)

| ID | Statement | Source | OD | Prior INV | Violation | Status |
|---|---|---|---|---|---|---|
| INV-B2-PRM-001 | **Permissions derive only from Role→Permission.** Role→Permission is the sole grant path. | A | #11, #12 | INV-AUTH-002 | Hidden grants | DOC; **VBC (contradicted)**: grants are User→Permiso |
| INV-B2-PRM-002 | **Sensitive operations need an explicit Permission, never role-name inference:** `ORDER_CONFIRM`, sensitive Cash, Sale cancellation/reversal/refund, Inventory adjustments, user/team administration, pricing changes. | A §5 | #17, #28 | INV-ORD-002, INV-CASH-002 | Privilege by title | DOC; **partial VBC**: `ventas.anular`, `inventario.ajustes`, `precios.cambiar`, `usuarios.gestionar` and `caja.gastos` are explicit; endpoints lacking `@RequierePermiso` are not covered |
| INV-B2-PRM-003 | **The permission domain set is closed and server-governed:** users, customers, catalog, pricing, orders, sales, inventory, cash, payments, receivables, purchases, messaging, brand, reports. Atomic identifiers and rows are OPEN. | A §4, §7 | #11, #12 | none | Drift in the catalogue | DOC; the atomic matrix is `[ND]` |
| INV-B2-PRM-004 | **The enforcement point is server-side and applies on every request**, regardless of channel. The mechanism is open. | R | #8 | none | Bypass of enforcement | DER; mechanism = technical delegation |

### 5.5 Business Context (Context)

| ID | Statement | Source | OD | Prior INV | Violation | Status |
|---|---|---|---|---|---|---|
| INV-B2-CTX-001 | **Business Context is mandatory** for every Business-scoped operation. | R, C4 (INC-02/08) | #4 | INV-CONTEXT-001 | Operations with no scope | DOC; **VBC (contradicted)**: context is the `empresaId` claim |
| INV-B2-CTX-002 | **The client cannot impose Business Context.** A client-supplied Business ID never alters the effective context. | C4 (INC-07) | #4, #8 | INV-CONTEXT-001 | Tenant forging | DOC; **VBC (contradicted)** in the sense that the claim is client-held; nothing sets a contract-level separate resolution |
| INV-B2-CTX-003 | **One effective context per request, resolving to an ACTIVE Membership.** | R, C4 (INC-02/03) | #3, #4 | INV-CONTEXT-001 | Ambiguous scope | DOC; shared with B1 (mechanism); **VBC (contradicted)** |
| INV-B2-CTX-004 | **On Business Switch, authority is re-derived from the target Membership;** no permission carry-over from the source. | C4 (INC-23) | #4 | none | Privilege carry-over | DER; the mechanism is in B1 |

### 5.6 Customer boundary (Customer Boundary / Security)

| ID | Statement | Source | OD | Prior INV | Violation | Status |
|---|---|---|---|---|---|---|
| INV-B2-CUS-001 | **A Customer has no Membership, Role or Permission,** and authenticating grants no internal authorization. | C5 (INC-12) | #13, #14 | INV-CUST-001 | Internal access by Customers | DOC; **VBC (contradicted)**: `type:'cliente'` is the only barrier; `PermissionsGuard` ignores type; endpoints without `@RequierePermiso` are reachable (G-01); `rol:'OWNER'` placeholder |
| INV-B2-CUS-002 | **Principal types are separated.** Each has its own audience, strategy and guard; tokens are rejected across surfaces. | C5 (INC-13/15) | #13 | none | Cross-surface token acceptance | DER; the mechanism is B1 (proposed design). **CROSS-BLOCK** |
| INV-B2-CUS-003 | **Customer↔User linkage is controlled and non-elevating.** Linking never confers Membership/Role. | C5 | #13, #14 | INV-CUST-003 (B1 numbering) | Privilege via association | DOC |
| INV-B2-CUS-004 | **Customer-facing responses never expose internal authorization data or secrets.** | C5 (INC-14) | #14 | none | Secret leakage | DER; **VBC (contradicted)** (G-08); **CROSS-BLOCK** to Customer/Security |
| INV-B2-CUS-005 | **Customer intent alone cannot execute a privileged internal operation** (e.g. confirming an Order). | A | #17 | INV-ORD-002, TE-ORD-003 | Customer-triggered confirmation | DOC; **CROSS-BLOCK** (Commerce) |

### 5.7 Legacy coexistence (Legacy Coexistence)

| ID | Statement | Source | OD | Prior INV | Violation | Status |
|---|---|---|---|---|---|---|
| INV-B2-LEG-001 | **`empresaId`, `Usuario.rol`, `UsuarioPermiso` and the legacy JWT are transitional;** none may become a permanent authority. | I, C6 | #42, #43 | R5 INV-MIG-001 | The legacy authority persists indefinitely | DOC; AS-IS = all four are today's authority |
| INV-B2-LEG-002 | **No silent conversion of `UsuarioPermiso` into Role/Permission.** Any mapping is explicit and Owner-approved. | A §9 (INC-21) | #12, #42 | R5 INV-MIG-003 | Silent privilege change at migration | DOC |
| INV-B2-LEG-003 | **A single source of truth for authority per domain at any moment.** Legacy and target do not both grant independently. | C6 (INC-19) | #42 | R5 INV-MIG-001 | Dual authority and divergence | DER |
| INV-B2-LEG-004 | **Legacy tokens are accepted only within a bounded window and cannot refresh.** | C6 (INC-18) | #42 | R5 INV-MIG-002 | An immortal legacy session | DER; window length = technical delegation |
| INV-B2-LEG-005 | **Legacy retirement is conditioned on cutover** and is not driven by the calendar. | C6 (INC-22) | #42, #43 | none | Premature removal or never removing | DER |
| INV-B2-LEG-006 | **Legacy-sourced authority never exceeds the explicitly approved mapping** while coexisting. | A §9, C6 | #12, #42 | INV-MIG-003 | Silent over-grant | DER |

**Shared with B1, referenced only (not B2 invariants):**
- Session/refresh single-use and reuse revocation (INC-04).
- Global and per-session revocation cut (INC-06).
- Server-side active Business storage (INC-09).
- Algorithm pinning and `iss`/`aud` (INC-11).
- Google `email_verified` and MFA for Owner/Admin (INC-24).
- Logout revocation (INC-26).
- No automatic User merge (INC-20).

## 6. Owner Decision Coverage

Master table rows (30-R8-MASTER) used by B2, and their coverage:

| OD | Subject | Covered by | Coverage |
|---|---|---|---|
| #2 | Roles belong to Membership | ROLE-001, MEM-001/003, AUT-002/003 | Full |
| #3 | ACTIVE/INACTIVE | MEM-002, CTX-003 | Full |
| #4 | Business Switch / Context | CTX-001..004 | Full (mechanism in B1) |
| #5 | JWT-centric | AUT-001 | Full |
| #6 | Controlled refresh | LEG-004 (boundary), B1 | Referenced |
| #7 | Revocation | AUT-005, MEM-004 | Partial: latency OPEN |
| #8 | JWT not the sole source | AUT-001/002/004, PRM-004 | Full |
| #9 | MFA for Owner/Admin | B1 | CROSS-BLOCK |
| #10 | Google | B1 | CROSS-BLOCK |
| #11, #12 | Permission catalogue and matrix; no Profile/Capability/Override | PRM-001/003, ROLE-003 | Partial: atomic rows OPEN |
| #13, #14 | Customer↔User | CUS-001..004 | Full |
| #17 | ORDER_CONFIRM | PRM-002, CUS-005 | Full (Commerce owns the detail) |
| #28 | Sensitive Cash | PRM-002 | Full (Cash owns the detail) |
| #30 | Repartidor not a Role | ROLE-002 | Full |
| #39 | Audit | MEM-005 | Partial |
| #42, #43 | Migration; legacy empresaId | LEG-001..006 | Full |

**No contradiction with any approved decision was found. No `OWNER DECISION CONFLICT — BLOCKED` is raised.**

## 7. Contract Coverage

| Contract | B2 invariants | Gap |
|---|---|---|
| R8-AUTH-001 | ROLE-001..003, PRM-001..003, LEG-002/006 | §7 OPEN list (atomic IDs, rows, inheritance, revocation timing, persistence, `UsuarioPermiso` migration, per-endpoint checks, enforcement) → §12 |
| R8-ARCH-003 | AUT, CTX, MEM | None |
| R8-ID-003 | LEG-001/003..005, MEM-005 | None |
| C1 | MEM-001..005 | Shared with B1 |
| C2 | AUT-001/003, LEG-001 | Mechanism in B1 |
| C3 | AUT-005, MEM-004 | Mechanism in B1 |
| C4 | CTX-001..004 | Shared with B1 |
| C5 | CUS-001..005 | CUS-002/004 are B1/Customer-side |
| C6 | LEG-001..006 | The window length is OPEN |
| *(uncovered)* | D-06 `autorizaciones` | No contract; see §12 |

## 8. Test/Eval Coverage

**Method:**
- TE IDs below come from the real catalog (`05-BLOCK-1-TESTS-EVALS-BASELINE-v0.1.md`).
- TC numbers are B1 candidate ranges (C1: 01–04, C2: 05–12, C3: 13–20, C4: 21–28, C5: 29–34, C6: 35–40). Only TC-29 and TC-38 were identified individually. The rest are mapped at range level, and individual TC numbers are to be pinned at derivation.
- All TEs are SPECIFIED, all TCs are candidates, and no test has been executed. **No TC is declared PASSED.**

| B2 invariant | Existing TE | TC range | Gap |
|---|---|---|---|
| AUT-001 | TE-AUTH-001 | TC-05..12 | Needs a "stale token after revocation" TE |
| AUT-002 | TE-AUTH-001/002/003 | TC-05..12 | Ordering test is missing |
| AUT-003 | none | TC-05..12 | **No TE exists** |
| AUT-004 | TE-ID-004/005 | TC-21..28 | Add undecorated-endpoint deny TE (depends on §12) |
| AUT-005 | none | TC-13..20 | **No TE**; depends on the latency decision |
| AUT-006 / 008 | TE-AUTH-004 / TE-AUTH-005, TE-MSG-004 | n/a | Covered |
| MEM-001 | none | TC-01..04 | **No TE** |
| MEM-002 | TE-ID-003 | TC-01..04 | Covered |
| MEM-003 | TE-ID-002 | TC-21..28 | Covered (enforcement tests in B3: TE-ID-008..011) |
| MEM-004 / 005 | none | TC-13..20 | **No TE** |
| ROLE-001 | TE-AUTH-003 (partial) | TC-01..04 | Needs its own TE |
| ROLE-002 | TE-AUTH-006 | n/a | Covered; **correct the B1 usage**: TE-AUTH-006 is the role-catalogue exclusion, not "Customer token rejected" |
| ROLE-003 / 004 | none | n/a | **No TE**; ROLE-004 is blocked by `[ND]` |
| PRM-001 | TE-AUTH-003 | n/a | Covered at a high level |
| PRM-002 | TE-ORD-002, TE-CASH-005 | n/a | Partial: no coverage for refund, adjustment, pricing or users admin |
| PRM-003 / 004 | none | n/a | **No TE** |
| CTX-001 | TE-ID-004 | TC-21..28 | Covered |
| CTX-002 | TE-ID-006 | TC-21..28 | Covered |
| CTX-003 | TE-ID-005 | TC-21..28 | Covered |
| CTX-004 | none | TC-21..28 | **No TE** |
| CUS-001 | TE-CUST-001, TE-AUTH-001 | TC-29 (Customer token rejected on an internal route) | **Correct the B1 label** |
| CUS-002 / 004 | none | TC-29..34 | **No TE** |
| CUS-003 | TE-CUST-003 or TE-CUST-004 (B1 numbering) | TC-29..34 | Resolve the ID collision first |
| CUS-005 | TE-ORD-003 | n/a | Covered |
| LEG-001..006 | none | TC-35..40 (TC-38 = `UsuarioPermiso` not converted silently) | **No TE family for legacy exists** |

**Other mapping corrections to the B1 report:** TE-ID-005 had been used for "cross-business lookup". The real TE-ID-005 is "invalid Business Context fails closed". Cross-Business lookup is TE-ID-008..011 and belongs to B3.

**Traceability chain (OWNER DECISION → CONTRACT → INVARIANT → TEST/EVAL), summarized:**

| OD | Contract | Invariant | TE / TC |
|---|---|---|---|
| #2 | R8-AUTH-001, R8-ARCH-003, C1 | ROLE-001, MEM-001/003 | TE-ID-002, TE-AUTH-003 / TC-01..04 |
| #3 | R8-ARCH-003 | MEM-002, CTX-003 | TE-ID-003, TE-ID-005 / TC-01..04, TC-21..28 |
| #4 | R8-ARCH-003, C4 | CTX-001..004 | TE-ID-004/005/006 / TC-21..28 |
| #5, #8 | R8-ARCH-003, C2 | AUT-001/002/004, PRM-004 | TE-AUTH-001/002/003 / TC-05..12 |
| #7 | C3 | AUT-005, MEM-004 | none (gap) / TC-13..20 |
| #11, #12 | R8-AUTH-001 | PRM-001/003, ROLE-003 | TE-AUTH-003 (partial) |
| #13, #14 | C5 | CUS-001..004 | TE-CUST-001..004 / TC-29..34 |
| #17 | R8-AUTH-001 | PRM-002, CUS-005 | TE-ORD-002/003 |
| #28 | R8-AUTH-001 | PRM-002 | TE-CASH-005 |
| #30 | R8-AUTH-001 | ROLE-002 | TE-AUTH-006, TE-FUL-003 |
| #42, #43 | R8-ID-003, C6 | LEG-001..006 | none (gap) / TC-35..40 |

## 9. AS-IS vs TO-BE Gap

All items below are `[C]`.

| Invariant | AS-IS | TO-BE | Gap |
|---|---|---|---|
| AUT-001 / AUT-002 | `jwt.strategy.ts:23-35` builds the principal from claims with no DB call. `permissions.guard.ts:26-35` allows only if `user.permisos` (from the JWT) includes the required permission. Neither Membership nor Role is consulted | Server-side chain per request | **Full gap**; G-02, G-03 |
| AUT-003 | The guard ignores `rol`. `rol` is still in the JWT and drives invitations and legajo | No global `rol`-only authority | Partial |
| AUT-004 | An endpoint without `@RequierePermiso` returns true. 8 of 19 controllers have none (`auth`, `auth.cliente`, `autorizaciones`, `jerarquia-catalogo`, `health`, `legajo.cliente`, `tienda`, `usuarios`); 37 usages exist across 13 files. Some are intentionally public or authentication-only | Fail-closed; the explicit default for undecorated Business-scoped endpoints is a technical decision | Gap |
| MEM-002 | `auth.service.ts:42-64` checks only `Usuario.activo` and `passwordHash`. A deactivation does not cut a live 8h token | ACTIVE Membership checked per request | **Gap** (G-04) |
| ROLE-001..003 / PRM-001 | `Usuario.rol` plus `UsuarioPermiso→Permiso`. `prisma/seed.ts:130-186` gives the Owner all `Permiso` rows through `usuarioPermisos`. A new permission is not auto-assigned to the Owner without `prisma:sync-permisos` | Role→Permission; no per-user override | Structural gap |
| PRM-002 | Permission names: `caja.gastos`, `inventario.ajustes`, `precios.cambiar`, `ventas.crear`, `ventas.anular`, `usuarios.gestionar`, `clientes.gestionar`, `productos.gestionar`, `compras.gestionar`, `pedidos.gestionar`, `fidelizacion.gestionar` | Explicit Permission for all sensitive ops | Partial. Two specific holes: `legajo.cliente.controller.ts` `pendientes` (:94-98) and `aprobar` (:117-121) check only `user.type !== 'usuario'` with no permission (**G-09**), and `usuarios.controller.ts` lists the Business's active users (id, nombre, email) to any authenticated user, guarded only by `LegajoAprobadoGuard` |
| CTX-001..003 | Context is the `empresaId` claim (`auth.service.ts:75-103`) | Server-resolved context | Gap |
| CUS-001 | `auth.cliente.service.ts:128-155` gives the Customer principal `permisos: []` and `rol: 'OWNER'`. The only discriminator is `type: 'cliente'`. The guard is not principal-aware | Customer without any authority | Gap. The empty `permisos[]` currently denies decorated endpoints only |
| LEG-001..006 | No coexistence mechanism. The legacy model is the only authority | Transitional adapter | Not started (documentation only) |
| *(D-06)* | `autorizaciones.service.ts:51-76` re-verifies the authorizer (`verificarCredenciales`), enforces `autorizador.id !== solicitanteId` and the same `empresaId`, and reads `usuarioPermiso` from the DB. The controller has no `@RequierePermiso` | Not defined | **Uncovered** (§12) |

Not contradicted but weak: `jwt.strategy.ts` pins no algorithm and uses a single secret (B1 scope).

## 10. Cross-Block Dependencies

Misplaced items are not removed. They are marked and kept visible.

| Item | Marker | Belongs in |
|---|---|---|
| INC-01..11, INC-23, INC-26 (Session, refresh, active Business storage, claims, switch mechanics) | CROSS-BLOCK DEPENDENCY | **B1** |
| INC-24 (Google, MFA) | CROSS-BLOCK DEPENDENCY | **B1** |
| INC-20 (no automatic User merge), IDENT-001/002 | CROSS-BLOCK DEPENDENCY | **B1** |
| TE-ID-008..011 (isolation) and G-05..G-07; INV-TEN-001 | CROSS-BLOCK DEPENDENCY | **B3** |
| AUT-007, PRM-002 domain detail (ORDER_CONFIRM, refund, adjustments, pricing) | CROSS-BLOCK DEPENDENCY | Domain blocks (Commerce, Inventory, Cash, Pricing); B2 holds only the general rule |
| AUT-008 | CROSS-BLOCK DEPENDENCY | Messaging block |
| CUS-002, CUS-004 | CROSS-BLOCK DEPENDENCY | B1 C5 / Customer-Security |
| CUS-005 | CROSS-BLOCK DEPENDENCY | Commerce |
| MEM-003 enforcement | CROSS-BLOCK DEPENDENCY | **B3** |
| LEG-004 (token window, refresh) | CROSS-BLOCK DEPENDENCY | B1 C3 mechanics; the window length is OPEN |

**Items that depend on still-OPEN technical decisions:** AUT-004 (the default for undecorated endpoints), AUT-005 and MEM-004 (latency), ROLE-004, PRM-003/004 and LEG-004 (§12).

## 11. Contradictions

1. **ID collisions (NEEDS RECONCILIATION).** These are documentary, not a conflict with an Owner decision.
   - R5 AUTH-002 = "UI is not authorization", while v0.2 and B1 AUTH-002 = "Membership→Role→Permission".
   - R5 AUTH-004 = "composition", while B1 AUTH-004 = "Messaging".
   - v0.2 and B1 swap CUST-002 and CUST-003.
   - R5 INV-ID-* and v0.2/B1 INV-IDENT-*/INV-MEM-* are parallel families.
2. **Obsolete invariant.** R5 INV-AUTH-004 is superseded and must not be propagated.
3. **Broad invariants.** INV-CONTEXT-001 and INV-AUTH-002 each combine several properties. They are split into CTX-001..003 and ROLE/PRM/AUT in B2, while the originals are retained as aliases.
4. **B1 report.** Inaccurate TE-* labels and the incorrect statement about the 30 decisions. Both are corrected here.
5. **Code vs target:** 12 target invariants contradicted (§5, §9). This is expected, since the code is the AS-IS baseline, and is not a conflict with an Owner decision.
6. **Real conflicts with approved Owner decisions: none found.**

## 12. Open Technical Details

All are **TECHNICAL DELEGATION — NO OWNER DECISION REQUIRED**, except where noted.

1. Atomic Permission identifiers and the Role→Permission rows (A §7).
2. Role inheritance, and the cardinality of roles per Membership (ROLE-004).
3. Permission/Membership revocation latency (AUT-005, MEM-004).
4. The default for Business-scoped endpoints with no declared Permission (AUT-004), and which of the 8 undecorated controllers are intentionally authentication-only.
5. Enforcement mechanism (guard evolution vs another construct) and persistence model.
6. How `UsuarioPermiso` rows map to Roles. This is explicit and Owner-approved (LEG-002/006), so it needs Owner approval of the mapping when it is produced, not a new decision on the rule itself.
7. Legacy window length, and the cutover criteria definition.
8. **D-06 `autorizaciones` second-person approval.** It is an AS-IS mechanism with no MVP contract. It needs to be placed (as a Permission-gated operation inside the chain) or explicitly left outside B2. This is NEEDS RECONCILIATION. It requires an Owner decision only if the Owner wants to retire or change its behavior. Mapping it into Role→Permission is technical.
9. `legajo` approval endpoints (G-09): which Permission applies. Technical.

## 13. Preservation / Adaptation Matrix

| Existing | Action | Result |
|---|---|---|
| B1 INV-AUTH-001 | **ADAPT** | → AUT-001 (adds the JWT-specific statement) |
| B1 INV-AUTH-002 | **SPLIT / ADAPT** | → AUT-002/003, ROLE-001..003, PRM-001 |
| B1 INV-AUTH-003 | **PRESERVE** | → AUT-006 |
| B1 INV-AUTH-004 | **PRESERVE** | → AUT-008 (CROSS-BLOCK) |
| INV-MEM-001/002 | **PRESERVE** | → MEM-003, MEM-002 |
| INV-CONTEXT-001 | **SPLIT** | → CTX-001..003 and AUT-004 |
| INV-CUST-001 | **PRESERVE** | → CUS-001 |
| INV-CUST-002/003 | **NEEDS RECONCILIATION** | Follow the B1 numbering (TE-CUST follows it) → CUS-003 |
| INV-ORD-002 / INV-CASH-002 / INV-FUL-002 | **PRESERVE** | → PRM-002 (general rule), CUS-005, ROLE-002 |
| R5 INV-ID-001..005 | **MERGE (alias)** | → IDENT/MEM/CTX family |
| R5 INV-AUTH-001/002/003 | **MERGE (alias)** | → AUT-002/AUT-006/AUT-008 |
| R5 INV-AUTH-004 | **OBSOLETE** | Superseded; excluded |
| R5 INV-XDOM-001 | **PRESERVE** | → AUT-007 |
| R5 INV-MIG-001/002/003 | **ADAPT** | → LEG-001..006 |

**INC classification** (CE = CANONICAL EXISTING, DN = DERIVED NEW, M = MERGE, R = REPLACE, O = OBSOLETE, NR = NEEDS RECONCILIATION). No REPLACE is applied. Nothing is replaced automatically.

| INC | Class | Lands in |
|---|---|---|
| 01 | M (with INV-AUTH-001) | AUT-001 |
| 02 | M (INV-CONTEXT-001) | CTX-003 |
| 03 | M (INV-CONTEXT-001, INV-MEM-002) | CTX-003, MEM-002 |
| 04, 05, 06 | DN (B1) | CROSS-BLOCK; AUT-005 for the decision interaction |
| 07 | M (INV-CONTEXT-001) | CTX-002 |
| 08 | M (INV-CONTEXT-001) | AUT-004 |
| 09 | DN (B1) | CROSS-BLOCK |
| 10 | DN | AUT-001, AUT-003 |
| 11 | DN (B1) | CROSS-BLOCK |
| 12 | M (INV-CUST-001) | CUS-001 |
| 13, 15 | DN | CUS-002 (CROSS-BLOCK) |
| 14 | DN | CUS-004 (CROSS-BLOCK) |
| 16 | DN | MEM-001 |
| 17 | M (INV-AUTH-002) | ROLE-001 |
| 18 | M (R5 INV-MIG-002) | LEG-004 |
| 19 | M (R5 INV-MIG-001) | LEG-003 |
| 20 | DN (B1) | CROSS-BLOCK |
| 21 | M (R5 INV-MIG-003) | LEG-002 |
| 22 | DN | LEG-005 |
| 23 | DN | CTX-004 |
| 24 | DN (B1) | CROSS-BLOCK |
| 25 | DN | MEM-005 |
| 26 | DN (B1) | CROSS-BLOCK |
| (none) | NR | D-06, ID collisions |
| (none) | O | R5 INV-AUTH-004 |

**Proposed follow-up documentation (not created):**
- **Create:** `docs/WAPSELL-DOCUMENTATION/07-DESIGN/INVARIANTS/DERIVED/06-B2-AUTHORIZATION-INVARIANTS-v0.1.md`, DRAFT, with an alias table to the old IDs.
- **Reason:** the Block 1 baseline (`05-…`, 707 lines) is a single block-wide file, and adding B2 inside it would conflate scope and risk the ID collisions.
- **Constraints:** no edit to `05-…`, v0.2 or R5, so the baseline is not replaced destructively. Resolving the ID collision (CUST-002/003 and AUTH-00x) would be a separate, explicitly approved edit.

## 14. Evidence Index

**Documents `[D]`:**
- `07-DESIGN/INVARIANTS/DERIVED/05-BLOCK-1-INVARIANTS-BASELINE-v0.1.md` (including §13 OPEN items and §15 traceability, where all Test = "NOT CREATED").
- `07-DESIGN/INVARIANTS/DERIVED/00-INVARIANTS-v0.1.md`.
- `07-DESIGN/INVARIANTS/BASELINE/00-R5-INVARIANTS-BASELINE-001-490.md`.
- `07-DESIGN/INVARIANTS/DERIVED/04-R6-INVARIANTS-CANONICAL-AUDIT-2026-10-03.md` (§3.2, §4).
- `07-DESIGN/TESTS-EVALS/DERIVED/05-BLOCK-1-TESTS-EVALS-BASELINE-v0.1.md`.
- `03-DECISIONS/30-R8-MASTER-OWNER-DECISION-CLOSURE-2026-10-03.md`, `31-…PROPAGATION-AUDIT…`, `35-R8-AUTH-001-OWNER-DECISION-PERMISSION-CATALOGUE-MATRIX-2026-10-03.md`.
- `07-DESIGN/CONTRACTS/DOMAIN/07-R8-AUTH-001-…-v0.1.md` and `08-R8-ARCH-003-…-v0.1.md`.
- `13-AUDIT/21-BLOCK-1-AUTH-SESSION-BUSINESS-CONTEXT-ASIS-AUDIT-2026-10-04.md` (untracked draft; G-01..G-10).

**Code `[C]`** (`apps/api`):
- `src/auth/guards/permissions.guard.ts:26-35`
- `src/auth/guards/jwt-auth.guard.ts`
- `src/auth/jwt.strategy.ts:23-35`
- `src/auth/auth.service.ts:42-64, 75-103`
- `src/auth/auth.cliente.service.ts:128-155`
- `src/autorizaciones/autorizaciones.service.ts:51-76`
- `src/autorizaciones/autorizaciones.controller.ts`
- `src/usuarios/usuarios.controller.ts`
- `src/legajo/legajo.cliente.controller.ts:94-98, 117-121`
- `src/legajo/guards/legajo-aprobado.guard.ts`
- `src/app.module.ts:53-54`
- `prisma/seed.ts:130-186`

**Not re-read `[ND]`:**
- `09-TRANSFORMATION/03-IDENTITY-TENANCY-MIGRATION-CONTRACT`
- `09-TRANSFORMATION/07-AUTHORIZATION-PROFILE-OWNERSHIP-CONTRACT`
- `13-AUDIT/14-CANONICAL-PHYSICAL-SCHEMA-CONTRACT`
- `07-BLOCK-1-TRANSFORMATION-SPEC-v0.1.md`
- `00-INVARIANTS-AUDIT-RECONCILIATION.md`
- `01-TESTS-EVALS-DERIVATION-v0.1.md`
- `02-TESTS-EVALS-AUDIT-RECONCILIATION.md`
- `03-ASIS-RUNTIME-VALIDATION-PLAN.md`

Findings that depend only on these could be refined once they are read. None is expected to change the verdict.

**Not recoverable `[ND]`:** the individual TC-01..40 numbers (only the contract ranges and TC-29 / TC-38 are firm).

## 15. Closure Recommendation

Next steps, in order:
1. Create `06-B2-AUTHORIZATION-INVARIANTS-v0.1.md` as a DRAFT, once documentation-only writing is approved.
2. Run an ID-collision reconciliation of CUST-002/003 and AUTH-00x as a separate documented edit.
3. Derive the missing TEs (AUT-003, AUT-005, MEM-001, MEM-004, CTX-004, CUS-002, CUS-004, the LEG family, PRM-003/004).
4. Resolve §12 items 4, 5 and 8 before implementation is authorized.

**Verdict: READY WITH RECONCILIATION**

**Justification:**
- The 31 invariants are traceable to closed contracts and approved Owner decisions, with no `OWNER DECISION CONFLICT — BLOCKED`.
- Test/eval derivation can start for most of the groups.
- Three items need reconciliation first:
  - the documentary ID collisions (CUST-002/003, AUTH-00x);
  - the D-06 mechanism that no contract covers;
  - the technical details in §12 that block specific tests (AUT-004, AUT-005 and ROLE-004).
- This is not READY FOR TEST/EVAL DERIVATION, because the CUST numbering and the three open technical items would produce unstable TEs.
- It is not BLOCKED or FAIL, because none of these requires reopening an Owner decision.
- Implementation remains NOT AUTHORIZED, and nothing was changed.
