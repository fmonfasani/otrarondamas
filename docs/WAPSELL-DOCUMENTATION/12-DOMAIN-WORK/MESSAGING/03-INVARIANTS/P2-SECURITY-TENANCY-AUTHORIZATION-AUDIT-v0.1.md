# WAPSELL Messaging — P2: Security and Tenancy
## Authorization audit, defect and remediation — v0.1

**Date:** 2026-10-19
**Branch:** `feat/messaging-http-ui-recovery`
**Initial SHA:** `4cb09b9b864907c40c42dd2953145912ad338952`
**Final SHA:** `490d215a6d593abf5f1911e905d204528e0e20c8` (no commit created by this process; HEAD advanced because another context committed `audit(p1)` concurrently on the same branch)
**Exit criterion:** **PASS** — one defect found, fixed and verified by execution.

**Normative source:** `03-INVARIANTS/WAPSELL-MESSAGING-MVP-INVARIANTS-CORE-CONVERSATION-PARTICIPANTS-v0.2.md`, section 4 (four access modes), section 4.3 (per-endpoint enforcement), section 7 (invariant checklist).

Evidence classes: `[C]` code, `[T]` test, `[E]` execution.

---

## 1. Scope reviewed

Every Messaging HTTP endpoint (`messaging.controller.ts`, 20 routes), the single
client-facing Socket.IO handler (`conversation.join`), and the domain operations
behind them (`messaging.service.ts`). Actor matrix: Owner participant, Owner
non-participant, internal non-Owner, Customer, participant who left (`leftAt`),
participant removed (`removedAt`), suspended Membership, foreign Business and
unauthenticated.

---

## 2. AS-IS authorization map

Guard primitives `[C]`:

- `assertActiveParticipant` — filters `conversationId + businessId + leftAt: null + removedAt: null` and the actor identity (`userId` XOR `customerId`). Throws 403 `El actor no participa en la conversación`.
- `assertConversationAdmin` — requires `role === 'OWNER'` **and** an active participant row with `isAdmin: true`.
- `assertParticipantsBelongToBusiness` — enforces **I-5** (`MembershipStatus.ACTIVE`) and **I-6** (`Cliente.activo === true`, scoped by `empresaId`).
- `getConversationForActor` — resolves within `businessId` (404 if absent), then applies `assertActiveParticipant` unless `isOwner`.
- `resolveContext` → `BusinessContextService` — fails closed when there is no ACTIVE Membership.

| Operation | Guard AS-IS | Matches section 4.3 |
|---|---|---|
| `GET /conversations` | `isOwner` ∨ participant filter | Yes |
| `GET /conversations/:id` | `getConversationForActor` | Yes |
| `GET /conversations/:id/messages` | `isOwner` ∨ `assertActiveParticipant` | Yes (see §5 divergence) |
| `POST /conversations/:id/messages` | `assertActiveParticipant` | Yes |
| `PATCH /conversations/:id/messages/:mid` | **author only — participation missing** | **No → DEFECT** |
| `DELETE /conversations/:id/messages/:mid` | **author only (admin path guarded)** | **No → DEFECT** |
| `POST /conversations` | cardinality + `assertParticipantsBelongToBusiness` | Yes |
| `DELETE /conversations/:id` | `assertConversationAdmin` | Yes |
| `POST /conversations/:id/participants` | `assertActiveParticipant` + cardinality + business check | Yes |
| `DELETE /conversations/:id/participants/:pid` | `isSelf` ∨ `assertConversationAdmin` | Yes |
| `POST /conversations/:id/associations` | `assertConversationAdmin` | Yes |
| `GET /conversations/:id/associations/history` | `getConversationForActor` + `assertConversationAdmin` | Yes |
| `POST /conversations/:id/orders` | `assertConversationAdmin` | Yes |
| `POST /conversations/:id/messages/:mid/read` | `assertActiveParticipant` | Yes |
| `GET .../read-receipts` | `isOwner` ∨ `assertActiveParticipant` | Yes |
| `POST /conversations/:id/admin/:pid` | `assertConversationAdmin` | Yes |
| Socket `conversation.join` | delegates to `getConversation` | Yes — same authority |

**HTTP/Socket parity:** the gateway runs no Prisma query and derives no permission of its own; `conversation.join` calls `MessagingService.getConversation` and maps `ForbiddenException` → `FORBIDDEN`, `NotFoundException` → `NOT_FOUND` `[C]`. The service is the single authorization authority, so the two channels cannot diverge.

---

## 3. DEFECT — authorship outlived participation

**Severity:** High (unauthorized write, silently persisted)
**Status:** FIXED and verified

### Statement

`editMessage` and `deleteMessage` verified tenancy (`businessId`) and
authorship, but never participation. An actor who sent a message and then
**left** or was **removed** from the conversation retained the ability to edit
and soft-delete that message indefinitely — mutating history that the remaining
participants were still reading, while `POST /messages` correctly rejected the
same actor with 403.

Section 4.3 requires `assertActiveParticipant` + author check for `PATCH`, and
`assertActiveParticipant` + (author ∨ admin) for `DELETE`.

### Evidence `[E]` — before the fix, over real HTTP (no stubs)

```
cannot edit its own message after leaving      Expected 403, Received 200
cannot delete its own message after leaving    Expected 403, Received 200
cannot send, edit or delete after removal      Expected 403, Received 200
Tests: 3 failed, 15 passed, 18 total
```

The persisted row confirmed the write landed: `editedAt` set and `content`
replaced after departure; `deletedAt` set and `content` nulled.

### Fix `[C]`

`apps/api/src/messaging/messaging.service.ts`

- `editMessage` — `assertActiveParticipant` inserted **before** the author check.
- `deleteMessage` — the author route now calls `assertActiveParticipant`; the admin route keeps `assertConversationAdmin`, which already filters `leftAt`/`removedAt`. The admin path was deliberately not narrowed.

### Verification `[E]`

```
P2 authorization suite (real HTTP):        18 passed, 18 total
messaging + membership unit suites:        94 passed, 7 suites
pre-existing messaging integration specs:  25 passed, 3 suites
```

Sensitivity `[E]`: with the two guards reverted, the new unit tests fail
(`2 failed, 28 passed`); restored, `30 passed`. The tests detect the defect
rather than merely accompanying the fix.

---

## 4. Withdrawn finding — suspended Membership

An initial probe suggested a suspended member could send, edit and delete. That
probe stubbed `resolveContext`, which **bypasses the Membership gate**. Against
the real stack, `BusinessContextService.resolveForAuthenticatedUser` fails
closed with `Sin Membership activa: contexto denegado` `[C]`, confirmed by
execution `[E]` with the participant row left deliberately active.

**The finding is withdrawn.** It is recorded here because the probe method, not
the system, produced it — and because it is the reason the delivered suite never
stubs `resolveContext`.

Residual observation (not a defect): `assertActiveParticipant` does not join
`Membership`, so participation alone would authorize if context resolution ever
stopped enforcing ACTIVE. Defense-in-depth only; the current chain is sound.

---

## 5. Contract divergence (no privilege impact)

Section 4.1 states a PARTICIPANT reads **all** messages with "no joined-after
filter". `getMessages` applies `createdAt >= participant.joinedAt` `[C]`, and
`messaging.service.spec.ts` asserts that behaviour ("retrieves only messages
created after the actor current participation period").

This **restricts** access rather than widening it, so it leaks nothing. Code and
document disagree and one of them should be corrected by the Owner — not
silently reconciled here.

---

## 6. Invariants reviewed as instructed

- **I-2 — type immutable; cardinality enforced.** Upheld `[C][T][E]`. DIRECT requires exactly one counterpart on create; `addParticipant` caps DIRECT at 2 and GROUP at 50 under `Serializable` isolation. A third participant in a DIRECT conversation returns 409 and persists nothing `[E]`. No endpoint writes `Conversation.type` after creation `[C]`.
- **I-6 — Customer participant must exist and be `activo = true`.** Upheld `[C][T][E]`. `assertParticipantsBelongToBusiness` filters `empresaId + activo: true`; an inactive Customer and a foreign-Business Customer both return 403 with no participant row written `[E]`.

---

## 7. No-persistence-on-rejection

Every negative test asserts the stored state after the rejection, not just the
status code: message counts unchanged, `editedAt`/`deletedAt` still null,
original content intact, no participant row created, `deletedAt` still null on
the conversation. A 403 that still writes would fail these assertions `[T][E]`.

No conversation or history leaked across the tenant border: a foreign Business
receives **404** (never 403, which would confirm existence) and its list never
contains the conversation `[E]`.

---

## 8. Deliverables

| File | Change |
|---|---|
| `apps/api/src/messaging/messaging.service.ts` | Fix: participation guard in `editMessage` and `deleteMessage` |
| `apps/api/src/messaging/messaging.service.spec.ts` | +2 unit tests (edit/delete after losing participation) |
| `apps/api/test/integration/p2-messaging-authorization.integration-spec.ts` | New: 18 negative HTTP authorization tests |
| this document | Audit record |

Out of scope and untouched: schema, migrations, identity model, WS1 access
policy, `.env`, the gateway, and all pre-existing working-tree changes and
backup files.

---

## 9. Risks, blockers, dependencies

- **Pre-existing build errors** `[E]`: `messaging.gateway.ts(371)` TS2339 ×2, in a file owned by another context and not modified here. `dist` still emits, so tests run; the branch does not typecheck clean. **Blocker for a clean CI build, not for this fix.**
- **Not executed:** the full repository test suite (only messaging/membership plus the messaging integration specs). No claim is made about unrelated domains.
- **No commit, push, merge or deploy** was performed. No migration was created or run. Tests ran against the disposable Postgres on port 5500, never a main database.
- `pos-admin` `MessagingPage.tsx` sorts `sequence` with `Number()`, losing precision past 2^53 — carried over from the WS2 audit, outside P2 scope.

---

## 10. Handoff

1. **Owner decision** on §5: does a participant read the full history, or only from `joinedAt`? Document and code currently disagree.
2. **Gateway context** should clear the two TS2339 errors at `messaging.gateway.ts:371` so the branch typechecks.
3. **Commit** the three changed files plus this document when the branch owner authorizes it (none was created here).
4. **Optional hardening**, needs authorization: join `Membership.status` inside `assertActiveParticipant` as defense-in-depth (§4).
