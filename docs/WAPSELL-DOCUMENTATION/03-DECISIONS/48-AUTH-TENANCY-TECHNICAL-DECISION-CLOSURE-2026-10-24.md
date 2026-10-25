# WAPSELL — AUTHENTICATION, AUTHORIZATION AND TENANCY DECISION CLOSURE

**Date:** 2026-10-24  
**Status:** OWNER-ACCEPTED — CLOSED AT POLICY/DIRECTION LEVEL  
**Authority:** The Owner explicitly accepted recommendations T-01 through T-10 in the 2026-10-24 working session.  
**Scope:** Authentication, session security, Business Context, Membership authorization, tenant isolation, safe responses, MFA and auditability.  
**Implementation:** NOT AUTHORIZED by this closure alone.  
**Schema / migrations / runtime / production cutover:** NOT AUTHORIZED by this closure alone.

## 1. Decisions closed now

### T-01 — Email normalization

Trim surrounding whitespace and normalize email to lowercase before registration, identity lookup, and comparison. Before enforcing or changing physical uniqueness constraints, audit existing records for duplicates/collisions and define safe reconciliation.

### T-02 — Verified Google OAuth email

Google OAuth account linking requires a verified provider email. Never link an existing User solely because an unverified or otherwise untrusted email string matches. Provider response handling, error UX, and recovery remain implementation details.

### T-03 — JWT is not authorization

JWT is an authentication/session-context mechanism, not the source of authorization. Claims must remain minimal; embedded Permission lists must not be authoritative. Exact claims, signing/key management, transport, lifetime, refresh/continuation, and storage remain open technical details.

### T-04 — Current server-side authorization and revocation

Every protected operation must revalidate current server-side Membership and authorization state. Revocation must not depend solely on access-token expiry. The mechanism and operational latency characteristics remain open; this decision establishes no fixed SLA.

### T-05 — Controlled Business Switch

Business Switch is a controlled server-side operation. A requested Business is accepted only after validating an ACTIVE Membership and establishing a server-trusted Business Context. Endpoint/protocol, response contract, and context transport remain open.

### T-06 — Application-level tenant isolation

Application-level tenant isolation is mandatory across all protected reads and writes, including ORM operations that bypass existing extensions and raw database paths. The exact enforcement architecture remains implementation design work; existing Prisma extensions alone must not be presumed sufficient.

### T-07 — Safe API responses

API responses must not expose passwords or password hashes, tokens, authentication-provider identifiers, or other secrets and authorization-sensitive fields. Resource-specific DTOs/projections and regression tests must enforce this rule.

### T-08 — Mandatory Owner/Admin MFA

MFA/2FA is mandatory for Owner and Admin. Provider/protocol, enrollment, challenge, recovery, and enforcement mechanics remain open implementation details.

### T-09 — Explicit route authorization classification

Every route must be explicitly classified as public/pre-context or Business-protected. Business-protected routes fail closed unless applicable authorization has been established. The canonical atomic Permission identifiers, complete Role→Permission matrix, and endpoint-to-permission mapping remain downstream work.

### T-10 — Security and commercial auditability

Security-sensitive changes and commercially relevant operations require appropriate traceability, including Membership/Role/Permission changes, Business Context changes, and sensitive session events. Event schema, retention, storage, access controls, and domain-specific audit coverage remain open.

## 2. Decisions intentionally deferred

These are not unresolved policy questions; they are controlled downstream design tasks. They must be resolved before implementing the affected behavior and must not be guessed:

- Physical schema, indexes, constraints, and identity uniqueness enforcement.
- Existing-data duplicate detection, reconciliation, and migration.
- Exact JWT claims, token lifetime, refresh/session continuation, transport, and revocation storage.
- Business Switch API contract and protocol.
- MFA provider/protocol and secure recovery workflow.
- Atomic Permission identifiers, full Role→Permission matrix, and endpoint-level permission mapping.
- Response DTO/projection inventory and security regression coverage.
- Audit event schema, retention, storage, access controls, and coverage.
- Legacy coexistence duration, cutover criteria, and rollback mechanics.

## 3. Relationship to existing decisions

This closure supplements and does not replace the prior Owner rulings and master decision package. The following remain binding:

- Wapsell is the platform; Business is the tenant boundary.
- User is global; Membership is the User↔Business relationship.
- Membership → Role → Permission governs authorization.
- An ACTIVE Membership is required for Business access; an INACTIVE Membership cannot authorize.
- Business Context is established server-side and cannot be overridden by client-supplied identifiers.
- Customer remains distinct from User; email equality alone does not authorize automatic linking.
- Owner/Admin MFA is mandatory.
- Legacy coexistence is temporary and controlled; legacy retirement is a separate gate.

## 4. Propagation and implementation gate

The accepted directions may now be propagated into the canonical TO-BE, contracts, invariants, test specifications, and transformation traceability.

This decision closure does **not** by itself authorize schema changes, migrations, code implementation, destructive legacy retirement, deployment, or production cutover. Implementation readiness remains subject to the applicable governance gates.

## 5. Evidence and verification status

- **DOCUMENTED:** Owner acceptance of T-01 through T-10 on 2026-10-24.
- **NOT CLAIMED:** code implementation, runtime verification, test execution, CI success, migration, or production cutover.
