# G5 — User Reconciliation Follow-up — 2026-09-29

**Estado:** OPEN — PRODUCTION EVIDENCE REQUIRED

## 1. Scope

This follow-up evaluates the G5 user-reconciliation gate using the evidence currently available.

## 2. Evidence available

### 2.1 Development seed

The repository seed explicitly creates a second company, `Empresa Demo Aislamiento`, solely to verify development tenant isolation. It also creates `owner@demo-aislamiento.com`.

Therefore the previously observed second company is a development fixture and must not be interpreted as evidence of a second production business.

**Evidence classification:** VERIFICADO POR CÓDIGO.

### 2.2 Seed database audit supplied for G5

The supplied G5 audit reports:

- accessible database: `otrarondamas-db-1`;
- PostgreSQL port: 5500;
- 43 tables;
- explicitly identified as development seed, not production;
- 4,343 products;
- 0 sales;
- 0 orders;
- 0 purchases;
- 0 audit records;
- 3 users;
- 2 Empresas;
- 0 inactive users;
- 0 duplicate emails under LOWER(TRIM(email));
- 0 Google IDs;
- 0 users without a valid Empresa;
- 11/25 permission assignments;
- 0 permission orphans;
- 0 invitations;
- 0 clients;
- no detected identity conflicts in that seed.

**Evidence classification:** DOCUMENTED / SUPPLIED AUDIT; not production evidence.

### 2.3 Production infrastructure

The repository documents a production PostgreSQL service and persistent volume in `docker-compose.prod.yml`, with production environment variables documented in `.env.prod.example`.

The repository does **not** provide evidence that the production database itself was accessed or audited during this G5 pass.

**Evidence classification:** VERIFIED BY CODE for infrastructure; NOT DETERMINABLE for production DB contents.

## 3. Code-level G5 findings

### R-01 — Email normalization is not implemented in login

The current login implementation uses the supplied email value directly. The current schema has global case-sensitive uniqueness on `Usuario.email`.

Therefore the selected invariant:

`lower(trim(email))` is the identity key

is not yet physically/runtime enforced by the current implementation.

**Status:** OPEN implementation finding.

### R-02 — Google email identity assumption

The supplied G5 audit identified current Google OAuth logic that treats equal email as the same person.

This is compatible with the selected Owner decision D1 only after the normalized global User identity invariant is explicitly enforced and validated.

**Status:** OPEN implementation finding.

## 4. G5 result

G5 remains **OPEN**.

Reason: the available database evidence is a development seed. It demonstrates that the seed contains no detected identity conflicts, but it cannot establish the same property for the production dataset.

No production identity conflict is asserted.

## 5. Required evidence to close G5

One production or production-equivalent snapshot must be audited with the same reconciliation rules:

1. User count.
2. Empty/null emails.
3. Exact duplicate emails.
4. Duplicate `LOWER(TRIM(email))`.
5. Duplicate Google IDs.
6. Users without valid Business/Empresa.
7. Businesses/Empresas without users.
8. Customer→User linkage candidates using normalized email.
9. Ambiguous Customer→User matches.
10. Permission and authorization orphan checks.
11. Invitation integrity.
12. A reproducible record of the database snapshot/environment used.

The audit must be read-only.

## 6. No data changes

This pass performs no production data changes and no Prisma/runtime changes.

## 7. Gate

**G5 = OPEN**

Closing condition: production or approved production-equivalent snapshot is audited and the reconciliation result is explicitly recorded.
