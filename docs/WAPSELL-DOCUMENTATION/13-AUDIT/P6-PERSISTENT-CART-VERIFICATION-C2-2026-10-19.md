# WAPSELL SPRINT — C2: P6 CARRITO PERSISTENTE
## Verification report — REQ-CART-001

**Date:** 2026-10-19
**Branch:** `feat/messaging-http-ui-recovery` (see §1 — the required worktree does not exist)
**HEAD at start:** `96734c2` → **HEAD at end:** `61f499a` (moved by other contexts during the task; no commit by this process)
**Exit criterion:** **BLOCKED** — the Cart Prisma models are absent from the schema, so the module cannot compile or run.

Evidence classes: `[C]` code, `[E]` execution, `[D]` documented.

---

## 1. Precondition NOT met

The brief requires the worktree `feat/sprint-p6-persistent-cart` prepared by C0.

```
git worktree list   → only the main checkout + an unrelated opencode worktree
git branch -a       → no branch matching *sprint-p6*
```

**Neither the worktree nor the branch exists** `[E]`. No C0 preparation is present.
Work therefore proceeded read-mostly on the current checkout, with changes confined
to the Cart module. **No commit was created**, because the module does not compile
(§2). This is reported rather than worked around.

---

## 2. BLOCKER — Cart models missing from the Prisma schema

**Severity:** Blocker. Nothing in the Cart module can execute.

| Artifact | State |
|---|---|
| `prisma/migrations/20261019141253_add_cart_and_cart_items/` | **present and committed** `[E]` |
| `model Cart` / `model CartItem` in `schema.prisma` | **ABSENT** (`grep -c '^model Cart'` → `0`) `[E]` |
| Back-relations `ClienteCarts`, `EmpresaCarts`, `ProductoCartItems` | **ABSENT** (0 occurrences each) `[E]` |
| `cart.service.ts`, `cart.controller.ts`, DTOs, spec | present and committed `[E]` |
| Generated client (`node_modules/.prisma/client`) | contains **no** Cart delegate `[E]` |

Runtime proof `[E]`:

```
node -e "... new PrismaClient() ..."   → cart: undefined | cartItem: undefined
```

Typecheck `[E]`: **15 errors, all in `src/cart/cart.service.ts`**, of the form
`Property 'cart'/'cartItem' does not exist on type DynamicClientExtensionThis<...>`.
These are the **only** typecheck errors in the whole API — every other
pre-existing error (including the two former `messaging.gateway.ts` TS2339s) is
now clean, so the cart errors are not incidental noise.

Integration run `[E]`: `26 failed, 2 passed` with
`TypeError: Cannot read properties of undefined (reading 'deleteMany')`.

### How this came about

`git reflog` shows a P6 commit (`5a56ace`, amended to `f57d895`,
"feat(p6): add persistent cart module with business context") followed by
`reset: moving to 920a67f` for a messaging workstream. Inspecting those commits:

```
f57d895 : cart.service.ts = 258 lines, model Cart count = 0
```

So the committed P6 work **never contained the schema models**; they existed only
as an uncommitted working-tree edit (read at line 1387 early in this session) and
were lost. The migration SQL, service, controller and spec survived because they
were tracked; the schema edit did not.

### Why this is not fixed here

Restoring the models is a **schema change**. The governing Owner decision
`34-R8-COM-004` §4 "Explicit non-approval" states the decision does **not** define
the *physical Cart schema* or *database constraints* `[D]`. The brief likewise
permits schema edits only when inside the approved contract. Restoring them is
therefore **not authorized by the material available**, and it is compounded by
the contract conflict in §3.

---

## 3. Contract conflict — anonymous Cart vs. required `customerId`

Owner decision `34-R8-COM-004` §2, approved behavior #1 `[D]`:

> **A Cart may exist without a Customer.**

The migration that is actually applied makes the opposite true `[E]`:

```sql
"customerId" TEXT NOT NULL
CREATE UNIQUE INDEX "Cart_customerId_businessId_key" ON "Cart"("customerId","businessId")
```

A `NOT NULL customerId` **forbids** the anonymous Cart the Owner approved. The
unique index additionally caps a customer at one cart per business, which the
decision neither grants nor denies.

**This needs an Owner ruling before the models are restored**, because the fix
differs: `customerId String?` (anonymous allowed, unique index must become
partial) versus keeping it required (decision #1 deferred to a later phase).
Resolving it silently either way would bake in an unapproved constraint.

---

## 4. Defects found in the Cart module (fixed, within scope)

### D-1 — Every HTTP endpoint was unreachable (controller)

`cart.controller.ts` gated each route on `user.type !== 'cliente'` and then called
`businessContextService.resolveForAuthenticatedUser(user)`. That resolver begins `[C]`:

```ts
if (auth.type !== 'usuario') {
  throw new ForbiddenException('BusinessContext V1 requiere identidad de usuario');
}
```

The two conditions are mutually exclusive, so **all five endpoints always threw 403**.

Proof `[E]`, real services against an isolated DB:

```
GET /cart: THREW -> ForbiddenException | BusinessContext V1 requiere identidad de usuario
resolveForCustomer: OK, businessId = true
```

**Fix:** use `resolveForCustomer`, the established pattern for customer identities
(`auth.customer.controller.ts:92`, `messaging.service.ts:984`, `messaging.gateway.ts:126`).

The 28-test suite could not catch this: it instantiates `CartService` directly
(`new CartService(...)`) and **never exercises the controller** —
`grep -c "request(|supertest|CartController"` → `0` `[E]`.

### D-2 — No customer-level isolation; `assertCartBelongsToCustomer` was dead code

`updateItemQuantity` and `removeItem` received only `businessId` and looked the item
up **by id alone**, checking ownership *after* reading the row. Any customer of the
same business could therefore modify another customer's cart item.
`assertCartBelongsToCustomer` existed but had **zero callers** `[E]`.

**Fix:** the controller now passes `user.id`, and both service methods filter in the
query itself:

```ts
where: { id: cartItemId, cart: { businessId, ...(customerId ? { customerId } : {}) } }
```

This also corrects the response code: a foreign item now yields **404** instead of
**403**, which previously confirmed to a foreign caller that the id exists.

### D-3 — Test suite leaked data and timed out in its own hook

- `beforeAll` had **no timeout**: ~15 sequential creates against Jest's 5000 ms
  default, so **all 28 tests failed in the hook** on a cold database `[E]`
  (`Exceeded timeout of 5000 ms for a hook`, run time 326 s).
- `afterAll` **only called `$disconnect()`** — it never deleted the two Empresas,
  hierarchy, products and batches it created. Every run leaked them into whatever
  database it pointed at.

**Fix:** `120000` ms on both hooks and a children-before-parents teardown.
Runtime fell from **326 s → 17 s** and 2 tests began passing `[E]`.

Measured consequence `[E]`: the historical database on port 5500 holds
**192 Empresas**; the fresh isolated database finished the run with **2** leaked
Empresas (the new teardown could not remove them only because `prisma.cartItem`
is undefined, per §2).

---

## 5. Items verified despite the blocker

| Scope item | Status |
|---|---|
| 4. `consolidatedStock()` used per its real contract | **PASS** `[C]` — returns an array; cart calls `consolidatedStock(businessId)` with no `search`/`familyId`/`subfamilyId`, so the internal `take: 50` cap does not apply, and `.find(s => s.productoId === …)` with `?? 0` is type-correct. |
| 6. Updating the cart must not reserve stock | **PASS** `[C]` — stock is read-only and informative (`Stock insuficiente… Disponible: N`); no `Lote`/`MovimientoStock` write exists anywhere in the module. Matches the documented decision. |
| 9. Migration reviewed without running on the main base | **PASS with finding** — see §6. |
| 2. Isolation by `businessId` | **PARTIAL** — `Cart`/`CartItem` are **not** in `MODELS_WITH_COMPANY_ID`, because that extension scopes models with a direct `empresaId` and Cart uses `businessId` `[C]`. Isolation rests entirely on manual filters; D-2 closed the two queries that lacked one. Not verifiable end-to-end while §2 blocks execution. |
| 1, 3, 5, 7, 8 | **BLOCKED** — require a runnable module. |

Per the brief, no isolation claim is made on the strength of a unit test: the
only isolation evidence here is static `[C]` plus the database-level test in §6.

---

## 6. Migration review (not executed against the main base)

Applied to a **dedicated, empty** container, never to 5500:

```
docker run -d --name orm-p6-cart-db -p 5504:5432 postgres:16-alpine
DATABASE_URL=…@127.0.0.1:5504/otrarondamas  npx prisma migrate deploy
→ All migrations have been successfully applied.   (24 migrations)
```

Findings:

1. **The migration applies cleanly from scratch** `[E]`.
2. **It is not confined to Cart.** Besides creating `Cart`/`CartItem`, it drops and
   recreates **10 messaging foreign keys** and renames **9 constraints**
   (`ConversationParticipant`, `Message`, `MessageReadReceipt`,
   `MessagingReadPreference`, `Reaction`, `Attachment`). A cart migration carrying
   messaging DDL is scope creep and a cross-workstream risk.
3. **No composite FK on the customer.** `Cart_customerId_fkey` references
   `Cliente(id)` only, not `(id, empresaId)` as messaging does. Proven `[E]`: the
   database **accepted** a cart whose customer belongs to business B while
   `businessId` is business A. `getOrCreateCart` blocks this in code, so it is a
   defense-in-depth gap, not an open exploit path.
4. `migrate status` against 5500 reports the cart migration **already applied**
   there (24 migrations, "up to date") — applied by an earlier process, not by me.

**Database used by every test in this report: `localhost:5504`** (isolated,
created and destroyed here). The main/historical base on **5500 was never
written to**; the only command aimed at it was read-only `migrate status`. The
container was removed at the end.

---

## 7. Diff

| File | Change |
|---|---|
| `apps/api/src/cart/cart.controller.ts` | D-1: `resolveForCustomer`; passes `user.id` to item ops |
| `apps/api/src/cart/cart.service.ts` | D-2: tenant+customer filter inside the query on `updateItemQuantity` / `removeItem` |
| `apps/api/test/integration/p6-cart-integration.integration-spec.ts` | D-3: hook timeouts + real teardown |

All three are inside the Cart module. **Not touched:** `MessagingPage.tsx`, order
creation logic, `schema.prisma`, any migration, and every file outside Cart
(verified with `git status`). No new typecheck error outside the 15 of §2.
Temporary probes were deleted.

**No commit was made.** The brief allows local Cart-only commits once the diff is
reviewed and the relevant tests pass; the tests cannot pass while §2 stands, so
committing would contradict "no declarar un test aprobado sin evidencia".

---

## 8. Acceptance criteria

| Criterion | Verdict |
|---|---|
| Persistence, isolation, validations covered by tests | **NOT MET** — blocked by §2; D-1/D-2 fixed but unverifiable end-to-end |
| Migration and model compatible | **NOT MET** — the migration exists, the models do not (§2); plus §3 contradicts the migration |
| Integration tests reproducible on an isolated base | **PARTIAL** — isolated base established and reproducible (5504); the suite still fails for §2 |
| Build and typecheck of the scope without new errors | **MET for my changes** — 0 new errors; the 15 pre-existing cart errors are §2 |
| No regressions in existing contracts | **MET** — no file outside Cart modified; §3 records a pre-existing contract conflict, not one introduced here |

---

## 9. Handoff

**To the Owner (blocking):**
1. Rule on §3: may a Cart exist without a Customer in this phase
   (`customerId String?` + partial unique index), or is approved behavior #1
   deferred? The schema cannot be restored correctly without this.
2. Approve the physical Cart schema, which `34-R8-COM-004` §4 explicitly leaves
   undefined.

**To C0 / release engineering:**
3. The worktree `feat/sprint-p6-persistent-cart` was never created (§1).
4. Restore `model Cart` / `model CartItem` and the three back-relations once §3 is
   ruled, then run `prisma generate`. Note a stale Jest process held
   `query_engine-windows.dll.node` and made `prisma generate` fail with `EPERM`
   until it was stopped.
5. Decide whether the messaging DDL bundled in the cart migration (§6.2) should be
   split out before this reaches any shared environment.

**To C3 (orders) — reported, not acted on:**
6. `CartItem` stores `cantidad` only; **no price is captured at add time**. Price
   reaches the client through `producto.precioMinorista` at read time, so a catalog
   price change retroactively alters an existing cart. If order creation is meant
   to honour the price seen when the item was added, it needs a price column on
   `CartItem` — a schema decision outside this context and outside my authorization.

**Residual, unauthorized here:**
7. Add `Cart`/`CartItem` to the isolation strategy (they are outside
   `companyScopeExtension` by construction, §5), or document that manual filtering
   is the accepted approach for `businessId` models.
8. `AddCartItemDto` imports `IsString` without using it (lint noise).
