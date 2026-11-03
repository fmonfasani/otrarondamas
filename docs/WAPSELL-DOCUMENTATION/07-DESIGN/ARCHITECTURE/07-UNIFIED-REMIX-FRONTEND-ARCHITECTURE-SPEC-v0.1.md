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
8. The current root CI and Remix-specific CI have separate responsibilities. The root `package.json` does not declare a `typecheck` script, while `.github/workflows/ci.yml` invokes `npm run typecheck` at the repository root. The root `build` script targets the NestJS API, while that workflow subsequently expects an `apps/wapsell-remix/build` artifact. The Remix-specific workflow independently installs the Remix app and runs its typecheck/build. These are configuration-level mismatches verified by reading the manifests/workflows; workflow execution status must be checked separately.
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

The current `docker-compose.prod.yml` defines the NestJS API plus `pos-admin` and `tienda-online` frontend services; it does not define a Remix service. The root `.github/workflows/ci.yml` contains a separate SSH/PM2 deployment path targeting `/opt/wapsell`. These are conflicting deployment descriptions in repository configuration, not proof of which path is currently serving production. This specification does not select or change the production deployment mechanism. A read-only VPS/Nginx/process audit must establish the live source of truth before cutover.

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


---

## 19. Phase 0 — Backend contract and authorization traceability (evidence pass 2026-11-03)

**Status: PARTIAL — repository source inspected; production topology and full parity remain unverified.**

This section records source-level evidence from `main` (base SHA `e9bc4cb5ac9cffa57d66b77695b698161fdebd4b`) and the current Remix branch. Route existence is not treated as proof of feature completeness, production use, or successful runtime behavior.

### 19.1 Backend security invariants confirmed

| Concern | Verified implementation | Migration constraint |
|---|---|---|
| Authentication | Global `JwtAuthGuard`; endpoints are private by default and explicitly opt out with `@Public()`. JWT is read from Bearer Authorization. | Remix server loaders/actions must forward the user token to NestJS. Do not replace backend auth with frontend-only route protection. |
| Permission checks | Global `PermissionsGuard`; `@RequirePermission(permission)` checks the current `UsuarioPermiso` relation on every protected request and rejects inactive/missing users. | Route visibility is UX only. Preserve backend permission enforcement and test positive/negative cases. |
| Staff/customer separation | Global `StaffIdentityGuard` rejects customer identities from internal endpoints unless explicitly marked `@AllowCustomer()`; public routes are exempt. | Keep Customer and Business route trees distinct; never infer actor type from client state. |
| Business Context | `BusinessContextService.resolveForAuthenticatedUser()` resolves legacy Usuario → canonical User → ACTIVE Membership → Business → verified Empresa adapter. It fails closed on missing link, no ACTIVE membership, or multiple ACTIVE memberships. | Do not use a session `empresaId`, request header or browser-selected tenant as authorization authority. V1 currently permits exactly one ACTIVE Membership; multiple-active selection is not implemented. |
| Business data isolation | Controllers such as Catalog, Customers, Sales, Orders, Cash Register and Inventory resolve company context before calling scoped services/repositories. | Keep `CompanyScopedPrismaService` / company scope enforcement intact. No direct Prisma access from Remix. |
| Staff approval | `ApprovedDossierGuard` is explicitly applied to sensitive business controllers and rejects `estadoLegajo === PENDIENTE`. | Preserve this backend gate; frontend must not bypass it. |
| Platform administration | `PlatformAdminController` is guarded by `PlatformAdminGuard`, using `PLATFORM_ADMIN_EMAILS`; empty/missing allowlist denies access. | Platform Admin is a separate actor capability. A Remix route or hidden nav item is not authorization. |

### 19.2 Route-to-API traceability — Remix current routes

| Remix route / capability | Current source behavior | NestJS source-level contract | Phase 0 disposition |
|---|---|---|---|
| `/[lang]/auth/login` | Server action calls `POST /auth/login`; stores JWT in Remix cookie. | `POST /auth/login` exists and is public. | **Mappable**, but session hardening required (see 19.4). |
| `/[lang]/auth/register` | Calls `POST /auth/register`. | No `POST /auth/register` handler was found in the inspected AuthController. | **Contract gap** — do not port as working registration until product flow and API are identified/approved. |
| `/[lang]/dashboard` | Calls `POST /auth/validate` via `requireAuth`. | No `POST /auth/validate` handler was found; `GET /auth/me` exists and queries current user data. | **Contract mismatch** — replace validation strategy only after verifying desired session semantics; do not add a speculative endpoint. |
| `/[lang]/dashboard` KPI panel | Calls `GET /dashboard/kpis` and `GET /dashboard/recent-orders`; returns hard-coded mock KPIs/orders when API URL is missing, API responds non-2xx, or fetch throws. | No Dashboard controller/module was present in the inspected API module registration or controller search. | **Mock-backed / no verified backend contract**. Not feature parity. |
| `/[lang]/dashboard/pedidos` | Calls `GET /pedidos` through `fetchTenantData`; on any failure renders fallback mock orders. | `GET /pedidos` exists; requires JWT, approved dossier, `pedidos.gestionar`, and resolved ACTIVE Membership Business Context. | **Mappable with security remediation**. Remove tenant authority from Remix session/header and never silently substitute mock orders. |
| `/[lang]/dashboard/pedidos/:id` | Calls `GET /pedidos/:id`; on failure renders fallback mock order. | `GET /pedidos/:id` exists with the same permission/context controls as list. | **Mappable with security remediation**; fallback must become an explicit error/empty state. |
| `/[lang]/dashboard/productos` | Loader returns static sample products; action contains TODO and performs no API mutation. | `GET/PATCH /catalogo/productos` family exists; CatalogController uses ACTIVE Membership Business Context and scoped persistence. | **Scaffold only**; define required product CRUD, filters and permission behavior before migration. |
| `/[lang]/dashboard/negocios` | Loader only calls `requireAuth`; page is placeholder content. | `GET /tenants/my-empresas` exists for legacy empresa list; `GET /auth/memberships` exists for canonical memberships. No verified Business create/switch UI contract in this route. | **Placeholder**; distinguish Business selector from future multi-active membership support. |
| `/[lang]/platform-admin` | Calls `GET /platform-admin/overview` and handles 401/403. | Endpoint exists and is protected by `PlatformAdminGuard`. | **Mappable for overview only**; other nav entries are non-functional placeholders in the current route. |

### 19.3 Backend capability inventory confirmed for migration mapping

| Capability | Verified NestJS endpoints (representative) | Actor / enforcement |
|---|---|---|
| Authentication | `POST /auth/login`, `GET /auth/me`, `GET /auth/memberships`, `POST /auth/switch-empresa/:empresaId` | Login public; remaining routes require JWT. Switch behavior must be reconciled with Membership V1 before using it as a Business selector. |
| Public storefront | `GET /store/catalog`, `GET /store/hierarchy`; legacy `GET /tienda/productos`, `GET /tienda/jerarquia`, `POST /tienda/pedidos`, `GET /tienda/pedidos/:id`; `POST /store/order`, `GET /store/tracking/:id` | Explicitly public. Current `/store/*` catalog/order paths use `TIENDA_EMPRESA_ID` configuration; public slug-scoped controller also exists and requires separate contract review. |
| Orders operations | `GET /pedidos`, `GET /pedidos/:id`, `PATCH /pedidos/:id/estado`, `POST /pedidos/:id/cancel` | Internal staff; `pedidos.gestionar`, Approved Dossier and ACTIVE Membership Business Context. |
| Catalog | `GET/PATCH /catalogo/productos` and hierarchy endpoints | Internal staff; Business Context and scoped company access; mutation permission is enforced by endpoint metadata. |
| Sales | `GET /ventas/productos`, `POST /ventas/cotizacion`, `POST /ventas`, `GET /ventas`, `GET /ventas/:id`, `GET /ventas/:id/comprobante` | Internal staff; relevant `ventas.crear` / `ventas.ver` permissions, Approved Dossier and Business Context. |
| Customers | `GET /clientes`, `GET /clientes/:id`, `POST /clientes`, `PATCH /clientes/:id` | Internal staff; mutations require `clientes.gestionar`; Business Context. |
| Cash register | `GET /caja/estado`, `POST /caja/apertura`, `POST /caja/movimientos`, `GET /caja/movimientos`, `POST /caja/arqueo` and related count/close handlers | Internal staff; Approved Dossier and Business Context; movement/close operations include `caja.gastos` authorization. |
| Inventory | `GET /inventario/stock`, `GET /inventario/productos/:id/lotes`, `GET /inventario/productos/:id/movimientos`, `POST /inventario/ajustes` | Internal staff; Business Context; adjustments require `inventario.ajustes`. |
| Messaging | `GET/POST /messaging/conversations`, `GET /messaging/conversations/:id`, `GET/POST /messaging/conversations/:id/messages`, plus association/order operations | Internal staff by default (global JWT + Staff Identity guards); service-level actor, membership and conversation ownership checks must be included in detailed route matrix. |
| Platform Admin | `GET /platform-admin/overview` | Internal Wapsell platform identity; email allowlist guard; not a Business Membership permission. |

The table is representative, not a complete endpoint/DTO catalogue. Exact DTO fields, response schemas, status codes, side effects and endpoint-level permissions still need to be extracted for each capability before implementation.

### 19.4 Critical Remix security and integration findings

1. **Session secret fails open in current Remix code.** `auth.server.ts` uses `SESSION_SECRET || 'dev-secret'`. Production configuration must fail closed when the secret is absent; this is a Phase 1 implementation requirement, not a reason to change the backend contract.
2. **JWT validation calls a non-existent verified route.** `validateJWT()` calls `POST /auth/validate`; inspected AuthController exposes no such handler. `GET /auth/me` is a real current-user read but is not automatically interchangeable without defining expiry, revocation and error semantics.
3. **Tenant authority is incorrectly duplicated in Remix.** `tenant.server.ts` trusts `empresaId` and `userId` from the cookie and forwards `X-Empresa-Id` / `X-User-Id`. Backend Business Context explicitly resolves ACTIVE Membership from authenticated identity and does not use caller-provided tenant identifiers as authority. Migration must remove this frontend tenant-authorization model.
4. **Mock data can mask backend outages and missing contracts.** Dashboard, order list/detail loaders return fabricated records on API errors; product loader is entirely static. These must become explicit loading/error/empty states and real API integrations before parity is claimed.
5. **Public storefront API surfaces are not yet consolidated.** Legacy `/tienda/*`, `/store/*`, and slug-scoped `/:businessSlug/tienda/*` coexist. Their business selection, authentication, customer identity, DTO and idempotency semantics must be compared before selecting a canonical storefront contract.
6. **Platform Admin scope exceeds its implemented API.** Only overview was verified. Businesses/users/subscriptions/audit navigation items must remain marked placeholder until corresponding endpoints and permissions are verified.
7. **Remix registration is not backed by the inspected API.** Do not infer that an endpoint exists because the frontend calls it.

### 19.5 Phase 0 remaining work and exit gates

| Work item | Status | Evidence required to close |
|---|---|---|
| Remix → NestJS route/DTO/permission matrix | **Partial** | Every Remix loader/action and interactive feature mapped to exact controller method, DTO, response shape, auth actor, Business Context, permission, and side effects. |
| POS Admin route and feature parity mapping | **Partial** | Each POS route and API client method mapped to controller/DTO/permission, including cash, inventory, purchases, customers, messaging and reports. |
| Tienda Online mapping | **Partial** | All storefront routes, checkout, customer auth, invitation and order tracking mapped to the selected public/customer API contract. |
| Next.js frontend disposition | **Open** | Determine route-by-route overlap and whether any production domain/process currently uses it. |
| Production/deployment topology | **Open — not inferable from repository source alone** | Live VPS process/container, Nginx upstream/domain, deployed commit and traffic evidence. Repository Docker/CI files are not proof of live use. |
| DTO/response/side-effect parity | **Open** | Controller DTOs, services, tests and API client contracts inspected for each capability. |
| Test coverage and runtime validation | **Open** | Relevant unit/integration/E2E test evidence; no runtime tests were executed in this evidence pass. |

**Phase 0 exit rule:** do not begin broad screen migration until all critical Customer, Business Operations and Platform Admin journeys have a verified target contract and actor/authorization classification; all gaps are explicitly dispositioned; and production frontend usage is evidenced or formally marked as an unresolved cutover blocker.

---

**End of Phase 0 evidence addendum — 2026-11-03.**


---

## 20. Phase 0 — POS Admin and Customer Storefront mapping (pass 2, 2026-11-03)

**Status: PARTIAL — source-level mapping only; not runtime parity certification.**

### 20.1 POS Admin route mapping

| Route | Feature and verified API contract | Authorization / disposition |
|---|---|---|
| `/login`, `/auth/google/callback` | Staff auth: `POST /auth/login`, `GET /auth/me`, Google OAuth routes. | Staff JWT. Existing client stores token in local/session storage; target Remix session must be server-managed and hardened. |
| `/` | Dashboard; explicit development placeholder, no KPIs connected. | Placeholder. |
| `/ventas` | `GET /ventas`. | `ventas.ver`, Approved Dossier, ACTIVE Membership Business Context. |
| `/ventas/nueva` | `GET /ventas/productos`, `POST /ventas/cotizacion`, `POST /ventas`, `POST /ventas/:id/pagos`. | Search requires staff + Business Context; quote/create require `ventas.crear`; payment authorization/DTO needs separate PaymentsController review. |
| `/ventas/:id`, `/ventas/:id/comprobante` | `GET /ventas/:id`, `GET /ventas/:id/comprobante`, `GET /ventas/:id/pagos`. | Sale reads require `ventas.ver`; payment policy remains to verify. |
| `/orders` | `GET /pedidos`, `GET /pedidos/:id`, `PATCH /pedidos/:id/estado`, `POST /pedidos/:id/cancel`. | All require `pedidos.gestionar`, Approved Dossier and Business Context. |
| `/inventory` | `GET /inventario/stock`, `GET /inventario/productos/:id/lotes`, `GET /inventario/productos/:id/movimientos`, `POST /inventario/ajustes`, `GET /inventario/alertas`. | Reads require staff + Business Context; adjustments require `inventario.ajustes`. |
| `/compras` | Suppliers and purchases: `/proveedores/**`, `/compras/**` including issue, receipts, payments and returns. | Mutations require `compras.gestionar`; reads require staff + Business Context. Controller comments describe payments/returns as beyond RF-12 Phase 1 despite handlers being present; reconcile UI, service and tests. |
| `/precios` | `GET/PATCH /catalogo/productos`. | Product mutation permission; exact decorator and UI gating to verify. |
| `/customers` | `GET /clientes`, `GET /clientes/:id`, `POST /clientes`, `PATCH /clientes/:id`. | Reads require staff + Business Context; mutations require `clientes.gestionar`. |
| `/fidelizacion` | `GET/POST /reglas-fidelizacion`, `GET/PATCH /reglas-fidelizacion/:id`, `GET /catalogo/jerarquia`. | All loyalty routes require `fidelizacion.gestionar`, Approved Dossier and Business Context. |
| `/messaging` | `/messaging/conversations/**`, messages, associations and participants. | Staff JWT and global StaffIdentityGuard; detailed service checks, DTOs, sockets and tests remain open. |
| `/cash` | `/caja/estado`, `/caja/apertura`, `/caja/movimientos`, `/caja/arqueo`, `/caja/arqueo/:id/autorizar`, `/caja/cierre`. | Approved Dossier + Business Context; `caja.gastos` required for movements and close; count authorization uses the separate D-06 credentials flow. |
| `/profile` | `GET /auth/me`; profile mutation/upload contracts not closed. | Route exists; exact endpoint parity remains open. |
| `/reports`, `/settings` | Explicit “En desarrollo” placeholders. | No functional API contract evidenced. |

### 20.2 Customer Storefront route mapping

| Route | Verified backend contract | Actor / disposition |
|---|---|---|
| `/` | `GET /tienda/productos`, `GET /tienda/jerarquia`. | Public API routes, although current React UI wraps catalog in a client-side auth gate. |
| `/checkout` | `POST /tienda/pedidos`. | Public endpoint; legacy service validates stock but does not reserve/deduct it. |
| `/pedido/:id` | `GET /tienda/pedidos/:id`. | Public tracking endpoint; review exposure and identifier behavior as part of security validation. |
| `/login` | `POST /auth/cliente/login`, customer Google OAuth, `GET /auth/cliente/me`. | Customer JWT, distinct from staff `/auth/login`. |
| `/registro` | `POST /auth/cliente/registro`. | Public retail-customer registration tied to `TIENDA_EMPRESA_ID`. |
| `/activar-invitacion-mayorista` | `POST /invitaciones/mayorista/activar`. | Public invitation-token activation for wholesale customers. |
| `/mi-cuenta` | `GET /auth/cliente/me`; edits not verified. | Customer JWT; Business Context resolves persisted Customer and Business. |
| `/mi-cuenta/legajo` | `GET/PATCH /legajo/cliente/mi-legajo`, `GET /legajo/cliente/mi-legajo/estado`. | Customer JWT; backend checks customer actor and wholesale status. Pending customers can complete dossier. |

### 20.3 Identity, storefront and migration constraints

- Customer JWT identity (`cliente`) is separate from staff identity (`usuario`). Do not unify their authentication contracts or permissions.
- Storefront AuthContext stores customer token/profile in `localStorage`; the React `RequiereAuth` wrapper is a UI gate, not backend authorization.
- `/auth/cliente/me` resolves tenant context from persisted Customer data, not from caller-selected tenant state.
- Public catalog and order endpoints remain public even though the current UI asks users to log in before catalog access.
- Legacy `/tienda/*` and newer `/store/*` routes coexist. The documented legacy order path validates stock without deduction; the separate `/store/order` phase path has different stock/idempotency semantics. Canonicalization requires a decision on stock reservation, idempotency, customer linkage and business selection.
- Customer Google OAuth currently returns access token in the callback query string. The target auth design must explicitly address token exposure in browser history, logs and referrers.
- Staff dossier routes (`/legajo/*`) and wholesale-customer dossier routes (`/legajo/cliente/*`) are separate actor flows.

### 20.4 Phase 0 remaining gates

1. Inspect PaymentsController and profile routes/DTOs; verify all POS payment and profile calls.
2. Complete Messaging HTTP/WebSocket contract, actor checks and test mapping.
3. Compare Next.js route behavior and API usage with the other frontends.
4. Establish live production frontend usage and deployed commit evidence; repository deployment files alone do not prove current runtime topology.
5. Complete capability-level DTO, side-effect and E2E traceability.

**Disposition:** POS Admin has substantial real API integration, but Dashboard/Reports/Settings are placeholders. Tienda Online has real public storefront and dedicated customer-auth flows, with session/security and duplicated-storefront-contract concerns. Remix remains incomplete. No broad screen migration should begin until remaining gates are closed or explicitly accepted.

---

**End of Phase 0 evidence addendum — pass 2, 2026-11-03.**


---

## 21. Phase 0 — Next.js overlap and additional backend evidence (pass 3, 2026-11-03)

**Status: PARTIAL — source inspection only; production usage is not established.**

### 21.1 Next.js route and API findings

| Surface | Observed behavior | Contract finding |
|---|---|---|
| `/[locale]` | Static welcome page. | No domain API integration in this page. |
| `/[locale]/auth/login` | Staff login UI; Next route handler proxies login. | `POST /auth/login` exists. |
| `/[locale]/auth/signup`, `recover` | Route directories exist; behavior not fully inspected. | Do not infer complete registration/recovery from route presence. |
| `/[locale]/dashboard` | KPI, trend and top-product components with period selector. | Next proxies call `/admin/dashboard/kpis`, `/admin/dashboard/top-products`, `/admin/dashboard/trends`; matching NestJS endpoints were not verified. |
| `/[locale]/negocios` | Business list, create/edit links and localStorage-based business selection. | `GET /tenants/my-empresas` exists. Business create/settings endpoints were not verified. Current Membership V1 resolves one ACTIVE membership and rejects multiple ACTIVE memberships. |
| `/api/auth/login`, `/api/auth/me` | Next server proxies. | Corresponding NestJS routes exist. |
| `/api/auth/switch-empresa`, `/api/auth/tenants` | Next server proxies. | `POST /auth/switch-empresa/:empresaId` and `GET /tenants/my-empresas` exist; switching semantics must be reconciled with Membership V1. |
| `/api/dashboard/kpis`, `top-products`, `trends` | Next server proxies to dashboard paths. | Backend contracts remain unverified. |

### 21.2 Cross-frontend disposition

| Capability | Strongest inspected source | Finding |
|---|---|---|
| Staff login | POS Admin / Next.js; Remix partial | Consolidate staff auth into one hardened Remix session. Customer auth remains separate. |
| Customer storefront | Tienda Online | Real catalog, checkout, tracking, customer login/registration, Google OAuth and wholesale dossier flow. |
| Business operations | POS Admin | Broadest verified operational UI/API integration. |
| Dashboard | Next.js (UI only) | API proxy targets not verified in NestJS; POS dashboard is explicitly placeholder; Remix dashboard has mock fallbacks. |
| Messaging | POS Admin | HTTP and Socket.IO backend exist; detailed contract/test matrix remains open. |
| Platform Admin | Remix | Only overview endpoint verified; retain separate authorization boundary. |

### 21.3 Additional backend contracts verified

- Payments: `PaymentsController` exposes `/ventas/:ventaId/pagos`; create requires `ventas.crear`, reads require authenticated staff and Business Context, and both require Approved Dossier.
- Staff dossier: `/legajo/mi-legajo`, `/legajo/mi-legajo/estado`; owner review/approval uses `/legajo/pendientes` and `PATCH /legajo/:usuarioId/aprobar`.
- Wholesale customer dossier is separate: `/legajo/cliente/mi-legajo`, status endpoint, pending list and Owner approval under `/legajo/cliente/*`.
- `GET /usuarios` is a minimal read-only staff listing, not a full user-management API.
- Messaging Socket.IO namespace is `/messaging`; handshake authenticates and resolves staff/customer Business Context. Room subscription requires explicit `conversation.join`, authorized through MessagingService. Membership revocation invalidates realtime access.
- Messaging create-message DTO requires `clientMessageId` (1–200 chars), non-empty content and optional UUIDv4 reply reference. Remaining DTO/event, actor capability and E2E mapping is open.

### 21.4 Phase 0 exit blockers

1. Verify Next signup/recovery and business create/settings pages; identify any unique capabilities.
2. Complete DTO/response/side-effect and test mapping for all critical journeys, especially Messaging.
3. Establish live VPS/Nginx/process/container/deployed-SHA evidence. Repository files alone cannot prove the active production frontend.
4. Close parity matrix and migration sequence before starting broad route migration.

**Current conclusion:** POS Admin is the strongest operational reference; Tienda Online is the customer storefront reference; Next.js has dashboard/business UI with unverified backend contracts; Remix is the consolidation target but is not parity-complete. Phase 0 remains open. No production cutover or legacy retirement is authorized by this evidence.

---

**End of Phase 0 evidence addendum — pass 3, 2026-11-03.**


---

## 22. Phase 0 — Next.js unresolved flows and Messaging UI contract (pass 4, 2026-11-03)

### 22.1 Next.js additional findings

- `/[locale]/auth/signup` renders a RegisterForm, but its submission/API contract was not proven to be a supported staff-registration flow. Compare it with the missing `POST /auth/register` in the inspected NestJS AuthController before reuse.
- `/[locale]/auth/recover` calls `POST /api/auth/recover`; no corresponding Next route handler or NestJS recovery endpoint was verified in the inspected source. Treat password recovery as an unverified flow, not a capability to port as-is.
- `/[locale]/negocios/crear` invokes `empresasApi.createEmpresa()` and redirects to onboarding. No matching backend create-business route was verified in the inspected NestJS controllers. This is a contract gap requiring product/identity onboarding review.
- The Next business list displays plan, active-user and last-activity fields and writes a selected `empresaId` into localStorage. The verified `GET /tenants/my-empresas` endpoint does not, by itself, establish that all displayed fields or multi-business switching semantics are supported by current Membership V1.
- Dashboard API route handlers proxy to `/admin/dashboard/*`; no matching controllers were found in the current NestJS app module inventory. The UI is not evidence that those metrics are backed by the current API.

### 22.2 Messaging UI/backend contract observations

- POS Messaging consumes conversations, messages, associations and association history; it references Orders by ID and reads order status through the Orders API, keeping order state owned by Orders.
- The UI uses `viewerAccess.canSend` to distinguish writable participant conversations from Owner read-only conversations. The backend returns this capability; the frontend signal is only a display affordance.
- Conversation management UI derives admin affordances from the active participant row; backend remains authoritative and rejects unauthorized actions.
- Message retry retains the same `clientMessageId` for an unconfirmed send, aligning with the backend's duplicate prevention contract.
- Product association/search uses `GET /ventas/productos`; customer selection uses `GET /clientes`. Cart/order creation integrates the persistent cart; order creation is not a direct client-supplied line-item write.
- Existing test files are present for Messaging controller, service, gateway and gateway transport. Their presence is not proof that all actor, revocation, duplicate-send, authorization and reconnect scenarios pass in CI; exact test-case-to-invariant traceability remains open.

### 22.3 Phase 0 status update

The source-level frontend/API inventory now covers the major routes and the primary contracts across all four frontend applications. It is **not yet closed**: remaining work is runtime/deployment evidence, full DTO and side-effect matrix for critical workflows, test-to-invariant traceability, and resolution of unverified Next.js and Remix contracts. No code migration is authorized by this discovery result.

---

**End of Phase 0 evidence addendum — pass 4, 2026-11-03.**

## 23. Phase 0 — Critical journey, side-effect and test trace (2026-11-03)

This section extends the source-level inventory with concrete operational side effects and identifies implementation risks that the unified frontend must not conceal. Evidence was inspected in `main` at base SHA `e9bc4cb5ac9cffa57d66b77695b698161fdebd4b`. The architecture branch contains this specification only; no application code was changed.

### 23.1 Verified source-to-side-effect matrix

| Journey / endpoint | Backend authority and access | Verified writes / side effects | Invariants and migration constraints |
|---|---|---|---|
| POS sale — `POST /ventas` | `SalesController`; `ventas.crear`; Approved Dossier; Business Context from ACTIVE Membership | Creates confirmed `Venta`, items, sequential per-company number, AuditLog, and deducts inventory through `InventoryService.deductStock()` in one transaction | Price/discount resolved server-side; Decimal totals; stock insufficiency rolls back. Idempotency lookup currently occurs before the create transaction. |
| Sale payment — `POST /ventas/:id/pagos` | Intended handler delegates to `SalesService.createPayment()`; `ventas.crear`; Approved Dossier; Business Context | Creates approved `Pago`; cash additionally creates one `MovimientoCaja` against current opening in the same transaction; records AuditLog | Cash requires an open register; amount cannot exceed sale balance; received cash/change are distinct from collected amount. POS expects response `{ pago, saldo }`. |
| Purchase creation / issue | `PurchasesController`; mutations require `compras.gestionar`; Approved Dossier; Business Context | Creates purchase in `BORRADOR`; issue transitions to `EMITIDA`; neither operation changes stock | Do not treat purchase creation or issue as physical stock intake. |
| Purchase receipt — `POST /compras/:id/recepciones` | `compras.gestionar`; Approved Dossier; Business Context | Creates `RecepcionCompra`, one new `Lote` and `MovimientoStock(Entrada)` per received item; increments received quantities and recalculates purchase state in one transaction | Partial receipt is supported; over-receipt is rejected against quantities read before transaction. Concurrent receipt race/locking is not proven by this source trace and needs a dedicated invariant test. |
| Supplier payment — `POST /compras/:id/pagos` | `compras.gestionar`; Approved Dossier; Business Context | Creates `PagoProveedor` and updates `totalPagado` / `saldo` in one transaction | Balance is computed from a purchase read before the transaction; concurrent payments need an explicit no-overpayment test/locking review. |
| Supplier return — `POST /compras/:id/devoluciones` | `compras.gestionar`; Approved Dossier; Business Context | Creates return and linked stock-out movements in a transaction; requires evidence of purchase-linked lot/available stock | Preserve lot ownership and rollback on invalid/cross-business references. |
| Cash opening / movement / count / close | `CashRegisterController`; Business Context; `caja.gastos` for manual movement and close; Approved Dossier | Opening creates `AperturaCaja`; movement creates `MovimientoCaja`; count derives expected cash from opening + categorized movements and creates `ArqueoCaja`; close creates `CierreCaja`, closes opening and marks register closed | Opening is unique while active; count requires two different users. D-05 threshold is still characterized as reference, not final policy. D-06 authorization must remain explicit; never auto-authorize. |
| Public legacy storefront — `POST /tienda/pedidos` | Public `StoreController`; company comes from configured `TIENDA_EMPRESA_ID` unless a scoped public-store controller supplies it | Creates customer/order/items transactionally; validates stock but does not deduct it | No stock reservation at checkout; seller confirmation later owns deduction. Public tracking by order ID needs privacy/access review. |
| Public canonical store order — `POST /store/order` | Public `StoreOrderController`; accepts `X-Idempotency-Key` | Calls the same StoreService with stock deduction enabled; order creation and stock deduction occur atomically | This is not behaviorally equivalent to legacy `/tienda/pedidos`. Canonical storefront route, stock timing, idempotency scope and customer/business resolution must be decided before UI consolidation. |
| Staff order confirmation / cancellation | `OrdersController`; `pedidos.gestionar`; Approved Dossier; Business Context | Confirmation transitions `RECIBIDO → CONFIRMADO` and deducts stock in SERIALIZABLE transaction; cancellation of a confirmed order reverses stock with linked `Entrada` movements and writes AuditLog | Conditional state transition prevents double confirmation; cancellation states and reversal rules must be preserved. A source defect below requires correction in a separately authorized code task. |
| Messaging order creation | `MessagingController` / `MessagingService`; authenticated actor + conversation authorization + Business Context | Builds order from persistent cart, associates conversation/customer, and uses conversation ID as idempotency key; order remains in the existing Orders workflow for stock/ERP confirmation | Do not move order creation or stock rules into Remix. Keep HTTP as recovery path if realtime publication fails. |

### 23.2 Findings requiring explicit remediation or decision

**F0-01 — Order cancellation idempotency branch is unreachable (source defect).**

In `OrdersService.cancelOrder()`, the method first allows only `RECIBIDO`, `CONFIRMADO` and `ENTREGA_FALLIDA`; immediately afterward it checks whether the state is already `CANCELADO` and intends to return a no-op success. Since `CANCELADO` was excluded by the preceding guard, that idempotency branch cannot execute. A repeated cancellation currently reaches the conflict path instead of the documented no-op behavior. This does not change the architecture decision, but it must be fixed and covered before the cancellation journey is declared parity-complete. **No code change is authorized by this specification.**

**F0-02 — Purchase receipt/payment concurrency requires stronger evidence.**

The purchase receipt path reads purchase items and computes pending quantities before opening its write transaction. The payment path reads the current purchase balance before its transaction. The writes themselves are transactional, but the inspected code does not establish that two concurrent receipts cannot over-receive or two concurrent supplier payments cannot overpay. Add concurrent integration tests and inspect DB constraints/locking before treating these flows as safe under retries or simultaneous operators.

**F0-03 — Storefront order endpoints have materially different stock semantics.**

Legacy `/tienda/pedidos` validates stock without reserving/deducting it; canonical `/store/order` calls the same service with `deductStock=true` and atomically deducts stock at order creation. The staff Orders flow also deducts on confirmation. The frontend migration must not merge these routes or display a single implied stock policy until the owner-approved order/payment lifecycle selects the canonical path. This is a contract decision, not a UI implementation detail.

**F0-04 — Sale idempotency key is globally unique in current schema/test characterization.**

The sales HTTP integration suite explicitly characterizes a cross-tenant reuse of another business's idempotency key as a Prisma unique-constraint failure (P2002). The same suite verifies same-tenant replay returns the same sale and deducts stock once. Do not assume the key is tenant-scoped merely because the service uses a company-scoped Prisma client. Review the unique index and key namespace before changing clients or retry behavior.

**F0-05 — Payment route source and compiled/runtime registration must remain aligned.**

The source tree contains `PaymentsController` declaring `POST/GET /ventas/:ventaId/pagos`, while `SalesController` declares sales routes and does not declare a payment route. The sales HTTP integration test documents that the compiled production stack registers the Sales payment handler before the Payments handler for POST, with GET served by Payments. However, the inspected `SalesModule` registers only `SalesController`, and `PaymentsModule` registers `PaymentController` at `/pagos`, not `PaymentsController`. This is a source/module-graph versus compiled-runtime evidence discrepancy. The test also contains direct controller tests separate from HTTP tests. Before relying on this route as a migration contract, verify a clean build from the exact source SHA, inspect the generated Nest route map, and rerun the HTTP suite. Do not select or delete a handler based only on source declarations.

**F0-06 — Cash D-05/D-06 are not fully closed business policy.**

The code blocks closure when a difference exceeds a reference threshold without an authorization. Authorization is delegated to `AuthorizationsService`, and the count must not self-authorize. The threshold is explicitly described in code as not yet owner-confirmed. Preserve the fail-closed behavior; obtain the final threshold/authorization policy before altering the cash workflow.

### 23.3 Test-to-invariant evidence inventory

The following tests exist in source and provide useful migration regression anchors. Their presence is not evidence that they passed in this work session.

| Test source | Existing coverage found by source inspection | Remaining gap |
|---|---|---|
| `apps/api/test/integration/s-v1-07-sales-http.integration-spec.ts` | Sales tenant isolation, stock rollback, same-tenant idempotent replay, cross-tenant key characterization, payment response, cash movement, closed-cash rejection and permissions | Clean-build route registration evidence and concurrent payment/over-collection behavior |
| `apps/api/test/integration/s-v1-13-cash-http.integration-spec.ts` | Real HTTP guards, ACTIVE/SUSPENDED/multiple Membership cases, tenant claim spoofing, permissions, opening, movement, count and cash-close preconditions | Complete D-05/D-06 owner policy and high-difference authorization/close scenarios |
| `apps/api/test/integration/b3-movimientostock-producto.integration-spec.ts` | Cross-Business stock relation isolation, purchase receipt, supplier returns, FIFO deduction and concurrent negative-adjustment protection | Concurrent purchase receipt over-receipt behavior |
| `apps/api/src/store/c3-idempotency.functional.spec.ts` | Idempotency key replay model, transaction source assertion, cart concurrency characterization and migration precondition | This file uses in-memory/mocked behavior for parts of the contract; it is not a substitute for DB-backed HTTP concurrency tests |
| `apps/api/test/integration/s-v1-07-sales-business-context.integration-spec.ts` | Direct controller/service Business Context isolation and sales/payment behavior | Must be interpreted separately from compiled HTTP route registration |

### 23.4 Phase 0 closure checklist — updated

- [x] Frontend application and route inventory.
- [x] Core NestJS authentication, Business Context, Membership, Permission and tenant-isolation boundaries.
- [x] Sales, payments, purchase receipt/payment/return, cash, storefront order, staff order and messaging side-effect mapping.
- [x] Existing regression-test locations and named invariants mapped.
- [ ] Reconcile clean-build source/module graph with compiled runtime route map for sale payments.
- [ ] Inspect DTO validation, response contracts and frontend call sites for every critical journey; record exact request/response examples.
- [ ] Add or verify concurrency evidence for purchase receipt, supplier payment, sale payment and repeated order cancellation (separate implementation/test task).
- [ ] Obtain runtime production deployment evidence (active frontend, API deployed SHA, containers/processes, reverse proxy and environment wiring). Production remains **NOT DETERMINED**; no live VPS access was available in this audit.
- [ ] Independent technical review of this specification and unresolved owner decisions.

**Phase 0 remains OPEN.** The current evidence is sufficient to define migration guardrails, not to authorize implementation or claim operational parity. No application code, database schema, migrations, production configuration or legacy application was changed in this phase.

## 24. Phase 0 — Frontend call-site and DTO contract trace (2026-11-03)

The following call sites were inspected on `main`. This matrix distinguishes the currently used frontend contract from backend routes that exist but are not shown to be consumed by the inspected applications.

| Journey | Current caller | Request contract observed | Response / behavior consumed | Migration consequence |
|---|---|---|---|---|
| POS sale | `apps/pos-admin/src/features/ventas/NuevaVentaPage.tsx` → `api.crearVenta()` | `canal`, optional `clienteId`, `items[{ productoId, cantidad }]`, `idempotencyKey` | Receives a `Venta`; then opens payment modal using sale total/balance | Preserve idempotency key across retries; server remains authority for price, discounts, totals and stock. |
| POS sale payment | `ModalCobro.tsx` → `api.crearPago()` | Cash: `{ medio, monto, montoRecibido? }`; transfer/QR: `{ medio, monto, referencia? }` | Reads `resp.saldo` and `resp.pago`; expects `{ pago, saldo }` | DTO/response are coupled to `SalesService.createPayment()`; any handler drift is a breaking UI contract. |
| POS purchases | `ComprasPage.tsx` → `crearCompra`, `emitirCompra`, `recibirCompra`, `crearPagoCompra`, returns | Create: `proveedorId` + items; receipt: per-item `compraItemId`, quantity, lot number and expiry; payment: amount, method, optional reference | Uses purchase, receipt, supplier-payment and return records to refresh operational view | UI captures physical lot data; do not reduce receipt to a generic status change. DTO validation and returned shapes need contract tests. |
| POS cash | `CajaPage.tsx` → `estadoCaja`, `abrirCaja`, movement/count/authorization/close helpers | Opening amount; movement type/amount/description; count amount + incoming user; authorization credentials/reason | UI refreshes cash status, movements, count and closure | Preserve handover identity and authorization interaction. Verify complete count/authorization UI states against D-05/D-06 before parity. |
| Customer storefront (Vite) | `apps/tienda-online/src/lib/api.ts` | `POST /tienda/pedidos` with `CrearPedidoRequest` | Uses `PedidoCreado`; tracking via `GET /tienda/pedidos/:id` | Existing production-facing candidate uses legacy no-deduction path; don't silently switch stock semantics. |
| Customer storefront (Remix) | `apps/wapsell-remix/app/routes/_index.tsx` | `POST /tienda/pedidos` with name, email, optional phone and items | Returns order result; catalog also reads `/tienda/productos` | Remix target currently calls the same legacy route, not `/store/order`. |
| Canonical store order | No caller found in inspected POS, Tienda Online or Remix call sites | `POST /store/order`, optional `X-Idempotency-Key` | Service creates order and deducts stock atomically | Backend endpoint/test presence is not proof of frontend adoption. Its activation is a separate product/contract decision. |

### 24.1 DTO validation observations

- `CreateSaleDto` requires a valid channel and a non-empty items array; optional customer and idempotency key are UUIDs. Product price is not a client-owned field in the observed POS request.
- `CreateSalePaymentDto` requires an allowed payment method and positive numeric amount; optional received amount must also be positive; optional reference is a string. The cash modal may omit `montoRecibido`, in which case the service treats the payment amount as the received amount and change as zero.
- `CreatePurchaseDto` requires supplier UUID and a non-empty items array; optional date field is a date string. Purchase item duplicate-product validation is explicitly marked TODO in the service.
- `ReceivePurchaseDto` requires a non-empty items array. Each receipt item uses a purchase-item UUID, positive quantity, date string for expiry and non-empty lot number.
- The API bootstrap uses a global validation pipe with whitelist/transform behavior, so the selected route's DTO is part of the runtime contract. Unknown fields must not be assumed to survive validation.

### 24.2 Critical frontend/backend contract conclusion

The two inspected customer storefronts — the existing Vite store and the Remix root route — both call `/tienda/pedidos`. The newer `/store/order` route has backend source and test references, but no matching call site was found in these frontend applications. The earlier source-to-side-effect matrix therefore describes a backend capability, not the current storefront integration path.

This distinction is material: the legacy route validates stock and defers deduction until seller confirmation; `/store/order` deducts stock at checkout. Do not migrate either frontend to `/store/order` until the order lifecycle and inventory policy are explicitly selected and regression-tested.

### 24.3 Evidence still required

- [ ] Capture concrete JSON request/response fixtures from clean-build HTTP tests for sales, payments, purchases, cash and both storefront routes.
- [ ] Verify the complete cash count/authorization interaction in POS Admin, including blocked high-difference close and error recovery.
- [ ] Inspect the exact checkout payload builders and tracking access policy in both customer frontends.
- [ ] Establish whether `/store/order` is intentionally dormant, a future route or a missed integration.
- [ ] Reconcile payment route registration from source modules against a clean production build before treating the route as canonical.

## 25. CI evidence — Phase 0 pull request validation (2026-11-03)

GitHub Actions for PR #106 completed with failures. The runs checked the PR merge ref `49c410e57835bec243461a339fc11b34e434d57e` (head `3ada53056ac609433c34e66fe0060bcea1b87727` merged by GitHub for CI against base `0fae0b98f7833e5a68b06352b5b8603c331e776a`). These are CI failures, not failures caused by the Markdown change; the merge ref includes the current base and the PR only adds documentation.

### 25.1 Run #591 — B4 Verification Infrastructure

- Run ID: `41575978148`.
- Engineering Kit smoke tests: **PASS**.
- `npm ci`: **PASS**.
- Prisma client generation: **PASS** (Prisma 5.22.0).
- API build: **FAIL** at `nest build`.
- Database push, API unit tests and integration verification: **SKIPPED** because the build step failed.

Build reported four TypeScript errors:
1. `src/dossier/dossier.controller.ts:64` — TS2694: `Express.Multer.File` is not exported by the resolved global Express namespace.
2. `src/dossier/dossier.customer.controller.ts:77` — same TS2694.
3. `apps/api/tsconfig.build.json:3` — TS5101: `baseUrl` deprecated under TypeScript 6.
4. `apps/api/tsconfig.build.json:3` — TS5107: `moduleResolution=node10` deprecated under TypeScript 6.

The API package declares `typescript: ^6.0.0`; the lockfile resolves `6.0.3`. The API package also declares Nest CLI/Schematics 12, while the workflow uses Node 20. Dependency installation emitted engine warnings indicating Nest 12 packages require Node >=22.12.0. The build did not report a Node runtime crash; the direct blockers are the type and compiler-option errors above.

### 25.2 Run #62 — Jest Tests

- Run ID: `41575978218`.
- Docker/PostgreSQL service initialization: **PASS**.
- Checkout and Node setup: **PASS**.
- Dependency installation: **PASS**.
- Jest: **FAIL before executing tests**.
- Result: **34 suites failed, 0 tests executed**.

The 34 suites failed during TypeScript compilation, with repeated:
- TS5011: inferred common source directory requires explicit `rootDir`.
- TS5101: deprecated `baseUrl`.
- TS5107: deprecated `moduleResolution=node10`.

This is a test-toolchain/configuration failure, not evidence of 34 behavioral test failures. No test assertions ran.

### 25.3 Additional CI hygiene signal

Both job logs report checkout post-job cleanup warning:
`fatal: No url found for submodule path 'worktrees/commerce-cart-order' in .gitmodules`.
The warning occurs during Git submodule cleanup after the main test/build failure. It is a separate repository metadata inconsistency to investigate; it was not the primary cause of either failed step.

### 25.4 CI recovery classification

| Finding | Classification | Next diagnostic / recovery action |
|---|---|---|
| TS6 deprecation diagnostics (TS5101/TS5107) | Compiler/toolchain compatibility | Decide supported TypeScript baseline; align tsconfig with that baseline rather than suppressing blindly |
| TS5011 in Jest compilation | Test tsconfig/rootDir mismatch | Inspect Jest/ts-jest tsconfig selection and establish an explicit test rootDir compatible with project layout |
| Missing `Express.Multer.File` | Type declaration compatibility | Inspect resolved `@types/express`, `@types/multer`, Multer package versions and declaration augmentation |
| Node 20 vs Nest 12 engine requirement | Runtime/toolchain mismatch | Align CI Node version with the API package's declared engine requirement and local/dev baseline |
| Missing submodule URL for worktree path | Git metadata/checkout hygiene | Inspect `.gitmodules`, index gitlink and intended lifecycle of `worktrees/commerce-cart-order` |

**No automatic fix was applied.** These findings affect the repository-wide API build/test infrastructure and must be handled as a dedicated CI recovery task. In particular, changing TypeScript major version, Node baseline, tsconfig inheritance or submodule metadata is outside this documentation-only Phase 0 scope.

### 25.5 Updated Phase 0 / CI status

- [x] Captured final results and job logs for PR #106 CI.
- [x] Distinguished test discovery/compilation failures from executed failing assertions.
- [x] Recorded concrete build errors and environment compatibility signals.
- [ ] Resolve API build and Jest compiler configuration under an explicitly selected Node/TypeScript baseline.
- [ ] Re-run build, unit tests and API integration suites after CI recovery.
- [ ] Reconcile payment controller/module registration using the clean build and HTTP route map.
- [ ] Verify production deployment evidence.

**CI is currently RED.** No product behavior has been proven broken by these two runs because Jest executed zero tests and the API build stopped before integration verification. The repository cannot be treated as migration-ready until CI is recovered and the relevant invariants are actually executed.
