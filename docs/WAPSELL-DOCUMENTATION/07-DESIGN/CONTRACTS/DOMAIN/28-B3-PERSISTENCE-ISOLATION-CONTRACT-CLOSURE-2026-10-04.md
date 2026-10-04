# WAPSELL — B3 PERSISTENCE ISOLATION CONTRACT CLOSURE v0.1

**Fecha:** 2026-10-04
**Estado:** T-01 CLOSED FOR DOWNSTREAM IMPLEMENTATION / OWNER-APPROVED TECHNICAL CONTRACT
**Alcance:** Business-scoped persistence isolation
**Implementación:** NOT AUTHORIZED BY THIS DOCUMENT
**Tests ejecutados:** NONE
**Schema / migrations / data:** NONE

## 1. Purpose

This document closes technical blocker T-01 identified by the B3 control point.

It does not replace or rewrite the historical B3 contract. It is the reconciled technical closure that makes the persistence-isolation obligations sufficiently explicit for downstream invariant, implementation-task and verification derivation.

Authority hierarchy remains:

1. Owner Decisions
2. R8-ARCH-002
3. canonical B1/B2 contracts and invariants
4. B3 contract and reconciliation addendum
5. this technical closure
6. downstream architecture / implementation / tests

The contract specifies required properties, not a mandatory Prisma implementation.

## 2. Approved technical decisions

The following Owner-approved decisions are normative for this contract:

| ID | Decision | Contract rule |
|---|---|---|
| T01-01 | Server-owned Business Context | A protected Business-scoped operation uses the Business Context established by the server. Client-supplied Business identifiers cannot select or override the effective Business. |
| T01-02 | Cross-Business relation lookup | A relation targeting another Business must not reveal that resource through the external persistence result; it is treated as unavailable/not found. The operation fails closed internally. |
| T01-03 | Nested writes | Every persisted relation participating in a Business-scoped nested operation must be validated against the same effective Business Context. |
| T01-04 | Unique lookups | Tenant-scoped uniqueness is evaluated within the effective Business Context. A globally unique mechanism must not expose a resource belonging to another Business through a Business-scoped operation. |
| T01-05 | Transactions | The effective Business Context remains authoritative for the complete Business-scoped transaction, including all persistence performed through its transaction client. |
| T01-06 | Raw SQL | Raw SQL is permitted only when the Business-scoped operation explicitly preserves the effective Business boundary. A raw query may not bypass tenant isolation. |
| T01-07 | Direct Prisma access | Direct Prisma access is permitted only for explicitly global/pre-context operations. A Business-scoped operation must use a persistence path that enforces the Business isolation contract. |

## 3. Business Context authority

For every protected Business-scoped persistence operation:

`server-established Business Context → persistence scope → operation`

The following is prohibited:

`client empresaId → persistence scope`

A client-supplied `empresaId`, Business identifier, relation identifier or equivalent value is untrusted input and cannot establish ownership.

Missing or invalid Business Context remains fail-closed under the upstream B1/B2 context contract.

This contract does not prescribe the physical transport or propagation mechanism of Business Context.

## 4. Direct ownership

For an entity whose ownership is directly represented by Business data:

- the effective Business is derived from the server Business Context;
- client-provided Business ownership cannot override it;
- create/createMany must not persist a Business different from the effective context;
- read/update/delete must be constrained to the effective context;
- the persisted state must remain within that context.

The presence of an `empresaId` field is an AS-IS implementation characteristic, not a canonical Wapsell ownership rule.

## 5. Related and derived ownership

A relation identifier supplied by a client is not proof of ownership.

Before a Business-scoped persistence operation persists a relation, the related resource must be resolvable within the effective Business Context.

For nested persistence:

- direct foreign keys must satisfy the Business boundary;
- nested creates must preserve Business ownership;
- nested connect/connectOrCreate/update/delete/set/disconnect operations, when introduced, must preserve the same boundary;
- indirect ownership must resolve deterministically to the same Business;
- a relation to another Business cannot be used to escape the current context.

If the relation cannot be resolved unambiguously to the effective Business, the operation must fail closed.

## 6. Cross-Business lookup semantics

A Business-scoped operation must not disclose another Business resource through:

- primary-key lookup;
- unique lookup;
- relation lookup;
- nested relation resolution;
- indirect/derived ownership resolution.

For a resource belonging to another Business, the externally observable result may be equivalent to absence/not-found. The contract does not prescribe a particular HTTP status or application error code.

The implementation must not use a cross-Business lookup as an information-disclosure side channel.

## 7. Unique lookup semantics

A unique lookup is Business-scoped when the surrounding operation is Business-scoped.

The logical key is therefore:

`effective Business Context + unique lookup semantics`

An implementation may use a post-query ownership check where required by the existing persistence technology, but the observable contract remains that a Business-scoped operation cannot return another Business resource.

This applies to every unique lookup mechanism actually present in the implementation; no lookup mechanism is invented by this contract.

## 8. Transaction boundary

A Business-scoped transaction has one effective Business Context for its complete execution.

All persistence operations performed through the transaction must preserve that context, including:

- reads;
- creates;
- updates;
- deletes;
- nested operations;
- unique lookups;
- raw SQL relevant to the Business-scoped operation.

A transaction must not become an isolation bypass merely because execution moved from the normal scoped client to a transaction client.

The actual runtime preservation of the scope remains a verification requirement and is not claimed as verified here.

## 9. Raw SQL boundary

Raw SQL is not prohibited by this contract.

However, any raw SQL participating in a Business-scoped operation must preserve the effective Business boundary explicitly.

Therefore:

- raw SQL cannot establish a different Business;
- raw SQL cannot omit the required Business predicate or equivalent ownership constraint where the queried data is Business-scoped;
- raw SQL cannot be used as a bypass around the scoped persistence contract;
- raw SQL inside a Business-scoped transaction remains subject to the same Business Context.

The exact abstraction or helper used to enforce this is an implementation concern.

## 10. Unsupported operations and fail-closed behavior

If a persistence operation cannot provide an enforceable Business isolation guarantee, it must not execute as an unscoped fallback.

Required behavior:

`unsupported / unverifiable isolation → reject → no unscoped persistence`

No silent fallback to global Prisma access is permitted for a Business-scoped operation.

This preserves the existing B3 fail-closed obligation.

## 11. Direct Prisma boundary

Direct `PrismaService` access is valid for explicitly global or pre-context operations such as identity establishment where no Business Context exists yet.

It is not a valid bypass for a protected Business-scoped operation.

Therefore the architecture distinguishes:

| Operation class | Direct Prisma allowed |
|---|---|
| Pre-context identity establishment | YES, when explicitly required |
| Explicitly global platform operation | YES, when declared global |
| Business-scoped operation | NO, unless the access path itself demonstrably enforces this contract |

This rule does not prescribe a particular service class or Prisma extension.

## 12. Legajo / DocumentoLegajo

`Legajo` and `DocumentoLegajo` are Business-scoped.

Their ownership must resolve deterministically to exactly one Business.

Client-supplied relation identifiers cannot override that ownership.

If ownership cannot be determined unambiguously, the operation must fail closed.

The physical ownership mechanism remains a downstream technical-design concern and is not prescribed by this contract.

This closes the former normative ambiguity without inventing a schema change.

## 13. Pre-context boundary

The persistence isolation contract applies to protected Business-scoped operations.

It does not turn identity-establishment or other explicitly pre-context operations into Business-scoped operations.

The distinction is:

`pre-context operation → no Business Context exists yet`

versus

`Business-scoped operation → Business Context is mandatory`

A pre-context operation must not be used as an excuse to bypass isolation once a Business-scoped operation begins.

## 14. Failure semantics

The contract deliberately does not prescribe HTTP status codes, exception class names or transport-specific error payloads.

It does prescribe the security property:

- no cross-Business data returned;
- no cross-Business mutation;
- no ambiguous ownership persisted;
- no unscoped fallback;
- no client override of server Business ownership;
- no transaction escape;
- no raw-SQL escape.

## 15. Traceability

| Contract area | Existing source / downstream mapping |
|---|---|
| Business Context authority | B1 `INV-CONTEXT-001`, B2 context contract |
| Direct ownership | R8-ARCH-002 P5-P8; B3-CON-006..009 |
| Client FK validation | ISO-001 / TE-B3-001 |
| Related/nested ownership | ISO-002 / TE-B3-002; inherited B1 TE-ID-011 |
| Derived ownership | ISO-003 / TE-B3-003 |
| Unique lookup | ISO-005 / TE-B3-005; inherited B1 TE-ID-010 |
| Transactions | ISO-006 / TE-B3-006 |
| Unsupported operations | ISO-007 / TE-B3-007 |
| Path independence | ISO-008 / TE-B3-008 |
| Legajo/DocumentoLegajo | ISO-009 / TE-B3-009 |
| Cross-Business negative verification | R8 property 12 — verification gate |

## 16. Implementation boundary

This closure does NOT authorize:

- tenant-isolation product changes;
- Prisma schema changes;
- migrations;
- User/Business/Membership schema changes;
- ISO-009 physical implementation;
- replacement of the existing Prisma mechanism;
- API redesign;
- JWT redesign;
- Business Context transport redesign.

Those require their own downstream authorization.

## 17. Verification requirements

This contract is documentary evidence only.

Current evidence:

- `[D]` — technical contract approved by Owner in this conversation.
- `[C]` — existing repository characteristics already documented by code inspection.
- `[T]` — 0.
- `[E]` — 0.

The contract is therefore **not evidence that tenant isolation currently passes**.

Required downstream verification includes, at minimum:

1. client Business ID cannot override server context;
2. cross-Business direct relation cannot be persisted;
3. nested/related persistence cannot escape Business;
4. unique lookups cannot expose another Business;
5. transaction scope survives the transaction boundary;
6. relevant raw SQL cannot bypass Business isolation;
7. unsupported operations fail closed;
8. Legajo/DocumentoLegajo ownership is deterministic;
9. explicit negative cross-Business verification is executed.

## 18. T-01 closure

The technical blocker T-01 is considered closed at the **contract-definition level** because the previously missing persistence-isolation rules are now explicit:

- Business Context authority;
- direct ownership;
- derived ownership;
- client FK validation;
- nested writes;
- unique lookup semantics;
- transaction continuity;
- raw SQL boundary;
- unsupported-operation fail-closed behavior;
- direct-Prisma bypass boundary;
- deterministic Legajo/DocumentoLegajo ownership.

**T-01: CLOSED FOR DOWNSTREAM DERIVATION.**

This closure does **not** mean:

- B3 implementation is authorized;
- B3 invariants are VERIFIED;
- tenant isolation is VERIFIED;
- Tests/Evals are executed;
- `[T]` or `[E]` evidence exists.

## 19. Change control

No application code, Prisma schema, migration or data is changed by this contract.

Historical B3 contract documents remain unchanged.

The next gate is a B3 control-point reassessment to determine whether the reconciled contract can promote the B3 invariants and Tests/Evals stages.

