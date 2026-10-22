---
name: tenant-isolation-audit
description: Audit authentication, authorization, and tenant/company scoping across API requests, services, Prisma queries, and related records. Use for multi-tenant security reviews, nested-resource access, cross-company regressions, and authorization test design.
---

# Tenant Isolation Audit

## Goal
Determine whether a request can read or mutate data outside its authorized company/business context, using code and test evidence rather than assumptions.

## Procedure
1. Establish branch, SHA, working-tree status, scope, and relevant repository instructions. Preserve pre-existing changes.
2. Identify the actual current tenancy model. Do not assume Wapsell's target Business/Membership model is implemented; inspect schema, guards, auth principal, services, and query extensions.
3. Trace the tenant context from authentication through guards/decorators, controller, service, ORM query, and related/nested records.
4. At each boundary ask:
   - Who authenticated the request, and what identity/context is trusted?
   - Which server-side permission check authorizes the action?
   - Where does the active tenant/company context originate?
   - Is every read/write scoped to that context?
   - Can a client-supplied ID override or bypass that scope?
   - Are child records verified against the authorized parent, not merely looked up by ID?
   - Do background jobs, exports, reports, and secondary endpoints enforce equivalent boundaries?
5. Inspect positive and negative tests. Design cross-tenant attempts for list, detail, update, delete, nested-resource, and indirect relation paths as relevant.
6. Reproduce findings only in local/disposable test environments. Never access production or another tenant's live data.
7. Report evidence and minimal remediation; do not change authorization or tenant architecture without explicit scope approval.

## Severity guidance
- Critical/High: unauthorized cross-tenant read/write, privilege escalation, or tenant context spoofing with material impact.
- Medium: a plausible boundary gap whose exploitability depends on additional conditions, or missing tests around sensitive paths.
- Low: defense-in-depth or documentation gap without demonstrated unauthorized access.

## Required report
- Current tenancy model and source paths.
- Entry point and end-to-end tenant-context trace.
- Findings with severity, evidence, and reproducible test where safe.
- Paths checked and areas not checked.
- Recommended fix and regression tests.
- Status: PASS, FINDINGS, or BLOCKED.

Do not claim isolation is proven by one passing test suite. State the boundaries and scenarios actually verified.