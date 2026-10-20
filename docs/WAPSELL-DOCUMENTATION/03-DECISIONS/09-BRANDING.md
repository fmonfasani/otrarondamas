# Branding Decisions

**Domain:** Branding, Design System, Storefront Experience  
**Canonical specification:** [06-BRANDING-AND-EXPERIENCE-SPEC.md](../06-SPECIFICATIONS/CANONICAL/06-BRANDING-AND-EXPERIENCE-SPEC.md)  
**Cross-interface specification:** [07-EXPERIENCE-PLATFORM-AND-INTERFACE-SYSTEM-SPEC.md](../06-SPECIFICATIONS/CANONICAL/07-EXPERIENCE-PLATFORM-AND-INTERFACE-SYSTEM-SPEC.md)

## Reconciled direction

**Decision D-004 — APPROVED (DERIVED / RECONSTRUCTED)**

Wapsell maintains a common Design System Core. Each canonical `Business` owns its own `Brand`, which defines the commercial identity shown to that Business's customers. The customer-facing experience should primarily express the Business brand; Wapsell remains the underlying platform and may be attributed discreetly.

This direction does not, by itself, approve a physical schema, a token set, a font catalogue, a component library, an asset provider, a publication mechanism or implementation.

## Specification status — 2026-10-20

The canonical Branding & Experience Specification has been expanded to version 0.2.0 as an integration baseline. It defines the proposed MVP scope, theme boundaries, Brand Studio, customer-facing surfaces, tenant isolation, draft/publication semantics, accessibility/security requirements, derived invariants, acceptance criteria and staged implementation.

**Status:** DRAFT — INTEGRATION BASELINE / OWNER REVIEW REQUIRED.

The expanded Branding specification and the cross-interface Experience Platform specification are normative proposals for review, not evidence that the current code complies. The latter proposes one customer Web/PWA experience, a separate Admin Web-only experience, a shared Design System Core, and distinct navigation/patterns. Those interface-topology requirements remain DRAFT and are not covered by D-004 approval. It deliberately leaves physical persistence, exact routes/DTOs, canonical token values, asset storage, revision/cache strategy and AI-generation provider open until repository evidence and explicit decisions support them.

## Conflict status

**CON-012 — OPEN.** The existence of the expanded specification does not close the conflict. Closure requires:
1. Confirm the canonical Core token set and reconcile the historical competing AS-IS token sets.
2. Verify the current schema, brand-related code, asset storage and storefront/admin behavior.
3. Reconcile the specification with the canonical general specification and current architecture.
4. Register derived Brand contracts, invariants and tests with traceability.
5. Record Owner review/approval and close CON-012 through the repository's governance process.
6. Verify implementation and CI evidence before claiming implementation readiness or completion.

## Authority and constraints

- `Business` remains the canonical tenant entity; `Brand` belongs to exactly one `Business`.
- Brand customization cannot change identity, Membership authorization, tenant isolation, prices, stock, orders, payments or other domain invariants.
- The existing `Empresa.configuracion` field must not be assumed to be the final Brand persistence mechanism without code/schema review.
- Historical token values and Figma proposals are evidence/input, not automatically canonical.
- No schema migration, production deployment or implementation authorization is granted by this decision record.

## References

- [Canonical Branding & Experience Specification](../06-SPECIFICATIONS/CANONICAL/06-BRANDING-AND-EXPERIENCE-SPEC.md)
- [Experience Platform & Interface System Specification](../06-SPECIFICATIONS/CANONICAL/07-EXPERIENCE-PLATFORM-AND-INTERFACE-SYSTEM-SPEC.md)
- [Identity, Tenancy, Membership & Authorization Specification](../06-SPECIFICATIONS/CANONICAL/01-IDENTITY-AND-TENANCY-SPEC.md)
- [Architecture baseline](../07-DESIGN/ARCHITECTURE/BASELINE/00-R3-ARCHITECTURE-BASELINE-001-490.md)
- [Decision Register](00-DECISION-REGISTER.md)
