# Messaging Browser E2E — reproducible CI path

**Status:** Added as an automated check; execution status must be read from the matching GitHub Actions run. This document is not itself evidence of a passing run.

## Scope

The `Messaging Browser E2E` workflow boots an ephemeral PostgreSQL database, applies the current Prisma schema to that disposable database, seeds the demo owner and a dedicated customer, starts the real NestJS API and Vite admin frontend, then runs Chromium against the real UI and HTTP API.

The browser scenario covers:

1. Login using the existing demo owner fixture.
2. Open `/messaging`.
3. Create a DIRECT conversation with a dedicated E2E customer.
4. Send a unique message through the UI.
5. Reload the page and assert the message is loaded again from server history.

The workflow does not mock messaging endpoints and does not target production data.

## Test-only fixture

`apps/api/prisma/seed-e2e-messaging.ts` is run only by the dedicated CI workflow after the existing seed. It creates/repairs the explicit legacy `Usuario → User → Membership` link required by the current BusinessContext implementation and upserts a dedicated customer. It does not alter the schema or migrations.

Demo credentials are the existing seed contract: `owner@otrarondamas.com` / `password123`. They are used only against the disposable CI database.

## Commands executed in CI

- `prisma db push` against the ephemeral PostgreSQL service.
- Existing API seed + E2E-only fixture seed.
- API and admin frontend production builds.
- NestJS API + Vite dev server startup.
- `npx playwright test --config=playwright.config.mjs`.

## Acceptance and limits

A pass proves the specified login/conversation/message/reload path on the exact checked-out SHA. It does not by itself prove full tenant-isolation coverage, every permission/revocation case, Google OAuth, or realtime delivery. Those remain separate API/security checks.
