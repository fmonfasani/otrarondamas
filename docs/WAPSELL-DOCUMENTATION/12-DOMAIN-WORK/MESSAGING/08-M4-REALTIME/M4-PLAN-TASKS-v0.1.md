# WAPSELL — Messaging M4 — Plan / Tasks v0.1

**Status:** APPROVED — IMPLEMENTATION PLAN BASELINE

## Objective

Implement realtime Messaging transport on top of the existing M1–M3 + Read Receipts domain without duplicating persistence, identity, tenancy or authorization.

## Protected areas

- Existing BusinessContext implementation.
- Existing Membership/authentication mechanisms.
- Existing Messaging HTTP endpoints/services.
- Existing Prisma models and migrations.
- Existing M1–M3 + Read Receipts behavior.
- Existing B3/B4 verification infrastructure.

## Work packages

### M4-01 Gateway foundation
Create the Socket.IO gateway boundary and module integration.

### M4-02 Handshake authentication
Reuse existing JWT authentication and resolve BusinessContext.

### M4-03 Conversation authorization
Implement explicit room subscription with Owner/non-Owner authorization rules.

### M4-04 Revocation
Implement the Membership-domain-event → Socket.IO Gateway propagation and invalidate affected protected realtime access immediately.

Membership remains the source of authorization truth; the event is transport invalidation only.

### M4-05 Event publication
Publish explicit domain events after successful persistence.

### M4-06 Read Receipts integration
Emit read events from the existing read-receipt service without duplicating its logic.

### M4-07 Recovery / reconnect
Preserve HTTP as source of truth and ensure reconnect does not bypass authorization.

### M4-08 Tests
Implement unit, integration, tenant-isolation and regression coverage defined by M4 tests/evals.

### M4-09 Validation
Run build, Prisma validation/generation as applicable, API tests, B3, B4, S-V1 and FS-1a regression suites.

### M4-10 Evidence / review
Reconcile diff, scope, contracts, invariants, test evidence and CI evidence before Gate.

## Dependencies

- Existing authentication/JWT.
- BusinessContext.
- Messaging services.
- Existing Socket.IO dependency or approved package introduction if absent.

## Schema dependency rule

No schema modification is planned. If implementation reveals a required persisted-state change, STOP and report **SCHEMA DEPENDENCY** before modifying Prisma or migrations.

## Exit criteria

M4 can advance to Gate only when:
- all in-scope tasks are implemented;
- contracts and invariants hold;
- required tests pass;
- tenant-isolation cases pass;
- existing regression suites pass;
- CI evidence is available on the relevant commit;
- diff contains no unintended scope;
- Review approves;
- Gate approves.

M4 must not be declared CLOSED before those conditions are satisfied.
