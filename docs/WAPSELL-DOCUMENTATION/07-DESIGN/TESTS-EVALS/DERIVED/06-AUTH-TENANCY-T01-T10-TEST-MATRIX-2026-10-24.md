# Authentication & Tenancy — T-01–T-10 Regression Test Matrix

**Date:** 2026-10-24  
**Authority:** `03-DECISIONS/48-AUTH-TENANCY-TECHNICAL-DECISION-CLOSURE-2026-10-24.md`  
**Related contract:** `07-DESIGN/CONTRACTS/DOMAIN/07-R8-AUTH-001-AUTHORIZATION-CONTRACT-v0.1.md`  
**Related invariants:** `07-DESIGN/INVARIANTS/DERIVED/00-INVARIANTS-v0.1.md`  
**Status:** TEST SPECIFICATION — NOT EXECUTED

This matrix defines required security regression cases. It is not evidence of existing implementation or passing tests. Test fixtures, exact endpoints, and physical mechanisms must be bound during implementation planning without weakening the policy below.

| Case | Invariant | Scenario / setup | Expected result | Minimum layer | Status |
|---|---|---|---|---|---|
| SEC-T01-01 | INV-SEC-T01 | Register or look up email values differing only by outer whitespace/case | Same normalized identity resolution; no duplicate identity | Unit + integration | SPECIFIED |
| SEC-T01-02 | INV-SEC-T01 | Existing records collide after normalization | Preflight detects and reports collisions; migration/unique constraint is blocked until reconciled | Data audit/migration rehearsal | SPECIFIED |
| SEC-T02-01 | INV-SEC-T02 | Google provider returns unverified email matching an existing User | No account linking; safe failure or verification flow | Unit + auth integration | SPECIFIED |
| SEC-T02-02 | INV-SEC-T02 | Google provider returns verified email under supported linking policy | Linking follows explicit account-linking flow; never bypasses other auth requirements | Auth integration | SPECIFIED |
| SEC-T03-01 | INV-SEC-T03 | Valid JWT, but no Membership for target Business | Deny protected request | Integration / E2E | SPECIFIED |
| SEC-T03-02 | INV-SEC-T03 | Valid JWT and ACTIVE Membership, but missing required Permission | Deny protected request | Integration / E2E | SPECIFIED |
| SEC-T04-01 | INV-SEC-T04 | Membership becomes INACTIVE/revoked while access token remains unexpired | Subsequent protected operation is denied based on current server-side state | Integration | SPECIFIED |
| SEC-T04-02 | INV-SEC-T04 | Permission is revoked while access token remains valid | Subsequent operation requiring that Permission is denied | Integration | SPECIFIED |
| SEC-T05-01 | INV-SEC-T05 | Switch to Business with no Membership or INACTIVE Membership | Switch rejected; no new trusted context established | Integration / E2E | SPECIFIED |
| SEC-T05-02 | INV-SEC-T05 | Client changes tenant/business ID in body, query, header or nested resource reference | Client value cannot override server-established Business Context | Integration / E2E | SPECIFIED |
| SEC-T06-01 | INV-SEC-T06 | Business A context reads/updates/deletes Business B resources via standard ORM | Denied or no foreign resource disclosure/mutation | Integration | SPECIFIED |
| SEC-T06-02 | INV-SEC-T06 | Cross-Business access through nested relations, bulk operations, upsert or groupBy | Denied; no foreign data returned or changed | Integration | SPECIFIED |
| SEC-T06-03 | INV-SEC-T06 | Raw SQL / executeRaw path uses a foreign Business identifier | Denied or safely constrained; no cross-tenant effects | Integration / DB test | SPECIFIED |
| SEC-T07-01 | INV-SEC-T07 | Inspect success and error DTOs for auth/profile/session/provider endpoints | Password hashes, tokens, provider IDs and secret/internal auth fields are absent | Unit + API contract | SPECIFIED |
| SEC-T08-01 | INV-SEC-T08 | Owner/Admin attempts privileged access without completing required MFA | Access to protected Owner/Admin surface is denied or restricted to MFA completion | Auth integration / E2E | SPECIFIED |
| SEC-T08-02 | INV-SEC-T08 | Non-Owner/Admin role follows applicable policy | No unintended MFA bypass for routes explicitly requiring it; no invented policy for other roles | Auth integration | SPECIFIED |
| SEC-T09-01 | INV-SEC-T09 | Enumerate API routes and their classification | Every route has explicit public/pre-context or Business-protected classification | Static/contract check | SPECIFIED |
| SEC-T09-02 | INV-SEC-T09 | Call protected route without context, Membership or required Permission | Fail closed; no domain side effect | Integration / E2E | SPECIFIED |
| SEC-T10-01 | INV-SEC-T10 | Membership status/Role/Permission changes and Business Switch occur | Auditable event/evidence records actor, target/context, action and outcome as defined by later audit contract | Integration | SPECIFIED |
| SEC-T10-02 | INV-SEC-T10 | Sensitive session/security event succeeds or fails | Event is traceable under the approved audit policy without logging credentials/tokens/secrets | Integration + security review | SPECIFIED |

## Execution and acceptance protocol

1. Map every case to the actual route/use case and owning module before implementation.
2. Use isolated Business A and Business B fixtures; assert both response content and persisted side effects.
3. For denial tests, assert no unauthorized read, write, event, stock/cash mutation or other domain side effect occurred.
4. Include positive controls so a denial test cannot pass because the whole route is broken.
5. Run the relevant unit/integration/E2E commands and attach actual CI evidence. Do not mark PASS from code inspection alone.
6. Do not add schema constraints or run migrations before normalized-email collision inventory and reconciliation.
7. Treat unresolved endpoint mapping, atomic Permission IDs, revocation SLA, MFA mechanics and audit storage as blockers to detailed executable test implementation—not as permission to omit policy coverage.

## Gate

- **Specification propagation:** intended by this document.
- **Test implementation:** NOT CLAIMED.
- **Test execution / CI:** NOT CLAIMED.
- **Runtime security compliance:** NOT CLAIMED.
- **Implementation/schema/migration/deployment authorization:** NOT granted by this document.
