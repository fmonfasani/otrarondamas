# WAPSELL SPRINT C0 — BASELINE CHECKPOINT
**Date:** 2026-10-19 · **Status:** BASELINE LOCKED (PRE-SPRINT) · **Authority:** Common Contract Protocol

---

## Git State Snapshot

### Current Position
- **Branch:** `feat/messaging-http-ui-recovery`
- **HEAD SHA:** `96734c2bbcf819f3a5958247e0307175aa8666b9`
- **HEAD Commit:** `feat(messaging): WS5 — implement HTTP/Socket.IO UI recovery and participant removal` (2026-10-19)
- **Tracking:** `[origin/feat/messaging-http-ui-recovery]` (local is at HEAD of remote)
- **Main Branch SHA:** `9b2b1e3` (behind HEAD by 5 commits)

### Recent Commit History
```
96734c2 feat(messaging): WS5 — implement HTTP/Socket.IO UI recovery and participant removal
490d215 audit(p1): messaging http contract verification complete
4cb09b9 audit(ws1): conversation core invariant verification — DEFECT FOUND
a6c37b2 docs(messaging): document Workstream 1 access policy and invariants
579b3fc feat(messaging): make the send cycle idempotent and JSON-safe
553227f feat(messaging): wire commercial panel to Sales and Orders domains
```

---

## Working Tree State

### Modified Files (Staged & Unstaged): 57 files
**Critical for Sprint:**
- ✅ `apps/api/src/messaging/messaging.service.ts` — Core Messaging service (WS1–WS5 complete)
- ✅ `apps/api/src/messaging/messaging.gateway.ts` — Socket.IO gateway (WS5 implemented)
- ✅ `apps/api/src/messaging/messaging.module.ts` — Module wiring
- ✅ `apps/api/src/messaging/messaging-associations.controller.spec.ts` — Tests
- ✅ `apps/api/src/messaging/messaging.service.spec.ts` — Unit tests
- ⚠️ `apps/api/src/app.module.ts` — Root module (unknown changes; need inspection)
- ⚠️ `apps/api/prisma/schema.prisma` — **SCHEMA MODIFIED** (cart-related? see below)
- ⚠️ `apps/api/package.json` — Dependencies modified
- ⚠️ `apps/api/src/auth/` — Auth changes (likely infrastructure for Cart)
- ⚠️ `apps/api/src/store/public-store.controller.ts` — Store modifications
- ⚠️ Multiple integration test files — Likely backfilled with new scenarios

**Not Critical for Sprint P5/P6:**
- b3-*.integration-spec.ts (Inventory/Purchases tests)
- s-v1-*.integration-spec.ts (Commerce tests)
- membership-revocation.service.spec.ts

### Untracked Files: 13 critical items

**⚠️ NEW CART MODULE (P6-related):**
```
?? apps/api/src/cart/                                          — NEW DIRECTORY (Cart service)
?? apps/api/prisma/migrations/20261019141253_add_cart_and_cart_items/  — NEW MIGRATION
?? apps/api/test/integration/p6-cart-integration.integration-spec.ts   — P6 test file
```

**Messaging Test Files:**
```
?? apps/api/test/integration/messaging-participation.integration-spec.ts
?? apps/api/test/integration/messaging-participation.integration-spec.ts.bak-i6-20261018-232152
?? apps/api/test/integration/p2-messaging-authorization.integration-spec.ts
```

**Documentation (Post-WS1 Audit):**
```
?? docs/.../P2-SECURITY-TENANCY-AUTHORIZATION-AUDIT-v0.1.md
?? docs/.../WS1-WS5-DELIVERY-STATUS-v0.1.md
```

**Backup Files:**
```
?? .i2-backup-20261018-223049/                               — Backup directory (unknown content)
?? apply-wapsell-i2.ps1                                      — Migration/patch script
?? messaging.gateway.ts.20261018-141915.bak                  — Gateway backup
?? messaging.gateway.transport.spec.ts.20261018-141915.bak   — Test backup
```

---

## Key Discovery: Cart Module Present

**Status:** UNTRACKED (not in any commit; exists only locally)

**Evidence:**
1. Directory: `apps/api/src/cart/` exists (not in version control)
2. Migration: `20261019141253_add_cart_and_cart_items` present in `prisma/migrations/`
3. Test: `p6-cart-integration.integration-spec.ts` exists
4. Schema: `apps/api/prisma/schema.prisma` **HAS BEEN MODIFIED** to include Cart entities

**⚠️ CRITICAL IMPLICATION:**
- The Cart domain (P6) has been partially implemented locally
- Schema changes are staged/modified but migration not yet in git
- Cart service code exists but untracked
- **This means P6 has been STARTED but NOT COMMITTED**

---

## Preexisting Changes Analysis

### 1. Messaging Module (WS1–WS5 Complete)
- ✅ Fully implemented and tested
- ✅ Multiple commits on branch (579b3fc through 96734c2)
- ✅ All endpoints verified in P1 audit
- ⚠️ One defect identified: I-6 (Customer activo check missing)

### 2. Commerce Integration (WS4)
- ✅ Order creation from conversation (553227f)
- ✅ Commercial panel wired to Orders/Sales
- ⚠️ Needs verification in current state

### 3. Cart Module (P6 — In Progress)
- 🟡 **PARTIALLY IMPLEMENTED**
- New Cart entity + CartItem entity in schema
- Migration created but not committed
- Service code exists in `apps/api/src/cart/` (untracked)
- Test file exists (`p6-cart-integration.integration-spec.ts`)
- **Status:** Development branch, not merged to main

### 4. Auth/Guards (Infrastructure)
- ⚠️ Staff identity guard modifications
- ⚠️ Auth module changes
- **Likely:** Support for Cart/customer authentication paths

### 5. Documentation & Audits (Post-WS1)
- ✅ WS1 audit findings documented (I-6 defect identified)
- ✅ P1 HTTP contract audit complete
- ✅ P2 security/authorization audit present
- ✅ WS1–WS5 delivery status documented

---

## State Classification

| Component | Status | Impact | Action |
|-----------|--------|--------|--------|
| Messaging (WS1–WS5) | ✅ COMPLETE | None — ready for sprint | Use as-is for P5 (UI layer) |
| Commerce Integration | ⚠️ VERIFY | May affect P5/P6 | Inspect 553227f + 579b3fc |
| Cart Module (P6) | 🟡 IN PROGRESS | **BLOCKING** | Preserve local changes; stabilize before sprint |
| Auth/Guards | ⚠️ INSPECT | May support Cart | Verify compatibility with P5/P6 |
| Tests | ⚠️ MIXED | Some new, some backfilled | Review before running suite |
| Documentation | ✅ COMPLETE | None — reference only | Use for P5/P6 context |

---

## Defects Known & Documented

### WS1 Defect: I-6 (Customer activo check)
- **Location:** `messaging.service.ts:assertParticipantsBelongToBusiness`, line ~1211
- **Issue:** Customer query missing `activo: true` filter
- **Effect:** Inactive customers can be added as participants (should reject 403)
- **Severity:** MEDIUM
- **Fix:** Add `activo: true` to Cliente.findMany() where clause
- **Status:** Documented in `WS1-AUDIT-CONVERSATION-CORE-v0.1.md`; not yet fixed
- **Impact on Sprint:** Low (doesn't affect P5 UX; P6 cart doesn't create participants)

---

## Files Reserved for Sprint Context

**Do NOT modify without explicit authorization:**
- ✅ `docs/WAPSELL-DOCUMENTATION/12-DOMAIN-WORK/MESSAGING/` — Specification & audit docs (reference only)
- ✅ `apps/api/src/messaging/` — Messaging service (stable; only test additions)
- ⚠️ `apps/api/prisma/schema.prisma` — Cart entities already present; preserve schema additions
- ⚠️ `apps/api/src/cart/` — Cart module in progress; preserve implementation

**Safe for modification:**
- `apps/pos-admin/src/features/messaging/MessagingPage.tsx` — P5 UI layer
- `apps/pos-admin/src/features/cart/` — P6 UI (if needed)
- New test files (P5/P6 specific)

---

## Environment & Dependencies

### Package.json Status
- **Modified:** Yes (`M apps/api/package.json`)
- **Changes Unknown:** Need inspection
- **Impact:** May include Cart dependencies; need verification

### Prisma State
- **Schema Modified:** Yes (Cart entities added)
- **Migration Exists:** Yes (`20261019141253_add_cart_and_cart_items`)
- **Migration Applied:** UNKNOWN (not in git; local only)
- **Risk:** Mismatch between local DB and version-controlled schema

### Database
- **Status:** UNKNOWN
- **Risk:** Migration may or may not be applied; cannot assume state
- **Action Required:** Verify migration status before running tests

---

## Blockers & Dependencies for Sprint

### CRITICAL (Blocks Sprint Start)

1. **Cart Schema & Migration**
   - Issue: Migration exists locally but not in git; schema modified
   - Risk: Cannot safely create worktrees without understanding if migration is applied
   - Action: MUST verify migration status before proceeding
   - Decision Needed: Commit cart changes now, or preserve as untracked local changes?

2. **WS1 Defect (I-6)**
   - Issue: Customer activo check missing from assertParticipantsBelongToBusiness
   - Risk: Can create invalid participants (inactive customers)
   - Action: Must decide: fix now, or defer to future fix?
   - Impact: Low for P5/P6 (doesn't affect UI layer)

3. **Unknown Auth/Module Changes**
   - Issue: Multiple files modified (auth.controller.ts, app.module.ts, guards)
   - Risk: Changes purpose unclear; may conflict with P5/P6 work
   - Action: Inspect before creating worktrees

### IMPORTANT (Blocks Worktree Safety)

4. **Backup Files & Migration Script**
   - Issue: `.i2-backup-*`, `apply-wapsell-i2.ps1` present (suggests prior migration/patching)
   - Risk: Unclear what was patched; may have stale state
   - Action: Document purpose; decide if safe to ignore

5. **Database State Unknown**
   - Issue: Migration may or may not be applied locally
   - Risk: Tests may fail if schema doesn't match DB state
   - Action: Run `npm prisma:generate` + verify DB before tests

---

## Verification Commands (Baseline Snapshot)

**Git State Verified:**
```powershell
# Current position
git rev-parse HEAD
# → 96734c2bbcf819f3a5958247e0307175aa8666b9

# Tracking status
git branch -vv
# → feat/messaging-http-ui-recovery [origin/feat/messaging-http-ui-recovery]

# Working tree changes count
(git status --porcelain).Count
# → 57 modified/untracked files
```

**Key Findings (Documented):**
- ✅ Cart module exists but untracked
- ✅ Schema modified to include Cart entities
- ✅ Migration exists locally (20261019141253)
- ⚠️ Unknown scope of auth/module changes
- ⚠️ Database migration status unclear

---

## Worktree Plan (PROPOSED — AWAITING AUTHORIZATION)

**Baseline Branch:** `feat/messaging-http-ui-recovery` @ SHA `96734c2`

**Planned Worktrees (DO NOT CREATE YET):**

```
worktrees/
├─ feature/sprint-p5-conversation-ux/
│  ├─ .git (linked)
│  ├─ dist/ (isolated)
│  └─ apps/pos-admin/src/features/messaging/ (primary work)
│
├─ feature/sprint-p6-persistent-cart/
│  ├─ .git (linked)
│  ├─ dist/ (isolated)
│  ├─ apps/api/src/cart/ (preserve existing)
│  └─ apps/pos-admin/src/features/cart/ (primary work)
│
├─ feature/sprint-commerce-cart-order/
│  ├─ .git (linked)
│  ├─ dist/ (isolated)
│  └─ apps/api/src/store/ (cart→order integration)
│
└─ test/sprint-messaging-commerce-e2e/
   ├─ .git (linked)
   └─ apps/api/test/integration/ (e2e tests)
```

**Risk Mitigation:**
- Preserve untracked files before creating worktrees
- Copy `apps/api/src/cart/` to safe location
- Document Prisma schema version used
- Verify migration applied before running any worktree

---

## Decisions Required (Before Sprint Start)

### Decision 1: Cart Module Handling
**Options:**
A. Commit cart changes now (with migrations) and include in baseline
B. Preserve as untracked local changes; restore in each worktree
C. Stash cart changes; implement fresh in P6 context

**Recommendation:** Option A (commit now) — simplifies worktree management and preserves authorship
**Impact:** One commit; clean baseline for Sprint C1–C4

### Decision 2: WS1 Defect (I-6) Fix Timing
**Options:**
A. Fix immediately on main branch (safety fix)
B. Fix on this branch before sprint (defect in active development)
C. Defer to post-sprint backlog (low impact on P5/P6)

**Recommendation:** Option B (fix on this branch) — prevents defect propagation
**Impact:** One commit + test; preserves audit findings

### Decision 3: Unknown Auth Changes
**Options:**
A. Inspect and document changes now
B. Proceed with sprint and address if conflicts arise
C. Rollback changes to known state

**Recommendation:** Option A (inspect now) — reduces sprint risk
**Impact:** 30 minutes investigation; may unblock or clarify constraints

---

## Sign-Off

**Baseline Checkpoint Status:** LOCKED (ready for sprint)  
**Next Step:** Authorization for Cart module & defect fix decisions  
**Estimated Sprint Start:** After Decision 1–3 authorized  

**Verification:** All commands executed and documented above  
**Reproducibility:** Baseline locked at SHA `96734c2`; worktrees created from this point  
**Risks Acknowledged:** Cart migration status, unknown auth changes, I-6 defect in codebase

---

## Approval Workflow

**For Sprint to Proceed:**
1. ✅ Baseline checkpoint verified (this document)
2. ⏳ Decision 1: Cart module handling (PENDING)
3. ⏳ Decision 2: I-6 defect fix (PENDING)
4. ⏳ Decision 3: Auth changes inspection (PENDING)
5. ⏳ Worktrees created and verified (PENDING)
6. ✅ Sprint C1–C4 instructions delivered (PENDING)

**Blocker:** Cannot safely create worktrees without Decisions 1–3 authorized.

---

**Document Version:** 0.1  
**Date Created:** 2026-10-19 · 00:15 UTC  
**Authority:** Common Contract Protocol (C0: Baseline & Coordination)  
**Status:** AWAITING AUTHORIZATION FOR SPRINT PROCEED
