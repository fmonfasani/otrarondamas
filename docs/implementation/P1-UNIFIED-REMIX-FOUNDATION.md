# P1 — Unified Remix Foundation: Implementation Contract

**Status:** READY FOR IMPLEMENTATION  
**Baseline:** ARCH-FE-001 (frozen 2026-11-03)  
**Target branch:** `feat/phase1-remix-foundation`  
**Base:** `main` at `0fae0b98f7833e5a68b06352b5b8603c331e776a`  
**Owner:** Wapsell  
**Execution mode:** one implementation workstream; no parallel agents modifying the same frontend.

## 1. Objective

Turn the existing `apps/wapsell-remix` application into the stable unified frontend foundation for the three experience areas:

1. Customer Experience.
2. Business Operations.
3. Platform Administration.

This phase establishes application topology, route boundaries, shared shell/layout primitives, navigation boundaries, design-system integration, and a reliable local validation path. It does **not** migrate every legacy feature or redesign backend contracts.

## 2. Source of truth and precedence

1. Frozen `ARCH-FE-001` is the architecture baseline.
2. Existing canonical Owner Rulings, Decision Register, backend contracts and security contracts remain authoritative.
3. Current NestJS implementation and DTOs are authoritative for what the API actually supports.
4. Existing Remix code is the starting point; preserve useful working behavior.
5. Legacy POS Admin and Tienda Online remain operational and untouched during this phase.

If sources conflict, do not silently choose or implement a new contract. Record the exact conflict and isolate the affected route/feature while continuing work that does not depend on it.

## 3. In-scope work

### P1.1 — Remix application baseline
- Inspect the current Remix app, route convention, build config, dependencies, shared packages and existing tests.
- Keep Remix v2 and the current React major version. Do not upgrade to React Router v7.
- Make the app runnable through documented, reproducible commands.
- Integrate the app into repository-level workspace/build conventions only if this can be done without breaking existing API/package workflows or unnecessarily changing the lockfile.
- Separate server-only environment configuration from browser-exposed configuration.

### P1.2 — Three explicit experience boundaries
Create explicit route/layout boundaries for:
- Customer Experience.
- Business Operations.
- Platform Administration.

Each area must have its own layout and navigation model. Shared primitives may be reused; identity, authorization and navigation semantics must not be conflated. Do not infer that a route is authorized because it is hidden from navigation.

Use route namespaces consistent with ARCH-FE-001 and the existing application conventions. Do not rename or remove existing routes without documenting compatibility and redirect behavior.

### P1.3 — Shared design-system foundation
- Inspect `packages/ui-kit`, `packages/design-system` (if present), tokens and existing frontend styles before adding components.
- Reuse existing components and tokens where viable.
- Avoid creating a competing component library or duplicating primitives.
- Add only the minimal shell/navigation primitives needed for the three experience areas.
- Preserve responsive behavior and accessibility basics (semantic landmarks, keyboard navigation, visible focus, labels).

### P1.4 — Backend integration boundary
- NestJS remains the only backend and the authority for authentication, authorization, Business Context, tenant isolation and business rules.
- Reuse existing supported API contracts only.
- Remix loaders/actions may provide server-side adapters and UX-level route handling; they must not duplicate domain logic or trust client-provided tenant IDs, roles or permissions.
- Do not introduce a second API, direct database access, new endpoints, DTO changes, Prisma/schema changes or auth model changes.
- Where current Remix auth/session behavior conflicts with ARCH-FE-001 or approved security contracts, do not paper over it. Isolate the affected protected flow and document the exact blocker; continue public/layout work that is independent of it.
- Never expose secrets or backend bearer tokens to browser JavaScript.

### P1.5 — Quality and runbook
Provide working app-specific commands for:
- typecheck
- lint
- unit/component tests
- production build
- local development

Add/update focused tests for route/layout separation and shared navigation behavior. Do not claim tests passed unless executed and evidenced.

## 4. Out of scope / protected areas

- No edits to `apps/api`, Prisma schema, migrations, database data, backend guards, authorization model or public API contracts.
- No removal or destructive migration of `apps/pos-admin`, `apps/tienda-online` or `apps/wapsell-frontend`.
- No production deployment, DNS, Nginx, VPS or environment-secret changes.
- No merge to `main`.
- Do not modify PR #100 or PR #106.
- Do not touch existing dirty worktrees or uncommitted user changes.
- No broad audit/reporting exercise. Investigate only what is necessary to implement and validate this contract.

## 5. Acceptance criteria

P1 is acceptable when all of the following are evidenced:

1. `apps/wapsell-remix` starts locally using documented commands.
2. Production build succeeds.
3. Typecheck and lint succeed, or every remaining failure is shown to be pre-existing and precisely scoped (no false green).
4. Three distinct route/layout shells render and have independent navigation structures.
5. Direct navigation to each area works; unknown routes and unauthorized UX states fail safely without treating UI guards as security controls.
6. Shared design-system components/tokens are reused; no duplicate design system is introduced.
7. Existing Remix routes not in the new shell remain compatible or have explicit migration/redirect handling.
8. No backend, schema, contract, legacy-app or protected-worktree changes are present in the diff.
9. Tests cover route-area rendering and navigation boundaries.
10. Final diff is reviewed for accidental changes, dead code, exposed secrets, browser-side tenant authority and mock data presented as live data.

## 6. Execution sequence

1. Inspect the target branch and current Remix implementation; establish a baseline of existing scripts/tests/build.
2. Implement the smallest foundation slice: route boundaries, three layouts and navigation.
3. Integrate existing design-system primitives.
4. Add focused tests.
5. Run typecheck, lint, tests and production build; diagnose and fix in-scope failures.
6. Review the final diff and verify protected paths are unchanged.
7. Commit on `feat/phase1-remix-foundation` and open a PR against `main`. Do not merge.

## 7. Required delivery report

Report only:
- branch and commit;
- routes/layouts implemented;
- commands executed and exact pass/fail results;
- tests added and executed;
- changed-file summary;
- any blockers requiring an Owner decision.

Do not report P1 complete if any acceptance criterion is unverified.
