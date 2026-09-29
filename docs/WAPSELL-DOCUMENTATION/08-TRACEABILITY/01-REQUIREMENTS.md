# Traceability - Requirements

**Reconciled:** 2026-09-28

> ## Status: **EMPTY BY EVIDENCE, NOT BY OMISSION**
>
> This axis was _To be populated._ and is now deliberately scoped. The repository contains
> **no requirements document**. 01-SOURCE-INVENTORY/ registers 18 external sources (SRC-001…SRC-018),
> and 05-ASIS/ records what the legacy system *is*, but nothing registers a **TO-BE requirement**
> with an ID, a priority and an acceptance criterion.
>
> Creating requirement IDs here would mean inventing the very artifacts whose absence is the
> finding. This file therefore documents the gap and points at the only approved requirement-like
> statements that do exist.

## What can be traced today

| Req-like statement | Authority | Where recorded |
|---|---|---|
| Wapsell is a platform, not a business | DEC-001 :7-9 | 00-WAPSELL-SPEC-GENERAL.md §2 |
| Business = Tenant | DEC-001 :13 | 00 §4, 01 §2 |
| User is a single global identity | DEC-001 :16 | 00 §5, 01 §1.1 |
| Membership is N:N User↔Tenant | DEC-001 :16-19 | 00 §6, 01 §3 |
| Roles/permissions live in the Membership | DEC-001 :18-19 | 00 §7, 01 §4-§5 |
| Brand is the tenant's commercial identity | DEC-001 :15 | 00 §8, 06 |
| Conversation is the central commercial interface | DEC-001 :23 | 00 §9, 04 |
| AI assistants are part of the product | DEC-001 :23-25 | 00 §9, §22, 04 |
| Otra Ronda Más is the first tenant | DEC-001 :20 | 00 §2 |

These are **directions**, not testable requirements: none has acceptance criteria, priority, or
an owner-assigned requirement ID. DEC-001:55-57 explicitly excludes the data model and migration
plan, so it cannot supply them.

## Open
- No REQ-nnn namespace exists anywhere in the repository. **OPEN.**
- The 18 D-0xx decisions are the closest thing to a requirement set, but their text is not
  reconstructable. See 04-DECISIONS/00-DECISION-REGISTER.md.
- See 00-GOVERNANCE/GOVERNANCE-RECONCILIATION-REPORT.md §5 (gap 1).