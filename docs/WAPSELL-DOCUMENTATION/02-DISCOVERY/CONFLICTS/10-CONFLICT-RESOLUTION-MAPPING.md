# Wapsell — Conflict Resolution Mapping (RECONCILED 2026-09-28)

> **Purpose.** Maps every `CON-001…CON-027` to the decision that resolves it, keeps it open, or
> leaves it undetermined. The original `03-CONFLICTS/00-CONFLICT-REGISTER.md` is **preserved
> verbatim** — this file is the reconciled overlay.
>
> **Governing rule applied (§14 of mandate):** a conflict is **not** marked RESOLVED merely
> because a related decision exists. A causal relationship must be documented. Decision text for
> D-001…D-018 **is now reconstructable** (`04-DECISIONS/00-DECISION-REGISTER.md` §4) but is
> `DERIVED / RECONSTRUCTED`, not Owner-verbatim. A conflict mapped **only** to `DERIVED` text
> therefore stays `OPEN`; closing it would be an invention. Only conflicts with a documented causal
> link to `OWNER-VERBATIM` text (CON-001, CON-009, CON-010) are marked `RESOLVED`, and CON-011
> only on its scope portion.
>
> Canonical register: `04-DECISIONS/00-DECISION-REGISTER.md`
>
> **EVIDENCE PROPAGATION 2026-09-28 (revised overlay).** The read-only code verification enabled by
> the D-010 ruling is **complete** in `10-AUDIT/01-D010-D014-CODE-EVIDENCE-AUDIT.md` (41 findings:
> 30 `VERIFIED BY CODE`, 6 `DOCUMENTED`, 5 `NOT DETERMINABLE`, 0 `VERIFIED BY TEST`,
> 0 `VERIFIED BY EXECUTION`). **CON-007** and **CON-019** move from `NOT DETERMINABLE` to
> **`EVIDENCE DETERMINED / VERIFIED BY CODE`** and remain **`OPEN`** — no corrective measure is
> approved. D-010 = `APPROVED REQUIREMENT` + `IMPLEMENTATION NON-COMPLIANT / GAP`
> (`AUD-D010-C01`…`C06`, `AUD-D010-G01`…`G10`). D-014 = `APPROVED REQUIREMENT` +
> `VERIFIED BY CODE`, satisfied **by absence of the feature** (`AUD-D014-C01`…`C10`,
> `AUD-D014-N01`…`N03`, `AUD-D014-G01`…`G02`). The `PROPOSED / OPEN` P1–P8 observations in the
> audit artefact are **not** decisions and are **not** promoted here. See **§5** (CON-007 / CON-019
> consolidation analysis) and **§6** (GRF-07, model/enum count discrepancy).

---

## 1. Reconciliation summary

**Revised 2026-09-28** after the four root-level audit artifacts were discovered. See
`04-DECISIONS/00-DECISION-REGISTER.md` §4 for the reconstructed decision text and §4.1 for artifact
authority.

| Metric | Value |
|---|---|
| Total conflicts | 27 |
| RESOLVED (causally documented) | **4** (CON-001 by DEC-001; CON-009 by D-001; CON-010 by D-002/D-002-bis; CON-011 scope portion by DEC-001 + D-003) |
| RE-CHARACTERISED (was mis-classified as a contradiction) | **1** (CON-006) |
| OPEN — mapped to an approved decision, text now available as `DERIVED / RECONSTRUCTED` | 15 (CON-002, CON-004…CON-008, CON-012…CON-027 — minus those resolved above) |
| OPEN — no related decision at all | 8 (CON-003…CON-008) — *note: D-003…D-018 text does not cover accounting/fiscal scope* |
| Conflicts wrongly marked RESOLVED before this reconciliation | 0 |
| Conflicts newly marked RESOLVED | **3** (CON-009, CON-010, CON-011 partial) |

> **Caveat on the 3 new resolutions.** They rest on text whose provenance is
> `OWNER-VERBATIM` for D-001 and D-002 (incl. the D-002-bis `Customer` resolution), so CON-009 and
> CON-010 are closed on the strongest available evidence. CON-011 is closed **only** on the scope
> question; its functional sub-items remain open. The remaining 15 conflicts have text to reason
> from but are **not** closed, because the text is `DERIVED` and closing them requires Owner
> confirmation.

---

## 2. Conflict → decision mapping

| Conflict | Previous state | Resolving decision | Current state | Evidence |
|---|---|---|---|---|
| CON-001 | **RESOLVED** | **DEC-001** — real text exists | **RESOLVED** (unchanged) | `04-DECISIONS/02-MULTITENANCY.md:6-27`. Only causally documented resolution in the set. |
| CON-002 | OPEN | D-017 (text DERIVED, not Owner-verbatim) | **OPEN** | `05-ASIS/02-ASIS-ARCHITECTURE.md` vs `SRC-018` (unreadable source). Decision text exists (DERIVED, not Owner-verbatim); it does not by itself resolve the AS-IS gap. |
| CON-003 | OPEN | **NONE** | **OPEN** | Accounting/fiscal scope. SRC-017 content unconfirmed (only sheet names). No decision ID covers it. |
| CON-004 | OPEN | **NONE** | **OPEN** | Documentation duplication SRC-007 vs SRC-009. No decision ID covers it. |
| CON-005 | OPEN | **NONE** | **OPEN** | SRC-012 internal version mismatch (filename v1.0 vs body v0.1). No decision ID covers it. |
| CON-006 | OPEN | **NONE — no decision covers it** | **OPEN (re-characterised 2026-09-28)** | `05-ASIS/11-ASIS-QUALITY.md` vs `SRC-007` §1. *Previously mapped to "D-009 (text DERIVED, not Owner-verbatim)". D-009's reconstructed text concerns documentary governance (SPEC is source of truth, proposals vs approved requirements, traceability) and does **not** address data quality. That mapping was unsupported and is withdrawn. No decision ID covers this conflict — see GRF-06.* |
| CON-007 | OPEN | D-010 (text DERIVED, not Owner-verbatim) | **OPEN — EVIDENCE DETERMINED (2026-09-28) / VERIFIED BY CODE** | `05-ASIS/11-ASIS-QUALITY.md` (CON-007) vs `SRC-007` §15 Inc-1. **Source correction 2026-09-28:** the earlier citation `00-DECISION-WORKSHOP.md:68` was wrong — the `NOT DETERMINABLE` origin is `03-DECISION-WORKSHOP/00-DECISION-WORKSHOP.md:82` and `03-DECISION-WORKSHOP/D-010-stock-integrity-controls.md:14,17,63`. **Retracted 2026-09-28:** the decision text now exists (`04-DECISIONS/00-DECISION-REGISTER.md` §4, `DERIVED / RECONSTRUCTED`) and the read-only verification the D-010 ruling authorised is **complete**. Evidence propagated: `AUD-D010-C01`…`C06` (partial controls — the conditional `UPDATE` SRC-011 reported absent does exist today) and `AUD-D010-G01`…`G10` (verified gaps: oversell race, return without guard, no balance movement, 0 `CHECK` / 0 `TRIGGER` in 17 migrations, `READ COMMITTED`, over-receipt race, `Venta.numero` uniqueness, zero tests, free-text `tipoMovimiento`, always in-memory consolidation), from `10-AUDIT/01-D010-D014-CODE-EVIDENCE-AUDIT.md` (41 findings: 30 `VERIFIED BY CODE`, 6 `DOCUMENTED`, 5 `NOT DETERMINABLE`, 0 `VERIFIED BY TEST`, 0 `VERIFIED BY EXECUTION`). **Still `OPEN`:** what changed is the *status of the knowledge*, not the health of the code — D-010 is an `APPROVED REQUIREMENT` whose implementation is `IMPLEMENTATION NON-COMPLIANT / GAP`, and no corrective measure is approved. Not closed. Consolidation analysis in **§5**. |
| CON-008 | OPEN | **NONE** | **OPEN** | "Otra Ronda Más" vs "Otra Roonda Más" typo as `Empresa.nombre` upsert key. No decision ID covers it. |
| CON-009 | OPEN | **D-001** — `OWNER-VERBATIM` | **RESOLVED** (2026-09-28) | **D-001, Owner-verbatim: "Business = Tenant. Empresa se transforma en Business y pasa a ser la unidad de aislamiento multi-tenant."** The canonical term is `Business`; `Tenant` denotes the multi-tenant *isolation function*, not the entity name. `IMPLEMENTATION DETAIL` (migration, physical model) stays `OPEN` and is outside this resolution. Was OPEN only because the text was believed absent. |
| CON-010 | OPEN | **D-002 + D-002-bis** — `OWNER-VERBATIM` | **RESOLVED** (2026-09-28) | **D-002: `User` is the global identity; `Membership` is the N:N User↔Business relation carrying roles and permissions.** **D-002-bis (Owner, later resolution): `Customer` is NOT merged with `User`** — it is the commercial relationship of the buyer/client with a `Business`, optionally linked to a `User` without requiring one, scoped to a `Business` context, and may carry purchases, orders, history, current account/debt, commercial terms and other Commerce data. `IMPLEMENTATION DETAIL` (Customer lifecycle, link modelling) stays `OPEN`. The prior false assumption that `Usuario`+`Cliente` merge into `User` is permanently retired. |
| CON-011 | OPEN | **D-003** (+ DEC-001) | **PARTIALLY RESOLVED** (2026-09-28) | **Scope question CLOSED.** DEC-001: *"Asistentes de IA son parte del producto, no un descarte del MVP"*; D-003 (`DERIVED`): *"Los asistentes de IA estarán preparados técnicamente para incorporarse posteriormente, pero permanecerán inactivos durante el MVP inicial."* Compatible: **in product scope, inactive in the first iteration.** The previous "CONFLICT" verdict was wrong. **Still `OPEN`** for the sub-items DEC-001:61-65 declines to decide: supported channels, what an assistant concretely does, automation vs human-intervention boundary. |
| CON-012 | OPEN | D-004 (partial — DEC-001 defines Brand) | **OPEN** | DEC-001:15 defines Brand; canonical design system NOT decided. AS-IS has four conflicting token sets, no hierarchy. |
| CON-013 | OPEN | D-005 (partial — DEC-001: roles/permissions in Membership) | **OPEN** | DEC-001:18-19 settles the principle; role/permission catalog NOT decided. |
| CON-014 | OPEN | **NONE** | **OPEN** | "Asistente de local" (AS-IS human role) vs "Asistente de IA". No decision ID covers terminology. |
| CON-015 | OPEN | D-006 (text DERIVED, not Owner-verbatim) | **OPEN** | R01 of SRC-011 via `05-ASIS/05-ASIS-AUTHORIZATION.md`. Decision text exists (DERIVED, not Owner-verbatim); it does not by itself resolve the AS-IS gap. |
| CON-016 | OPEN | D-007 (text DERIVED, not Owner-verbatim) | **OPEN** | `05-ASIS/03-ASIS-DATA.md`, `05-ASIS/07-ASIS-FLOWS.md`. The D-007 ficha's own Open Questions still list Order/Sale states as unanswered. |
| CON-017 | OPEN | D-008 (text DERIVED, not Owner-verbatim) | **OPEN** | `EstadoVenta.ANULADA` with no producing flow; AR models with no service. Decision text exists (DERIVED, not Owner-verbatim); it does not by itself resolve the AS-IS gap. |
| CON-018 | OPEN | D-009 (text DERIVED, not Owner-verbatim) | **OPEN** | `05-ASIS/11-ASIS-QUALITY.md` vs `SRC-007`. Decision text exists (DERIVED, not Owner-verbatim); it does not by itself resolve the AS-IS gap. |
| CON-019 | OPEN | D-010 (text DERIVED, not Owner-verbatim) | **OPEN — EVIDENCE DETERMINED (2026-09-28) / VERIFIED BY CODE** | SRC-007 Inc-1 controls. **Source correction 2026-09-28:** the earlier citation `00-DECISION-WORKSHOP.md:68` was wrong — the `NOT DETERMINABLE` origin is `03-DECISION-WORKSHOP/00-DECISION-WORKSHOP.md:82` and `03-DECISION-WORKSHOP/D-010-stock-integrity-controls.md:8,17,63`. **UNBLOCKED by the D-010 ruling (2026-09-28):** v1.0 prevails; verifying and maintaining the existing integrity controls is a mandatory Inventory requirement, and invalid quantities are rejected without exception per Business (the v1.1 carve-out was **REJECTED**). The authorised read-only verification is **complete**. Evidence propagated: `AUD-D010-C01`…`C06` and `AUD-D010-G01`…`G10`; the verified conditions are carried in `05-ASIS/11-ASIS-QUALITY.md` §"Integridad transaccional del stock (D-010) — estado real verificado". **Still `OPEN`:** D-010 is `IMPLEMENTATION NON-COMPLIANT / GAP` and no corrective measure is approved. **CONSOLIDABLE with CON-007 — retained, not deleted**, to preserve the traceability of both identifiers; consolidation requires explicit Owner authorisation and is not applied here. See **§5**. |
| CON-020 | OPEN | D-011 (text DERIVED, not Owner-verbatim) | **OPEN** | AS-IS DTO rejects "Mercado Pago" with 400. Decision text exists (DERIVED, not Owner-verbatim); it does not by itself resolve the AS-IS gap. |
| CON-021 | OPEN | D-012 (text DERIVED, not Owner-verbatim) | **OPEN** | RF-10: `CuentaCorriente`/`Deuda`/`AplicacionPago` exist, no service. Decision text exists (DERIVED, not Owner-verbatim); it does not by itself resolve the AS-IS gap. |
| CON-022 | OPEN | D-013 (text DERIVED, not Owner-verbatim) | **OPEN** | AS-IS cash cycle is defined; TO-BE text exists but is DERIVED, not Owner-verbatim. |
| CON-023 | OPEN | D-014 (text DERIVED, not Owner-verbatim) | **OPEN** | AS-IS single-business FIFO/Lote inventory. Decision text exists (DERIVED, not Owner-verbatim); it does not by itself resolve the AS-IS gap. |
| CON-024 | OPEN | D-015 (text DERIVED, not Owner-verbatim) | **OPEN** | Purchases/AP gap. Decision text exists (DERIVED, not Owner-verbatim); it does not by itself resolve the AS-IS gap. |
| CON-025 | OPEN | D-016 (text DERIVED, not Owner-verbatim) | **OPEN** | RF-13: `Entrega` model exists, no module. Decision text exists (DERIVED, not Owner-verbatim); it does not by itself resolve the AS-IS gap. |
| CON-026 | OPEN | D-017 (text DERIVED, not Owner-verbatim) | **OPEN** | Same subject as CON-002 (stack simple vs enterprise). Decision text exists (DERIVED, not Owner-verbatim); it does not by itself resolve the AS-IS gap. |
| CON-027 | OPEN | D-018 (text DERIVED, not Owner-verbatim) | **OPEN** | No CI/CD in AS-IS. Decision text exists (DERIVED, not Owner-verbatim); it does not by itself resolve the AS-IS gap. |

---

## 3. Unmapped conflicts (no decision ID exists)

`CON-003`, `CON-004`, `CON-005`, `CON-008`, `CON-014` have **no corresponding D-0xx decision**.
They were identified in Phase 3 and never entered the workshop inventory. They are **orphaned
conflicts** and are reported as **GRF-06**.

---

## 4. Governance findings raised by this mapping

| ID | Severity | Finding |
|---|---|---|
| GRF-01 | CRITICAL | AI scope conflict — DEC-001 vs `00-WAPSELL-SPEC-GENERAL.md:46,106`. See `00-GOVERNANCE/GOVERNANCE-RECONCILIATION-REPORT.md` §7. |
| GRF-02 | HIGH | `DEC-002…DEC-019` numbering anticipated by DEC-001:53 was never assigned. Namespace equivalence unresolved. |
| GRF-03 | HIGH | `03-CONFLICTS/07-DECISION-REGISTER.md` was routed as the approval target by `00-DECISION-WORKSHOP.md:77`, contradicting `01-SOURCE-OF-TRUTH.md`. Now historical. |
| GRF-04 | CRITICAL | 18 conflicts have an approved decision ID but no decision text → none can be closed. |
| GRF-05 | HIGH | Two colliding numbering namespaces inside `03-CONFLICTS/` (01, 02, 03, 04, 05, 06 each used twice). |
| GRF-06 | MEDIUM | 5 orphaned conflicts with no decision ID. |
| GRF-07 | HIGH | Enum-count discrepancy: `05-ASIS/03-ASIS-DATA.md` records "8 enums" as confirmed by direct read, but the current `apps/api/prisma/schema.prisma` declares **10**, matching SRC-011. **Determined**; figures deliberately not corrected — that file is outside this reconciliation's scope. See §6. |

---

## 5. CON-007 / CON-019 — consolidation analysis (2026-09-28)

Requested determination: do CON-007 and CON-019 represent the same normative conflict? Compared
across the eight required dimensions. **No conflict is closed and no record is deleted by this
analysis.**

| Dimension | CON-007 | CON-019 | Match |
|---|---|---|---|
| Definition of the conflict | `SRC-007` §15 Inc-1 demands stock-integrity controls; the code did not have them **at the audit date** | The same demand, stated in the present tense as "controls absent from code" | **Same normative claim.** CON-007 is time-scoped to the SRC-011 audit date; CON-019 is not. |
| Scope | `UPDATE` condicional, `CHECK` en lotes, FK compuesta de cliente → now `AUD-D010-C01`…`C06` + `G01`…`G10` | Identical scope, identical finding IDs | **Identical** |
| Sources | `SRC-007` §15 Inc-1; `05-ASIS/11-ASIS-QUALITY.md` (via SRC-011); `10-AUDIT/…` | `SRC-007`; `05-ASIS/11-ASIS-QUALITY.md` (CON-007, via SRC-011); `10-AUDIT/…` | **Same set.** Only the anchor differs: CON-007 cites `§15 Inc-1`, CON-019 cites `SRC-007` unanchored. |
| Affected requirement | D-010 | D-010 | **Identical** |
| Evidence | `AUD-D010-C01`…`C06`, `AUD-D010-G01`…`G10` | `AUD-D010-C01`…`C06`, `AUD-D010-G01`…`G10` | **Identical** |
| Expected resolution | Remains `OPEN`: no approved corrective measure exists | Remains `OPEN`: no approved corrective measure exists; unblocked by the same 2026-09-28 ruling | **Identical** |
| Relation to D-010 | Direct; this is the conflict the ruling unblocked for verification | Direct; the same ruling | **Identical** |
| Relation to D-014 | None | None | **Identical (both absent).** D-014 is carried by CON-023. |

### Corroborating structure in the existing documentation

- `03-CONFLICTS/05-BUSINESS-RULE-CONFLICTS.md` contains a **single row** ("Controles de Integridad
  de Stock") whose Source B is `05-ASIS/11-ASIS-QUALITY.md` **(CON-007)** and whose Required
  Decision is **(CON-019)** — one row already spans both identifiers.
- `03-DECISION-WORKSHOP/D-010-stock-integrity-controls.md:8` nests them: *"Related conflicts:
  CON-019 (Brecha de Integridad: Controles de Stock Requeridos por SPEC de Ventas Ausentes en
  Código (CON-007))"*.
- `03-DECISION-WORKSHOP/01-DECISION-MATRIX.md:24` and `03-DECISION-IMPACT-MAP.md:25` both map
  D-010 → **CON-019** only.

### Result: **A. CONSOLIDABLE**

CON-007 and CON-019 represent **the same normative conflict**: the stock-integrity controls that
`SRC-007` §15 Inc-1 requires were reported absent by SRC-011, and the D-010 requirement that
demands them is not fully satisfied by the implementation — controls exist only partially
(`AUD-D010-C01`…`C06`) and the gaps are verified (`AUD-D010-G01`…`G10`).

The **only** material difference is lineage, not normative content:

- **CON-019** is the *decisional* identifier — the conflict that entered the workshop inventory and
  generated D-010.
- **CON-007** is the *AS-IS observation* identifier — the SRC-011-derived quality finding, and the
  anchor under which the verified evidence now lives in `05-ASIS/11-ASIS-QUALITY.md`.

**Not actioned, by rule.** Consolidation is **not** applied here: it requires explicit Owner
authorisation, and no record is deleted. Both identifiers stay `OPEN`. If the Owner authorises
consolidation, the lineage above is the justification for **retaining both** identifiers — one as
canonical, the other as a cross-referenced alias — rather than removing either.

---

## 6. Model / enum count discrepancy — `42 modelos` and `8 enums` vs `10 enums` (GRF-07)

Raised as an unreconciled discrepancy in `05-ASIS/03-ASIS-DATA.md` §"Discrepancia sin reconciliar".
**The figures are not corrected here** — recorded as a finding only, as instructed.

| Figure | Where it appears | Backing source | Verdict |
|---|---|---|---|
| `42 modelos` | `05-ASIS/03-ASIS-DATA.md:4`; `05-ASIS/00-ASIS-OVERVIEW.md:73`; `01-SOURCE-INVENTORY/02-SOURCE-METADATA.md:155`; `01-SOURCE-INVENTORY/01-SOURCE-CLASSIFICATION.md:20` | SRC-011, plus the direct read recorded in `03-ASIS-DATA.md` | **Confirmed.** A direct read of `apps/api/prisma/schema.prisma` counts exactly **42** `model` declarations, agreeing with both sources. |
| `8 enums` | `05-ASIS/03-ASIS-DATA.md:4` and `:133-137` — attributed to "conteo directo de esta sesión sobre el schema completo" | Claimed direct read of the current schema | **Not reproducible.** The current `schema.prisma` declares **10** `enum` blocks, not 8. |
| `10 enums` | `05-ASIS/03-ASIS-DATA.md:4` and `:133` — attributed to SRC-011 | SRC-011 | **Confirmed.** The current `schema.prisma` declares **10** enums, so SRC-011's figure is independently corroborated by direct read. |

Enums currently declared in `apps/api/prisma/schema.prisma` (10): `EstadoPedido`, `EstadoPago`,
`EstadoCompra`, `EstadoCaja`, `EstadoVenta`, `UnidadBase`, `NivelFidelidad`, `RolUsuario`,
`EstadoLegajo`, `TipoDocumentoLegajo`.

### Result: **DETERMINABLE — `10 enums` is correct for the current schema**

The discrepancy **can** be determined from the available evidence:

- `42 modelos` is confirmed by both SRC-011 and direct read — the two sources agree.
- `10 enums` is confirmed by SRC-011 **and** independently reproduced by direct read of the
  current schema.
- `8 enums`, recorded in `05-ASIS/03-ASIS-DATA.md` as *"confirmado por lectura directa"*, is
  **not reproducible** against the current schema. It is therefore a documentation error, not a
  schema change. The hypothesis in `03-ASIS-DATA.md:133-137` — that the gap might be a different
  counting criterion, or types later merged — is **not supported**: no enum is missing from the
  current schema relative to SRC-011's count, and the model count did not drift.

**Not corrected here.** `05-ASIS/03-ASIS-DATA.md` is outside this reconciliation's scope, so its
lines 4 and 131-137 remain untouched. Correcting `8 enums` → `10 enums` is a follow-up and should
be applied together with the other counts that file still carries unreconciled.

**Residual sub-question, still `NOT DETERMINABLE`:** whether `8` was ever an accurate count at
some intermediate point, and what criterion would have produced it. The repository holds no record
of an enum removal or merge, so that historical sub-question cannot be settled from the
documentation. It does **not** affect the current-state verdict above.
