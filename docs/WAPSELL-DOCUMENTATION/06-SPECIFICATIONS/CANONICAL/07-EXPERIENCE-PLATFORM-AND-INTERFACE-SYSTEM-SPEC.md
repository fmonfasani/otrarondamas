# Wapsell — Experience Platform & Interface System Specification

**Document ID:** SPEC-EXP-001  
**Version:** 0.1.0  
**Status:** DRAFT — INTEGRATION BASELINE / OWNER REVIEW REQUIRED  
**Last reconciled:** 2026-10-20  
**Domain:** Customer PWA/Web, Business Admin Web, Design System, Branding, Navigation, Cross-interface integration  
**Canonical path:** `docs/WAPSELL-DOCUMENTATION/06-SPECIFICATIONS/CANONICAL/07-EXPERIENCE-PLATFORM-AND-INTERFACE-SYSTEM-SPEC.md`

> **Authority.** This document defines a proposed coherent TO-BE across Wapsell's interfaces. It does not claim the current code conforms, approve implementation, close open decisions (including CON-012), authorize schema/API changes, or replace domain specifications. Requirements marked **PROPOSED** require owner review. Items marked **AS-IS TO VERIFY** require code, schema, browser and test evidence before implementation planning.

## 1. Purpose and product model

Wapsell is one multi-tenant platform with distinct experiences over shared domain capabilities. Otra Ronda Más is the first Business/tenant used for validation, not a separate product architecture.

The product combines:
- a customer-facing commerce experience, accessible as a responsive web app and installable Progressive Web App (PWA);
- a Business operations/admin web app, desktop/tablet oriented but responsive enough for supported narrow viewports;
- a shared platform backend and domain model;
- one Wapsell Design System Core, with tenant Brand configuration applied only where the customer-facing commercial identity should lead;
- cross-cutting messaging and navigation conventions without collapsing the customer and operator experiences into one UI.

The customer experience should feel like shopping with the Business through a conversationally natural interface—not like a generic ERP and not necessarily like a literal WhatsApp clone. Messaging is a commerce interaction surface, not a separate source of prices, stock, orders or permissions.

## 2. Canonical interface topology

```text
                         WAPSELL PLATFORM
                               |
              +----------------+----------------+
              |                                 |
       CUSTOMER EXPERIENCE                BUSINESS ADMIN
       Web + Installable PWA               Web only
              |                                 |
       Storefront / Catalog                Operations workspace
       Search / Product                    Dashboard / Reports
       Cart / Checkout                     Catalog / Pricing
       Orders / Order status                Stock / Purchases
       Customer messaging                  Sales / Orders / Cash
       Account / Preferences                Customers / Suppliers
              |                             Team / Settings
              |                             Brand Studio
              +----------------+----------------+
                               |
                     Shared application/API
                               |
       Identity & Membership / Business context / Authorization
       Commerce / Catalog / Pricing / Inventory / Orders / Payments
       Customer / Messaging / Notifications / Audit / Brand
                               |
                    Persistence and adapters
```

This is a logical topology, not a deployment diagram. It does not mandate micro-frontends, separate backend services, new APIs, or a specific PWA framework.

### 2.1 Experience boundaries

| Concern | Customer Web/PWA | Business Admin Web | Shared platform |
|---|---|---|---|
| Primary user intent | Discover, ask, decide, buy, track | Operate and configure the Business | Enforce domain rules and access |
| Brand expression | Published Business Brand is prominent | Wapsell operational shell; Business context visible; Brand Studio previews customer output | Brand resolution and validation |
| Authentication | Browsing may be public where policy permits; account-required actions follow approved auth rules | Authenticated User + active Business context + valid Membership + permission | Identity, session and authorization |
| Commerce mutation | Customer intent via approved use cases | Authorized staff workflows via approved use cases | Server-authoritative validation and transactions |
| Offline behavior | App shell and explicitly cached public content may remain viewable; mutations never assumed successful offline | No general offline mutation mode in MVP | Authoritative state, idempotency and conflict policy |
| Device strategy | Mobile-first, responsive web and installable PWA | Web-only, desktop-first responsive layouts | Shared contracts and capability rules |

No customer-facing UI may bypass authorization or domain rules. Admin UI must not rely on obscurity or client-side route hiding as its security boundary.

## 3. Experience principles

1. **One platform, two purpose-built experiences.** Shared domain and visual foundations; distinct navigation, information architecture and task flows.
2. **Customer first, brand-forward.** Storefront and customer messaging use the Business's published Brand over the Wapsell Design System Core.
3. **Operator first, clarity-forward.** Admin prioritizes information density, operational status, data integrity, discoverability and safe execution. Tenant Brand configuration must not reduce admin legibility or alter operational meaning.
4. **Design System is the shared contract.** Tokens, component APIs, interaction states and accessibility rules have one canonical source; applications consume supported releases rather than copying styles.
5. **Brand is constrained configuration, not a fork.** A Business selects approved values/assets/variants; it cannot inject arbitrary executable presentation.
6. **Backend owns truth.** Prices, discounts, availability, stock, order/payment state, permissions and Business context are resolved and validated server-side.
7. **Responsive behavior is specified, not improvised.** Components and flows define supported breakpoints, overflow, touch targets, keyboard behavior and degraded states.
8. **Progressive enhancement without false guarantees.** PWA installation, push notifications, background sync, offline writes and browser APIs vary by platform; unsupported capabilities must degrade safely.
9. **Shared semantics, tailored interaction.** A product, order, conversation or status has one domain meaning, even if each interface presents it differently.
10. **No false implementation claims.** This is target-state documentation until verified against code and automated/manual evidence.

## 4. Design System Core and Brand System

### 4.1 Three-layer model

**Layer A — Wapsell Design System Core**
- semantic design tokens: color roles, typography roles, spacing, sizing, elevation, borders, motion, breakpoints and layering;
- accessible primitives and components: buttons, inputs, navigation, dialogs, tables, cards, status indicators, alerts, skeletons, empty states, toasts and loading/error patterns;
- component interaction contracts: keyboard, focus, validation, disabled/loading states, responsive behavior and semantics;
- layout patterns and accessibility requirements;
- versioning, contribution, deprecation and visual regression policy.

**Layer B — Experience patterns**
- Customer: storefront, catalog/product detail, cart/checkout, order tracking, conversational commerce, account and install/offline states.
- Admin: app shell, Business switch/context, navigation, data lists, filters, forms, detail views, destructive-action confirmation, operational status, Brand Studio and reporting.
- Patterns compose Core components; they must not duplicate primitives or define conflicting token sets.

**Layer C — Business Brand configuration**
- public identity: name, logo, optional tagline and approved assets;
- semantic palette and curated typography;
- allow-listed component appearance and storefront section variants;
- customer-facing content and bounded conversational personality;
- draft/published revisions and validated preview/publish/rollback.
- Brand applies to customer-facing surfaces and previews. Admin can expose the active Business identity/context and Brand Studio but keeps a stable operational shell, contrast and meaning.

The Brand System consumes Core tokens and component contracts. It may map approved semantic tokens to tenant values; it may not override accessibility, interaction semantics, authorization cues, state meaning or critical action affordances. No app should define a parallel, incompatible token system.

### 4.2 Token resolution and precedence

Proposed runtime resolution:
1. Core semantic defaults establish safe values and component behavior.
2. The current experience selects its supported layout/pattern.
3. For a customer-facing Business surface, the server-resolved published Brand maps validated tenant values onto allowed semantic token slots.
4. Component state (error, success, disabled, focus, selected, destructive) retains its semantic meaning and accessible treatment.
5. Missing, invalid, stale or unavailable Brand data falls back to the last known valid published revision or deterministic Core defaults; never to arbitrary partial styles.

Draft Brand configuration is visible only to users authorized to edit/preview it. Public customers must not receive drafts through caches, static payloads, guessed identifiers or client-side state.

### 4.3 Source of truth and implementation boundaries

- **AS-IS TO VERIFY:** identify existing UI kit, tokens, fonts, theme providers, CSS conventions, component libraries and duplicated styles in both apps.
- **PROPOSED:** designate one canonical token source and one component ownership boundary; generate/derive app consumption artifacts rather than maintaining manually synchronized copies.
- A package such as `packages/ui-kit` may be the current candidate, but its suitability, actual contents, dependency graph and build boundaries must be verified before committing to it.
- `packages/shared-types` can share types/contracts where appropriate; it must not become a dumping ground for visual components or server domain logic.
- Avoid coupling customer and admin bundles to each other's route trees or runtime-only dependencies.
- No schema, package, framework or component-library choice is authorized solely by this specification.

## 5. Customer Web + PWA

### 5.1 Product definition

The customer web app and PWA are **one customer experience and one application**, not two products with divergent feature sets. The web version is the canonical access path; installation adds a launcher/window experience where supported. Core shopping tasks must remain usable without installing the PWA.

**Mobile-first** is the primary design constraint. Desktop web remains supported. Responsive layouts should adapt composition and density without changing domain semantics or creating a separate desktop-only customer product.

### 5.2 Primary customer journeys

1. **Discover:** open a Business storefront via a stable public route/link, understand identity, browse featured content/categories.
2. **Find:** browse/search/filter catalog; view product detail, options, availability and price sourced from the backend.
3. **Ask:** initiate or continue a conversation with the Business where messaging is enabled; conversation can clarify products and intent.
4. **Build purchase:** select items/options, review cart, validate quantities and delivery/pickup options if supported.
5. **Checkout:** authenticate or provide required customer details according to the approved identity/checkout policy; show final server-calculated totals and supported payment methods.
6. **Confirm:** create/confirm an order only through authorized server use cases; prevent duplicate submissions and communicate pending/failed/succeeded states truthfully.
7. **Track:** inspect current order state, fulfillment information and relevant conversation/notifications.
8. **Return:** reopen the store/order/conversation via valid deep links; preserve context only when access and expiry rules permit.

Exact checkout guest policy, identity linking, payment provider, delivery/pickup options and public order lookup security remain open unless defined by their canonical domain specs. Do not invent endpoints or relax authentication to simplify UX.

### 5.3 Customer navigation model

Proposed primary information architecture:
- Store/Home
- Catalog/Search
- Cart
- Messages/Conversations
- Orders
- Account/Profile (where authenticated)

On small screens, use a compact navigation pattern with clear selected state and safe-area support; avoid more top-level items than fit. Product detail, checkout, conversation and order tracking may use focused task layouts that reduce persistent navigation where distraction or accidental loss is risky. Desktop can use wider navigation and split panes where useful, but must retain the same journey semantics.

Navigation labels, route paths, badge counts and visible actions must be derived from actual feature availability and permission/identity state. Do not render dead links or imply unsupported capability. Back navigation should preserve meaningful search/filter/cart context where safe.

### 5.4 PWA capabilities and boundaries

**MVP target:**
- installable manifest with app name, icons, theme/background colors and appropriate display behavior;
- secure-context requirements and installability checks;
- service worker lifecycle managed without silently leaving a stale application version indefinitely;
- app shell caching and narrowly scoped cache policies;
- network-aware loading, offline notice, retry and update-available messaging;
- responsive touch interaction, safe-area handling and accessible focus;
- deep-link behavior for product, conversation and order routes, subject to authorization;
- installation is optional and must not block web use.

**Offline policy:**
- Public, non-sensitive app shell and explicitly approved public catalog/Brand assets may be cached with freshness rules.
- Do not cache private customer data, conversations, tokens, payment data or sensitive order data in a general public cache.
- Cart persistence, if supported, must be explicit, bounded, validated on reconnect and never treated as a stock reservation.
- No offline purchase, payment, stock reservation, order confirmation or message delivery may be shown as successful until the server confirms it.
- Background sync, push notifications, periodic sync and offline mutation queues are **NOT ASSUMED** for MVP. Each requires a capability/security/retry specification and browser support validation.
- Logout, account switch, Business/store switch where applicable, revocation and data expiry must invalidate private client state and caches appropriately.

### 5.5 Customer states

Each critical route defines loading, populated, empty, error, offline, unauthorized, not-found, stale-data and retry behavior as applicable. Checkout additionally defines validation, submitting, pending confirmation, confirmed and failed/recoverable outcomes. Conversation defines sending, sent/acknowledged/delivered/read states only to the extent supported by the actual messaging contract; never fabricate delivery receipts.

## 6. Business Admin — Web only

### 6.1 Product definition

Admin is a dedicated authenticated web application for authorized Business members. It is **not a PWA product requirement** and does not need an installable manifest, service worker, push, or offline mutation mode for MVP. It should remain responsive and accessible, but its information architecture is optimized for operational work, primarily desktop/tablet.

### 6.2 Primary information architecture

The final navigation must match implemented and approved modules. Proposed grouping:
- **Overview:** operational dashboard and actionable exceptions.
- **Sales & Orders:** sales, orders, payment/fulfillment states and authorized corrections.
- **Messaging:** conversations and sales context, with actions routed through domain use cases.
- **Catalog & Promotions:** products, categories, price/promotion configuration.
- **Stock & Purchases:** inventory, suppliers, purchasing and stock movements.
- **Customers:** Business-scoped customer records and history.
- **Cash & Finance:** cash operations and reports within approved domain scope.
- **Reports:** filters, exports and reconciliation where supported.
- **Brand Studio:** identity/assets, visual direction, storefront sections, conversation personality, preview, validation and publish.
- **Business Settings & Team:** Business settings, members, roles/permissions and profile, only as authorized and supported.

These are conceptual groups, not a claim that all modules are complete. Hide or disable only according to product policy and authorization state; backend authorization remains mandatory. Do not show an operational module as released merely because it appears in this proposed map.

### 6.3 Admin shell and workflows

- Stable Wapsell operational shell, predictable navigation, page title/breadcrumb/context, Business identity, current user and authorized actions.
- If a User belongs to multiple Businesses, the active Business context must be explicit and switching must reset/refetch Business-scoped data. The exact switch mechanism remains open.
- Dense tables/lists support search, filters, sorting, pagination/virtualization as justified, empty/error states and responsive overflow.
- Forms identify required fields, validation rules, unsaved changes and save outcome.
- Destructive or financially significant operations require explicit confirmation and idempotent/traceable backend handling where applicable.
- Long-running operations show progress and recovery paths without implying success prematurely.
- Avoid hiding essential information behind hover-only interactions; support keyboard and assistive technologies.
- Brand Studio previews the real customer-facing composition using the same Core components and published/draft resolution rules, not a separately hand-coded mockup.

### 6.4 Authorization and data boundaries

Every protected operation requires authenticated User, target Business, active valid Membership and permission. UI visibility is a usability layer only. Every query, mutation, cache key, websocket/conversation subscription, export and deep link must be scoped and re-authorized server-side. Switching Business invalidates or partitions all prior Business-scoped client data. Customer data and platform User identity remain distinct as defined in Identity & Tenancy spec.

## 7. Shared behavior and cross-interface contracts

### 7.1 Shared domain, not shared screen

Both apps may reference the same product, order, customer, conversation and Brand concepts, but their views/actions differ by actor and use case. Share types, validation metadata and domain semantics where useful; do not force identical navigation or reuse a customer interaction component as an admin workflow when their tasks differ.

### 7.2 Messaging as a transversal capability

Messaging may appear in customer and admin experiences:
- Customer uses it to ask, decide, submit intent and review relevant order context.
- Staff uses it to respond, inspect allowed commercial context and invoke approved workflows.
- Both see the same conversation identity and event ordering, subject to access.
- A message is not itself proof of a sale, payment, stock reservation, delivery or completed order.
- Sales/order actions initiated in a conversation call the same application use cases as other surfaces; no duplicate pricing or inventory rules.
- Real-time delivery, read receipts, reconnection, retention, attachments, notifications and cross-device sync must follow the messaging contracts and be tested separately.

### 7.3 API and state ownership

- Interfaces consume documented application/API contracts; they do not read persistence directly.
- Server remains authoritative for Business context, authorization, published Brand, catalog availability, prices, promotions, cart validation, stock, orders, payment status and role permissions.
- Client-side calculations may be provisional previews only and must be reconciled with server responses.
- Mutation UX distinguishes intent, in-flight, accepted/pending, confirmed and failed states.
- Retries must not duplicate orders, payments, stock movements or messages; exact idempotency contracts belong to the relevant domain specification.
- No endpoint, DTO, event name, persistence field or migration is introduced by inference from this document.

### 7.4 Shared shell and package boundaries

Proposed ownership:
- **Design tokens/theme contract:** canonical semantic tokens and theme-resolution logic.
- **Core UI primitives:** accessible, experience-neutral components.
- **Experience patterns:** customer and admin layouts and task flows in their own app boundaries.
- **Brand configuration/renderer:** validated Business Brand resolution and customer preview.
- **Shared types/contracts:** only genuinely shared contracts and schemas.
- **Domain/application services:** backend use cases and invariants.

Current package names and dependency directions are **AS-IS TO VERIFY**. A shared package must not import app-specific routes, business persistence, secrets or server-only modules into browser bundles. Build/lint/type checks should enforce allowed dependency directions.

## 8. Responsive, accessibility and visual quality

- Target WCAG 2.2 AA as the proposed baseline, subject to owner confirmation and validation.
- Semantic HTML, keyboard operation, visible focus, logical focus order, accessible names, status announcements and error association.
- Contrast checked after tenant Brand token resolution, including text, controls, focus, disabled and status colors. Reject or auto-correct invalid combinations with transparent feedback; never publish unreadable themes.
- Respect reduced-motion preferences and avoid conveying state by color alone.
- Touch targets and spacing appropriate for mobile customer flows; keyboard and pointer operation for admin.
- Layouts must handle long translated/localized content, large text, zoom, empty lists, narrow screens, portrait/landscape and content overflow.
- Loading skeletons do not replace accessible status; dialogs manage focus and restore it on close.
- Visual regression snapshots should cover Core components, at least one default theme and representative tenant Brand themes, plus narrow/wide viewports.
- Accessibility automation supplements but does not replace keyboard and assistive-technology review.

## 9. Performance, cache and release consistency

- Define performance budgets from measured baselines; do not invent a current score.
- Split bundles by application/route and defer noncritical features.
- Optimize image formats/sizes and use responsive assets; avoid loading admin-only code in the customer app or vice versa.
- Public Brand/config/catalog cache keys include the correct Business identity and published revision. Private data cache keys also include authenticated identity and Business context as applicable.
- Publishing a Brand updates the authoritative revision atomically; clients must not combine tokens/assets from different revisions.
- Service worker update policy must avoid broken mixed-version assets and must provide recoverable refresh behavior.
- API/schema compatibility, UI package version compatibility and cache invalidation are part of release validation.
- Telemetry must avoid leaking message contents, credentials, payment data or personal information; analytics/consent/retention policy remains to be specified.

## 10. Security and privacy

- Never trust client-provided Business IDs, roles, prices, permissions or Brand ownership.
- Tenant scoping is enforced at backend use-case/data-access boundaries, not only in navigation.
- Validate and normalize uploaded assets; enforce file type/size limits, safe image processing, storage access policy and malware/content handling as required.
- No arbitrary tenant CSS/HTML/JS, remote executable theme code or untrusted font execution.
- Avoid storing secrets or payment data in web storage, service-worker caches, logs or analytics.
- Prevent cross-tenant cache leakage, IDOR, unsafe public order links and unauthorized conversation subscriptions.
- Logout, revocation, membership deactivation and Business switching must clear or revalidate cached/private state.
- CSP, cookie/session strategy, CSRF/XSS protections, OAuth redirect rules and token storage must be specified against the actual stack; this document does not choose them.
- Audit sensitive admin actions, Brand publication and material commerce changes according to the audit policy.

## 11. Proposed invariants

- **EXP-INV-01:** Customer web and installable PWA share one customer product behavior and domain contract.
- **EXP-INV-02:** Admin is web-only for MVP; no PWA/offline-admin capability is implied.
- **EXP-INV-03:** Customer and admin interfaces share domain truth but have distinct task-oriented information architectures.
- **EXP-INV-04:** One canonical Design System Core owns tokens, primitives, accessibility and interaction semantics.
- **EXP-INV-05:** Business Brand is validated configuration over Core, not a code/theme fork.
- **EXP-INV-06:** Published Brand, never a draft, is used for public customer experience.
- **EXP-INV-07:** Invalid/unavailable Brand data falls back safely without blocking core shopping.
- **EXP-INV-08:** Brand cannot alter authorization, pricing, stock, payment, order or tenant isolation semantics.
- **EXP-INV-09:** Backend authorizes every protected operation independently of client route/visibility.
- **EXP-INV-10:** Business-scoped state/cache/subscriptions are partitioned and revalidated on context change.
- **EXP-INV-11:** Offline UI never reports unconfirmed commerce or messaging mutations as successful.
- **EXP-INV-12:** Messaging actions use shared application/domain use cases and are not a second source of commerce truth.
- **EXP-INV-13:** Critical journeys expose loading, empty, error, retry and final server-confirmed states.
- **EXP-INV-14:** All tenant themes preserve minimum accessibility and critical-action semantics.
- **EXP-INV-15:** No endpoint, schema or technical framework is considered approved solely because it appears in this specification.

## 12. Proposed acceptance criteria

1. A customer can complete supported browsing and shopping flows on mobile web without installing the PWA.
2. On supported browsers, the customer app meets agreed installability requirements and launches to the same application/routes.
3. An offline or failed mutation is visibly pending/failed and never presented as a confirmed order, payment or sent message without server evidence.
4. The customer app renders the active Business's published Brand, with safe fallback on missing/invalid configuration.
5. Brand draft changes are visible only in authorized preview and cannot leak to public requests/caches.
6. Admin operations require an authorized Business context; changing Business cannot retain data from the previous context.
7. Admin remains usable without PWA installation and does not claim offline mutations.
8. Customer and admin consume the same semantic token/component source without duplicating independent token catalogs.
9. Theme validation catches or rejects combinations that fail the agreed contrast/accessibility rules.
10. Product, order and conversation states are semantically consistent across customer/admin surfaces, while actions remain actor-appropriate.
11. Messaging-triggered commerce operations use the same server-side validation and transaction boundaries as other entry points.
12. Core customer/admin routes cover loading, empty, error, unauthorized/not-found and recovery states as applicable.
13. Automated tests cover theme resolution, Business-context cache isolation, navigation guards as UX, API authorization, responsive layouts and critical journeys.
14. Browser/PWA behavior is tested on the agreed support matrix; unsupported APIs degrade without blocking web use.
15. No acceptance criterion is marked complete without linked code/test/browser evidence.

## 13. Traceability and dependent specifications

This spec depends on and must remain aligned with:
- `06-SPECIFICATIONS/CANONICAL/01-IDENTITY-AND-TENANCY-SPEC.md` — User, Business, Membership, Customer and authorization;
- `06-SPECIFICATIONS/CANONICAL/06-BRANDING-AND-EXPERIENCE-SPEC.md` — Business Brand, Brand Studio, draft/publish/revert and customer brand rendering;
- the R3 Architecture baseline — modular monolith and domain boundaries;
- Messaging, Catalog, Cart/Orders, Pricing/Promotions, Inventory, Payments, Customer and Audit specifications/contracts when located and reconciled;
- R4 contracts, R5 invariants and R6 tests/evals — to be derived after review, not inferred as already present;
- AS-IS inventory for `apps/tienda-online`, `apps/pos-admin`, `packages/ui-kit`, `packages/shared-types`, API routes, auth, PWA manifest/service worker and current test setup.

Before implementation, produce a reconciliation matrix with columns: requirement/invariant, current code location, existing contract, existing tests, gap, decision needed, planned change, verification evidence. Record each missing or conflicting source rather than silently filling it.

## 14. Open decisions and evidence required

- **OPEN:** approve this interface topology and confirm exact names/routes of both apps.
- **OPEN:** verify actual app/package structure, component library, token sources and whether `packages/ui-kit` is canonical or only a candidate.
- **OPEN:** decide customer guest/authenticated checkout and Customer↔User association in alignment with Identity/Tenancy.
- **OPEN:** define supported browser/device matrix, PWA installability target, cache TTL/revalidation and offline data allowlist.
- **OPEN:** decide whether push notifications are in MVP; not assumed here.
- **OPEN:** define customer navigation details, URL/deep-link format and order/conversation access policy.
- **OPEN:** define final admin module visibility against actual implementation and approved MVP scope.
- **OPEN:** resolve Brand revision/cache invalidation semantics and CON-012 through the established decision process.
- **OPEN:** agree WCAG target, performance budgets, telemetry/privacy policy and visual regression/browser matrix.
- **AS-IS TO VERIFY:** current route coverage, PWA configuration, service worker, manifest, responsive breakpoints, design tokens, shared component imports, theme implementation, API authorization and E2E evidence.

## 15. Implementation-readiness sequence

1. Inventory current apps, routes, shared packages, tokens, theme providers, Brand models, PWA configuration and tests.
2. Build the AS-IS → TO-BE reconciliation matrix; identify duplicates, conflicting sources and missing contracts.
3. Review/approve this spec and the Branding spec; reconcile decision register and CON-012.
4. Agree the canonical token taxonomy and Core component ownership; map existing components before replacing anything.
5. Derive contracts and invariants for theme resolution, Business context, cache partitioning, PWA states, navigation and shared messaging/commerce actions.
6. Define tests/evals: unit, component/accessibility, API authorization, integration, E2E, visual regression, PWA/browser matrix and tenant-isolation tests.
7. Sequence implementation by dependency and risk; preserve existing working flows and avoid broad redesign before route/API traceability is known.
8. Implement only through approved tasks; validate, review diffs and link evidence before closing each criterion.

**Definition of Done for this specification:** owner-reviewed scope; explicit decision status; AS-IS evidence linked; conflicts recorded; downstream contracts/invariants/tests traced; no false claim of implementation; open blockers retained in the register. This document alone does not authorize implementation or close any gate.
