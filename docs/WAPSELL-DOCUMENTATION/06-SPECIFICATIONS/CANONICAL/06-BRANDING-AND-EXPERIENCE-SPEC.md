# Wapsell — Branding & Customer Experience Specification

**Document ID:** SPEC-BRAND-001  
**Version:** 0.2.0  
**Status:** DRAFT — INTEGRATION BASELINE / OWNER REVIEW REQUIRED  
**Last reconciled:** 2026-10-20  
**Domain:** Brand, Storefront, Customer Experience, UI/UX, Tenancy  
**Canonical path:** `docs/WAPSELL-DOCUMENTATION/06-SPECIFICATIONS/CANONICAL/06-BRANDING-AND-EXPERIENCE-SPEC.md`

> **Authority and status.** This specification expands the existing canonical placeholder; it does not assert that the current implementation already satisfies it. It follows the documented direction that `Business` is the tenant boundary and `Brand` represents that Business's customer-visible commercial identity. `CON-012` remains OPEN until the reconciliation artifacts, decision register, derived contracts/invariants/tests, and implementation evidence are updated and reviewed. This document alone does not close that conflict or authorize schema changes, migrations, deployment, or implementation.
>
> **Evidence labels:** **DECIDED** = documented direction; **SPECIFIED HERE** = proposed normative behavior requiring review; **AS-IS TO VERIFY** = must be checked against code/schema/tests before implementation.

## Relationship to the cross-interface platform specification\n\nThe customer PWA/Web, Admin Web-only boundary, shared Design System Core, experience-specific navigation, PWA lifecycle/offline policy, and cross-interface contracts are governed by [07-EXPERIENCE-PLATFORM-AND-INTERFACE-SYSTEM-SPEC.md](07-EXPERIENCE-PLATFORM-AND-INTERFACE-SYSTEM-SPEC.md). This document remains authoritative for Business Brand configuration, Brand Studio, public Brand rendering, draft/publish/revert and tenant-specific visual rules. If a conflict appears, record it for reconciliation; do not silently fork tokens, components or behavior. Both documents remain drafts until reviewed, and neither alone closes CON-012 or authorizes implementation.\n\n## 1. Purpose

Define a coherent, staged branding capability so each Wapsell Business can present a distinctive commercial identity—especially in the customer-facing storefront—while sharing Wapsell's secure, accessible, reliable commerce platform.

The target is not a set of duplicated storefront applications. It is one platform and Design System Core that renders a tenant-specific brand configuration through approved tokens, component variants, content and assets.

## 2. Product principles

1. **Tenant brand leads the customer experience.** The customer should feel they are shopping with the Business, not inside a generic Wapsell template.
2. **Wapsell Core remains dependable and discreet.** Wapsell owns platform navigation conventions where required, accessibility, responsive behavior, interaction semantics, error/loading/offline states, authorization and commerce invariants. A discreet “Powered by Wapsell” mark may be used where product policy allows.
3. **One Business, one effective Brand.** A Brand belongs to exactly one canonical `Business`. No Brand may be applied to another Business by changing a client-supplied identifier.
4. **Configuration, not arbitrary code.** MVP customization uses validated data and allow-listed component variants; no tenant-provided CSS, HTML, JavaScript, executable templates or untrusted font files.
5. **Backend is authoritative.** The server resolves tenant context, permissions, published configuration and commerce data. Client-side theme state is presentation-only.
6. **Drafts do not leak into the published storefront.** Edits remain drafts until a permitted publication action succeeds.
7. **Progressive enhancement.** Missing, invalid or unavailable brand data falls back to a deterministic Wapsell default theme and must never break browsing or purchasing.
8. **Branding cannot change business rules.** Visual configuration cannot alter price calculation, availability, stock reservation, order state, payment status, permissions, identity or tenant isolation.
9. **Accessibility and usability are release criteria.** Brand expression cannot make text unreadable, controls ambiguous, focus invisible or critical actions hard to identify.
10. **One source of truth per concern.** Avoid duplicate token sets and competing configuration stores. Existing fields/models must be inspected and reconciled before choosing physical persistence.

## 3. Scope and release stages

### 3.1 Stage 1 — MVP Brand Essentials (target)

**Customer-facing priority**
- Store identity: public name, logo, optional tagline and short description.
- Main cover/banner image with validated crop behavior and responsive presentation.
- Brand palette using semantic roles; preview foreground/background combinations and enforce contrast rules.
- Typography selected from a curated, licensed, supported font catalogue; separate heading and body roles only if the chosen fonts are compatible.
- Approved component appearance presets for buttons, product cards, chips/badges and section layouts.
- Storefront composition using a bounded set of sections: hero, featured products, categories/collections and promotional content.
- Conversational identity: avatar/logo, greeting, away message and a bounded tone selection. These fields do not activate an AI agent or imply automated replies.
- Live preview for supported customer breakpoints.
- Save draft, validate, publish, report validation errors and revert to the previous successful publication.
- Accessible defaults and predictable loading/error/empty states.

**Admin-facing capability**
- A guided Brand Studio with sections: Identity, Visual Direction, Store Experience, Conversational Personality, Preview and Publish.
- Upload an existing logo or select an optional AI-assisted logo-generation workflow. Generated output is a proposal/asset, not an automatically approved brand decision. Users can review, replace or remove it.
- Asset management for logo, banner and avatar, with explicit upload/generation status and safe fallback.
- Preview the actual storefront components rather than a detached illustration.
- Clear indication of draft versus published configuration and validation failures.

### 3.2 Stage 2 — Expanded customization (future; not MVP acceptance scope)

Additional type scales, more palette presets, advanced card/button variants, richer campaign/collection sections, additional banner slots and expanded layout controls. Each addition requires component support, validation and responsive/accessibility tests.

### 3.3 Stage 3 — Advanced brand experience (future; not MVP acceptance scope)

More flexible page composition, industry-specific storefront patterns, richer motion/interaction where accessible, optional custom-domain support and AI-assisted brand recommendations. Any AI feature must be separately specified for consent, generated-asset review, cost limits, moderation, data handling and operational fallback. No custom code execution is implied.

## 4. Domain model and ownership

### 4.1 Canonical ownership

- **DECIDED:** `Business` is the canonical tenant entity and isolation boundary; `Brand` belongs to one `Business`.
- **SPECIFIED HERE:** Brand configuration is a Business-scoped resource. Reads of a public published brand may be anonymous only for the explicitly resolved storefront Business. Draft read/write/publish operations require authentication, active Business context, valid Membership and permission.
- **AS-IS TO VERIFY:** Existing `Empresa`, `Business`, `Empresa.configuracion`, asset metadata and storefront settings must be inspected before schema changes. Do not create parallel models or silently assume `Empresa` and `Business` are already reconciled.

### 4.2 Logical concepts (not a physical schema mandate)

- **Brand identity:** public display name, tagline, description, logo asset reference.
- **Brand theme:** semantic color tokens, allowed font identifiers, supported visual variants.
- **Storefront configuration:** banner/cover asset, enabled sections, ordering, featured content references.
- **Conversational branding:** avatar reference, greeting, away message and tone preset.
- **Publication metadata:** draft revision, published revision, actor, timestamp and validation result.

These concepts may be stored in existing configuration fields or dedicated tables after inspection of the actual schema, query patterns, audit needs and migration strategy. This specification does not authorize a schema choice by naming these concepts.

### 4.3 Revision and publication model

The implementation must preserve a clear distinction between editable draft and published state. A successful publication produces an immutable or otherwise reproducibly versioned snapshot. The storefront resolves only a valid published snapshot. Failed validation or publication must leave the previous published snapshot active. Reverting creates a new publication pointing to a prior known-good configuration or restores its content as a new revision; history must not be silently erased.

Exact storage strategy, concurrency control and revision identifiers are **OPEN IMPLEMENTATION DECISIONS** pending schema and architecture review.

## 5. Theme and design-token contract

### 5.1 Two layers

- **Wapsell Design System Core:** structural layout, spacing scale, component semantics, responsive breakpoints, focus treatment, accessibility behavior, interaction states and critical status messaging.
- **Business Brand Theme:** tenant-owned brand assets, semantic color values, allowed font identifiers, approved component variants and storefront content.

A Business Theme selects and configures supported presentation; it does not replace the Core or supply arbitrary components.

### 5.2 Semantic tokens

MVP token roles should include, at minimum:

- `brand.primary`
- `brand.onPrimary`
- `brand.secondary`
- `brand.surface`
- `brand.onSurface`
- `brand.mutedSurface`
- `brand.border`
- `brand.focus`
- `brand.headingFont`
- `brand.bodyFont`
- `brand.cornerStyle`
- `brand.cardStyle`

The names above are proposed semantic roles, not a claim that variables already exist. A single canonical token registry must map these roles to the actual CSS variables/theme implementation. Avoid duplicate hex literals across apps and components. Status colors for success, warning, error, payment/order state and system feedback remain semantically governed by Core; a tenant palette cannot make those states ambiguous. Any tenant-specific status styling must preserve recognizable meaning and pass contrast checks.

### 5.3 Initial visual defaults

The current documentation contains multiple conflicting AS-IS token sets. No legacy palette is automatically canonical by virtue of existing in code or an old design file. The initial Core palette and default theme must be selected through an explicit reconciliation and verified against the current Figma design and frontends. Until then, values are **OPEN**, not silently inferred.

## 6. Asset and logo rules

- Asset records must be owned/scoped to the Business or explicitly shared platform assets.
- Validate file type from content, size, dimensions and supported formats; do not trust filename or client MIME alone.
- Use safe image transformations/cropping and responsive variants where infrastructure supports them.
- Do not execute uploaded SVG scripts, HTML, CSS or embedded active content. If SVG is accepted, sanitize it under an explicit allow-list; otherwise rasterize/restrict formats.
- Never expose private draft assets through predictable public URLs. Public assets must correspond to published content and intended visibility.
- Generation must not overwrite the current logo automatically. Store the generated proposal, let the user preview and explicitly select it.
- Licensing, retention, storage provider, CDN, generation provider and exact size limits are **OPEN** until verified against current infrastructure and selected through implementation planning.

## 7. Customer-facing experience requirements

### 7.1 Required surfaces

The effective published brand must render consistently in:
1. Storefront home/cover.
2. Category and collection browsing.
3. Search results, if supported by the storefront.
4. Product detail.
5. Cart.
6. Checkout and order confirmation.
7. Customer-visible order status/tracking.
8. Conversation entry, conversation header and brand-authored messages.

A surface not yet implemented must be recorded as a dependency/gap, not marked compliant. The tenant theme must not hide mandatory totals, fees, payment status, order status, stock limitations, errors or required legal/business information.

### 7.2 Conversational personality

The MVP supports brand-authored content and tone presets only. It must distinguish human messages, system-generated operational messages and brand-authored greeting/away content. Tone selection does not alter message delivery semantics, consent, permissions or automation. AI-generated sales replies are out of scope unless separately specified and approved.

### 7.3 Responsive and preview parity

Preview must use the same theme-resolution and component-rendering path as the published storefront wherever feasible. If preview data differs from production data, label the difference. Supported breakpoints must be declared in the Design System; all assets must preserve usable crop, focal point and logo legibility across breakpoints.

## 8. Admin, authorization and API boundaries

Brand Studio operations are Business-scoped and must follow the canonical authorization rule:

`authenticated User → target Business → active Membership → Role/Permission → use case`

A token alone does not authorize brand modification. A client-supplied Business ID, asset ID or revision ID must never be treated as proof of ownership.

The backend owns:
- Resolving the requested storefront Business.
- Loading only that Business's published brand snapshot.
- Validating and persisting drafts.
- Validating assets and theme values.
- Authorizing publish/revert operations.
- Recording audit events for meaningful changes and publication.
- Ensuring cache keys and invalidation are tenant- and revision-aware.

The frontend owns:
- Editing forms and immediate local preview.
- Showing validation feedback.
- Rendering the returned effective theme.
- Preventing accidental loss of unsaved changes.

The frontend is not a security boundary. Exact endpoint names, DTOs, guards, permission identifiers, storage mechanism, caching technology and transaction boundaries are **OPEN** until inspected and documented in domain contracts. Do not invent API routes in implementation solely from this specification.

## 9. Failure handling and consistency

- Missing brand: render deterministic Wapsell default plus available Business name; never crash the storefront.
- Invalid published configuration: reject publication; keep last known-good published revision active.
- Asset unavailable: render a safe fallback and emit observable diagnostic context; do not block checkout solely because a decorative image failed.
- Draft/publish race: use concurrency protection so stale edits cannot silently overwrite newer revisions.
- Cache staleness: publish/revert must invalidate or version all derived brand cache entries; a customer must not see a mixture of old logo and new colors caused by independent cache lifecycles.
- Cross-tenant request: deny access to drafts and private assets; do not disclose whether another tenant's private resource exists.
- Network failure during save/publish: display an explicit failed/unknown result and reconcile against server state before retrying. Never claim a publication succeeded based only on optimistic UI.
- Theme failure must not change commerce behavior or disable access to essential controls.

## 10. Security, privacy, accessibility and performance

- Enforce server-side Business ownership and Membership/Permission checks on every mutation.
- Validate content length, URLs, asset ownership, image formats and allowed theme values.
- Prevent stored XSS through user-authored text and asset handling.
- Do not allow brand content to impersonate Wapsell system notices, payment providers or security-critical messages.
- Preserve keyboard access, visible focus, semantic labels, screen-reader names, reduced-motion preferences and usable zoom.
- Check text and interactive contrast against the final rendered background. Automated contrast checking is necessary but not sufficient; manual review remains required for complex imagery.
- Avoid loading the entire asset library for the first storefront render. Use optimized assets, appropriate dimensions and lazy loading for non-critical media.
- No exact performance budget is imposed until baseline measurements exist; establish one before release and test mobile conditions.

## 11. Derived invariants

The following invariants must be represented in the domain contract and automated tests before implementation can be considered production-ready:

- **BR-INV-01 — Ownership:** every Brand configuration and private asset belongs to exactly one Business or an explicitly declared shared platform scope.
- **BR-INV-02 — Tenant isolation:** no user can read or mutate another Business's draft or private assets without explicit authorized platform scope.
- **BR-INV-03 — Published-only storefront:** public customer surfaces resolve published revisions only.
- **BR-INV-04 — Last-known-good:** failed validation/publication never replaces the current valid published snapshot.
- **BR-INV-05 — Presentation-only:** theme values cannot alter business calculations, state transitions, authorization or inventory.
- **BR-INV-06 — Safe defaults:** absent or invalid theme data results in a usable default experience.
- **BR-INV-07 — Semantic consistency:** critical system/status messages remain distinguishable and accessible under every allowed theme.
- **BR-INV-08 — Revision coherence:** all storefront surfaces in one rendered experience resolve the same publication revision.
- **BR-INV-09 — Auditability:** publish/revert and other defined consequential changes record actor, Business context, revision and timestamp.
- **BR-INV-10 — No executable customization:** tenant configuration cannot execute arbitrary code.

These are derived requirements proposed by this specification. They must be linked into the canonical invariant registry and assigned test evidence before being treated as closed project invariants.

## 12. Verification and acceptance matrix

| ID | Acceptance condition | Required evidence |
|---|---|---|
| BR-AC-01 | Three Business tenants can display distinct identities on the same application build. | Multi-tenant integration/E2E test and screenshots. |
| BR-AC-02 | Editing tenant A cannot affect tenant B's draft or published theme. | Cross-tenant negative tests. |
| BR-AC-03 | Unauthorized or inactive Membership cannot edit, publish or revert a Brand. | Authorization tests per operation. |
| BR-AC-04 | Storefront shows only published revisions. | API/service and browser E2E tests. |
| BR-AC-05 | Failed validation/publication preserves the last good publication. | Service/integration test. |
| BR-AC-06 | Logo/banner upload rejects unsupported, oversized or unsafe assets. | Upload validation and security tests. |
| BR-AC-07 | Customer surfaces consistently apply one publication revision. | E2E assertions across home/product/cart/checkout/order/chat. |
| BR-AC-08 | Default theme keeps storefront functional when theme or asset data is absent. | Fallback tests. |
| BR-AC-09 | All allowed theme presets pass automated contrast checks and manual accessibility review. | Accessibility report and manual checklist. |
| BR-AC-10 | Brand changes do not alter price, stock, payment or order invariants. | Regression suite and domain tests. |
| BR-AC-11 | Preview reflects the effective theme and labels unpublished changes. | Admin/browser E2E. |
| BR-AC-12 | Publish/revert cache invalidation is tenant- and revision-safe. | Integration test with cache behavior or a documented equivalent. |
| BR-AC-13 | Generation failure leaves the existing selected logo untouched. | Generation workflow test. |
| BR-AC-14 | Keyboard, focus, labels and responsive layout remain usable on supported viewports. | Automated accessibility plus viewport E2E/manual review. |

No acceptance condition is considered PASS without a recorded test result or review evidence. This specification does not claim these tests already exist.

## 13. Integration and traceability

| Artifact | Relationship | Required follow-up |
|---|---|---|
| `03-DECISIONS/02-MULTITENANCY.md` | `Business` is tenant; Brand belongs to Business. | Preserve as the identity/tenancy direction; do not redefine ownership here. |
| `03-DECISIONS/09-BRANDING.md` | Branding decision record; currently notes `CON-012 OPEN`. | Reconcile its status and link this expanded spec after review. |
| `04-ASIS/10-ASIS-BRANDING.md` or current renamed equivalent | Evidence of current hardcoded/competing tokens. | Re-run code inspection; do not treat historical AS-IS as current without verification. |
| `06-SPECIFICATIONS/CANONICAL/00-WAPSELL-SPEC-GENERAL-v0.4.md` and current canonical baseline | Platform-level requirements and boundaries. | Check for contradictions and add a traceability reference; do not duplicate the whole spec. |
| `06-SPECIFICATIONS/CANONICAL/01-IDENTITY-AND-TENANCY-SPEC.md` | Business ownership, Membership and authorization. | Keep Brand mutations behind the canonical authorization model. |
| `07-DESIGN/ARCHITECTURE/BASELINE/00-R3-ARCHITECTURE-BASELINE-001-490.md` | Modular-monolith direction and Brand boundary. | Derive application/domain/infrastructure responsibilities without adding a new service. |
| `07-DESIGN/CONTRACTS/DOMAIN/` | Domain API and persistence contracts. | Add/reconcile Brand contracts only after actual schema/routes are inspected. |
| `07-DESIGN/INVARIANTS/DERIVED/` | Derived invariants. | Register BR-INV-01…10 and mark their approval/evidence state explicitly. |
| `07-DESIGN/TESTS-EVALS/` | Verification design. | Map BR-AC-01…14 to actual test IDs/files and evidence. |
| `09-TRANSFORMATION/` and `11-IMPLEMENTATION-READINESS/` | Gap closure and implementation sequencing. | Add an explicit Brand reconciliation/readiness task before implementation. |
| Figma file / frontend applications | UX and implementation surfaces. | Verify screen inventory and actual components; design is not proof of implementation. |

Paths must be checked against the active branch before editing linked artifacts; historical path variants are not silently treated as current canonical sources.

## 14. Implementation sequence and gates

1. **Reconcile source of truth:** inspect the current branch, decision register, AS-IS evidence, Prisma schema, brand-related code, asset storage, storefront, admin and Figma. Record the actual files and conflicting token definitions.
2. **Close design decisions:** approve Core tokens, allowed font catalogue, theme schema, asset policy, publication/revision strategy and MVP component variants. Record explicit decisions and resolve `CON-012` through the repository governance process.
3. **Derive contracts and invariants:** define DTO/service boundaries and permission checks from the actual architecture; register invariants and tests with traceability.
4. **Implement backend slice:** persistence/reuse, authorization, validation, asset handling, draft/publish/revert and audit. No migration before schema review and migration/rollback plan.
5. **Implement customer rendering:** canonical token registry and tenant theme resolution; integrate storefront home, product, cart, checkout, order status and conversation surfaces.
6. **Implement Brand Studio:** connect editing, preview and publication to the same contracts and renderer.
7. **Verify:** run unit, integration, cross-tenant isolation, security, accessibility and E2E regression tests; collect screenshots and CI evidence.
8. **Review and delivery:** compare code, schema, routes, docs and tests against this spec; close gaps or mark them explicitly OPEN. Do not claim release readiness solely because the UI looks correct.

## 15. Open decisions — must not be guessed

- Canonical Core palette and resolution of the four historical token sets.
- Actual schema/persistence mapping and whether existing configuration fields should be extended.
- Asset storage provider, accepted formats, limits, sanitization/rasterization and CDN policy.
- Exact route/DTO names and permission identifiers.
- Publication concurrency/versioning and cache invalidation mechanism.
- Supported font catalogue and font licensing.
- Exact responsive breakpoints and performance budgets.
- Whether/when AI logo generation is enabled, provider, cost/usage policy and data handling.
- Public Wapsell attribution policy.
- Domain/custom-domain support and advanced Stage 2/3 entitlements.

Each open decision must have an owner, status and evidence in the decision/readiness records before implementation depends on it.

## 16. Definition of Done for this specification

This document is **integrated and ready for review** when it is stored at the canonical path and cross-linked from the repository's decision/readiness artifacts. The branding domain is **not CLOSED** until:
- `CON-012` is explicitly reconciled under repository governance;
- canonical tokens and unresolved implementation decisions are resolved or formally deferred;
- contracts, invariants and tests are registered with traceability;
- implementation and CI evidence meet the acceptance matrix;
- an independent diff/contract review records no unresolved contradictions affecting the release scope.

**Current status:** specification draft expanded; implementation not asserted; conflict closure and production readiness not claimed.
