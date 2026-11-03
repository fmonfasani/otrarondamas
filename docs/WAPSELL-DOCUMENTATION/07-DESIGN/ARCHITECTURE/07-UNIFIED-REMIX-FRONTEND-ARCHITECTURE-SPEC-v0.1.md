# WAPSELL — Unified Remix Frontend Architecture & Migration Specification

**Document ID:** ARCH-FE-001  
**Version:** 0.1.0  
**Date:** 2026-11-03  
**Status:** DRAFT — OWNER-DIRECTED ARCHITECTURE / TECHNICAL REVIEW REQUIRED  
**Scope:** Consolidation of Customer, Business Operations and Platform Admin experiences into one Remix frontend, retaining NestJS as the only backend.  
**Target repository:** \`fmonfasani/otrarondamas\`

> **Owner direction recorded 2026-11-03:** consolidate the Wapsell frontend into one Remix application and retain NestJS as the only backend. Migration must be progressive; existing applications remain intact until their capabilities are migrated and verified.
>
> **Document status:** this specification records the selected direction and defines the proposed target and migration controls. It does not claim that the target is implemented, does not silently amend canonical product decisions, and does not authorize database/schema changes, legacy deletion, production cutover or deployment. Technical details explicitly marked OPEN require resolution in the relevant contract/design gate before the affected implementation slice.

---

## 1. Executive decision

Wapsell will converge on:

- **One frontend application:** Remix, React and TypeScript.
- **One backend application:** NestJS, exposing the authoritative API and application/domain capabilities.
- **One persistence authority:** PostgreSQL accessed by NestJS through the existing Prisma layer.
- **One shared frontend Design System Core:** reusable tokens, primitives, components and experience patterns.
- **Three isolated experience areas within the same frontend application:**
  1. Customer Experience.
  2. Business Operations.
  3. Wapsell Platform Administration.

“One frontend” means one frontend codebase, dependency graph, build/test pipeline and deployable application. It does **not** mean one undifferentiated UI, one navigation tree, shared authorization, or unrestricted reuse of layouts between different actors.

The target is a modular monolith on the backend and a modular, route-segmented frontend. Micro-frontends, a second API/backend, direct frontend database access and a simultaneous framework rewrite are out of scope.

### 1.1 Architectural decision boundary

| Concern | Target decision | Status |
|---|---|---|
| Frontend framework | Remix v2 as the migration baseline | Selected direction; version upgrade deferred |
| Frontend topology | One Remix application with three isolated experience areas | Owner-directed |
| Backend | Existing NestJS API remains the only backend | Owner-directed |
| Persistence | Existing PostgreSQL + Prisma through NestJS only | Preserve; schema changes out of scope |
| Backend architecture | Modular monolith; no microservices migration | Existing architectural direction |
| Design System | One Wapsell Core, with Business Brand applied to customer-facing surfaces | Existing product direction; detailed implementation needs reconciliation |
| Customer PWA | Progressive enhancement of the Customer Experience | Target; capability-specific details remain open |
| Business Admin | Authenticated Business Context and Membership/Permission authorization | Existing approved security direction |
| Platform Admin | Separate privileged experience and server-side authorization | Existing platform direction; detailed permissions remain open |
| Legacy frontends | Preserve during migration; retire only after verified parity and cutover | Mandatory migration constraint |

### 1.2 Framework version policy

The current Remix application declares \`@remix-run/*\` version ranges beginning at \`^2.15.0\` and React \`^18.3.1\`. The migration will stabilize and validate the existing Remix v2 baseline first.

Do not combine this consolidation with an upgrade to React Router v7 / a different framework mode. Evaluate that upgrade separately after the unified application is stable, with its own compatibility assessment, migration plan and acceptance gate.

---

## 2. Authority and relationship to existing documentation

This specification is subordinate to Owner Rulings and the canonical Decision Register. It must be read together with:

- \`06-SPECIFICATIONS/CANONICAL/07-EXPERIENCE-PLATFORM-AND-INTERFACE-SYSTEM-SPEC.md\` — logical Customer/Admin experience boundaries, Design System Core, Brand and PWA principles.
- \`06-SPECIFICATIONS/CANONICAL/06-BRANDING-AND-EXPERIENCE-SPEC.md\` — Business Brand ownership and customer-facing presentation.
- \`07-DESIGN/ARCHITECTURE/06-BLOCK-1-ARCHITECTURE-SPEC-v0.1.md\` — modular-monolith, domain ownership, Business isolation and application boundaries.
- \`07-DESIGN/CONTRACTS/DOMAIN/08-R8-ARCH-003-AUTH-SESSION-BUSINESS-CONTEXT-CONTRACT-v0.1.md\` — authentication, session and server-established Business Context.
- \`07-DESIGN/CONTRACTS/DOMAIN/09-R8-ARCH-002-TENANT-ISOLATION-CONTRACT-v0.1.md\` — tenant-isolation obligations.
- \`03-DECISIONS/48-AUTH-TENANCY-TECHNICAL-DECISION-CLOSURE-2026-10-24.md\` — Owner-accepted security directions T-01 through T-10.
- Current code, tests, migrations and execution evidence — authority for what is actually implemented.

The existing Experience Platform specification already describes two distinct logical experiences (Customer and Business Admin) over shared domain capabilities. This document adds a **single-application implementation topology** and a third, privileged Platform Admin area. It does not collapse the experience boundaries or change product/domain ownership.

If a conflict is found, record it and reconcile it against the applicable Owner Ruling. Do not silently overwrite canonical requirements or create a new product decision by implementation.

### 2.1 Evidence labels used here

- **VERIFIED BY CODE:** confirmed by reading the current \`main\` source.
- **DOCUMENTED:** described by an existing specification or decision.
- **PROPOSED:** target behavior or technical arrangement defined by this draft.
- **OPEN:** insufficient authority or evidence to close the detail.
- **NOT DETERMINABLE:** cannot be established from the inspected source alone.

A route, component, package manifest or design document is not proof of a complete production-ready feature.

---

## 3. AS-IS frontend inventory

The following inventory was read from the repository's current \`main\` branch on 2026-11-03. It is a source inventory, not a feature-parity assessment.

| Application | Evidence found | Migration disposition |
|---|---|---|
| \`apps/wapsell-remix/\` | Remix v2 application. Routes include locale-based login/register, dashboard, businesses, products, orders, platform-admin, health and stream endpoints. Contains auth/tenant services, contexts, hooks and dashboard/order/product components. The root route includes a customer catalog/cart/checkout implementation connected to NestJS storefront endpoints. | **TARGET FOUNDATION — EXTEND / RECONCILE** |
| \`apps/pos-admin/\` | React + Vite operational panel. Routes/features include authentication, dashboard, POS/sales, sale details/receipt, orders, inventory, purchases, pricing, customers, loyalty, messaging, cash, profile; reports/settings contain placeholders. | **MIGRATE BY CAPABILITY — PRESERVE UNTIL PARITY** |
| \`apps/tienda-online/\` | React + Vite customer store. Feature folders include authentication, cart, catalog, checkout and order tracking; route wiring includes login, registration, wholesale invitation activation, account and customer file/legajo. | **MIGRATE BY CUSTOMER JOURNEY — PRESERVE UNTIL PARITY** |
| \`apps/wapsell-frontend/\` | Next.js application manifest declares Next.js 16 and React 19, with localized application routes and separate frontend dependencies. Its current production use, completeness and overlap with Remix are not established by this inventory. | **DISCOVER, CLASSIFY, THEN MIGRATE OR EXPLICITLY EXCLUDE** |
| \`packages/ui-kit/\` | Shared UI package exists; its component completeness and actual adoption across the three frontends require assessment. | **ASSESS AND CONSOLIDATE** |
| \`packages/shared-types/\` | Shared TypeScript package exists. API/domain contract ownership and current adoption require assessment. | **PRESERVE; RECONCILE CONTRACTS** |

### 3.1 Verified implementation gaps and risks in the current Remix foundation

The following are specific code-level findings and must be treated as migration work, not as accepted target behavior:

1. The root npm workspaces currently include \`apps/api\` and \`packages/*\`; \`apps/wapsell-remix\` is not a root workspace.
2. The Remix package is named \`wapsell-remix\`, not a scoped \`@otrarondamas/*\` workspace name. Docker and CI commands must use the actual package identity or deliberately standardize it as part of the foundation slice.
3. Remix auth stores a JWT and Empresa-related values in its cookie session. The tenant service reads \`empresaId\` from that session and forwards \`X-Empresa-Id\` / \`X-User-Id\` headers. This must be reconciled with the current approved rule that Business Context is established and validated server-side against current ACTIVE Membership and cannot be overridden by client-controlled identifiers.
4. The current \`requireAuth\` implementation validates the JWT but does not, by itself, prove current Membership, effective Role/Permission or revocation state for every protected operation.
5. The current session configuration has a development fallback secret. Production must fail closed when required secrets are absent; development defaults must never be accepted in production.
6. Some dashboard and order loaders return mock/fallback data when the API is unavailable. Production UI must not represent fabricated values as live business data.
7. Server-side API calls use an environment variable named \`VITE_API_URL\` in places. Server-only API configuration must be clearly separated from variables intentionally exposed to browser bundles.
8. The current root CI and Remix-specific CI have separate responsibilities. Their triggers, dependency installation, validation coverage and deployment behavior need to be reconciled into one intentional pipeline.
9. The Remix application currently contains a Platform Admin route, but a frontend route is not evidence of backend authorization. Access must be enforced by NestJS and verified negatively.
10. The root README's stated application inventory and current source inventory are not fully aligned. Documentation must be reconciled after the capability inventory; this draft does not rewrite historical evidence.

### 3.2 Verified route inventory

The following route inventory is based on the route registration and directory structure inspected on current \`main\`. It records source paths and route intent only; it does not assert endpoint completeness or production usage.

#### Remix foundation — \`apps/wapsell-remix/app/routes/\`

| Existing route file | Current capability indicated by source | Target area | Initial disposition |
|---|---|---|---|
| \`_index.tsx\` | Store entry, catalog fetch, local cart state, checkout/order submission | Customer | EXTEND / reconcile against Tienda Online |
| \`$lang.tsx\` | Locale/layout boundary | Shared experience infrastructure | PRESERVE / reconcile |
| \`$lang.auth.tsx\` | Auth route layout | Shared route infrastructure | ADAPT |
| \`$lang.auth.login.tsx\` | Staff login and session creation | Business | ADAPT; security contract required |
| \`$lang.auth.register.tsx\` | Registration | Actor scope must be confirmed | RECONCILE |
| \`$lang.dashboard._index.tsx\` | Staff dashboard/KPIs/recent orders; currently contains mock fallback behavior | Business | ADAPT; remove production mock fallback |
| \`$lang.dashboard.negocios.tsx\` | Business list/selection surface | Business / Identity | RECONCILE with Membership and Business Context |
| \`$lang.dashboard.pedidos.tsx\` | Orders list | Business | ADAPT; remove mock fallback |
| \`$lang.dashboard.pedidos.$id.tsx\` | Order detail | Business | VERIFY parity and API contract |
| \`$lang.dashboard.productos.tsx\` | Product management | Business | VERIFY parity |
| \`$lang.platform-admin.tsx\` | Platform overview | Platform Admin | ADAPT; backend platform authorization required |
| \`api.health.ts\` | Frontend health route | Operations | PRESERVE if used by deployment healthchecks |
| \`api.stream.ts\` | Stream/SSE endpoint | Realtime integration | RECONCILE ownership and use |

#### POS Admin — \`apps/pos-admin/src/App.tsx\`

| Existing route | Capability | Target area | Initial disposition |
|---|---|---|---|
| \`/login\`, \`/auth/google/callback\` | Staff authentication / OAuth callback | Business | ADAPT to unified session design |
| \`/\` | Dashboard | Business | MERGE with Remix dashboard after KPI parity |
| \`/ventas\`, \`/ventas/nueva\`, \`/ventas/:id\` | Sales list, new sale/POS, sale detail | Business | MIGRATE; critical operational journey |
| \`/ventas/:id/comprobante\` | Printable receipt | Business | MIGRATE with print regression test |
| \`/orders\` | Orders | Business | MERGE with Remix orders after parity |
| \`/inventory\` | Inventory | Business | MIGRATE |
| \`/compras\` | Purchases | Business | MIGRATE |
| \`/precios\` | Pricing | Business | MIGRATE |
| \`/customers\` | Customers | Business | MIGRATE |
| \`/fidelizacion\` | Loyalty | Business | MIGRATE |
| \`/messaging\` | Messaging | Business | MIGRATE only against approved Messaging contracts |
| \`/cash\` | Cash operations | Business | MIGRATE; preserve financial invariants |
| \`/profile\` | Staff profile | Business | MIGRATE / reconcile with global User |
| \`/reports\` | Placeholder ("en desarrollo") | Business | NOT IMPLEMENTED until backend use case exists |
| \`/settings\` | Placeholder ("en desarrollo") | Business | NOT IMPLEMENTED until scope/API/permissions exist |

#### Tienda Online — \`apps/tienda-online/src/App.tsx\`

| Existing route | Capability | Target area | Initial disposition |
|---|---|---|---|
| \`/\` | Authenticated catalog | Customer | MERGE with Remix storefront; reconcile public/auth policy |
| \`/checkout\` | Checkout | Customer | MIGRATE; server-authoritative validation |
| \`/pedido/:id\` | Public order tracking | Customer | MIGRATE; verify token/ID access policy |
| \`/login\`, \`/registro\` | Customer login/registration | Customer | MIGRATE; distinct from staff auth |
| \`/activar-invitacion-mayorista\` | Wholesale invitation activation | Customer | MIGRATE if still required by current requirements |
| \`/mi-cuenta\` | Customer account | Customer | MIGRATE |
| \`/mi-cuenta/legajo\` | Customer file/document workflow | Customer | MIGRATE only with privacy and document-access controls |

#### Next.js frontend — \`apps/wapsell-frontend/app/\`

| Existing route group | Capability indicated by source tree | Target area | Initial disposition |
|---|---|---|---|
| \`[locale]/page.tsx\` | Localized entry/landing | Customer or shared public platform surface | DISCOVER actual use and required behavior |
| \`[locale]/auth/login\` | Login | Actor scope must be confirmed | RECONCILE; do not merge blindly |
| \`[locale]/auth/signup\` | Signup | Actor scope must be confirmed | RECONCILE |
| \`[locale]/auth/recover\` | Account recovery | Actor scope must be confirmed | RECONCILE |
| \`[locale]/dashboard\` | Dashboard | Business or platform; must be confirmed | DISCOVER |
| \`[locale]/negocios\`, \`crear\`, \`[id]\` | Business listing/create/detail | Business / Platform | RECONCILE with Business lifecycle and Platform Admin boundaries |
| \`api/auth/*\` | Next server route proxies for login, me, switch-empresa and tenant listing | Server adapter | MIGRATE only after endpoint and security contract review |
| \`api/dashboard/*\` | Next server route proxies for KPI, top products and trends | Server adapter | MIGRATE only after endpoint and Permission mapping |

The Next.js tree is present in the repository, but its production use, completeness and ownership are **NOT DETERMINABLE** from route presence alone. Phase 0 must establish whether any of these routes are used by a live domain, customer journey or internal workflow.

### 3.3 Initial capability consolidation map

| Capability | Existing source(s) | Remix status from inspected code | Migration rule |
|---|---|---|---|
| Customer storefront/catalog | Remix root route; Tienda Online | PARTIAL in Remix | Reconcile behavior and choose one canonical customer flow |
| Cart/checkout | Remix root route; Tienda Online | PARTIAL in Remix | Preserve server validation and idempotency |
| Customer identity/account | Tienda Online; Next auth routes | NOT PROVEN complete in Remix | Separate Customer identity from staff User |
| Staff authentication | Remix auth; POS Admin auth; Next auth proxies | PARTIAL / competing implementations | One session design; NestJS remains authority |
| Business context/switch | Remix tenant service; Next switch-empresa proxy; POS selector | INCONSISTENT / SECURITY RECONCILIATION REQUIRED | Server-validated Membership and context |
| Dashboard | Remix dashboard; POS Admin; Next dashboard | PARTIAL / overlapping | One Business dashboard based on verified APIs |
| Orders | Remix list/detail; POS Admin; Tienda tracking | PARTIAL across experiences | One domain contract, actor-specific views |
| Product/catalog management | Remix products; POS Admin; Tienda catalog | PARTIAL across experiences | Shared domain data; separate staff/customer UI |
| Sales/POS/receipt | POS Admin | NOT PRESENT as verified complete Remix workflow | Migrate without changing Sales domain rules |
| Inventory | POS Admin | NOT PRESENT as verified complete Remix workflow | Migrate with stock invariants |
| Purchases/suppliers | POS Admin | NOT PRESENT as verified complete Remix workflow | Migrate with purchasing contracts |
| Pricing | POS Admin | NOT PRESENT as verified complete Remix workflow | Backend owns price calculation |
| Customers/loyalty | POS Admin; Tienda customer account | PARTIAL / distinct actor semantics | Preserve Customer vs User distinction |
| Cash | POS Admin | NOT PRESENT as verified complete Remix workflow | Preserve cash invariants and audit |
| Messaging | POS Admin; Remix realtime scaffolding | NOT PROVEN end-to-end in Remix | Migrate only against approved Messaging contracts |
| Platform Admin | Remix overview; Next Business routes | INITIAL SLICE / incomplete | Separate platform privilege and cross-tenant audit |
| Reports/settings | POS Admin placeholders | NOT IMPLEMENTED | Do not fabricate completion |

### 3.4 Inventory rule

Before migrating any feature, create a route/use-case inventory with at least:

- source application and route;
- actor and experience area;
- user outcome / business capability;
- source components and state management;
- NestJS endpoint(s) and DTOs actually used;
- authentication, Business Context and Permission requirements;
- domain invariants and side effects;
- current tests and known gaps;
- target Remix route/module;
- parity criteria and evidence;
- disposition: PRESERVE, ADAPT, REPLACE, MISSING or NOT DETERMINABLE.

No application may be retired based only on the existence of a similarly named Remix route.

---

## 4. Target system architecture

### 4.1 Logical topology

\`\`\`text
                         WAPSELL PLATFORM
                                |
                   ONE REMIX FRONTEND APP
                                |
          +---------------------+----------------------+
          |                     |                      |
   CUSTOMER EXPERIENCE   BUSINESS OPERATIONS    PLATFORM ADMIN
   Web + installable PWA  Authenticated staff    Wapsell internal
   Brand-forward          Business-contextual    Privileged scope
          |                     |                      |
          +---------------------+----------------------+
                                |
                     Shared UI / Design System
                     Shared route and API adapters
                     Experience-specific modules
                                |
                    Remix loaders / actions / BFF
                  (orchestration and safe adaptation)
                                |
                     ONE NESTJS BACKEND API
                                |
       Identity / Membership / Authorization / Business Context
       Customer / Catalog / Commerce / Orders / Sales / Payments
       Inventory / Purchases / Cash / Messaging / Brand / Audit
                                |
                     Prisma persistence layer
                                |
                           PostgreSQL
                                |
              Redis / external providers / integrations
              only where already required and approved
\`\`\`

This is a logical architecture. It does not require microservices, multiple frontend deployments, direct database access from Remix, or a new backend.

### 4.2 Single frontend application, three experience boundaries

| Experience | Primary actors | Main capabilities | Security context |
|---|---|---|---|
| Customer | Anonymous visitor where policy permits; authenticated Customer | Landing/storefront, catalog, product detail, cart, checkout, order confirmation/tracking, account, customer messaging | Public access only for explicitly public operations; customer identity/session for protected customer operations |
| Business Operations | Owner, Admin, Seller and other authorized staff | Dashboard, sales/POS, orders, catalog/products, pricing, inventory, purchases, customers, loyalty, cash, messaging, profile/settings and future reports | Authenticated global User + active Business Context + ACTIVE Membership + effective Permission |
| Platform Admin | Authorized Wapsell internal operator | Business/platform overview, platform-level administration and explicitly authorized cross-Business operations | Separate platform-level authorization; never inferred from a Business role or ordinary authenticated session |

These are logical route/layout/module boundaries inside the same Remix application. They are not separate frontends or micro-frontends.

### 4.3 Frontend responsibility

Remix owns:

- route composition and layouts;
- server-side loaders and actions;
- form handling and experience-level orchestration;
- server-to-NestJS API adaptation;
- rendering, accessibility and responsive behavior;
- client-side transient interaction state;
- PWA shell and explicitly approved cache behavior;
- presentation of server-authoritative results and errors.

Remix does **not** own:

- commercial or financial rules;
- authoritative prices, discounts or stock;
- order, sale, payment or cash state machines;
- tenant authorization decisions;
- permission evaluation;
- authoritative Business Context;
- direct Prisma/database access;
- independent persistence of domain entities;
- a second set of backend business services.

A Remix loader/action may orchestrate calls to NestJS, validate transport-level input and map API responses to UI-friendly representations. It must not reproduce or bypass NestJS domain rules.

### 4.4 NestJS responsibility

NestJS remains the only backend and the authoritative owner of:

- authentication and current server-side session validation;
- global User identity and Customer distinction;
- Business, Membership and active Business Context;
- Role/Permission authorization;
- tenant isolation for every protected read/write;
- domain validation, transactions and state transitions;
- API contracts and resource DTOs;
- persistence through Prisma/PostgreSQL;
- integration adapters and server-side audit events.

The frontend must consume existing NestJS endpoints where they satisfy the use case. Any missing or incompatible endpoint must be specified and reviewed as a backend API change before implementation. The migration must not invent an alternative API backend.

### 4.5 Backend modularity

The existing modular-monolith direction remains in force. Domain capabilities retain their own authoritative rules. Messaging, dashboards and frontend orchestration may invoke domain use cases but may not mutate another domain's persistence directly.

No microservices extraction is part of this migration.

---

## 5. Application and code organization

The following is a proposed organization, not a requirement to perform a large directory move in the first commit:

\`\`\`text
apps/
  api/                         # sole NestJS backend
  wapsell-remix/               # sole frontend application
    app/
      routes/
        _customer/             # customer layouts and journeys
        _business/             # staff operations layouts and journeys
        _platform/              # privileged Wapsell administration
        api/                    # health and narrowly scoped transport endpoints
      features/
        identity/
        customer/
        catalog/
        cart/
        checkout/
        orders/
        sales/
        inventory/
        purchases/
        cash/
        messaging/
        brand/
        platform-admin/
      components/
      design-system/
      services/
        api.server.ts
        auth.server.ts
        business-context.server.ts
        customer-session.server.ts
      contracts/
      hooks/
      i18n/
      styles/
packages/
  ui-kit/                       # canonical shared UI primitives, if validated
  shared-types/                 # generated/validated API contracts, not duplicate domain rules
\`\`\`

The exact Remix route filenames and nesting must be selected after reviewing current routes and URL compatibility. The names above express responsibility boundaries only.

### 5.1 Dependency direction

\`\`\`text
Experience route / component
          ↓
Feature-level UI orchestration
          ↓
Typed Remix server adapter
          ↓
NestJS API contract
          ↓
NestJS application/domain capability
          ↓
Prisma / PostgreSQL / external adapter
\`\`\`

Rules:

1. UI components do not call Prisma or database clients.
2. Browser code does not receive server secrets or backend credentials.
3. Domain logic is not duplicated in components, hooks or Remix loaders/actions.
4. Feature modules depend on published contracts, not undocumented internals of other features.
5. Shared packages contain reusable presentation primitives or stable types; they do not become a second domain layer.
6. No circular dependency between experience modules.
7. Experience-specific layouts and navigation remain separate even when they reuse shared components.

### 5.2 Workspace and dependency policy

The foundation phase must decide and implement one reproducible dependency model:

- include the Remix app in the root npm workspace **or** explicitly document and enforce a separate install boundary;
- prefer a single root lockfile and deterministic CI installation if the selected workspace model supports it;
- pin and validate Node/npm versions consistently across CI, Docker and local development;
- avoid duplicate React, TypeScript, ESLint and shared package installations where a single compatible version is practical;
- use \`npm ci\` in CI and production build contexts when the lockfile is authoritative;
- never use \`npm install --fix\` or mutating lint scripts as a substitute for reviewed dependency/configuration changes.

The exact workspace change is a foundation implementation decision and must be validated with the full monorepo before merging.

---

## 6. Identity, authentication and authorization boundaries

This section is constrained by existing Owner-accepted decisions and contracts. The frontend migration must preserve them.

### 6.1 Canonical security chain

\`\`\`text
Authenticated global User
          ↓
Server-established active Business Context
          ↓
Current ACTIVE Membership
          ↓
Effective Role
          ↓
Effective Permission
          ↓
Authorized NestJS operation
          ↓
Business-scoped resource
\`\`\`

Authentication is not authorization. A JWT is not the source of truth for current Membership or Permission. UI route protection is not a security boundary.

### 6.2 Business Operations

Every protected Business operation must:

1. authenticate the global User;
2. resolve the requested/active Business Context server-side;
3. validate current ACTIVE Membership;
4. resolve effective Role/Permission from current server-side state;
5. enforce the applicable permission in NestJS;
6. enforce Business ownership/isolation on every relevant persistence path;
7. fail closed if context, membership, authorization or session is missing/invalid/revoked.

A Business identifier selected in the UI is a **request**, not authority. The server must validate it against current Membership and establish the effective context. Client-supplied headers or cookie values must never independently grant access.

Business switching must be a controlled server-side operation. A switch must not grant access to an inactive or unrelated Membership.

### 6.3 Customer identity

Customer is a commercial identity distinct from global User. Email equality alone must not automatically link a Customer to a User. Customer authentication and account flows must not accidentally inherit Business staff permissions or Business Context.

### 6.4 Platform Admin

Platform Admin is a separate privileged security boundary:

- platform privileges must be explicit and enforced in NestJS;
- a Business Owner/Admin role does not imply platform privileges;
- cross-Business queries/actions require explicit platform-level authorization and auditability;
- the frontend must not expose platform data merely because a route is hidden or difficult to discover;
- negative tests must prove that Customer and ordinary Business users cannot access Platform Admin operations.

### 6.5 Session implementation — OPEN technical design

The current Remix cookie-session implementation is an adaptation candidate, not an approved final mechanism.

A server-side Remix BFF session using secure, HttpOnly, SameSite cookies is a candidate because it can keep bearer tokens out of browser JavaScript. Before adoption, specify and review:

- token storage and exposure;
- cookie signing/encryption and secret management;
- session lifetime and rotation;
- CSRF protections for mutations;
- refresh/continuation and revocation;
- logout and multi-device behavior;
- Business Context establishment and switching;
- MFA challenge and recovery;
- Google OAuth callback and verified-email handling;
- error mapping and safe response DTOs.

Production must fail closed when required secrets are missing. No development fallback secret may be used in production. Exact claims, token lifetime, refresh, revocation storage and MFA mechanics remain governed by the existing OPEN items until separately closed.

### 6.6 Required security regression cases

At minimum:

- valid JWT without Membership is denied;
- INACTIVE Membership is denied;
- User with Membership in Business A cannot access Business B;
- client-supplied Business ID cannot override server context;
- revoked session cannot continue authorizing protected operations;
- insufficient Permission is denied even when the route is visible;
- Customer cannot access staff operations;
- Business Owner/Admin cannot access Platform Admin operations without explicit platform privilege;
- nested/related writes cannot attach resources from another Business;
- responses do not expose credentials, tokens, provider secrets or sensitive authorization fields.

---

## 7. Experience requirements

### 7.1 Customer Experience

Target capabilities, migrated from the existing storefronts and completed only where requirements and backend contracts support them:

- landing/store entry and Business Brand presentation;
- catalog browsing and search;
- category/collection navigation;
- product detail and availability;
- cart lifecycle;
- checkout and order confirmation;
- order tracking;
- customer login, registration and account;
- wholesale invitation/activation and customer file workflows where still required by approved business rules;
- customer messaging/conversational commerce when its domain contracts and backend capability are ready;
- responsive web and installable PWA behavior.

Browsing visibility (public vs authenticated) must follow the approved product/business requirements for each route. The migration must not silently change existing access policy.

**Commercial truth is always resolved by NestJS.** The browser may display provisional cart calculations for responsiveness, but the server validates price, discount, availability, quantity, stock and order creation before confirming the operation.

### 7.2 Business Operations

The unified Business area must progressively absorb the current POS Admin capabilities:

- authentication and Business selection/context;
- dashboard and operational KPIs;
- sales/POS, cart and payment collection;
- sales history, detail and printable receipt;
- order management;
- catalog/products and pricing;
- inventory, stock movements and adjustments;
- purchases, suppliers and receiving;
- customers and loyalty;
- cash opening, movements, reconciliation and closing;
- messaging/conversations;
- profile and settings;
- reports only when real backend use cases and data contracts exist.

A route placeholder is not a completed capability. Reports, settings and other unfinished modules remain explicitly NOT IMPLEMENTED until their use cases, APIs, permissions and tests are verified.

### 7.3 Platform Admin

The unified app may host the Platform Admin area, but it remains a separate experience and security boundary. The current Remix overview route is only an initial connected slice; it is not proof of a complete platform administration module.

Capabilities such as Business lifecycle, user/platform operations, subscriptions, audit and platform metrics require explicit scope, contracts and authorization before being represented as implemented.

### 7.4 Shared Design System and Business Brand

- One Wapsell Design System Core defines semantic tokens, primitives, accessibility behavior and reusable components.
- Customer-facing surfaces apply the resolved/published Brand of the current Business within approved constraints.
- Business Operations prioritizes clarity, data density, status legibility and safe execution; tenant branding must not compromise operational semantics.
- Platform Admin uses Wapsell platform identity and must not inherit a tenant's Brand.
- Brand is validated configuration, not tenant-supplied executable CSS/HTML/JavaScript.
- Existing UI kits and styles must be inventoried before adoption; do not blindly merge incompatible token systems.

### 7.5 Responsive behavior and accessibility

- Customer: mobile-first, responsive web, touch-friendly interaction.
- Business Operations: desktop/tablet-first with supported narrow viewport behavior explicitly tested.
- Platform Admin: desktop-first, with critical workflows remaining usable at supported smaller widths.
- Keyboard navigation, visible focus, semantic structure, contrast, accessible names, validation feedback and loading/error states are release criteria.
- Critical actions require confirmation and clear success/failure feedback where domain consequences justify it.

### 7.6 PWA and offline policy

PWA installability is a progressive enhancement, not a separate frontend.

Initial target:

- installable application shell;
- web manifest and service worker;
- explicit cache policy for static assets and approved public/read-only content;
- clear online/offline state;
- safe recovery after connectivity returns.

The PWA must **not** imply that a sale, payment, stock change, order submission or other mutation succeeded while offline. Offline writes, background sync, push notifications and conflict resolution remain out of scope until each capability has an explicit domain/idempotency/security contract and test strategy.

---

## 8. API integration contract

### 8.1 Single backend rule

All frontend experiences call the same NestJS backend. Remix server loaders/actions are a BFF/orchestration layer, not an independent backend.

- No second NestJS instance or alternative API is created for the frontend migration.
- No direct frontend access to PostgreSQL, Prisma or Redis.
- No duplicate business rules in Remix.
- No public exposure of internal service credentials.
- All mutations are validated and authorized by NestJS.
- API error/status contracts are mapped consistently to UI states.

### 8.2 API inventory before migration

For each route/use case, record:

- endpoint and HTTP method;
- request/response DTO;
- auth requirement;
- Customer / Business / Platform scope;
- active Business Context requirement;
- Permission requirement;
- idempotency and retry behavior for mutations;
- transaction/state-transition behavior;
- error codes and user-safe messages;
- current tests and evidence.

Do not infer endpoints from UI names. If an endpoint is not verified in NestJS, classify it as MISSING or NOT DETERMINABLE and specify the backend change separately.

### 8.3 Server-only API adapter

The unified frontend should centralize NestJS communication in typed server-only adapters. The adapter is responsible for:

- resolving the server-side API base URL from non-public environment configuration;
- attaching the authenticated session credential without exposing it to browser code;
- obtaining the effective context through the approved server-side mechanism;
- mapping errors and safe DTOs;
- applying timeout and cancellation behavior;
- preventing accidental logging of secrets or personal data.

Variables prefixed for browser exposure (for example \`VITE_*\`) must not be used for server-only credentials or secrets. Public configuration may be exposed only when intentionally safe.

---

## 9. Migration strategy — Strangler pattern

Migration is incremental and capability-based. Old applications continue serving their verified capabilities until the corresponding Remix slice has passed its gate.

### Phase 0 — Baseline, governance and feature inventory

**Objective:** know exactly what exists before moving it.

Deliverables:
- current branch/main SHA and clean source inventory;
- route and capability inventory for Remix, POS Admin, Tienda Online and Next frontend;
- API/DTO/authorization mapping for each capability;
- dependency and workspace inventory;
- current tests, CI workflows and deployment topology;
- preservation classification (PRESERVE / ADAPT / REPLACE / MISSING / NOT DETERMINABLE);
- conflict and open-decision register for frontend-specific details;
- baseline screenshots/recordings for critical flows where practical.

Exit gate:
- no in-scope route is unmapped;
- production use of the Next frontend and each legacy application is classified or explicitly NOT DETERMINABLE;
- critical customer and operational journeys have baseline evidence;
- no feature is declared migrated merely because a route exists.

### Phase 1 — Remix Foundation

**Objective:** make the existing Remix app a reliable single frontend foundation.

Deliverables:
- supported Remix v2 baseline and Node/npm version policy;
- one reproducible workspace/install strategy;
- one canonical frontend build/typecheck/lint/test configuration;
- non-mutating lint command;
- environment-variable and secret policy;
- route/error/loading boundaries;
- typed server-only NestJS adapter;
- shared Design System adoption plan;
- Docker build/runtime and healthcheck alignment;
- CI workflow that validates the actual Remix application and backend compatibility without accidental production deployment.

Exit gate:
- clean deterministic install succeeds;
- Remix typecheck and production build pass;
- API build remains independently validated;
- health checks target real routes/ports;
- no app relies on undeclared root workspaces;
- CI does not deploy from pull requests;
- baseline unit tests pass.

### Phase 2 — Identity, sessions and context

**Objective:** establish secure access foundations before migrating protected business modules.

Deliverables:
- Customer and staff authentication flows clearly separated;
- Remix session design reconciled with ARCH-003 and Owner decisions;
- server-side Business Context and controlled Business switch;
- ACTIVE Membership and Permission checks in NestJS;
- platform-level authorization boundary;
- OAuth callback, logout, revocation and MFA flows as applicable;
- explicit route classification and safe error responses.

Exit gate:
- security regression matrix in §6.6 passes;
- no protected route relies on UI-only guards;
- no Business Context is trusted from an unvalidated browser/session field;
- no secrets or bearer tokens are exposed to browser JavaScript;
- session failure fails closed.

### Phase 3 — Customer Storefront

**Objective:** migrate and reconcile customer journeys into Remix.

Migration sources:
- \`apps/tienda-online/\`;
- customer-facing routes/components already present in \`apps/wapsell-remix/\`;
- customer capabilities in \`apps/wapsell-frontend/\` only where inventory confirms they are required.

Capability order:
1. landing/store entry and Brand rendering;
2. catalog/category/search/product detail;
3. cart;
4. checkout/order submission;
5. order confirmation and tracking;
6. login/registration/account/invitation flows;
7. PWA installability and read-only offline shell;
8. customer messaging when its backend contracts are ready.

Exit gate:
- critical customer journeys meet parity criteria;
- server validates all commercial values and mutations;
- no mock data is presented as production data;
- accessibility, responsive and browser tests pass;
- PWA behavior matches the documented offline policy;
- old storefront remains available for rollback until cutover is approved.

### Phase 4 — Business Operations

**Objective:** migrate the POS Admin capabilities without changing backend domain ownership.

Suggested migration sequence:
1. Business shell, context selector and dashboard;
2. customers and customer search;
3. catalog/products and pricing;
4. orders;
5. sales/POS, payment and receipt;
6. inventory and stock operations;
7. purchases and supplier operations;
8. cash operations;
9. loyalty;
10. messaging;
11. profile/settings;
12. reports after their data contracts and use cases are verified.

The exact order may be adjusted by dependency and business criticality, but each capability must have its own acceptance gate.

Exit gate for each capability:
- route/use-case mapping complete;
- Permission and Business Context verified;
- backend API contract verified;
- parity tests pass against the legacy behavior;
- operational side effects are verified;
- observability and error handling are in place;
- old route remains available until the capability-level cutover succeeds.

### Phase 5 — Platform Admin

**Objective:** consolidate Wapsell internal platform operations without mixing them with Business administration.

Deliverables:
- separate platform route/layout/navigation;
- server-enforced platform authorization;
- explicit cross-Business data access rules;
- auditability for privileged operations;
- platform admin E2E negative tests against Customer and Business users.

Exit gate:
- all Platform Admin endpoints enforce explicit platform permissions;
- ordinary Business Owner/Admin cannot access platform operations;
- cross-Business reads/actions are auditable and bounded.

### Phase 6 — Cross-cutting integration and hardening

**Objective:** complete shared capabilities and production readiness.

Includes:
- messaging and realtime integration;
- notification behavior where specified;
- shared Design System consolidation;
- i18n and locale behavior;
- accessibility and visual regression;
- performance budgets and caching;
- security headers, CSRF and session controls;
- structured logging, error monitoring and operational dashboards;
- dependency/license/security checks;
- full E2E coverage for critical journeys.

Exit gate:
- all critical user journeys pass in CI;
- tenant isolation and authorization negative tests pass;
- no unresolved critical/high security findings;
- agreed performance/accessibility budgets pass;
- rollback procedure is rehearsed.

### Phase 7 — Parallel deployment and controlled cutover

**Objective:** move traffic only after the new experience is proven.

Rules:
- deploy Remix in parallel with legacy frontends;
- do not change database schema as a side effect of frontend cutover;
- map domains/paths in Nginx only after route ownership and API base paths are verified;
- use controlled route/domain cutover, not a blind all-at-once switch;
- preserve the ability to route traffic back to the legacy frontend;
- monitor HTTP errors, auth failures, checkout/order success, operational mutations and latency;
- define a rollback trigger and decision owner before cutover.

Exit gate:
- production smoke tests pass;
- critical customer and staff journeys pass against production-like data;
- no cross-tenant access regression;
- rollback is available and tested;
- Owner explicitly approves production cutover.

### Phase 8 — Legacy retirement

Only after successful cutover and an agreed observation period:

- retire migrated routes from \`apps/tienda-online/\`, \`apps/pos-admin/\` and any included Next frontend;
- remove obsolete dependencies and CI workflows;
- remove Dockerfiles/services and Nginx routes no longer used;
- update README, architecture, deployment and runbooks;
- preserve required historical artifacts and migration evidence.

Legacy retirement is a separate destructive gate. It must never be bundled into an early migration PR.

---

## 10. Verification strategy

### 10.1 Test layers

| Layer | Required evidence |
|---|---|
| Static | TypeScript typecheck, lint without auto-fix, formatting/config validation |
| Unit | Components, hooks, utilities, server adapters and route-level pure logic |
| Contract | Remix adapters against documented NestJS request/response/error contracts |
| Integration | Authentication, Business Context, Permission and domain API interactions |
| E2E Customer | Browse/search, cart, checkout, confirmation, account and tracking |
| E2E Business | Login, Business switch, sales, orders, inventory, purchases, cash and messaging as migrated |
| E2E Platform | Platform admin access and denied access for ordinary users |
| Security | Tenant isolation, IDOR, authorization, CSRF, session/revocation, safe DTOs and secret exposure |
| Accessibility | Keyboard, focus, labels, contrast, semantic navigation and responsive behavior |
| PWA | Installability, cache scope, offline read-only behavior and online recovery |
| Visual regression | Shared components and critical experience screens |
| Operational | Docker build, healthchecks, smoke tests, rollback and monitoring |

### 10.2 CI requirements

The unified CI must:
- install dependencies deterministically;
- validate the API and Remix app explicitly;
- run typecheck, lint, unit and relevant contract/integration tests;
- build production artifacts;
- run a critical E2E smoke suite;
- scan dependencies and secrets;
- publish test/build artifacts and clear failure diagnostics;
- use path filters only when they cannot skip required cross-package validation;
- never execute a production deployment from a pull request;
- keep deployment approval and production environment protection separate from build validation.

CI optimization must reduce redundant work without removing product validation. A successful build alone is not proof of feature correctness.

### 10.3 Evidence discipline

Every phase reports:
- exact commit SHA and branch;
- commands/workflows executed;
- pass/fail/skipped counts;
- artifacts and logs;
- environment and data assumptions;
- remaining gaps.

Do not label a feature COMPLETE, a phase CLOSED or a migration VERIFIED without corresponding evidence.

---

## 11. Deployment topology

Target logical deployment:

- one Remix frontend runtime/build;
- one NestJS API runtime;
- PostgreSQL remains the persistence authority;
- Redis and external integrations remain backend concerns where already used;
- Nginx remains the edge reverse proxy and TLS termination point unless a separately approved infrastructure change replaces it.

The frontend may serve Customer, Business and Platform routes through the same application deployment. Domain/subdomain separation may be retained for product/brand and security reasons, but must route to the same Remix application and preserve explicit route/host validation. The final host/domain mapping is OPEN until current DNS, Nginx, cookie scope, CORS, OAuth callback and production topology are verified.

The current repository contains more than one deployment pattern (Docker Compose and workflow/PM2 references). This specification does not select or change the production deployment mechanism. A separate deployment reconciliation must establish the live source of truth before cutover.

---

## 12. Non-functional requirements

| Attribute | Requirement |
|---|---|
| Security | Backend authorization and tenant isolation are authoritative; secure sessions; least privilege; safe DTOs; no secrets in browser bundles |
| Reliability | Explicit loading, empty, error and retry states; no false success; idempotent handling for retryable mutations where backend contracts support it |
| Performance | Server-render where useful; avoid unnecessary client bundles; define measurable route and API budgets before production release |
| Accessibility | WCAG-aligned semantic and keyboard behavior; exact conformance target to be selected and tested |
| Responsive | Customer mobile-first; Business/Admin responsive with supported viewport matrix |
| Maintainability | One frontend framework, shared design system, explicit feature boundaries, typed API adapters and no duplicate business logic |
| Observability | Correlation between frontend request and NestJS operation without leaking tokens or sensitive payloads |
| Localization | Preserve supported locale behavior; locale strategy and translation ownership must be unified |
| Compatibility | Supported browser/device matrix to be declared before release |
| PWA | Progressive enhancement; cache only approved resources; offline mutations are not assumed successful |

Numeric SLOs, performance budgets, browser matrix and formal accessibility conformance level remain OPEN until baseline measurement and product acceptance.

---

## 13. Risks and controls

| Risk | Impact | Control / exit evidence |
|---|---|---|
| Migrating by screen name rather than behavior | Missing business workflows | Route/use-case/API parity matrix and E2E acceptance |
| Trusting session-stored \`empresaId\` | Cross-tenant access | Server-side active context + current Membership/Permission validation and negative tests |
| Treating JWT validation as full authorization | Revoked or unauthorized user continues | Current-state authorization in NestJS |
| Duplicating business rules in Remix | Divergent price/stock/order behavior | NestJS remains sole domain authority; contract tests |
| Retiring legacy apps too early | Production workflow outage | Parallel operation, rollback and separate retirement gate |
| Incomplete Next frontend inventory | Hidden capability loss | Determine actual use/deployment and classify every required route |
| Multiple lockfiles/workspace boundaries | CI and Docker drift | One explicit reproducible dependency strategy |
| Mock fallbacks in production | Misleading business data | Remove mock fallback from production paths; explicit degraded/error state |
| PWA caching private data | Data leakage across users/tenants | Conservative cache policy and security tests |
| Platform Admin mixed with Business Admin | Privilege escalation | Separate backend authorization and negative tests |
| Framework upgrade combined with migration | Excessive change surface | Stabilize Remix v2 first; separate upgrade proposal |
| Deployment source-of-truth ambiguity | Incorrect production cutover | Read-only infra/deployment audit before cutover |

---

## 14. Explicitly out of scope

This frontend consolidation does not authorize:

- replacing NestJS or creating a second backend;
- microservices migration;
- changing PostgreSQL or Prisma versions;
- changing the physical identity, Business, Membership or tenancy schema;
- schema migrations or production data transformations;
- changing domain state machines or financial/inventory rules;
- implementing missing domain capabilities merely because a frontend route is planned;
- changing payment providers or messaging channels;
- activating AI assistants or WhatsApp integration;
- destructive deletion of legacy applications before the retirement gate;
- production Nginx/DNS/SSL changes or deployment cutover;
- an immediate Remix v2 → React Router v7 upgrade.

Any of these requires a separate scoped specification, applicable Owner decision and explicit implementation/deployment gate.

---

## 15. Open technical decisions

The following must be resolved in the relevant phase; this document deliberately does not invent answers:

1. Exact Remix v2 patch version and supported Node/npm versions.
2. Root workspace and lockfile strategy.
3. Exact route/URL topology, locale strategy and domain/subdomain mapping.
4. Final server-side session/token storage, rotation, refresh, revocation and CSRF design.
5. Exact Business Switch API/transport and context propagation.
6. Complete endpoint-to-Permission mapping for each migrated route.
7. Customer public-vs-authenticated access policy per route.
8. Current production status and actual usage of \`apps/wapsell-frontend/\`.
9. Shared UI kit adoption versus consolidation into Remix.
10. PWA cache allowlist, service worker lifecycle and offline capabilities beyond read-only shell.
11. Platform Admin permission catalogue and allowed cross-Business operations.
12. Final deployment runtime (Docker/Compose vs existing PM2/workflow deployment) and rollback mechanics.
13. Numeric performance budgets, browser/device support matrix and accessibility conformance target.
14. Observability provider, retention and privacy controls.

An OPEN item blocks only the implementation slice that depends on it; it must not be silently guessed.

---

## 16. Traceability

| Target requirement | Primary authority | Implementation location (target) | Required verification |
|---|---|---|---|
| One frontend application, three distinct experiences | Owner direction 2026-11-03; SPEC-EXP-001 | \`apps/wapsell-remix\` | Route/experience inventory; build and E2E |
| Customer Brand over shared Wapsell Core | SPEC-BRAND-001; SPEC-EXP-001; DEC-001 | Customer routes + Brand adapter + Design System | Brand isolation, fallback, responsive/accessibility tests |
| Business is tenant; User global; Membership N:N | DEC-001 and subsequent Owner decisions | Remix context adapter; NestJS Identity/Tenancy | Membership and cross-tenant negative tests |
| Server-established Business Context | T-04/T-05; ARCH-003 | Remix server adapter + NestJS | Business switch, inactive membership and spoofing tests |
| Application-level tenant isolation | R8-ARCH-002; tenant-isolation contract | NestJS persistence/application boundary | Direct, nested, unique lookup and transaction tests |
| NestJS is sole backend | Existing modular-monolith architecture + Owner direction | \`apps/api\` | API contract tests; no direct frontend DB access |
| Platform Admin separate privilege | Platform Admin decisions/specification | Platform routes + NestJS platform guards | Negative E2E and audit tests |
| PWA is progressive enhancement | SPEC-EXP-001 | Customer Remix experience | Installability, cache and offline tests |
| Legacy retirement only after parity | This migration specification | All legacy applications | Phase 7/8 evidence and rollback test |

Requirement IDs from the canonical product register are not invented here. New requirement IDs, contract IDs and invariant IDs must be assigned through the repository's naming/governance protocol if this draft is accepted for downstream derivation.

---

## 17. Definition of Done

The unified frontend migration is complete only when all of the following are evidenced:

- [ ] One Remix application is the only maintained frontend application for Customer, Business Operations and Platform Admin.
- [ ] All required legacy capabilities have an explicit disposition and traceable target route/use case.
- [ ] No required workflow was lost during migration.
- [ ] NestJS remains the only backend and sole owner of business rules and authorization.
- [ ] No frontend directly accesses PostgreSQL, Prisma or Redis.
- [ ] Customer, Business and Platform Admin experiences remain logically and securely separated.
- [ ] Business Context and Membership/Permission rules pass positive and negative security tests.
- [ ] All critical Customer and Business journeys pass E2E tests.
- [ ] PWA behavior matches the approved offline/cache policy.
- [ ] Accessibility, responsive behavior, performance and observability criteria pass.
- [ ] CI validates the actual frontend and backend without accidental deployment.
- [ ] Production cutover and rollback have been rehearsed and approved.
- [ ] Legacy applications are retired only after the observation period and separate retirement approval.
- [ ] README, architecture, API, deployment and operational documentation reflect the verified implementation.
- [ ] No claim of CLOSED/COMPLETE exceeds the available code, test, execution and production evidence.

---

## 18. Immediate next execution slice

The next task after this draft is **Phase 0 — Unified Frontend Discovery & Parity Matrix**, not a mass code migration.

Required output:

1. Complete route inventory for all four frontend applications.
2. Capability-by-capability mapping to existing NestJS endpoints and DTOs.
3. Actor, Business Context, Membership and Permission classification for each route.
4. Identification of duplicated, missing, placeholder and mock-backed functionality.
5. Current production/deployment usage classification for each frontend.
6. Dependency/workspace/CI/Docker baseline.
7. Migration order with dependencies and phase exit criteria.
8. Explicit blockers requiring Owner decision versus technical details that can be resolved within existing authority.

Only after Phase 0 is reviewed should Phase 1 modify workspace/build/CI configuration. No legacy application is deleted in Phase 0 or Phase 1.

---

**End of specification draft — ARCH-FE-001 v0.1.0.**
