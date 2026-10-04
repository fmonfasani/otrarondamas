# B2 — CONTROLLED INVARIANT RECONCILIATION

- **Date:** 2026-10-04
- **Type:** Audit / reconciliation report. Documentation only. Not a normative source.
- **Relation to file 22:** this report verifies and corrects `22-B2-AUTHORIZATION-INVARIANTS-RECONCILIATION-2026-10-04.md` (draft, non-canonical, contains the errors listed in §4). File 22 is not modified.
- **Evidence classes:** `[C]` code, `[D]` document, `[ND]` not determinable. No `[T]` or `[E]`: there are no executed tests.
- **Scope of this work:** no code, schema, migration or data change; no commit, push or deploy; no test executed; no approved Owner Decision reopened.

## 1. Executive Summary

- The 4 reconciliations were verified against the sources. **None requires reopening an approved Owner Decision.**
- Resolved documentally (no Owner Decision):
  - ID collisions.
  - R5 `INV-AUTH-004` is OBSOLETE.
  - The `INV-CUST-002/003` swap, which is a chain problem and not an isolated pair.
- D-06 `autorizaciones`:
  - Classified by facets: one part is a technical mapping, one part is a technical OPEN, one part is **OPEN — OWNER DECISION REQUIRED (CON-018)**.
  - No decision was taken on whether D-06 is removed or kept unchanged.
- Verification found **errors in the earlier draft** (file 22, §4 below). File 22 stays non-canonical.
- Stability of the resulting 34 B2 invariants: **22 stable, 6 conditional, 5 not stable, 1 process rule (not test-derivable).**
- **Verdict: READY WITH RECONCILIATION.** We do not proceed automatically. The exact open list is in §7, §13 and §15.

## 2. Reconciliation Scope

**In scope:**
- Verify the 4 reconciliations and the technical open items.
- Fix the canonical B2 set and its traceability.
- Assess stability for Test/Eval derivation.

**Out of scope:**
- Creating tests or files for tests.
- Reopening OR-B2-001/002/003, OR-B3-001/002/010 or the master table.
- Implementation.
- Modifying or renumbering R5, v0.2, B1 or the historical TE documents.

**Authority precedence:** OWNER RULING > DECISION REGISTER > CANONICAL SPEC > TO-BE > CONTRACTS > AUDIT > WORKSHOP > HISTORICAL.

## 3. Input B2 Findings

The draft (file 22, untracked, non-canonical) proposed the `INV-B2-*` prefix with 7 families:

| Family | Count |
|---|---|
| AUT | 8 |
| MEM | 5 |
| ROLE | 4 |
| PRM | 4 |
| CTX | 4 |
| CUS | 5 |
| LEG | 6 |
| **Total** | **36** |

File 22 says "31" in three places (:14, :23, :450). That count is wrong: the real sum is 36. The "12 of 31 contradicted by code" statement was not re-verified and is no longer citable.

## 4. ID Collision Reconciliation

**Corrections to the earlier report (verified against sources):**
1. v0.2 and B1 agree on the meaning of AUTH-001..003. B1 adds AUTH-004 (Messaging) and `INV-CONTEXT-001`. The "Messaging does not bypass" invariant has 3-4 IDs:
   - R5 `INV-AUTH-003`.
   - v0.2 `INV-MSG-003` (:418).
   - B1 `INV-AUTH-004`.
   - B1 `INV-MSG-003`.
2. v0.2 `INV-AUTH-002` does **not** list the 4-role catalogue. The catalogue is in B1 AUTH-002 and R8-AUTH-001 §4.
3. The CUST swap is a **chain** problem (invariants and TE), not a pair:
   - v0.2: CUST-002 = association, CUST-003 = Business-scoped (`00-INVARIANTS-v0.1.md:564-572`).
   - B1: CUST-002 = Business-scoped (:203), CUST-003 = association (:211).
   - Historical v0.1 documents (2026-09-29): CUST-002 = Business-scoped.
   - It also collides at contract level: C-CUST-002 is "scoped" in `02-COMMERCE-CONTRACTS.md:15` and "controlled association" in `07-BLOCK-1-CONTRACTS-BASELINE-v0.1.md:261`.
4. TE-ID-004..007 collide in meaning between `00-TESTS-EVALS-v0.2.md:50-70` and `05-BLOCK-1-TESTS-EVALS-BASELINE-v0.1.md:66-104`. B2 does not reuse TE numbers.
5. There are local contract namespaces (ARCH-003 §4-5: AUTH-001..005, CTX-001..006) that also need aliases.
6. The earlier statement "D-06 is not covered by any MVP contract" was partial (see §6).
7. The IDs INC-xx / TC-xx exist only in file 22. They come from a chat-only B1 report and are **not canonical evidence**.
8. Invariant wording problems: see §8.

**Collision table:**

| Legacy ID | Document | Meaning | Current B2 ID | Status | Action |
|---|---|---|---|---|---|
| R5 `INV-AUTH-001` | R5 | Contextual authorization | AUT-002 + CTX-003 | MERGE/ALIAS | Alias; do not renumber R5 |
| R5 `INV-AUTH-002` | R5 | UI is not authorization | AUT-006 | ALIAS (collides with v0.2/B1 AUTH-002) | Alias by content |
| R5 `INV-AUTH-003` | R5 | Messaging does not bypass | AUT-008 | ALIAS | Alias |
| R5 `INV-AUTH-004` | R5 | Profile→Roles→Capabilities→Overrides | — | OBSOLETE | Historical evidence only (§5) |
| `INV-AUTH-001` | v0.2, B1 | Authentication does not authorize | AUT-001 | ADAPT | Strengthen: "not sole truth" |
| `INV-AUTH-002` | v0.2, B1 | Membership→Role→Permission, 4 roles | AUT-002, ROLE-001/002/003, PRM-001 | SPLIT | Split by content |
| `INV-AUTH-003` | v0.2, B1 | UI is not authorization | AUT-006 | ALIAS | Same meaning as R5 AUTH-002 |
| `INV-AUTH-004` / `INV-MSG-003` | B1 (AUTH-004, MSG-003); v0.2 (MSG-003) | Messaging does not bypass | AUT-008 | ALIAS (CROSS-BLOCK) | Messaging owns the detail |
| `INV-CUST-002` | v0.2 | Association | CUS-003 | ALIAS | Same meaning as B1 CUST-003 |
| `INV-CUST-003` | v0.2 | Business-scoped | not B2 (B3/Customer) | External ALIAS | Reference, do not own |
| `INV-CUST-002` / `003` | B1 | Business-scoped / association | as above | Reference | B1 is the current numbering |
| `INV-CUST-002` | historical v0.1 | Business-scoped | as above | Historical | No action |
| `C-CUST-002` | `02-COMMERCE-CONTRACTS` vs `07-BLOCK-1` | Scoped vs association | CUS-003 (association) | Contract-level collision | Always cite with the document |
| `TE-ID-004..007` | `00-TESTS-EVALS-v0.2` vs B1 TE | Different meanings | NOT YET DEFINED | TE collision | Do not reuse numbers |
| ARCH-003 `AUTH-001..005` | R8-ARCH-003 §4 | Local clauses | AUT-001, AUT-002, LEG-001/003 (AUTH-003), cross-B1 (AUTH-004), AUT-004 (AUTH-005) | ALIAS by content | Final table when the B2 file is created |
| ARCH-003 `CTX-001..006` | R8-ARCH-003 §5 | Local clauses | CTX-001, CTX-003, CTX-002, CTX-003/AUT-004, CTX-004 (switch)/MEM, B3 (CTX-006) | ALIAS by content | Same |

The mapping of ARCH-003 `AUTH-0xx` and `CTX-0xx` is by content and is a proposed alias. The final mapping is made when the B2 file is created.

**Determination:**
- The meaning is identical across documents; only the numbers change, so there is **no normative contradiction**. It is an alias problem, not a decision problem.
- Documentary basis: B1 is the most recent and declares itself the consolidated surface for downstream invariants and tests.
- Nothing historical is renumbered.
- Status: **resolved documentally; not NEEDS OWNER RECONCILIATION.**

## 5. Obsolete Invariants

- **R5 `INV-AUTH-004`** (`00-R5-INVARIANTS-BASELINE-001-490.md`, composition Profile→Roles→Capabilities→Overrides): **OBSOLETE / SUPERSEDED.**
  - OR-B2-001: "No se adopta Profile → Role → Capability → Overrides para el MVP".
  - R6 audit §4 (:97-129) marks it superseded.
  - v0.2:478 says "SUPERSEDED by INV-AUTH-002".
  - R8-AUTH-001 §9/§13: direct override NOT APPROVED.
  - Kept as historical evidence; not propagated.
- **Note for the Owner (not a contradiction):** item #12 of the master table (`30-R8-MASTER…:41`) says "no global Profile/Capability/Overrides model", with "global" as a qualifier. OR-B2-001 is unqualified and prevails. The result does not change.
- **File 22:** contains the errors in §4. It must not be cited as a source.

## 6. D-06 `autorizaciones` Analysis

**Answers to the 9 questions:**

| # | Question | Answer | Class |
|---|---|---|---|
| 1 | What behavior exists | Second-person approval by re-login (email+password) for **one** operation, `caja.cierreConDiferencia`, tied to the 5000 reference threshold. Creates an `Autorizacion` record linked to `ArqueoCaja`. `cerrar()` is blocked if over the threshold and there is no `autorizacionId` (`autorizaciones.service.ts:30-93`, `caja.service.ts:170,206-266`) | `[C]` |
| 2 | What rule it protects | INV-08 / RF-09 and the D-06 constraints: nothing self-authorizes, no plaintext PIN (SDD:559; `scaffolding-notas.md:658-673`) | `[D]` |
| 3 | Is it a business authorization | Yes, as a **conditional approval layer** on top of the Permission base. It is not the Membership→Role→Permission base | `[D]` |
| 4 | Is it just a second factor/authorizer | It is second-person approval, not MFA. Distinct from decision #9 (MFA Owner/Admin) | `[D][C]` |
| 5 | Does it depend on `empresaId` | Yes: rejects `autorizador.empresaId !== empresaId` | `[C]` |
| 6 | Does it use `UsuarioPermiso` | Yes: `usuarioPermiso.findFirst` with a fresh DB read (not subject to JWT staleness) | `[C]` |
| 7 | Expressible as a Permission-gated operation | The authorizer side yes (authorizer with the right Permission, same Business). The requester side is ungated (`autorizaciones.controller.ts:10-15`; `caja.controller.ts:68-83`) | `[C]` |
| 8 | Which invariant covers it | None approved. Canonical Spec §6.2 covers it conditionally: "pueden requerir… sin auto-autorización… OPEN DETAIL" (`01-IDENTITY-AND-TENANCY-SPEC.md:330`). Candidate `INV-B2-AUT-009` (CONDITIONAL) | `[D]` |
| 9 | Which test/eval covers it | None. NOT YET DEFINED | `[ND]` |

**Classification by facet** (no A/B choice made):

| Facet | Classification | Nature |
|---|---|---|
| Authorizer with the right Permission, same Business, different from requester, auditable record | **PRESERVE (AS-IS) and ADAPT** later to Membership/Role→Permission | Technical mapping, no behavior change. Depends on atomic Permission IDs |
| Requester-side gate vs. the Cash matrix (Vendedor "explicitly authorized", Gestor "No") | **OPEN technical** | Endpoint→permission mapping (R8-AUTH-001 §12) |
| Re-login mechanism (email+password) | **OPEN** | No approved decision. SDD delegated it to the design |
| Whether the exception-approval rule, its threshold and its MVP validity are retained, modified or retired | **OPEN — OWNER DECISION REQUIRED (CON-018)** | TO-BE gap #11 (`08-TOBE/01-IDENTITY-AND-TENANCY.md:441`), `08-TOBE/04-CASH.md` §6.2 (:272-285), :373, :472 and `R4-CASH-006` leave it explicitly undecided |

**Status:** the 5000 threshold is marked in code as "NO confirmado como decisión final" (`caja.service.ts`). B2 only carries the conditional invariant.

**Code observations** (not decisions):
- Stale "D-06 pendiente" comments (`caja.service.ts:168,264`, `permissions.guard.ts:11-14`).
- A `cliente` token can reach `POST /autorizaciones`. It still needs valid authorizer credentials.

## 7. Technical Open Items

| Item | Invariants affected | Can proceed without closure? | Blocking for Tests? | Blocking for Implementation? | Owner Decision? |
|---|---|---|---|---|---|
| AUT-004: default for undecorated endpoints | AUT-004 | Yes (conceptual fail-closed is stable) | Partial: only the mechanism test | Yes | No (technical) |
| AUT-005: revocation | AUT-005, MEM-004 | Yes, for the principle | **Yes**, for any timing test | Yes | No (decision #7 delegates the mechanism) |
| ROLE-004: role cardinality per Membership | ROLE-004 | Yes | Yes, for that invariant | Yes | `[ND]` |
| Atomic Permission IDs | PRM-003, PRM-002 | Partial: domain level yes | Yes, for atomic tests | Yes | Possible (catalogue approval) |
| Role→Permission rows | PRM-001, PRM-003 | Partial | Yes, for per-role tests | Yes | Probable (matrix) |
| Enforcement mechanism | AUT-004, AUT-007 | Yes | No (behavior tests do not depend on it) | Yes | No |
| Revocation latency | AUT-005, MEM-004 | Yes, for the principle | **Yes** | Yes | `[ND]` if the bound is a business tolerance |
| Legacy window | LEG-004 | Yes | Yes, for that invariant | Yes | `[ND]` |
| `UsuarioPermiso` mapping | LEG-002, LEG-006 | Yes | **Yes**, for LEG-006 | Yes | **Yes** (R8-AUTH-001 §9: "explicit and approved") |
| G-09: legajo approval | none today | Yes | No | Yes | `[ND]` (no normative source; AS-IS defect at `legajo.cliente.controller.ts:94-121`) |
| Customer/User principal separation | CUS-001 | Yes (observable behavior is tested) | No | Yes | No |
| MFA mechanism and Business Switch transport | CTX-004 | Yes (behavior level) | No | Yes | No |
| D-06 (CON-018) | AUT-009 | Yes, the rest of B2 | Only for AUT-009 | Yes | **Yes** |

None of these is closed here.

## 8. Canonical B2 Invariant Set

Result: **34 IDs.** 36 original, minus 3 merged (AUT-003, PRM-004, CUS-002), plus 1 candidate (AUT-009). None is declared implemented.

| ID | Normative statement (summary) | Source | Owner Decision | Status | Reconciliation | Test readiness |
|---|---|---|---|---|---|---|
| AUT-001 | The JWT authenticates, it does not authorize. Claims (`empresaId`, role, permissions) are not the **sole** authorization truth | ARCH-003 §7; OR-B2-002; #5, #8 | OR-B2-002 | DOCUMENTED | Wording adjusted | STABLE |
| AUT-002 | Chain User → Business Context → ACTIVE Membership → Role → Permission, evaluated server-side | R8-AUTH-001 §3; OR-B2-001 | OR-B2-001 | DOCUMENTED | Split of `INV-AUTH-002` | STABLE |
| AUT-003 | MERGE into ROLE-001 + AUT-001 | — | — | MERGE/ALIAS | Resolved | n/a |
| AUT-004 | Fail-closed on absent/ambiguous context, membership, role or permission | ARCH-003 AUTH-005, CTX-004 | #8 | DOCUMENTED | The decorator default is mechanism (open) | CONDITIONAL |
| AUT-005 | Evaluation against current server state; the staleness bound is OPEN | ARCH-003 §6; #7 | #7 | DERIVED | Bound `[ND]` | CONDITIONAL (principle); NOT STABLE (timing) |
| AUT-006 | UI visibility is not authorization | R5 AUTH-002 / v0.2 AUTH-003 | — | DOCUMENTED | Alias | STABLE |
| AUT-007 | Authorization precedes domain mutation | R5 `INV-XDOM-001` (:688, STABLE); B1 `INV-X-002` (:542) | — | DOCUMENTED | CROSS-BLOCK | STABLE |
| AUT-008 | No channel (Messaging) grants what Membership/Role/Permission denies | R5 AUTH-003; v0.2 MSG-003; B1 AUTH-004 | — | DOCUMENTED | CROSS-BLOCK (Messaging) | STABLE |
| AUT-009 (candidate) | When a critical operation requires explicit approval by another User with the right Permission, there is no self-authorization | Canonical Spec §6.2 (:330) | CON-018 OPEN | DERIVED | Conditional on the decision | NOT STABLE |
| MEM-001 | At most one ACTIVE Membership per (User, Business) | `[D]` derived; no normative source. D-002 says "N:N" | — | DERIVED | Physical `UNIQUE(userId,businessId)` exists only in proposals (`09-TRANSFORMATION/08-…:417`); stays a technical detail | CONDITIONAL |
| MEM-002 | Only an ACTIVE Membership authorizes; INACTIVE or absent denies | OR-B2-003; #3 | OR-B2-003 | DOCUMENTED | Absorbs the principle of MEM-004 | STABLE |
| MEM-003 | A Membership does not authorize another Business | `INV-MEM-001` v0.2/B1 | — | DOCUMENTED | CROSS-BLOCK with B3 | STABLE |
| MEM-004 | A status change is reflected within the AUT-005 bound | ARCH-003 §6; #7 | #7 | DERIVED | Stable part already in MEM-002 | NOT STABLE (timing) |
| MEM-005 | History keeps the User as actor even if the Membership becomes INACTIVE | #39 | — | DERIVED | Source only through general audit | CONDITIONAL |
| ROLE-001 | The role belongs to the Membership, not the User | R8-AUTH-001; #2 | OR-B2-001 | DOCUMENTED | Absorbs AUT-003 | STABLE |
| ROLE-002 | Closed MVP catalogue: Owner, Admin, Vendedor, Gestor de Stock; Customer, Proveedor and Repartidor are not Roles | R8-AUTH-001 §4; #30 | #30 | DOCUMENTED | — | STABLE |
| ROLE-003 | Profile/Capability/Override is **not adopted** for the MVP; no direct Membership override | OR-B2-001; R8-AUTH-001 §9/§13 | OR-B2-001 | DOCUMENTED | "Not adopted", not "prohibited" | STABLE |
| ROLE-004 | Role cardinality per Membership | — | — | `[ND]` | — | NOT STABLE |
| PRM-001 | Permissions derive only from Role→Permission | R8-AUTH-001; #11, #12 | OR-B2-001 | DOCUMENTED | — | STABLE (behavior level) |
| PRM-002 | Sensitive operations require an explicit Permission (ORDER_CONFIRM, sensitive Cash, etc.) | R8-AUTH-001 §5; #17, #28 | OR-B3-010 | DOCUMENTED | Atomic IDs OPEN | STABLE (behavior level) |
| PRM-003 | The permission domain set is closed and server-governed | R8-AUTH-001 §4/§7 | #11 | DOCUMENTED | Atomic catalogue `[ND]` | NOT STABLE |
| PRM-004 | MERGE into AUT-006 / AUT-008; the mechanism is technical | — | — | MERGE/ALIAS | Resolved | n/a |
| CTX-001 | Business Context is mandatory | ARCH-003 CTX-001 | #4 | DOCUMENTED | — | STABLE |
| CTX-002 | The client cannot impose the context | ARCH-003 CTX-003 | #4, #8 | DOCUMENTED | — | STABLE |
| CTX-003 | One effective context, resolving to an ACTIVE Membership | ARCH-003 CTX-002 | #3, #4 | DOCUMENTED | — | STABLE |
| CTX-004 | On Business Switch, authority is re-derived from the target Membership | ARCH-003 §9 | #4 | DERIVED | No switch TE exists today | STABLE (behavior level) |
| CUS-001 | A Customer has no Membership/Role/Permission; authenticating gives no internal access | `C-CUST-001` B1 (:246) | #13 | DOCUMENTED | Absorbs the observable part of CUS-002 | STABLE |
| CUS-002 | MERGE into CUS-001; the mechanism (audience/strategy/guard) moves to technical items | — | — | MERGE/ALIAS | Resolved | n/a |
| CUS-003 | Customer↔User association is controlled and non-elevating | `C-CUST-002` B1 (:261); OR-B3-001/002 | OR-B3-001 | DOCUMENTED | B1 numbering | STABLE (with a non-elevation test) |
| CUS-004 | Customer responses do not expose secrets or authorization data | no normative source (G-08 is only an AS-IS defect) | — | NOT SOURCED | — | NOT STABLE |
| CUS-005 | Customer intent alone does not execute a privileged operation | #17 | #17 | DOCUMENTED | CROSS-BLOCK (Commerce) | STABLE |
| LEG-001 | `empresaId`, `Usuario.rol`, `UsuarioPermiso` and the legacy JWT are transitional | ID-003 C-COEX-001/002; #42, #43 | — | DOCUMENTED | — | STABLE |
| LEG-002 | No silent conversion of `UsuarioPermiso` to Role/Permission | R8-AUTH-001 §9 | — | DOCUMENTED | — | STABLE |
| LEG-003 | No parallel authorization model; one authoritative source per domain | ID-003 §8, §4 | #42 | DOCUMENTED | Source corrected | STABLE |
| LEG-004 | Legacy is bounded and does not permanently substitute the target | ID-003 C-COEX-001/005 | #42 | DERIVED | "Cannot refresh" removed (invented); window OPEN | CONDITIONAL |
| LEG-005 | Legacy retirement is a separate cutover task | ID-003 §10 | #42 | DERIVED | Process/gate rule | NOT TEST-DERIVABLE |
| LEG-006 | Legacy does not exceed the explicitly approved mapping | R8-AUTH-001 §9 | #12 | DERIVED | Mapping OPEN | NOT STABLE |

**Summary:** 22 STABLE, 6 CONDITIONAL, 5 NOT STABLE, 1 not test-derivable. Only active invariants count; MERGE/ALIAS do not.

## 9. Preservation / Adaptation Matrix

| Existing | Action | Canonical B2 result | Reason |
|---|---|---|---|
| R5 `INV-AUTH-001` | MERGE/ALIAS | AUT-002 + CTX-003 | Same meaning |
| R5 `INV-AUTH-002` | MERGE/ALIAS | AUT-006 | Same meaning |
| R5 `INV-AUTH-003` | MERGE/ALIAS | AUT-008 | Same meaning |
| R5 `INV-AUTH-004` | OBSOLETE | — | §5 |
| R5 `INV-XDOM-001` | PRESERVE | AUT-007 | STABLE, cross-block |
| R5 `INV-MIG-001/002/003` | ADAPT | LEG-001..006 | Reformulated without inventing |
| v0.2/B1 `INV-AUTH-001` | ADAPT | AUT-001 | "Not sole truth" |
| v0.2/B1 `INV-AUTH-002` | SPLIT | AUT-002, ROLE-001/002/003, PRM-001 | Too broad |
| v0.2/B1 `INV-AUTH-003` | MERGE/ALIAS | AUT-006 | Same meaning |
| v0.2/B1 `INV-AUTH-004`, `INV-MSG-003` | MERGE/ALIAS | AUT-008 | CROSS-BLOCK |
| v0.2/B1 `INV-CONTEXT-001` | SPLIT | CTX-001, CTX-002, CTX-003, AUT-004 | Too broad |
| `INV-MEM-001` / `INV-MEM-002` | PRESERVE | MEM-003 / MEM-002 | — |
| `INV-CUST-001` | PRESERVE | CUS-001 | — |
| `INV-CUST-002` (v0.2) / `INV-CUST-003` (B1) | MERGE/ALIAS | CUS-003 | Same association rule |
| `INV-CUST-003` (v0.2) / `INV-CUST-002` (B1) | PRESERVE (external) | Outside B2 (B3/Customer) | Business-scoped |
| `INV-ORD-002`, `INV-CASH-002` | PRESERVE (reference) | PRM-002 (B2 side) | CROSS-BLOCK |
| `INV-FUL-002` | PRESERVE (reference) | ROLE-002 | Catalogue boundary |
| D-06 `autorizaciones` | NEEDS RECONCILIATION | AUT-009 candidate | §6 |
| AS-IS code of `UsuarioPermiso`, `Usuario.rol`, `empresaId` | PRESERVE as AS-IS | LEG-001 | Evidence, not canonical |
| New | NEW | AUT-009 | CON-018 |

## 10. Invariant → Contract Traceability

| OWNER DECISION | CONTRACT | INVARIANT | TEST/EVAL | IMPLEMENTATION REQUIREMENT |
|---|---|---|---|---|
| OR-B2-001 (Membership→Role→Permission) | R8-AUTH-001 §3-4 | AUT-002, ROLE-001/002/003, PRM-001 | NOT YET DEFINED | Server-side Role→Permission; Membership model |
| OR-B2-002 (valid token ≠ authorization) | R8-ARCH-003 §7 | AUT-001 | NOT YET DEFINED | Server-side verification per request |
| OR-B2-003 (Membership ACTIVE/INACTIVE) | R8-ARCH-003 §6 | MEM-002, CTX-003 | NOT YET DEFINED | Membership status |
| #4 Business Switch | R8-ARCH-003 §9 | CTX-001..004 | NOT YET DEFINED | Application-controlled context |
| #7 Revocation | R8-ARCH-003 §6 | AUT-005, MEM-004 | NOT YET DEFINED | Mechanism OPEN |
| OR-B3-001/002 (Customer↔User) | B1 `C-CUST-002` | CUS-001, CUS-003 | NOT YET DEFINED | Controlled association |
| OR-B3-010 / #28 (sensitive Cash) | R8-AUTH-001 §5 | PRM-002 | NOT YET DEFINED | Atomic IDs OPEN |
| #17 (ORDER_CONFIRM) | B1 `C-ORD-002` | PRM-002, CUS-005 | NOT YET DEFINED | Explicit Permission |
| #42/#43 (migration, legacy `empresaId`) | R8-ID-003 C-COEX-001..006 | LEG-001..006 | NOT YET DEFINED | Window and mapping OPEN |
| CON-018 (OPEN) | Canonical Spec §6.2 | AUT-009 | NOT YET DEFINED | Depends on the decision |

## 11. Invariant → Test/Eval Readiness

Existing TEs are in `00-TESTS-EVALS-v0.2.md:50-70` (TE-AUTH-001..004) and in the B1 baseline (:66-104). I did not detect TEs for MEM or a switch-specific one in those catalogues. No exhaustive re-sweep of all TEs was done.

| B2 Invariant | Test/Eval existente | Gap | Reconciliation needed | Stable for derivation? |
|---|---|---|---|---|
| AUT-003 | B1 TE-AUTH-001..002 (by content) | Merge into ROLE-001/AUT-001 | Alias | Merge: yes via ROLE-001 + AUT-001 |
| AUT-004 | None specific | Decorator default is mechanism | Separate behavior from mechanism | **CONDITIONAL** |
| AUT-005 | None | Revocation bound `[ND]` | Technical closure | **NO** |
| MEM-001 | None | No normative source for uniqueness | Confirm or retire the statement | **CONDITIONAL** |
| MEM-004 | None | Depends on AUT-005 | Technical closure | **NO** (timing); the stable part is MEM-002 |
| CTX-004 | No switch TE exists | Switch transport OPEN | Behavior level only | **Yes (behavior)** |
| CUS-002 | B1 isolation TE (different) | Mechanism | MERGE into CUS-001 | n/a (merged) |
| CUS-003 | `TE-CUST-003/004` B1; `TE-ID-006` v0.2 | Missing non-elevation test; TE numbering collides | ID alias | **Yes** |
| CUS-004 | None | No normative source | Source or discard | **NO** |
| LEG-001 | None | — | — | **Yes** |
| LEG-002 | None | — | — | **Yes** |
| LEG-003 | None | Re-source to ID-003 §8/§4 | — | **Yes** |
| LEG-004 | None | Window OPEN | Reworded | **CONDITIONAL** |
| LEG-005 | n/a | Process rule | Treat as a gate | **NO** (not test-derivable) |
| LEG-006 | None | Mapping OPEN | Mapping closure | **NO** |
| PRM-003 | `TE-AUTH-006` (role catalogue, B1) covers another invariant (ROLE-002) | Atomic catalogue `[ND]` | Catalogue closure | **NO** |
| PRM-004 | None | MERGE | Alias | n/a (merged) |

No tests were created. No test was declared PASSED.

## 12. Owner Decision Coverage

Approved decisions are not reopened. Coverage against the master table (`30-R8-MASTER…`) and the OR documents:

| Decision | B2 coverage | Level |
|---|---|---|
| OR-B2-001 / #2 / #11 / #12 | AUT-002, ROLE-001/002/003, PRM-001 | Complete at behavior level; atomic rows OPEN |
| OR-B2-002 / #5 / #8 | AUT-001, AUT-004 | Complete |
| OR-B2-003 / #3 | MEM-002, CTX-003 | Complete |
| #4 | CTX-001..004 | Complete; switch transport in B1 |
| #7 | AUT-005, MEM-004 | Partial: the mechanism is an implementation detail (#7 itself says so) and the bound is `[ND]` |
| #9 | B1 | Referenced |
| #13 / #14 / OR-B3-001/002 | CUS-001, CUS-003 | Complete |
| #17 | PRM-002, CUS-005 | Complete |
| #28 / OR-B3-010 | PRM-002 | Complete in rule; atomic IDs OPEN |
| #30 | ROLE-002 | Complete |
| #39 | MEM-005 | Partial |
| #42 / #43 | LEG-001..006 | Partial: window and mapping OPEN |
| CON-018 | AUT-009 | **Not decided** |

No contradiction with any approved decision was found. `OWNER DECISION CONFLICT` is not raised.

## 13. Remaining Dependencies

1. **Owner Decision required:** CON-018 (D-06 scope: retain/modify/retire the exception approval, its threshold and its mechanism).
2. **Probable Owner approval (R8-AUTH-001 §9):** `UsuarioPermiso` → Role/Permission mapping; atomic IDs and matrix rows.
3. **Technical (do not block derivation of the stable set):** AUT-004 default, revocation and latency, legacy window, ROLE-004 cardinality, enforcement, principal separation, MFA/switch.
4. **`[ND]`:** staleness bound (AUT-005); cardinality (ROLE-004); G-09 (target permission for legajo approval).
5. **Documentary:**
   - Source or discard for CUS-004.
   - Confirm or retire the MEM-001 statement.
   - Final alias for the ARCH-003 clauses.
   - Treat LEG-005 as a gate.
6. Improvable in existing documents (not touched): mojibake at `01-IDENTITY-AND-TENANCY-SPEC.md:329`; stale `07-TOBE/` path in `08-TOBE/04-CASH.md`.

## 14. Readiness Gates

| Gate | Result | Basis |
|---|---|---|
| A — Invariant Identity | **PASS WITH RECONCILIATION** | ID collisions resolved by alias without renumbering; final ARCH-003 alias still missing |
| B — Contract Consistency | **PASS WITH RECONCILIATION** | The `C-CUST-002` collision is handled by citing the document; no normative contradiction |
| C — Owner Decision Consistency | **PASS WITH RECONCILIATION** | No conflict with approved decisions; CON-018 stays open and is isolated in AUT-009 |
| D — Test Derivation Stability | **CONDITIONAL** | Only the subset of 22 stable invariants is derivable; 6 conditional and 5 not stable, listed above |

## 15. Final Verdict

**READY WITH RECONCILIATION**

The criterion is documentary evidence, not the expectation of a full READY. The documentary reconciliations are resolved, but exactly this remains open:
- AUT-009 (D-06): blocked by CON-018.
- CONDITIONAL: AUT-004, AUT-005, MEM-001, MEM-005, LEG-004.
- NOT STABLE: MEM-004, ROLE-004, PRM-003, CUS-004, LEG-006.
- LEG-005: not test-derivable.

Per the agreed rule, **we do not proceed automatically to Tests/Evals**: first we review that list.

## 16. Recommended Next Step

1. Review together the 11 open items in §15 and decide which are closed documentally. Quick candidates: MEM-001 (confirm or retire), CUS-004 (source or discard), LEG-005 (turn into a gate).
2. Ask the Owner for the D-06 scope decision (CON-018). Until then AUT-009 stays out of the derivation.
3. Only then write the canonical B2 invariants file and derive Tests/Evals for the 22 stable ones only, with IDs "NOT YET DEFINED" until assigned without reusing TE numbers from the current catalogues.
4. Planned order: B2 Tests/Evals → B2 Readiness → B4.

File 22 remains untracked and with the errors in §4. It can be annotated or replaced on request.

## 17. Evidence Index

All evidence is `[D]` or `[C]`; `[ND]` points are marked above.

**Decisions `[D]`** (`docs/WAPSELL-DOCUMENTATION/03-DECISIONS/`):
- `20-OR-B2-OWNER-DECISIONS-2026-10-03.md` (OR-B2-001/002/003).
- `22-OR-B3-OWNER-DECISIONS-2026-10-03.md` (:15-27, :76-81).
- `30-R8-MASTER-OWNER-DECISION-CLOSURE-2026-10-03.md` (:31-72).
- `26-R4-TOBE-AUDIT-INVENTORY-CASH-MESSAGING-2026-10-03.md:52` (R4-CASH-006).

**Contracts `[D]`:**
- `07-DESIGN/CONTRACTS/DOMAIN/08-R8-ARCH-003-…-v0.1.md` (§4-17).
- `…/06-R8-ID-003-…-v0.1.md` (:43-185).
- `07-BLOCK-1-CONTRACTS-BASELINE-v0.1.md` (:35, :134-261, :355).
- `02-COMMERCE-CONTRACTS.md:15`.
- `01-IDENTITY-AND-TENANCY-CONTRACTS.md:138`.
- R8-AUTH-001 §7 (:77-85), §9, §13.
- `46-R8-AUTH-001-CONTRACT-PROPAGATION-READINESS-2026-10-04.md`.

**Invariants and TE `[D]`:**
- `07-DESIGN/INVARIANTS/DERIVED/05-BLOCK-1-INVARIANTS-BASELINE-v0.1.md` (:193-211, :431-437, :534-556, :625).
- `BASELINE/00-R5-INVARIANTS-BASELINE-001-490.md:688-692`.
- `00-INVARIANTS-v0.1.md` (:133-164, :418, :478, :564-572).
- `TESTS-EVALS/DERIVED/00-TESTS-EVALS-v0.2.md:50-70`.
- `TESTS-EVALS/DERIVED/05-BLOCK-1-TESTS-EVALS-BASELINE-v0.1.md:66-104`.

**D-06 `[D]`:**
- `06-SPECIFICATIONS/CANONICAL/01-IDENTITY-AND-TENANCY-SPEC.md:306-311, :330`.
- `08-TOBE/01-IDENTITY-AND-TENANCY.md:441`.
- `08-TOBE/04-CASH.md` (:209, :272-285, :373, :423-472).
- `04-ASIS/05-ASIS-AUTHORIZATION.md:43-62`.
- SDD `SDD-especificacion-funcional-v0.1.md:559`; `scaffolding-notas.md:658-673`.

**Audit `[D]`:**
- `13-AUDIT/21-BLOCK-1-AUTH-SESSION-BUSINESS-CONTEXT-ASIS-AUDIT-2026-10-04.md` (G-01, G-04, G-08, G-09).
- `09-TRANSFORMATION/08-PHYSICAL-TARGET-MODEL-V2…:417`.
- `12-ARCHITECTURAL-DECISION-CLOSURE.md:639`.
- `13-AUDIT/22-…` (non-canonical).

**Code `[C]`** (`apps/api/src/`):
- `autorizaciones/autorizaciones.service.ts:30-93`.
- `autorizaciones/autorizaciones.controller.ts:10-27`.
- `autorizaciones/dto/solicitar-autorizacion.dto.ts:8`.
- `caja/caja.controller.ts:57-88`.
- `caja/caja.service.ts:168-266`.
- `prisma/schema.prisma:1112-1128`.
- `auth/permissions.guard.ts:11-35`.
- `auth/jwt.strategy.ts:23-35`.
- `auth/auth.types.ts:5-33`.
- `auth/auth.service.ts:42-103`.
- `auth/auth.cliente.service.ts:149-159`.
- `legajo/legajo.cliente.controller.ts:94-121`.
- `legajo/legajo-aprobado.guard.ts:24-36`.
- `usuarios/usuarios.controller.ts:19-32`.
- `app.module.ts:53-54`.
- `seed.ts:130-186`.

Code line numbers come from earlier reads in the session. No tests or linter were re-executed.
