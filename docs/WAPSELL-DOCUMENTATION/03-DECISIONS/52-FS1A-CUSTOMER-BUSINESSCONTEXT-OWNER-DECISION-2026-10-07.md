# D-SC01-02 — Customer BusinessContext tenant authority interpretation — 2026-10-07

**Status:** OWNER-APPROVED — RECORDED  
**Scope:** FS-1 / FS-1a — Customer BusinessContext resolution and tenant authority interpretation.  
**Decision:** L2 — APPROVED.

## 1. Decision

`Cliente.empresaId` may be read by `BusinessContextService.resolveForCustomer()` as persisted relationship data to resolve the Business associated with an authenticated Customer.

This use of `Cliente.empresaId` **does not constitute a second tenant authority or a parallel tenancy mechanism**.

The canonical tenant authority remains **BusinessContext**. Consumers of tenant-scoped Customer functionality must obtain the Business through `BusinessContextService` and must not derive tenant authority directly from the legacy JWT `empresaId` claim.

## 2. Interpretation of I-SC01-05

This decision selects **L2 (broad interpretation)** over L1 (strict interpretation).

- **L1 — rejected:** treating any read of `Cliente.empresaId` as an independent tenant authority would imply a schema/model dependency for FS-1.
- **L2 — approved:** `Cliente.empresaId` is persisted relationship data used internally by the canonical BusinessContext resolver. The authority exposed to consumers remains the resolved `BusinessContext.businessId`.

## 3. Consequences

1. No schema change is required by this decision.
2. No second identity, tenancy or authorization mechanism is introduced.
3. The legacy JWT `empresaId` claim is not authoritative for Customer BusinessContext resolution.
4. `resolveForCustomer()` remains the canonical resolution path for authenticated Customer context.
5. FS-1/FS-1a may use the existing `Cliente.empresaId` relation without treating it as a parallel tenant boundary.

## 4. Evidence / traceability

- Related invariant interpretation: **I-SC01-05**.
- Previous decision requiring reconciliation: **D-SC01-01**.
- FS-1a implementation: `feat/fs-1a-customer-business-context`.
- FS-1a implementation commits: `baaddc39f352e53278e8f5e142cc817c11be04ad` and `55685eb1bec21417dee740bac375c2211c25abcc`.
- HTTP isolation evidence: FS1A-H-01, FS1A-H-02 and FS1A-H-03.
- This decision does not by itself establish CI verification or FS-1a Gate closure.

## 5. Authorization boundary

This decision authorizes the **normative interpretation and its documentation**. It does not authorize:

- schema or migration changes;
- changes to JWT structure;
- changes to Membership semantics;
- changes to CI/B4 infrastructure;
- push, merge or deployment;
- declaration of FS-1a CLOSED without the remaining Gate criteria.

**Authority:** Owner approval, 2026-10-07.
