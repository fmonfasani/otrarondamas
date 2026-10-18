# Messaging Access Policy — Quick Reference
**Version:** 0.1 · **For:** Developers integrating with Messaging · **Date:** 2026-10-18

## TL;DR: Four Access Modes

| Mode | Who | List | Read | Write | Notes |
|------|-----|------|------|-------|-------|
| **PARTICIPANT** | Active conversation member (User or Customer) | ✓ Own only | ✓ All | ✓ Full | Can edit/delete own messages |
| **OWNER_READ_ONLY** | OWNER role, not a participant | ✓ All | ✓ All | ✗ **403** | Administrative read access only |
| **NON_AUTHORIZED** | User in Business, not Owner, not participant | ✗ Empty | ✗ **403** | ✗ **403** | No access; not an error |
| **FOREIGN_BUSINESS** | User from another Business | ✓ Own | ✗ **404** | ✗ **404** | No info leak; returns 404 |

## What Enforces Access?

**In `messaging.service.ts`:**

- **`assertActiveParticipant()`** — Throws 403 if not participant
  - **Used in:** createTextMessage, editMessage, deleteMessage, markMessageRead, addParticipant, removeParticipant
  - **Result:** "El actor no participa en la conversación"
  
- **`assertConversationAdmin()`** — Throws 403 if not OWNER + participant with isAdmin = true
  - **Used in:** deleteConversation, transferAdmin, createConversationAssociation, deactivateConversationAssociation, createOrderFromConversation
  - **Result:** "El actor no es administrador de la conversación"

- **`isOwner = context.role === 'OWNER' && context.userId !== null`** — Grants read-only access
  - **Used in:** listConversations, getConversation, getMessages
  - **Result:** Owners see all conversations but cannot write unless they participate

## HTTP API Security

```
GET /conversations
├─ PARTICIPANT: sees own
├─ OWNER_READ_ONLY: sees all
├─ NON_AUTHORIZED: sees none (empty 200 [])
└─ FOREIGN_BUSINESS: sees none (empty 200 [])

GET /conversations/:id
├─ PARTICIPANT: ✓ 200
├─ OWNER_READ_ONLY: ✓ 200
├─ NON_AUTHORIZED: ✗ 403 (assertActiveParticipant)
└─ FOREIGN_BUSINESS: ✗ 404 (businessId filter)

GET /conversations/:id/messages
├─ PARTICIPANT: ✓ 200 (from joinedAt onward)
├─ OWNER_READ_ONLY: ✓ 200 (all messages, audit access)
├─ NON_AUTHORIZED: ✗ 403 (assertActiveParticipant)
└─ FOREIGN_BUSINESS: ✗ 404

POST /conversations/:id/messages (WRITE)
├─ PARTICIPANT: ✓ 201
├─ OWNER_READ_ONLY: ✗ 403 (assertActiveParticipant fails)
├─ NON_AUTHORIZED: ✗ 403
└─ FOREIGN_BUSINESS: ✗ 404
```

## Socket.IO Alignment

**`conversation.join` event:**
- PARTICIPANT: ✓ joins room, receives events
- OWNER_READ_ONLY: **✗ FORBIDDEN** — assertActiveParticipant blocks
- NON_AUTHORIZED: ✗ FORBIDDEN
- FOREIGN_BUSINESS: ✗ NOT_FOUND

## UI Integration (MessagingPage.tsx)

The API returns `viewerAccess` on GET /conversations and GET /conversations/:id:

```typescript
viewerAccess: {
  canSend: true | false,  // false if OWNER_READ_ONLY or non-participant
  mode: 'PARTICIPANT' | 'OWNER_READ_ONLY'
}
```

**UI rule:** Do NOT offer a send button if `viewerAccess.canSend === false`.

This prevents the user from attempting an operation that will fail with 403.

## Common Errors & Fixes

**Error:** "El actor no participa en la conversación" (403)  
**Causes:**
- User tried to write to a conversation they're not a participant of
- OWNER role tried to write without being added as a participant
- Customer token used on staff endpoint (sec-001 check)

**Fix:**
- Add user/customer as a participant first: POST `/conversations/:id/participants`
- Or use Owner read-only mode for read-only access without participating

---

**Error:** Not found (404)  
**Causes:**
- User from another Business tried to access conversation
- Conversation deleted (soft delete)

**Fix:**
- Ensure user's businessId matches conversation's businessId
- Check conversation.deletedAt is null

---

**Error:** "El actor no es administrador de la conversación" (403)  
**Causes:**
- Non-admin tried to delete conversation, associate entities, or remove others
- Non-Owner tried to manage (only OWNER role admins in MVP)

**Fix:**
- Ensure user is an admin of the conversation (isAdmin = true)
- Admin transfers: only one participant must have isAdmin = true; transfer via transferAdmin endpoint

---

## For Workstream 2+ Teams

When linking Orders/Sales/Customers to conversations:

1. **Check Membership isolation:** Only active ACTIVE memberships can participate
2. **Validate tenancy:** ConversationAssociation.businessId MUST match Order/Sale/Customer.businessId
3. **Do not weaken write checks:** assertActiveParticipant is not optional; keep it on all mutations
4. **Do not add implicit conversions:** A Customer ID is not a User ID; use context.type to distinguish
5. **Do not bypass admin checks:** assertConversationAdmin is the only way to enable admin operations

---

## Code Patterns to Follow

**Listing (read-only, Owner-safe):**
```typescript
const isOwner = context.role === 'OWNER' && context.userId !== null;
const conversations = await prisma.conversation.findMany({
  where: {
    businessId: context.businessId,
    deletedAt: null,
    ...(!isOwner ? { participants: { some: { /* active */ } } } : {})
  }
});
```

**Writing (participant-required):**
```typescript
await assertActiveParticipant(tx, conversationId, context);
// Now safe to write
```

**Admin operation:**
```typescript
await assertConversationAdmin(tx, conversationId, context);
// Admin check includes: OWNER role + active participant + isAdmin flag
```

---

## DO NOT

- ❌ Use `context.userId` alone to check participation (use `assertActiveParticipant`)
- ❌ Skip businessId filters (tenant isolation critical)
- ❌ Assume OWNER role grants write permission (use assertion)
- ❌ Create participants with both userId and customerId
- ❌ Compare participant creation dates to determine "joined before" (use joinedAt)
- ❌ Allow Customers on staff HTTP endpoints (auth middleware rejects at entry)
- ❌ Soft-delete messages in a way that leaves Conversation orphaned
- ❌ Create associations without admin check
- ❌ Infer admin status from Membership.role (use ConversationParticipant.isAdmin)

## Reference

- **Full invariants:** WAPSELL-MESSAGING-MVP-INVARIANTS-CORE-CONVERSATION-PARTICIPANTS-v0.2.md
- **Implementation:** apps/api/src/messaging/messaging.service.ts
- **Tests:** apps/api/src/messaging/messaging.service.spec.ts, messaging-participation.integration-spec.ts
