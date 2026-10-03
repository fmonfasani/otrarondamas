# Identity Decisions

> ## RECONCILED 2026-09-28 — **EMPTY**
>
> This file has never had content. Identity decisions D-001, D-002, D-005, D-006 were approved by
> the Owner in the workshop. **RETRACTED 2026-09-28:** the claim that no decision text exists was an inventory error; reconstructed text now lives in 00-DECISION-REGISTER.md §4, so nothing could be
> written here without inventing it.
>
> What is actually approved, from **DEC-001** (02-MULTITENANCY.md):
> - :16 — User is a single global identity.
> - :16-19 — Membership is the N:N User↔Tenant relation.
> - :18-19 — roles and permissions live in the Membership.
>
> Explicitly **not** decided by DEC-001 (:55-57): which term is canonical (Tenant vs
> Business), the User/Customer split, email uniqueness, the role/permission catalogue, the
> data model and the migration plan.
>
> Canonical status for all four: APPROVED — OWNER-VERBATIM (D-001, D-002) / APPROVED — DERIVED / RECONSTRUCTED (D-005, D-006).
> See 00-DECISION-REGISTER.md and GOVERNANCE-RECONCILIATION-REPORT.md §3.
>
> **R3 note (2026-09-30) — additive.** The "not decided by DEC-001" list above is the historical state of DEC-001 only. Later Owner rulings (OR-001, OR-002-A…F, P1-A, P5-B; Decision Register §8.1; `18-R2-OWNER-DECISION-CLOSURE-REPORT.md`) settled, conceptually: `Business` as canonical term, `User` global with globally unique email, `Usuario`/`Cliente` split. Data model, migration plan, role/permission catalogue (D-005) and Customer↔User "same email" matching remain `OPEN`/`NO CONSULTED`; implementation `NOT AUTHORIZED`.