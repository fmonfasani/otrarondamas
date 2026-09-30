# Wapsell — Master Traceability Matrix
**Reconciled:** 2026-09-28 · **Status:** PARTIAL — the matrix can only be filled for DEC-001

> ## How to read this matrix
>
> The previous content of this file was a single row of `TBD` across eleven columns. It is
> replaced because an all-`TBD` matrix hides the real problem: **most of the chain has no
> upstream anchor.**
>
> The rule applied: a cell is filled only when the repository contains evidence for it. Cells
> marked `NOT DETERMINABLE` are **not** gaps in this matrix — they are gaps in the decision
> corpus. Filling them would require inventing decision text, which the mandate forbids.
>
> Legend: `VERIFIED` = evidence read in the named file. `PROPOSED` = asserted by a spec author
> with no decision behind it. `NOT DETERMINABLE` = approved decision ID, no text in repository.
> `NOT DOCUMENTED` = no artifact exists at all. `n/a` = the column does not apply to this row.

---

> **R1 TRACEABILITY NOTE (2026-09-30) — additive. No row of the table below was modified.** This matrix stays
> anchored on DEC-001 (*Reconciled 2026-09-28*). Later authority: D-001, D-002, D-002-bis (`OWNER-VERBATIM`,
> `04-DECISIONS/00-DECISION-REGISTER.md` §4), OR-001 (`04-DECISIONS/13-OR-001-OWNER-RULING-CLOSURE.md`) and OR-002-A
> (`04-DECISIONS/15-OR-002-A-OWNER-RULING.md`), both `CLOSED` 2026-09-28.
>
> - **Rows 4 and 5** (`CON-010 OPEN`; row 5 `NOT DECIDED`): historical record. The current canonical state, per
>   OR-002-A, is `CON-010` `RESOLVED` in conceptual direction (`User` → `Membership` N:N → `Business`; `Customer`
>   not merged with `User`, optional link), authority D-002 + D-002-bis; `IMPLEMENTATION DETAIL` `OPEN`; no physical
>   implementation authorized. These `OPEN` positions were not in the `ISS-07` table and are recorded in
>   `04-DECISIONS/17-R1-DOCUMENTAL-RECONCILIATION-RECORD.md`; `ISS-07` remains preserved.
> - **Rows 2 and 3** (`CON-009 OPEN`; canonical term `NOT DECIDED`): historical record. Later authority: D-001
>   `OWNER-VERBATIM` (`Business` canonical) and OR-001 P1-A (`Empresa` → `Business`; physical vs conceptual scope not
>   defined by the ruling).
>
> **R3 TRACEABILITY NOTE (2026-09-30) — additive; the R1 note above is preserved.** Source / Authority: Owner rulings of
> 2026-09-30 (R2) — `04-DECISIONS/18-R2-OWNER-DECISION-CLOSURE-REPORT.md`, Decision Register §8.1. Now ruled at the
> conceptual level: OR-002-B, C, D, E, F; P1-A option C (`Empresa` → `Business`, terminology and persistent model as
> final destination — the physical migration is neither designed nor authorized); P5-B; `CON-010`/`ISS-07`
> (`RESOLVED` conceptually; implementation `OPEN`); `ISS-08` (precedence); D-003/WhatsApp (`RESOLVED`). No row of
> this matrix was modified. Still `OPEN`: Customer↔User "same email" matching; `NO CONSULTED`: D-005, OR-003,
> OR-005, D-006, D-008, D-011, D-013, D-015, D-016, D-017. Technical Specification `NOT APPROVED`; implementation
> `NOT AUTHORIZED`; `F1` is not an authorization.

## 1. Decision → spec → AS-IS (the chain that can actually be traced)

| # | Decision direction | Authority | Canonical SPEC | AS-IS evidence | Conflict | Verdict |
|---|---|---|---|---|---|---|
| 1 | Wapsell is a platform, not a business; Otra Ronda Más is the first tenant | **DEC-001** `:7-9`, `:20` | `00-WAPSELL-SPEC-GENERAL.md` §2 | `05-ASIS/01-ASIS-PRODUCT.md` (single-business system) | — | **TO-BE APPROVED** |
| 2 | `Business = Tenant` | **DEC-001** `:13` | `00` §4, `01` §2 | `05-ASIS/03-ASIS-DATA.md` (`Empresa` = isolation root) | CON-009 **OPEN** | **TO-BE APPROVED** (equivalence only) |
| 3 | Which term is canonical, `Tenant` or `Business` | **EXCLUDED** by DEC-001 `:55-57` | `01` §2.1 (uses `Tenant`, flagged) | — | CON-009 **OPEN** | **NOT DECIDED** |
| 4 | `User` is a single global identity | **DEC-001** `:16` | `00` §5, `01` §1.1 | `05-ASIS/04-ASIS-IDENTITY.md` (`Usuario` 1:1 `Empresa` — *not* global) | CON-010 **OPEN** | **TO-BE APPROVED** |
| 5 | `User`/`Customer` merge, email uniqueness | **EXCLUDED** by DEC-001 `:55-57` | `01` §1.1, `02` §1.1 | `05-ASIS/04-ASIS-IDENTITY.md:63-68`; `05-ASIS/07-ASIS-FLOWS.md:39` (anonymous buyer) | CON-010 **OPEN** | **NOT DECIDED** — the two AS-IS sources are what made the old `Customer = User` claim contradictory |
| 6 | `Membership` is N:N `User`↔`Tenant` | **DEC-001** `:16-19` | `00` §6, `01` §3 | none — no AS-IS analogue (AS-IS is 1:1) | — | **TO-BE APPROVED** |
| 7 | Roles/permissions live in the `Membership` | **DEC-001** `:18-19` | `00` §7, `01` §4-§5 | `05-ASIS/05-ASIS-AUTHORIZATION.md` (R01, roles tied to `Usuario`+`Empresa`) | — | **TO-BE APPROVED** (principle) |
| 8 | The role/permission **catalogue** | **EXCLUDED** | `01` §4, `06` (role-based nav) | `05-ASIS/05-ASIS-AUTHORIZATION.md` (AS-IS role list, not a TO-BE decision) | — | **NOT DECIDED** |
| 9 | `Brand` is the tenant's commercial identity | **DEC-001** `:15` | `00` §8, `01` §2.1, `06` | `05-ASIS/06-ASIS-UX-BRANDING.md` (**four conflicting token sets**, no hierarchy) | CON-012 **OPEN** | **TO-BE APPROVED** (concept) |
| 10 | Canonical design system / tokens | **EXCLUDED** | `06` | `05-ASIS/06-ASIS-UX-BRANDING.md` | CON-012 **OPEN** | **NOT DECIDED** |
| 11 | Conversation is the central commercial interface | **DEC-001** `:23` | `00` §9, `04` | `05-ASIS/08-ASIS-INTEGRATIONS.md` (AS-IS messaging channels) | — | **TO-BE APPROVED** |
| 12 | Supported messaging channels, message model | **EXCLUDED** | `00` §9, `04` | `05-ASIS/08-ASIS-INTEGRATIONS.md` | — | **NOT DECIDED** |
| 13 | **AI assistants are part of the product** (reverses the "AI out of MVP" criterion) | **DEC-001** `:23-25` | `00` §9, §22, §23, `04` | none — AI is absent from the AS-IS entirely | **CON-011 OPEN / GRF-01** | **TO-BE APPROVED** — and it **contradicts** the old `00` OUT OF SCOPE line, which is now struck |
| 14 | AI **functional scope**, automation boundary | **EXCLUDED** by DEC-001 `:61-65` | `00` §9, `04` | — | CON-011 **OPEN** | **NOT DECIDED** |
| 15 | Legal fate of `wapsell-clientes` / `wapsell-pdv` | **EXCLUDED** by DEC-001 `:55-57` | — | `05-ASIS/` (both legacy apps documented) | — | **NOT DECIDED** |
| 16 | Impact on the standalone POS | **EXCLUDED** by DEC-001 `:55-57` | — | `05-ASIS/` (POS documented) | — | **NOT DECIDED** |

---

## 2. D-001…D-018 → spec (the chain that cannot be traced)

| Decision | Authority status | Specialized SPEC | Contract | Invariant | Test | Verdict |
|---|---|---|---|---|---|---|
| D-001 Tenant/tenancy | `APPROVED — OWNER-VERBATIM` | `01-IDENTITY-AND-TENANCY-SPEC.md` §2 | **NOT DOCUMENTED** | **NOT DOCUMENTED** | **NOT DOCUMENTED** | **PARTIAL** via DEC-001:13 |
| D-002 User/Membership | same | `01` §1, §3 | **NOT DOCUMENTED** | **NOT DOCUMENTED** | **NOT DOCUMENTED** | **PARTIAL** via DEC-001:16-19 |
| D-003 Messaging + AI scope | same | `04-MESSAGING-SPEC.md` (placeholder) | **NOT DOCUMENTED** | **NOT DOCUMENTED** | **NOT DOCUMENTED** | **PARTIAL** via DEC-001:23-25 |
| D-004 Brand/identity | same | `06-BRANDING-AND-EXPERIENCE-SPEC.md` (placeholder) | **NOT DOCUMENTED** | **NOT DOCUMENTED** | **NOT DOCUMENTED** | **PARTIAL** via DEC-001:15 |
| D-005 Roles/permissions | same | `01` §4-§5 | **NOT DOCUMENTED** | **NOT DOCUMENTED** | **NOT DOCUMENTED** | **PARTIAL** via DEC-001:18-19 |
| D-006 Authorization/token | same | `01` §6, §9, §10 | **NOT DOCUMENTED** | **NOT DOCUMENTED** | **NOT DOCUMENTED** | **NOT DETERMINABLE** |
| D-007 Order/Sale split | same | `02-COMMERCE-SPEC.md` §4, §5 | **NOT DOCUMENTED** | **NOT DOCUMENTED** | **NOT DOCUMENTED** | **NOT DETERMINABLE** |
| D-008 Sale lifecycle/returns | same | `02` §5 | **NOT DOCUMENTED** | **NOT DOCUMENTED** | **NOT DOCUMENTED** | **NOT DETERMINABLE** |
| D-009 Approval process | same | `01` §4, §6 | **NOT DOCUMENTED** | **NOT DOCUMENTED** | **NOT DOCUMENTED** | **NOT DETERMINABLE** |
| D-010 Inventory source of truth | same | `03-OPERATIONS-SPEC.md` (placeholder) | **NOT DOCUMENTED** | **NOT DOCUMENTED** | **NOT DOCUMENTED** | **`IMPLEMENTATION NON-COMPLIANT / GAP`** — requirement `APPROVED - OWNER-RULED`; controls partial (`AUD-D010-C01`…`C06`), gaps verified (`AUD-D010-G01`…`G10`). See §5 Chain A |
| D-011 Payments | same | `02` §6 | **NOT DOCUMENTED** | **NOT DOCUMENTED** | **NOT DOCUMENTED** | **NOT DETERMINABLE** |
| D-012 Accounts Receivable | same | `02` §7 | **NOT DOCUMENTED** | **NOT DOCUMENTED** | **NOT DOCUMENTED** | **NOT DETERMINABLE** |
| D-013 Cash | same | `00` §12, `03` | **NOT DOCUMENTED** | **NOT DOCUMENTED** | **NOT DOCUMENTED** | **NOT DETERMINABLE** |
| D-014 Inventory | same | `00` §13, `03` | **NOT DOCUMENTED** | **NOT DOCUMENTED** | **NOT DOCUMENTED** | **`VERIFIED BY CODE`** — requirement `APPROVED - OWNER-RULED`; isolation verified (`AUD-D014-C01`…`C10`), prohibition met by absence of the feature. See §5 Chain B |
| D-015 Purchases/Suppliers/AP | same | `00` §14, `03` | **NOT DOCUMENTED** | **NOT DOCUMENTED** | **NOT DOCUMENTED** | **NOT DETERMINABLE** |
| D-016 Fulfillment | same | `00` §16, `03` | **NOT DOCUMENTED** | **NOT DOCUMENTED** | **NOT DOCUMENTED** | **NOT DETERMINABLE** |
| D-017 Architecture | same | `05-PLATFORM-AND-GOVERNANCE-SPEC.md` (placeholder) | **NOT DOCUMENTED** | **NOT DOCUMENTED** | **NOT DOCUMENTED** | **NOT DETERMINABLE** |
| D-018 CI/CD | same | `05` | **NOT DOCUMENTED** | **NOT DOCUMENTED** | **NOT DOCUMENTED** | **NOT DETERMINABLE** |

---

## 3. Entity-level traceability (AS-IS → TO-BE)

Every row is a **transformation hypothesis**, not a decision. DEC-001:55-57 explicitly excludes
the data model and migration plan, so the right-hand column cannot be filled.

| AS-IS entity | AS-IS source | Candidate TO-BE | TO-BE decided? |
|---|---|---|---|
| `Empresa` | `05-ASIS/03-ASIS-DATA.md` | `Tenant` | Equivalence APPROVED (DEC-001:13); **fields and migration NOT decided** |
| `Usuario` | `05-ASIS/04-ASIS-IDENTITY.md` | `User` (internal) | APPROVED (DEC-001:16); **uniqueness NOT decided** |
| `Cliente` | `05-ASIS/04-ASIS-IDENTITY.md` | `Customer`? | **NOT DECIDED** — separate entity, a `User`, or both |
| — | — | `Membership` | N:N APPROVED (DEC-001:16-19); **schema NOT decided** |
| — | — | `Role`, `Permission` | In-Membership APPROVED (DEC-001:18-19); **catalogue NOT decided** |
| `Pedido`, `PedidoItem` | `05-ASIS/03-ASIS-DATA.md` | `Order` | **NOT DETERMINABLE** (D-007) |
| `Venta`, `VentaItem` | `05-ASIS/03-ASIS-DATA.md` | `Sale` | **NOT DETERMINABLE** (D-007) |
| `Pago` | `05-ASIS/03-ASIS-DATA.md` | `Payment` | **NOT DETERMINABLE** (D-011) |
| `CuentaCorriente`, `Deuda`, `AplicacionPago` | `05-ASIS/03-ASIS-DATA.md` (no service, RF-10) | AR concepts | **NOT DETERMINABLE** (D-012) |
| `Producto` | `05-ASIS/03-ASIS-DATA.md` | `Product` | `PROPOSED`; key `[Tenant, codigoInterno]` is AS-IS-verified |
| `EstadoPedido` (10 values) | `05-ASIS/03-ASIS-DATA.md` | Order states | **NOT DETERMINABLE** — values never enumerated in any document |
| `EstadoVenta` (`CONFIRMADA`/`ANULADA`) | `05-ASIS/03-ASIS-DATA.md` | Sale states | **NOT DETERMINABLE** (D-008); no flow produces `ANULADA` |

---

## 4. What this matrix proves

- **Only DEC-001 has a traceable chain**, and only for 8 of its own direction items. The other
  8 items it raises are self-declared exclusions.
- **Contracts: `NOT DOCUMENTED` in 18/18 rows.** No decision maps to a contract.
- **Invariants: `NOT DOCUMENTED` in 18/18 rows.** No decision maps to an invariant.
- **Tests: `NOT DOCUMENTED` in 18/18 rows.** No decision maps to a test.
- Four of the seven canonical specs (`03`, `04`, `05`, `06`) are **placeholders with no rules at
  all**, so D-003, D-004, D-010, D-016, D-017 and D-018 have no spec to trace to even in
  proposal form.
- The remaining four specs (`00`, `01`, `02`, and the DEC-001 parts) trace only because DEC-001
  supplied the text.
- **D-010 and D-014 are the only decisions with a verified code-evidence chain** (propagated
  2026-09-28 from `10-AUDIT/01-D010-D014-CODE-EVIDENCE-AUDIT.md`). Both are `APPROVED - OWNER-RULED`
  with `DERIVED / RECONSTRUCTED` text, and both now have an AS-IS evidence chain (§5). **Neither
  acquired a contract, invariant or test**: the Contract / Invariant / Test columns above still read
  `NOT DOCUMENTED` for both, which is deliberate and consistent with the audit, where corrective
  observations remain `PROPOSED / OPEN`.

## 5. D-010 / D-014 — verified evidence chain (propagated 2026-09-28)

Added by the controlled evidence propagation of 2026-09-28. Source of truth for every finding
ID below: `10-AUDIT/01-D010-D014-CODE-EVIDENCE-AUDIT.md` — 41 findings (30 `VERIFIED BY CODE`,
6 `DOCUMENTED`, 5 `NOT DETERMINABLE`, 0 `VERIFIED BY TEST`, 0 `VERIFIED BY EXECUTION`).
**No `INV-*`, no `TEST-*`, no contract and no invariant is created by this propagation**; the
Contract / Invariant / Test columns of §2 stay `NOT DOCUMENTED` for both decisions, by decision.

### Chain A — D-010 stock integrity: requirement approved, implementation is a GAP

| Link | Value | Evidence location |
|---|---|---|
| Decision | **D-010** — `APPROVED - OWNER-RULED 2026-09-28`, text `DERIVED / RECONSTRUCTED` | `04-DECISIONS/00-DECISION-REGISTER.md` §4.3.1 |
| Domain | `Inventory` | `05-ASIS/03-ASIS-DATA.md` |
| Requirement | Integrity transaccional del stock mediante *"controles de base de datos y/o transacción"*: movimientos **atómicos**, **concurrentemente seguros**, **resistentes a cantidades inválidas** y **consistentes entre movimientos y existencias resultantes** | D-010 approved text |
| Controls present (partial) | `AUD-D010-C01`…`C06` — conditional atomic `UPDATE`, movement+balance adjustment inside `$transaction`, DTO quantity validation, sale atomicity, hard reject on insufficient stock, expiry flag captured at movement time | `05-ASIS/11-ASIS-QUALITY.md` — `VERIFIED BY CODE` |
| Gaps (where it fails) | `AUD-D010-G01`…`G10` — concurrent oversell, unguarded supplier return, unbalanced ledger when `loteId` is absent, 0 `CHECK` and 0 `TRIGGER` across 17 migrations, `READ COMMITTED`, over-receipt race, `Venta.numero` without uniqueness guarantee, zero test files, free-text `tipoMovimiento`, in-memory stock consolidation | `05-ASIS/11-ASIS-QUALITY.md` — `VERIFIED BY CODE` |
| Implementation verdict | **`IMPLEMENTATION NON-COMPLIANT / GAP`** — the *"and/or"* clause is satisfied only in its transactional half; controls do not cover every stock-modifying path | D-010 status |
| Conflicts | `CON-007` and `CON-019` — `EVIDENCE DETERMINED / VERIFIED BY CODE`, both still `OPEN`; `CON-019` flagged as consolidation candidate and **retained** | `03-CONFLICTS/00-CONFLICT-REGISTER.md` |
| Tests / contracts / invariants | **`NOT DOCUMENTED`** — 0 test files exist and no corrective measure is approved | unchanged by this propagation |

Note on `AUD-D010-G04`: the absence of `CHECK`/`TRIGGER` is **relevant technical evidence, not
an independent design decision**. D-010 does not mandate a specific `CHECK`; it mandates
*"controles de base de datos y/o transacción"*. The current breaches allow invalid states
(`Lote.cantidad` negativo) to be persisted, and D-010 is **not** fully satisfied.

### Chain B — D-014 inventory ownership: requirement approved, isolation verified

| Link | Value | Evidence location |
|---|---|---|
| Decision | **D-014** — `APPROVED - OWNER-RULED 2026-09-28`, text `DERIVED / RECONSTRUCTED` | `04-DECISIONS/00-DECISION-REGISTER.md` §4.3.1 |
| Domain | `Inventory` → Tenant / Business isolation | `05-ASIS/03-ASIS-DATA.md` |
| Requirement | Inventory belongs exclusively to each Business; no shared global stock; **no stock transfer between Business** unless an inter-Business operation is explicitly defined and authorized in a later specification | D-014 approved text |
| Isolation verified | `AUD-D014-C01`…`C10` — per-request Prisma Client Extension, `empresaId` forced on writes, filter injected in reads and mutations, `findUnique` post-filtering, **fail-closed**, `Producto` / `Lote` / `MovimientoStock` all covered, JWT as sole origin, the only raw SQL carries `empresaId`, unique keys scoped per Business, HTTP surface has no enterprise parameter | `05-ASIS/03-ASIS-DATA.md` — `VERIFIED BY CODE` |
| Prohibition | `AUD-D014-N01` — no stock-transfer entity, endpoint, service, command, job or cron; all 8 `transfer*` hits in `apps/api/src` are `medioPago` | `VERIFIED BY CODE` |
| Compliance qualification | `AUD-D014-N02` — compliance **by absence of the feature**, not by an enforcing control | `VERIFIED BY CODE` |
| Latent risk | `AUD-D014-G01` (denormalised `empresaId` with no cross-key DB consistency) and `G02` (unscoped `PrismaService` injected in `auth` / `invitaciones` / `legajo`) — no path exploited in the audited code | `05-ASIS/03-ASIS-DATA.md` — `VERIFIED BY CODE` |
| Implementation verdict | **`VERIFIED BY CODE`** — the current implementation is compatible with the required isolation | D-014 status |
| Tests / contracts / invariants | **`NOT DOCUMENTED`** — registering D-014 as a verifiable invariant appears in the audit only as `PROPOSED / OPEN`, not as an approved requirement | unchanged by this propagation |

## 6. Related files
- `08-TRACEABILITY/01-REQUIREMENTS.md` … `09-EVIDENCE.md` — per-axis sub-matrices (stubs).
- `04-DECISIONS/00-DECISION-REGISTER.md` — canonical decision register.
- `03-CONFLICTS/10-CONFLICT-RESOLUTION-MAPPING.md` — CON → decision causal mapping.
- `03-DECISION-WORKSHOP/03-DECISION-IMPACT-MAP.md` — workshop-level impact map.
- `00-GOVERNANCE/GOVERNANCE-RECONCILIATION-REPORT.md` — full report and open findings.
