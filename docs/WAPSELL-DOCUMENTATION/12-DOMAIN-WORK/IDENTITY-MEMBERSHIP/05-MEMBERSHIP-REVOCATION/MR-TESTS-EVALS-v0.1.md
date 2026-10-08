# Membership Revocation — Tests & Evals v0.1

**Status:** PROPOSED — PENDING REVIEW/GATE

## Unit
- Owner suspends ACTIVE Membership.
- Non-Owner cannot suspend.
- Owner cannot suspend their own Membership.
- Owner reactivates SUSPENDED Membership.
- Non-Owner cannot reactivate.
- Valid transitions are accepted.
- Invalid transitions are rejected.
- Usuario.activo remains unchanged.
- Event payload contains only approved fields.
- Event previous/new status values are correct.

## Integration / HTTP
- Owner suspends Membership in own Business.
- Owner reactivates Membership in own Business.
- Business A cannot mutate Membership from Business B.
- Client-supplied tenant identifiers cannot override BusinessContext.
- Non-Owner mutation is denied.
- Owner self-suspension is denied.
- Suspended Membership no longer resolves as ACTIVE through BusinessContext.
- Reactivated Membership resolves as ACTIVE.
- Event is emitted only after successful persistence.

## Regression
Run existing API tests, B3 tenant-isolation candidate, S-V1 verification suites, FS-1a verification suite, and relevant Membership/BusinessContext tests.

## Security / Failure
Invalid JWT; unresolved BusinessContext; foreign Membership; nonexistent Membership; invalid state transition; persistence failure; event publication failure after persistence.

## Evidence
Classify results as VERIFIED BY TEST, VERIFIED BY EXECUTION, VERIFIED BY CI, or NOT DETERMINABLE. Local results do not substitute for CI evidence.
