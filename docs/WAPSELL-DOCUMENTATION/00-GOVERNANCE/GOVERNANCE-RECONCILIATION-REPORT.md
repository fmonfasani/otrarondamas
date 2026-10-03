# Wapsell — Governance Reconciliation Report

**Date:** 2026-09-28
**Scope:** documentation only, `docs/WAPSELL-DOCUMENTATION/`
**Mandate:** reconstruct and repair governance for D-001…D-018; preserve DEC-001; restore
traceability; do not invent; no code, no database, no deploy, no commit, no new decisions.
**Overall result: PASS WITH OPEN FINDINGS** — see §9 for why this is not a PASS.

---

## 1. Executive summary

The Owner confirmed that **D-001…D-018 were approved** in the Decision Workshop. The repository
contains **no text for any of them**. The only decision with real, quotable text is **DEC-001**
(`04-DECISIONS/02-MULTITENANCY.md`), and it is a *product direction* memo that explicitly
**disclaims** the data model, migration plan, token design, AI functional scope, legacy repository
fate and the impact on the standalone specs.

Two false claims drove this reconstruction:

1. **`03-CONFLICTS/07-DECISION-REGISTER.md` presented 18 workshop *questions* as `APPROVED`.**
   The decisions were never taken. The same file was the approval target named by
   `00-DECISION-WORKSHOP.md:77`, which also contradicted `01-SOURCE-OF-TRUTH.md`.
2. **The three substantive canonical specs claimed `APPROVED — COHERENT WITH DECISIONS
   D-001..D-018`**, with **31 `(Aprobado D-0xx)` attribution markers** and **zero** DEC-001
   corroboration for their functional content.

The second point is the material one. A reader of `00-WAPSELL-SPEC-GENERAL.md` alone would have
believed 18 approved decisions were implemented as requirements. They were not; their text is
gone, and in several places the spec had silently filled the gap with **invented content** — most
egregiously an `Order` state machine with no source anywhere (§4.1).

What is genuinely approved is narrow and it is real: Wapsell is a platform, `Business = Tenant`,
`User` is global, `Membership` is N:N, roles live in the Membership, `Brand` is per-Tenant,
conversation is the central interface, and **AI assistants are part of the product**.

---

## 2. Scope covered

| Area | Files | State before | State after |
|---|---|---|---|
| `00-GOVERNANCE/` | 7 | no reconciliation artifact | plan + this report |
| `01-SOURCE-INVENTORY/` | 12 | registered sources, unread | cited as evidence; SRC-017/018 defects recorded |
| `02-CANONICAL-SPEC/` | 7 | 3 falsely `APPROVED`, 4 placeholders | 3 demoted + corrected, 4 placeholders annotated |
| `03-CONFLICTS/` | 17 | 1 resolved, mixed authority | causal mapping added; **only CON-001 resolved** |
| `03-DECISION-WORKSHOP/` | 23 | 18 fichas `PENDING`, master said "no decision made" | reconciled with fallback status; history preserved |
| `04-DECISIONS/` | 12 | register had only DEC-001 | rebuilt with 18 reconciled rows |
| `05-ASIS/` | 13 | the only substantive evidence | cited, not modified |
| `06-TRANSFORMATION/` | 9 | not audited in this pass | **not modified — OPEN** |
| `07-TOBE/` | 12 | not audited in this pass | **not modified — OPEN** |
| `08-TRACEABILITY/` | 10 | 1 all-`TBD` + 9 `_To be populated._` | master + 9 axes rebuilt with honest gaps |
| `09-ANNENES/` | 1 | not audited in this pass | **not modified — OPEN** |

---

## 3. Decision identity and hierarchy

Two colliding namespaces exist inside `03-CONFLICTS/`:

| Namespace | Meaning | Location | Count |
|---|---|---|---|
| `D-0xx` | workshop **questions**, per `D-001…D-018` | `03-DECISION-WORKSHOP/` | 18 |
| `DEC-0xx` | canonical register entries | `04-DECISIONS/` | 1 assigned (DEC-001) |

DEC-001:53 anticipates `DEC-002…DEC-019` for the remaining 18. **That numbering was never
assigned.** No equivalence may be assumed, so no `D-0xx → DEC-0xx` mapping was created. (GRF-02)

**DEC-001 — verified, complete, quotable:**
`04-DECISIONS/02-MULTITENANCY.md`, `Status: APPROVED`, date `2026-09-25`, Owner `fmonfasani`.

**D-001…D-018 — approved by the Owner; text status as of 2026-09-28 (this table supersedes the first pass's `text absent` classification):**

| Group | Decisions | State |
|---|---|---|
| **Owner-verbatim** | D-001, D-002 (+ D-002-bis `Customer` resolution) | `APPROVED — OWNER-VERBATIM`. Quotable as approved text. `IMPLEMENTATION DETAIL` still `OPEN` |
| **Reconstructed** | D-003 … D-018 | `APPROVED — DERIVED / RECONSTRUCTED`. Consistent with the workshop register summaries; **not** quotable as approved text until the Owner confirms wording. `IMPLEMENTATION DETAIL` still `OPEN` |
| Originally authored | DEC-001 | `APPROVED`, 2026-09-25, `fmonfasani`. The only decision with text written by its author |

**Where the reconstructed text lives:** `WAPSELL-SPEC-GENERAL-v1.0-RECONSTRUIDA.md` §3 (lines 87-344)
and `WAPSELL-SPEC-GENERAL-v1.1-REVISADA.md` §4 — both **non-canonical DRAFTs** at repository root.
They are now registered with explicit authority in `04-DECISIONS/00-DECISION-REGISTER.md` §4.1
(**GRF-14a**). The first pass missed them because its inventory enumerated only subdirectories.

**Date:** **2026-09-28** per the root artifacts ("aprobadas por el Owner durante el workshop del
2026-09-28") — `DERIVED`; the first pass recorded `NOT DOCUMENTED`. Owner attribution `fmonfasani`
(from the historical
register, not from a signed workshop record), and **implementation detail `OPEN`**.

---

## 4. Evidence classification

| Class | Definition | Count | Examples |
|---|---|---|---|
| **VERIFIED** | text read directly from a cited file | 1 decision + 15 AS-IS citations | DEC-001; all 15 Commerce AS-IS citations |
| **TO-BE APPROVED** | direction confirmed by DEC-001 | 8 items | `User` global, `Membership` N:N, AI in product |
| **OWNER-VERBATIM** *(new, 2026-09-28)* | decision text confirmed word-for-word by the Owner | **3** | D-001, D-002, D-002-bis (`Customer` ≠ `User`) |
| **DERIVED / RECONSTRUCTED** *(new, 2026-09-28)* | decision text reconstructed from root-level audit artifacts; consistent with the workshop register, **not** Owner-verified | **16** | D-003 … D-018 |
| ~~**PARTIAL**~~ | *retired 2026-09-28* — superseded by the two classes above | 0 | was D-001…D-005 |
| ~~**NOT DETERMINABLE** (as decision-text state)~~ | *retired 2026-09-28* — text now exists for all 18 | 0 | was D-006…D-018 |
| **PROPOSED** | asserted by a spec author, no decision behind it | most of `00`/`01`/`02` | Modular Monolith *(now `APPROVED` per D-017)*, role/permission catalogues, AI channel & automation limits |
| **PLACEHOLDER** | file with no rules at all | 4 specs | `03`, `04`, `05`, `06` |
| **NOT DOCUMENTED** | artifact does not exist | 54 cells | contracts, invariants, tests (18 × 3) — **still true**: reconstructed text does not create these layers |
| **ORPHANED** | conflict with no decision ID | 6 | CON-003, CON-004, CON-005, CON-006 *(new — mapping to D-009 withdrawn)*, CON-008, CON-014 |

---

## 5. Inconsistencies found and their treatment

| # | Inconsistency | Severity | Treatment |
|---|---|---|---|
| 1 | Workshop questions marked `APPROVED` in the conflict register | **CRITICAL** | `07-DECISION-REGISTER.md` is now historical; canonical register rebuilt |
| 2 | Workshop master asserted *"no decision has been made"* while the same repo claimed approval | HIGH | Master annotated; historical assertion preserved verbatim |
| 3 | `00` spec asserted the Phase 1 "AI out of MVP" criterion and attributed it to D-003 | **CRITICAL** | Contradicts DEC-001:23-25 → **GRF-01**; line struck, AI scope marked `OPEN` |
| 4 | `00` §22 OUT OF SCOPE listed "active AI assistants" | **CRITICAL** | Struck as superseded by DEC-001 |
| 5 | `00` §23 "Future Evolution" framed AI as a future addition | HIGH | Struck — AI is in product scope, not future |
| 6 | 28 `(Aprobado D-0xx)` markers in `00` | **CRITICAL** | All demoted to `TO-BE PROPOSED` |
| 7 | `01` claimed *"D-001: Tenant es término canónico"* | **CRITICAL** | **False** — DEC-001:55-57 excludes it; corrected |
| 8 | `01` assumed `Usuario`+`Cliente` merge into `User` | HIGH | Retired; CON-010 OPEN |
| 9 | `01` assumed global email uniqueness | MEDIUM | Retired; `05-ASIS/04-ASIS-IDENTITY.md:68` records it as open |
| 10 | `01` presented D-009 as "establece que…" | HIGH | Retired; no decision text |
| 11 | `02` declared `Customer` **is** a `User` | **CRITICAL** | Contradicts the anonymous-buyer AS-IS flow; rewritten |
| 12 | `02` invented `Order` states `BORRADOR`/`PENDIENTE`/`CONFIRMADO`/`CANCELADO` | **CRITICAL** | **Removed.** AS-IS `EstadoPedido` has 10 unenumerated values |
| 13 | `02` asserted the `Sale` lifecycle as decided (D-008) | HIGH | Demoted to `NOT DETERMINABLE` |
| 14 | `02` mixed AS-IS fields into TO-BE sections (`idempotencyKey`, `numero`, AS-IS price fields) | HIGH | Relabelled and moved to the AS-IS subsections |
| 15 | `02` mixed supplier payment (AP) into `Payment` | HIGH | Split; AP marked out of scope for that section |
| 16 | `02` had no link between `Payment` and Accounts Receivable | HIGH | Added as `OPEN`; cobrar ≠ imputar |
| 17 | `02` claimed *"Esto es resuelto por D-011/D-012"* | HIGH | Retired; no such text |
| 18 | `02` cited a `Finance/AR SPEC` that does not exist | MEDIUM | Reference removed (→ GRF-08) |
| 19 | `02` had **no** tenant-isolation or authorization section | HIGH | §8.1 added as `OPEN` |
| 20 | `08-TRACEABILITY/` master was a single all-`TBD` row | HIGH | Rebuilt with real chains and honest gaps |
| 21 | 9 traceability axes were `_To be populated._` | MEDIUM | Rebuilt, each documenting what is missing and why |
| 22 | 26 of 27 conflicts could not be closed | **CRITICAL** | Causal mapping added; only CON-001 resolved |

### Classification the mandate asked for
- **Process failure:** the workshop was never turned into decisions (#1, #2); the historical
  register was used as the approval target against `01-SOURCE-OF-TRUTH.md` (#1).
- **Fabricated detail:** the `Order` state machine (#12). This is the clearest instance of a spec
  author filling a missing decision with plausible-sounding content.
- **AS-IS→TO-BE leakage:** #11, #13, #14, #15.
- **Contradictions:** #3, #4, #5, #7, #11.
- **Missing Open Detail:** #8, #9, #16, #18, #19, #21.

---

## 6. Decisions restored (partial reconstruction)

Only the direction that DEC-001 actually states is recorded. Nothing is elaborated.

| ID | Reconstructed direction (DEC-001) | Source | Not decided by DEC-001 |
|---|---|---|---|
| D-001 | `Business = Tenant` | `:13` | which term is canonical; how `Empresa` transforms |
| D-002 | `User` global; `Membership` N:N | `:16-19` | schema; `User`/`Customer`; email uniqueness |
| D-003 | conversation is central; **AI is part of the product** | `:23-25` | channels; what an assistant does; automation boundary |
| D-004 | `Brand` = the tenant's commercial identity | `:15` | design system, tokens, typography |
| D-005 | roles/permissions live in the `Membership` | `:18-19` | the role/permission catalogue |
| D-006…D-018 | — | — | everything |

---

## 7. Special finding — GRF-01: AI scope framing (**CORRECTED 2026-09-28**)

> **This section previously concluded that D-003 had no text and that D-003 contradicted DEC-001.
> Both conclusions were WRONG and are retracted.** The reconstructed D-003 text was present in the
> root-level audit artifacts and had been missed because the original inventory enumerated only
> subdirectories, not root-level files. GRF-01 is downgraded **CRITICAL → MEDIUM**: it is a
> *scope-label and attribution defect*, not a contradiction.

| Source | Claim | Verdict |
|---|---|---|
| `00-WAPSELL-SPEC-GENERAL.md` §9 (old) | "el MVP no incluye asistentes de IA activos… (Aprobado D-003)" | **SUBSTANTIVELY CORRECT**, wrong attribution marker format. "acciones autónomas" appears in **no** decision — remains unattributed, not restored |
| `00-WAPSELL-SPEC-GENERAL.md` §22 (old) | OUT OF SCOPE: "Asistentes de IA activos" | **MIS-FRAMED** — correct as an activation-state decision, wrong as a product-scope exclusion |
| `00-WAPSELL-SPEC-GENERAL.md` §23 (old) | "AI assistants" under **Future Evolution** | **MIS-FRAMED** — implies future *adoption*; DEC-001 establishes present *product scope* |
| `04-MESSAGING-SPEC.md` | "future assistant integration" | **MIS-FRAMED** — same labelling defect |
| `WAPSELL-SPEC-GENERAL-v1.0-RECONSTRUIDA.md:107-113` / `v1.1-REVISADA.md:121-127` | **D-003 text**: *"Messaging estará activo en el MVP inicial como sistema de mensajería propio de Wapsell. Los asistentes de IA estarán preparados técnicamente para incorporarse posteriormente, pero permanecerán inactivos durante el MVP inicial. El MVP inicial no depende de WhatsApp como canal."* | **DERIVED / RECONSTRUCTED** — consistent with the workshop register summary; not yet Owner-verified verbatim |
| `04-DECISIONS/02-MULTITENANCY.md:23-25` | *"Asistentes de IA son parte del producto, no un descarte del MVP — esto revierte explícitamente el criterio de trabajo inicial de la Fase 1"* | **VERIFIED — DEC-001** |

**Resolution.** DEC-001 and D-003 are **compatible, not contradictory**. DEC-001 places AI assistants
*in product scope* and reverses the assumption that AI is out unless proven otherwise. D-003 fixes
the *activation state per iteration*: technically prepared, **inactive during the first MVP**.
"In product scope" and "inactive in the first iteration" are orthogonal. The previously struck
statement has been **restored** to `00-WAPSELL-SPEC-GENERAL.md` §9/§22/§23 with corrected
classification: `IN PRODUCT SCOPE — INACTIVE IN FIRST ITERATION (D-003)`.

**CON-011 remains OPEN, but narrowed** to the sub-items DEC-001 explicitly declines to decide
(`02-MULTITENANCY.md:61-65`): supported channels, what an AI assistant concretely does, and the
automation-vs-human-intervention boundary. The AI *scope* question itself is **no longer open**.

---

## 8. Open findings

| ID | Severity | Finding | Blocks |
|---|---|---|---|
| ~~GRF-01~~ | ~~CRITICAL~~ → **MEDIUM** | **CORRECTED.** AI scope is settled: in product scope (DEC-001), inactive in first iteration (D-003). Residual defect is the *label* ("Future Evolution" / OUT OF SCOPE) plus the unattributed "acciones autónomas" phrase | messaging/AI design (narrowed) |
| **GRF-04** | **HIGH** (was CRITICAL) | 18 conflicts have an approved decision ID; reconstructed text now exists for all of them, but text for D-003…D-018 is `DERIVED`, not Owner-verbatim. Conflicts close only on the decisions whose text the Owner confirms | CON-002, CON-009…CON-027 |
| ~~GRF-09~~ | **WITHDRAWN** | **FALSE FINDING — RETRACTED.** Reconstructed text for **all** D-001…D-018 exists at root level in `WAPSELL-SPEC-GENERAL-v1.0-RECONSTRUIDA.md` §3 and `v1.1-REVISADA.md` §4. The original claim "no decision text exists" was an inventory error (root files were never enumerated) | — |
| **GRF-14a** | **HIGH (new)** | **The four root-level artifacts are non-canonical DRAFTS dated 2026-09-28** and are not referenced by the canonical register. They are the *only* carrier of the reconstructed decision text, so the canonical corpus depends on unregistered files | canonical register, decision provenance |
| GRF-02 | HIGH | `DEC-002…DEC-019` never assigned; namespaces unreconciled | canonical register |
| GRF-03 | HIGH | Approval routing pointed at a non-canonical file | workshop process |
| GRF-05 | HIGH | Two colliding numbering namespaces inside `03-CONFLICTS/` | conflict taxonomy |
| GRF-08 | MEDIUM | **6 dangling spec references** (Finance/AR, Security, Cash, Purchases, Fulfillment) | spec completeness |
| GRF-13 | HIGH | **Two directories look populated but are mostly empty**: `04-DECISIONS/` has 11 files, only 2 with content; `03-CONFLICTS/` has 18 files, 7 of them empty duplicates of a colliding prefix | reader assumptions |
| GRF-14 | MEDIUM | `04-DECISIONS/01,03…10` (9 per-topic decision files) are empty, so the canonical decision folder *looks* organised while holding no decisions | decision lookup |
| GRF-06 | MEDIUM | 5 orphaned conflicts with no decision ID | CON-003/004/005/008/014 |
| GRF-07 | MEDIUM | Contracts, invariants and tests: **`NOT DOCUMENTED` in 18/18 rows**. Candidate invariants `INV-G01…INV-G07` now exist as *drafts* in the v1.0 root artifact but are **deferred, not formalised** | verification |
| GRF-10 | MEDIUM | 4 of 7 canonical specs are placeholders with no rules | D-003/004/010/016/017/018 |
| GRF-11 | MEDIUM | SRC-018 unreadable, SRC-017 content unconfirmed, SRC-007/012 version conflicts | AS-IS closure |
| GRF-12 | LOW | `Empresa.nombre` key differs: "Otra Ronda Más" vs "Otra Roonda Más" (typo) | AS-IS data |

---

## 9. Final result

### **PASS WITH OPEN FINDINGS — REVISED 2026-09-28**

**Status changed from "3 critical open findings" to "0 critical, 4 high".** Two of the three original
critical findings were errors in the previous pass and are now retracted:

- ~~**GRF-09** — 18 approved decisions have no text.~~ **RETRACTED — FALSE.** Reconstructed text for
  all of D-001…D-018 exists at root level (`WAPSELL-SPEC-GENERAL-v1.0-RECONSTRUIDA.md` §3,
  `WAPSELL-SPEC-GENERAL-v1.1-REVISADA.md` §4). The previous inventory enumerated only
  subdirectories and never saw these files. Requirements, contracts and invariants therefore *do*
  have an anchor. Residual issue is provenance, not existence: text for D-001/D-002 is
  Owner-verbatim; D-003…D-018 is `DERIVED / RECONSTRUCTED` and awaits Owner confirmation.
- ~~**GRF-01** — AI functional scope undecided.~~ **CORRECTED — now settled.** DEC-001 (in product
  scope) and D-003 (inactive in first iteration) are compatible. Downgraded to MEDIUM, residual
  defect is a mis-labelled section plus one unattributed phrase.
- **GRF-04 — HIGH (was CRITICAL).** 26 of 27 conflicts remain open *not* for lack of text, but
  because closing them requires the Owner to confirm reconstructed wording as canonical. D-001 and
  D-002 are Owner-confirmed and their conflicts may now close.
- **GRF-14a — HIGH (new).** The four root-level artifacts are non-canonical DRAFTS dated
  2026-09-28, unregistered in the canonical corpus, yet they are the sole carrier of the decision
  text. This is now the most significant structural finding.

**What this pass did achieve:** the corpus no longer contains a false claim of approval, no
invented state machine presented as a decision, no AS-IS behaviour presented as TO-BE fact, and no
conflict marked resolved without a documented causal link. The boundary between what is approved,
what is proposed, and what is unknown is now explicit in every file touched.

**What the previous pass got wrong (recorded for auditability):** it asserted two false findings
(GRF-09, GRF-01) and, following from GRF-01, it *struck substantively correct D-003 content* from
the General spec and reclassified it as an unresolved contradiction. The strike has been reverted.

### To reach PASS
1. Owner-confirm the reconstructed text of **D-003…D-018** (D-001/D-002 already confirmed) and
   promote it into `04-DECISIONS/00-DECISION-REGISTER.md` as verbatim — this unblocks GRF-04 and
   most of CON-002/CON-009…CON-027.
2. Register the four root-level artifacts in the canonical corpus with an explicit authority
   statement, or fold their content into the canonical files (GRF-14a).
3. Decide the narrowed CON-011 sub-items: supported channels, assistant behaviour, automation vs.
   human-intervention boundary.
4. Assign the `DEC-002…DEC-019` numbering and close the namespace collision (GRF-02, GRF-05).
5. Write the 4 placeholder specs, or record explicitly that they are deferred (GRF-10).
6. Create the 6 referenced-but-missing specs, or remove the references (GRF-08).

---

## 10. Files changed in this pass

Documentation only. No code, Prisma schema, migration, test, infrastructure file, database, or
deployment was touched. No commit was made.

**Rewritten**
- `04-DECISIONS/00-DECISION-REGISTER.md` — canonical register rebuilt
- `03-CONFLICTS/07-DECISION-REGISTER.md` — converted to historical
- `03-CONFLICTS/00-CONFLICT-REGISTER.md` — reconciliation banner added
- `00-GOVERNANCE/GOVERNANCE-RECONCILIATION-REPORT.md` — this file (revised 2026-09-28)
- `10-TRACEABILITY/00-MASTER-TRACEABILITY.md` + `01`–`09` — rebuilt

**Corrected**
- `02-CANONICAL-SPEC/00-WAPSELL-SPEC-GENERAL.md` — 28 false markers removed; **§9/§22/§23
  corrected 2026-09-28**: D-003 statement restored, AI reclassified as
  `IN PRODUCT SCOPE — INACTIVE IN FIRST ITERATION`, GRF-01 downgraded
- `02-CANONICAL-SPEC/01-IDENTITY-AND-TENANCY-SPEC.md` — 3 false claims corrected
- `02-CANONICAL-SPEC/02-COMMERCE-SPEC.md` — invented `Order` states removed, 4 leaks corrected, §8.1 added
- `02-CANONICAL-SPEC/03`,`04`,`05`,`06` — placeholder banners + open items

**Annotated**
- `03-DECISION-WORKSHOP/00`, `01`, `02`, `03` and all 18 `D-*.md` fichas — reconciliation blocks appended, history preserved
- `00-GOVERNANCE/GOVERNANCE-RECONCILIATION-PLAN.md` — created

**Created**
- `03-CONFLICTS/10-CONFLICT-RESOLUTION-MAPPING.md`

**Root-level artifacts — DISCOVERED 2026-09-28 and INCORPORATED (same pass)**

These 4 documents were missed by the first pass, which enumerated subdirectories only
(→ GRF-09, GRF-14a). They remain **non-canonical DRAFTs**; their decision text has been
incorporated into the canonical artifacts with explicit two-tier provenance.

| Artifact | Registered at | Text now carried by |
|---|---|---|
| `WAPSELL-SPEC-GENERAL-v1.0-RECONSTRUIDA.md` | `04-DECISIONS/00-DECISION-REGISTER.md` §4.1 | Register §4 (D-001…D-018), `00`/`01`/`02` canonical specs |
| `WAPSELL-SPEC-GENERAL-v1.1-REVISADA.md` | Register §4.1 | Register §4.1 + §7 (Open Detail register, approval criteria) |
| `WAPSELL-IDENTITY-AND-TENANCY-SPEC-v0.1-DERIVADA.md` | Register §4.1 | `02-CANONICAL-SPEC/01-IDENTITY-AND-TENANCY-SPEC.md` §2, §4, §5, §6 |
| `WAPSELL-DECISION-REGISTER-D001-D018.md` | Register §4.1 | Register §4 (all 18 summaries reconciled) |

**Residual (unchanged):** contracts, invariants and tests remain `NOT DOCUMENTED`
(54 cells). Incorporating decision text does **not** create those layers.

**Markup damage repaired 2026-09-28:** 118 NUL characters (from PowerShell backtick-escaping
of `` `0 `` paths) across 24 files were restored to `0`; the affected inline-code spans were
re-validated. Corpus now validates clean: 0 control chars, 0 U+FFFD, all 130 files valid UTF-8.

**Historical note:** `00-GOVERNANCE/GOVERNANCE-RECONCILIATION-PLAN.md` and the historical
`03-CONFLICTS/07-DECISION-REGISTER.md` retain their pre-reconciliation status strings on
purpose. Both now carry an explicit `SUPERSEDED` / retraction banner; do not read their
status column as current.
