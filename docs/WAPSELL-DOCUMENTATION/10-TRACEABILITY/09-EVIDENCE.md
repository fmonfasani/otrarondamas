# Traceability - Evidence

**Reconciled:** 2026-09-28

> ## Status: **AS-IS EVIDENCE IS THE ONLY SUBSTANTIVE EVIDENCE IN THE CORPUS**
>
> Every verifiable citation in the repository resolves into 05-ASIS/ (which in turn cites
> 01-SOURCE-INVENTORY/SRC-001…SRC-018). The decision side has one real document
> (04-DECISIONS/02-MULTITENANCY.md = DEC-001). Everything else is a proposal.

## Evidence tiers
| Tier | What | Count | Verifiable? |
|---|---|---|---|
| 1 | 04-DECISIONS/02-MULTITENANCY.md (DEC-001) | 1 | **YES** — quotable text |
| 2 | 05-ASIS/* AS-IS baseline | 13 files | **YES** — cited to SRC-* |
| 3 | 01-SOURCE-INVENTORY/* registered sources | 18 (SRC-001…SRC-018) | **PARTIAL** — see below |
| 4 | 03-DECISION-WORKSHOP/D-*.md questions | 18 | **NO** — approved, text absent |
| 5 | 02-CANONICAL-SPEC/00,01,02 | 3 | **PROPOSED** — 31 false approval markers removed |
| 6 | 02-CANONICAL-SPEC/03,04,05,06 | 4 | **PLACEHOLDER** — no rules |
| 7 | 06-TRANSFORMATION/, 07-TOBE/, 08-TRACEABILITY/01-09 | stubs | **NO** — _To be populated._ |

## Source-verification results
- All **15** AS-IS citations in 02-COMMERCE-SPEC.md resolved to real evidence. The Commerce
  defects were **authority and scope** errors, not fabricated citations.
- **SRC-018 is unreadable** (CON-002) and **SRC-017 is content-unconfirmed** — only sheet names
  are known (CON-003). So the AS-IS side is not fully closed either.
- **SRC-007** version conflict: filename says v1.0, body says v0.1 (CON-005).
- **SRC-012** is an internal version mismatch (CON-005 family).
- CON-008: Empresa.nombre upsert key differs — "Otra Ronda Más" vs "Otra Roonda Más"
  (typo). This is an **AS-IS data defect with no decision behind it**.

## Evidence gaps that block everything downstream
- No decision text for D-001…D-018 → requirements, contracts, invariants and tests cannot be
  anchored. **18/18 rows empty.**
- CON-004: documentation duplication SRC-007 vs SRC-009 (same sheet, two sources).

## Open
See 00-GOVERNANCE/GOVERNANCE-RECONCILIATION-REPORT.md §5 and §8.