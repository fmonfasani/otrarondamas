# Inventory Decisions


> ## RECONCILED 2026-09-28
>
> **State corrected 2026-09-28 (post-propagation).** The previous `EMPTY` status is obsolete.
> D-010 and D-014 **do** have decision text in the repository: reconstructed at
> `04-DECISIONS/00-DECISION-REGISTER.md` §4, rows **D-010** and **D-014**. This sheet records
> state and pointers only — the summary table below does not replace the canonical wording in §4,
> which remains the single source of truth for decision text.
>
> **Status, unchanged in character:** `APPROVED` — `OWNER-RULED 2026-09-28` (§4.3.1: v1.0
> prevails), text `DERIVED / RECONSTRUCTED`. No decision wording was invented, added or altered
> here, and no P1–P8 recommendation was incorporated.
>
> | ID | Requirement (summary — canonical text in §4) | Requirement state | Implementation state |
> |---|---|---|---|
> | D-010 | Transactional stock integrity: atomic, concurrency-safe movements, resistant to invalid quantities, consistent between movements and resulting stock. | `APPROVED REQUIREMENT` | **`IMPLEMENTATION NON-COMPLIANT / GAP`.** Partial controls `AUD-D010-C01`…`C06`; verified gaps `AUD-D010-G01`…`G10`. **Not satisfied in full.** |
> | D-014 | Inventory belongs exclusively to each Business; no global shared stock; inter-Business stock transfer prohibited absent a later explicit specification. | `APPROVED REQUIREMENT` | **`VERIFIED BY CODE`.** Controls `AUD-D014-C01`…`C10`; compliance is met **by absence of the transfer feature** (`AUD-D014-N01`…`N03`); latent risks `AUD-D014-G01`…`G02`. |
>
> **Still not decided** — unchanged, and distinct from the two requirements above:
> - the concrete DB / transaction mechanisms and the test strategy for D-010 (§4, D-010 Open detail);
> - locations and the physical model for D-014 (§4, D-014 Open detail);
> - whether locations exist in the MVP at all;
> - the multi-tenant inventory lifecycle of CON-023, which D-014 does not cover.
>
> **Evidence.** The read-only code verification authorised by the D-010 ruling is **complete** in
> `10-AUDIT/01-D010-D014-CODE-EVIDENCE-AUDIT.md` (41 findings: 30 `VERIFIED BY CODE`,
> 6 `DOCUMENTED`, 5 `NOT DETERMINABLE`, 0 `VERIFIED BY TEST`, 0 `VERIFIED BY EXECUTION`). The
> `PROPOSED / OPEN` P1–P8 observations in that artefact are **not** decisions and remain
> unapproved.
>
> **AS-IS baseline.** Single-Business FIFO / lot model (`05-ASIS/03-ASIS-DATA.md`), with `Lote` and
> `MovimientoStock` bound to `empresaId`. `02-CANONICAL-SPEC/00-WAPSELL-SPEC-GENERAL.md` §13
> states the approved requirement separately from the implementation gap; the "stock único por
> Tenant" model remains TO-BE `PROPOSED` only.
>
> **Conflicts.** CON-007, CON-019 and CON-023 remain **`OPEN`**. CON-007 and CON-019 are
> `EVIDENCE DETERMINED / VERIFIED BY CODE` and assessed **`CONSOLIDABLE`** — see
> `03-CONFLICTS/10-CONFLICT-RESOLUTION-MAPPING.md` §5. Consolidation is **not** applied: it
> requires explicit Owner authorisation, and no record is deleted.