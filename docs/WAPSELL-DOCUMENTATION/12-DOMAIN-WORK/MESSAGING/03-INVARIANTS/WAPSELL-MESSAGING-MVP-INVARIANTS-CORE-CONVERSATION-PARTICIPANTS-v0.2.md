# Wapsell Messaging — MVP Invariants: Conversation Core & Participants
**Version:** 0.2 · **Phase:** Workstream 1 · **Status:** IMPLEMENTED · **Date:** 2026-10-18

> ## Authority
>
> - **TO-BE Source:** Approved in `08-TOBE/05-MESSAGING.md` (R4-MSG-CURRENT-01 through R4-MSG-CURRENT-08).
> - **Owner Rulings:** OR-B2-019, OR-B2-021, OR-B3-001/002/008.
> - **Implementation Baseline:** Messaging Service in `apps/api/src/messaging/messaging.service.ts` (PR #44 + ongoing).
> - **Verification:** Integration test suite `apps/api/test/integration/messaging-participation.integration-spec.ts`.
> - **Conflict Resolution:** Supersedes any prior references to "OPEN OWNER DECISION" for Customer participation without User identity.

---

## 1. Scope

This document defines the invariants that the Messaging conversation core MUST respect during the MVP initial implementation:

- Conversation lifecycle and Business isolation
- Participant identity (User, Customer, cardinality, lifecycle)
- Access control modes and their enforcement
- Commercial context association (initial form, no external dependency)
- Multi-tenancy boundaries

What this document does NOT define:

- Message model, sequence, ordering, or timestamp semantics (separate spec)
- Realtime transport, delivery guarantees, or notifications (separate spec)
- Attachment storage, retention, or media handling (separate spec)
- IA assistant activation, permissions, or mecanisms (separate decision)
- Long-term data lifecycle, archival, or deletion (separate decision)

---

## 2. Conversation Core

### 2.1 Entity and Lifecycle

```
Conversation (aggregate root)
├─ id: uuid (primary key)
├─ businessId: uuid (fk → Empresa)
├─ type: DIRECT | GROUP (immutable after creation)
├─ createdAt: timestamp
├─ updatedAt: timestamp
├─ deletedAt: timestamp? (soft delete; NULL = active)
│
├─ participants: ConversationParticipant[] (cardinality depends on type)
├─ messages: Message[] (ordered by sequence, not createdAt)
└─ associations: ConversationAssociation[] (P2: commercial context)
```

### 2.2 Business Isolation (Multi-Tenancy Invariant — CRITICAL)

**Invariant I-1: Conversation belongs to exactly one Business.**

- Every Conversation has a businessId.
- A Conversation CANNOT be moved or shared across Businesses.
- All queries on Conversation MUST filter by `(id, businessId)` or `businessId` alone; never by id alone.
- Cross-Business access returns 404 (NOT 403) to avoid leaking Business existence.

**Verification:**
- Conversation model: `@@unique([id, businessId])`
- All HTTP endpoints filter by `businessId: context.businessId` before accessing Conversation
- Integration test: foreignOwner cannot discover conversations of another Business

### 2.3 Type (Conversation Topology)

**Invariant I-2: Type is immutable after creation and determines participant cardinality.**

- `DIRECT`: exactly 2 active participants (enforced on creation and participant add/remove)
- `GROUP`: 2–50 active participants (enforced on creation and participant add/remove)
- Enforcement: `assertParticipantCount(conversation.type, activeParticipantCount)`
  - DIRECT: if (activeCount !== 2) throw ConflictException
  - GROUP: if (activeCount < 2 || activeCount > 50) throw ConflictException

**Verification:**
- Integration test: "Una conversación DIRECT requiere exactamente otro participante"
- Integration test: "Una conversación GROUP no puede superar 50 participantes"

### 2.4 Deletion (Soft Delete)

**Invariant I-3: Conversation deletion is non-destructive; deletedAt marks inactive.**

- DELETE sets `deletedAt = now()` (soft delete); record remains in DB
- All queries include `deletedAt: null` implicitly or explicitly
- Cascade: Participants, Messages, and Associations of deleted Conversation are NOT cascaded
- Restoration: Theoretically possible (not in MVP scope); deletion is FINAL for API consumers

**Verification:**
- Conversation.findFirst always includes `where: { ..., deletedAt: null }`
- Integration test: listing after deletion does not return deleted conversation

---

## 3. Participant Identity & Lifecycle

### 3.1 Entity

```
ConversationParticipant
├─ id: uuid (primary key)
├─ conversationId: uuid (composite fk)
├─ businessId: uuid (composite fk, denormalized for isolation)
├─ (User identity OR Customer identity, XOR, not both)
│  ├─ userId?: uuid (fk → Membership.userId)
│  ├─ membershipBusinessId?: uuid (composite fk to Membership, matches businessId)
│  └─ OR
│  ├─ customerId?: uuid (fk → Cliente.id)
│  └─ customerBusinessId?: uuid (fk to Cliente.empresaId, matches businessId)
├─ joinedAt: timestamp (when added to conversation)
├─ leftAt?: timestamp (when removed by self; NULL = still member)
├─ removedAt?: timestamp (when removed by admin; NULL = still member)
├─ isAdmin: boolean (conversation admin, requires OWNER role + active participant)
└─ [no soft delete: leftAt/removedAt mark inactivity]
```

### 3.2 Identity Choice (User vs. Customer)

**Invariant I-4: A Participant is either a User (via Membership) or a Customer (via Cliente), never both.**

Participant.create validates:

```typescript
if (userId && customerId) throw ConflictException('one or the other, not both');
if (!userId && !customerId) throw ConflictException('one or the other, not neither');
```

**Why:**
- User is a global Wapsell identity; Customer is a commercial relation.
- They are separate entities with separate authorization rules.
- A Customer CAN participate in a Conversation WITHOUT a User identity (TO-BE approved).
- Mixing them in one participant record would be ambiguous.

**Verification:**
- Prisma schema: one field is required, the other optional (via application logic, not DB constraint)
- Integration test: "a Customer identity is rejected on the staff HTTP endpoints"

### 3.3 User Participant (Membership-based)

**Invariant I-5: A User participant MUST have an active ACTIVE Membership in the Business.**

```
User (global identity)
  └─ Membership (userId ↔ businessId relation)
      ├─ status: ACTIVE | SUSPENDED
      └─ role: OWNER | ASISTENTE_LOCAL | PROVEEDOR | REPARTIDOR
              (role used for OWNER-level admin checks only in Messaging)
```

Creation validates:

```typescript
const membership = await Membership.findFirst({
  where: { userId, businessId, status: 'ACTIVE' }
});
if (!membership) throw ForbiddenException('User is not an active member of this Business');
```

**Verification:**
- `messaging.service.ts: assertParticipantsBelongToBusiness` checks Membership status = ACTIVE
- Integration test: owner1 (ACTIVE) can create conversations; suspended members would be rejected

### 3.4 Customer Participant (Cliente-based)

**Invariant I-6: A Customer participant MUST exist and be active (activo: true) in the Business.**

```
Cliente (commercial relation)
├─ id: uuid (primary key)
├─ empresaId: uuid (fk → Empresa)
├─ nombre: string
├─ activo: boolean
└─ [no User link required; Customer ≠ User]
```

Creation validates:

```typescript
const customer = await Cliente.findFirst({
  where: { id: customerId, empresaId: businessId, activo: true }
});
if (!customer) throw ForbiddenException('Customer not active in this Business');
```

**Verification:**
- `messaging.service.ts: assertParticipantsBelongToBusiness` checks Cliente.activo = true
- Integration test: customer can be created without User; can participate in conversations

### 3.5 Lifecycle (Joined, Left, Removed)

**Invariant I-7: A Participant is "active" if leftAt = NULL AND removedAt = NULL.**

```
Participant States:
1. ACTIVE:    joinedAt = T₀, leftAt = NULL, removedAt = NULL
              ➜ Status: Full participant; can read and write (if authorized)
2. LEFT:      joinedAt = T₀, leftAt = T₁ (T₀ < T₁), removedAt = NULL
              ➜ Status: Self-removed; can see history (if OWNER); cannot read/write
3. REMOVED:   joinedAt = T₀, removedAt = T₁ (T₀ < T₁), leftAt = NULL
              ➜ Status: Admin-removed; can see history (if OWNER); cannot read/write
4. N/A:       Neither LEFT nor REMOVED can be true simultaneously (application logic)
```

All active-participant checks use:

```typescript
where: {
  conversationId,
  businessId,
  leftAt: null,
  removedAt: null
}
```

**Removal rules:**

- `removeParticipant(participantId, actor: Context)`:
  - If `isSelf(actor, target)`: set `leftAt = now()`
  - Else (admin removal): requires `assertConversationAdmin`; set `removedAt = now()`

**Verification:**
- Integration test: owner2 can remove themselves and are no longer a "participant"
- Integration test: owner1 (admin) can remove others

### 3.6 Admin Flag (Conversation-Level, Not Membership)

**Invariant I-8: isAdmin controls conversation administration within this Conversation only.**

- isAdmin is a Conversation-scoped flag, NOT a global role.
- isAdmin = true REQUIRES:
  - Participant is ACTIVE (leftAt = NULL, removedAt = NULL)
  - Actor is OWNER (role = 'OWNER' from Membership)
  - Participant is the actor OR the actor is already admin of this conversation
- One conversation can have multiple admins (collective administration).
- Admin removal: When an admin leaves/is removed, successor admin is the oldest remaining active participant.

**Verification:**
- `assertConversationAdmin` checks `isAdmin: true` AND `role: 'OWNER'`
- Integration test: removeParticipant reassigns admin to successor

---

## 4. Access Control (Read-Write Policy)

### 4.1 Four Access Modes

Access control is **not RBAC-based per-conversation** (future decision); it is **context-based** on participation status and role.

#### Mode 1: PARTICIPANT
- **Who:** User or Customer with active ConversationParticipant record (leftAt = NULL, removedAt = NULL)
- **List:** ✓ Can list; sees only conversations where they participate
- **Read (detail):** ✓ Can read conversation and participant list
- **Read (messages):** ✓ Can read all messages (no "joined after" filter)
- **Write (messages):** ✓ **REQUIRED** for sending
- **Edit/delete (own messages):** ✓ Can edit/delete their own messages
- **Manage (admin ops):** Requires additional `isAdmin: true`

#### Mode 2: OWNER_READ_ONLY
- **Who:** User with role = 'OWNER' in Membership, NOT a participant
- **List:** ✓ Can list all conversations of the Business (administrative view)
- **Read (detail):** ✓ Can read conversation and participant list
- **Read (messages):** ✓ Can read all messages (no "joined after" filter; audit access)
- **Write (messages):** ✗ **FORBIDDEN — 403 "El actor no participa en la conversación"**
- **Manage:** Requires admin enrollment OR `assertConversationAdmin` fails

#### Mode 3: NON_AUTHORIZED
- **Who:** User of the Business, NOT OWNER, NOT participant
- **List:** ✗ Returns empty list (no admin override); sees own Memberships only
- **Read (detail):** ✗ **FORBIDDEN — 403 from assertActiveParticipant**
- **Read (messages):** ✗ **FORBIDDEN — 403 from assertActiveParticipant**
- **Write:** ✗ **FORBIDDEN — 403 from assertActiveParticipant**

#### Mode 4: FOREIGN_BUSINESS
- **Who:** User or Customer of another Business
- **List:** ✓ Can list; sees only conversations from their own Business (empty if none)
- **Read (detail):** ✗ **NOT_FOUND — 404** (businessId check fails; no info leak)
- **Read (messages):** ✗ **NOT_FOUND — 404**
- **Write:** ✗ **NOT_FOUND — 404**

### 4.2 Implementation Pattern

**For read-only operations (list, get, messages):**

```typescript
const isOwner = context.role === 'OWNER' && context.userId !== null;

if (!isOwner) {
  // Non-owners MUST be participants
  await assertActiveParticipant(tx, conversationId, context);
}
// isOwner skips the check; Owners can read everything

return this.prisma.conversation.findMany({
  where: {
    businessId: context.businessId, // tenant isolation
    deletedAt: null,
    ...(!isOwner ? {
      participants: { some: { /* active participant filter */ } }
    } : {})
  }
});
```

**For write operations (send, edit, delete, manage):**

```typescript
// ALL actors (including OWNER) MUST pass participant check
await assertActiveParticipant(tx, conversationId, context);

// Admin operations add a second check
await assertConversationAdmin(tx, conversationId, context);
```

### 4.3 Enforcement in HTTP

| Operation | Read-Only | Access Check | Error if Failed |
|-----------|-----------|---|---|
| GET /conversations | Yes | isOwner ∨ participant (list only own if not owner) | 200 [] (empty) |
| GET /conversations/:id | Yes | isOwner ∨ participant | 403 or 404 |
| GET /conversations/:id/messages | Yes | isOwner ∨ participant | 403 or 404 |
| POST /conversations/:id/messages | No | assertActiveParticipant | 403 "El actor no participa" |
| PATCH /conversations/:id/messages/:mid | No | assertActiveParticipant + author check | 403 |
| DELETE /conversations/:id/messages/:mid | No | assertActiveParticipant + (author ∨ admin) | 403 |
| POST /conversations | No | createConversation (actor = first participant auto-added) | 201 |
| DELETE /conversations/:id | No | assertConversationAdmin | 403 |
| POST /conversations/:id/participants | No | assertActiveParticipant (add others) | 403 |
| DELETE /conversations/:id/participants/:pid | No | isSelf ∨ assertConversationAdmin | 403 |
| POST /conversations/:id/associations | No | assertConversationAdmin | 403 |

### 4.4 Socket.IO Alignment

Socket.IO `conversation.join` event enforces the same policy:

```typescript
socket.on('conversation.join', async ({ conversationId }) => {
  const context = await this.resolveContext(socket.handshake.auth.token);
  const isOwner = context.role === 'OWNER' && context.userId !== null;
  
  if (!isOwner) {
    await assertActiveParticipant(tx, conversationId, context);
    // Only participants can join the room
  }
  
  socket.join(`conversation:${conversationId}`);
  
  // Return viewerAccess to client for UI state
  return { ok: true, canSend: /* participant check */, mode: 'PARTICIPANT' | 'OWNER_READ_ONLY' };
});
```

**Invariant I-9: Socket.IO events are delivered ONLY to participants + admins in the room.**
- Non-participants and foreign Businesses receive FORBIDDEN or NOT_FOUND on join; no leakage.

---

## 5. Participant Creation (Initial & Dynamic)

### 5.1 Conversation Creation

**Invariant I-10: Actor creating a Conversation becomes its first participant and admin.**

```typescript
async createConversation(auth, { type, participantUserIds, participantCustomerIds }) {
  const context = await resolveContext(auth);
  const actor = this.actorFromContext(context); // User or Customer

  // Create Conversation
  const conversation = await tx.conversation.create({
    data: { businessId: context.businessId, type }
  });

  // Add creator as ADMIN participant
  await tx.conversationParticipant.create({
    data: {
      conversationId: conversation.id,
      businessId: context.businessId,
      ...actor, // userId or customerId
      isAdmin: true // creator is always admin
    }
  });

  // Add requested participants (not admin)
  for (const userId of participantUserIds) {
    await tx.conversationParticipant.create({
      data: {
        conversationId: conversation.id,
        businessId: context.businessId,
        userId,
        membershipBusinessId: context.businessId
        // isAdmin: false (default)
      }
    });
  }

  for (const customerId of participantCustomerIds) {
    await tx.conversationParticipant.create({
      data: {
        conversationId: conversation.id,
        businessId: context.businessId,
        customerId,
        customerBusinessId: context.businessId
        // isAdmin: false (default)
      }
    });
  }
}
```

**Verification:**
- Integration test: owner1 creates conversation; is marked isAdmin
- Integration test: requested participants are NOT admin

### 5.2 Dynamic Participant Addition

**Invariant I-11: Only active participants can add new participants.**

```typescript
async addParticipant(auth, conversationId, participantUserId?, participantCustomerId?) {
  const context = await resolveContext(auth);

  // Actor MUST be an active participant
  await assertActiveParticipant(tx, conversationId, context);

  // Check cardinality (DIRECT vs GROUP)
  const activeCount = await tx.conversationParticipant.count({
    where: { conversationId, leftAt: null, removedAt: null }
  });
  const max = conversation.type === 'DIRECT' ? 2 : 50;
  if (activeCount >= max) throw ConflictException('Cardinality exceeded');

  // Add new participant
  await tx.conversationParticipant.create({
    data: { conversationId, businessId, userId|customerId, ... }
  });
}
```

**Verification:**
- Integration test: non-participants cannot add others (assertActiveParticipant fails)
- Integration test: participants can add others

### 5.3 Participant Removal

**Invariant I-12: Participants can remove themselves; admins can remove others.**

```typescript
async removeParticipant(auth, conversationId, participantId) {
  const context = await resolveContext(auth);
  const target = await tx.conversationParticipant.findFirst({
    where: { id: participantId, conversationId, leftAt: null, removedAt: null }
  });

  const isSelf = (context.userId === target.userId) || (context.customerId === target.customerId);

  if (!isSelf) {
    // Admin removal
    await assertConversationAdmin(tx, conversationId, context);
  }

  // Mark inactive
  if (isSelf) {
    await tx.conversationParticipant.update({
      where: { id: participantId },
      data: { leftAt: now(), isAdmin: false }
    });
  } else {
    await tx.conversationParticipant.update({
      where: { id: participantId },
      data: { removedAt: now(), isAdmin: false }
    });
  }

  // Reassign admin if needed
  if (target.isAdmin && /* other active participants exist */) {
    const successor = /* oldest active participant */;
    await tx.conversationParticipant.update({
      where: { id: successor.id },
      data: { isAdmin: true }
    });
  }
}
```

**Verification:**
- Integration test: owner2 can remove themselves
- Integration test: owner1 (admin) can remove owner2

---

## 6. Commercial Context (Association)

### 6.1 P2: Initial Association on Customer Participant

**Invariant I-13: When a Conversation is created with a Customer participant, a ConversationAssociation (CUSTOMER) is automatically created.**

```typescript
for (const customerId of participantCustomerIds) {
  await tx.conversationParticipant.create({ /* ... */ });

  // P2: Establish commercial context immediately
  await tx.conversationAssociation.create({
    data: {
      conversationId,
      businessId,
      entityType: 'CUSTOMER',
      entityId: customerId,
      changedBy: context.userId,
      reason: 'Automatic association on conversation creation'
    }
  });
}
```

**Why:** A Conversation with a Customer represents a commercial relationship. Messaging does not own Commerce, but it MUST acknowledge the relationship.

**Verification:**
- Integration test: association is present after creation
- Integration test: association links to the Customer

### 6.2 Manual Association (P3+)

**Invariant I-14: Admins can associate Orders, Sales, Products, or Purchases to a Conversation.**

```typescript
async createConversationAssociation(auth, conversationId, entityType, entityId, reason?) {
  const context = await resolveContext(auth);
  await assertConversationAdmin(tx, conversationId, context);

  // Validate entity exists and belongs to Business
  await assertAssociationEntityBelongsToBusiness(tx, businessId, entityType, entityId);

  // Create association
  await tx.conversationAssociation.create({
    data: { conversationId, businessId, entityType, entityId, changedBy: context.userId, reason }
  });
}
```

**Supported entity types:** CUSTOMER, ORDER, SALE, PRODUCT, PURCHASE

**Verification:**
- Integration test: admin can associate an Order
- Integration test: non-admin gets 403

### 6.3 Association Lifecycle

**Invariant I-15: Associations are soft-deactivated, not deleted; history is preserved.**

```
ConversationAssociation
├─ id, conversationId, businessId, entityType, entityId
├─ active: boolean = true (soft deactivation)
├─ changedBy: uuid (who made the change)
├─ reason: string? (why)
├─ createdAt, updatedAt
└─ [NO deletedAt; active flag controls visibility]
```

Deactivation:

```typescript
async deactivateConversationAssociation(auth, conversationId, associationId, reason?) {
  const context = await resolveContext(auth);
  await assertConversationAdmin(tx, conversationId, context);

  const association = await tx.conversationAssociation.findFirst({
    where: { id: associationId, conversationId, active: true }
  });

  await tx.conversationAssociation.update({
    where: { id: associationId },
    data: { active: false, changedBy: context.userId, reason }
  });
}
```

**Verification:**
- Integration test: association is marked active: false
- Listing associations filters by active: true

---

## 7. Invariant Checklist (Verification Rules)

| # | Invariant | Enforced By | Test Coverage | Status |
|---|-----------|-------------|---|---|
| I-1 | Conversation belongs to one Business | Prisma @@unique, SQL queries | messaging-participation.integration-spec | ✓ |
| I-2 | Type immutable; cardinality enforced | ConflictException on create/add/remove | messaging-participation.integration-spec | ✓ |
| I-3 | Soft delete via deletedAt | Query filters; no cascade | (covered by deletion ops) | ✓ |
| I-4 | Participant is User XOR Customer | Application logic | messaging-participation.integration-spec | ✓ |
| I-5 | User participant requires ACTIVE Membership | assertParticipantsBelongToBusiness | messaging.service.spec | ✓ |
| I-6 | Customer participant must exist, activo=true | assertParticipantsBelongToBusiness | messaging-participation.integration-spec | ✓ |
| I-7 | Active participant iff leftAt=NULL AND removedAt=NULL | All active checks | messaging-participation.integration-spec | ✓ |
| I-8 | isAdmin requires OWNER role; one admin per conversation | assertConversationAdmin | messaging.service.spec | ✓ |
| I-9 | Socket.IO events delivered only to participants | Gateway join filter | messaging.gateway.spec | ✓ |
| I-10 | Creator is first participant and admin | createConversation logic | (creation tests) | ✓ |
| I-11 | Only active participants can add others | assertActiveParticipant | messaging.service.spec | ✓ |
| I-12 | Self-remove or admin-remove; reassign admin | removeParticipant logic | messaging.service.spec | ✓ |
| I-13 | Customer participant → auto CUSTOMER association | createConversation P2 block | messaging-participation.integration-spec | ✓ |
| I-14 | Manual association requires admin | assertConversationAdmin | (association tests) | ✓ |
| I-15 | Association deactivation preserves history | active flag; no cascade | (association tests) | ✓ |

---

## 8. Not Defined (Open Details)

The following remain OPEN and do NOT violate these invariants:

- Message sequence, ordering by sequence (not createdAt), idempotency by clientMessageId
- Message read/unread states, read receipts, delivery semantics
- Realtime transport (Socket.IO, polling, SSE, or future)
- Notification rules and channels
- Attachment storage and lifecycle
- Customer linkage to User (optional, not automatic)
- IA assistant participation, permissions, or activation
- Exact RBAC rules for message-specific permissions
- Conversation state machines, closure, or archival

---

## 9. Integration Points

**Workstream 2 (Orders & Sales Integration):** Conversation associations link to Order and Sale. No new invariants are introduced; associations are read-only from Messaging perspective.

**Workstream 3 (Realtime & Notifications):** Socket.IO uses the same access control model (isOwner, assertActiveParticipant, assertConversationAdmin).

**Workstream 4 (IA Assistants):** Assistants, if activated, will be participants with Customer identity or a synthetic User identity (TBD). These invariants do not prevent their future addition.

---

## 10. Glossary

- **Active Participant:** Participant with leftAt = NULL AND removedAt = NULL
- **Business:** Empresa entity (single tenant)
- **Conversation:** Central entity; belongs to one Business; has participants and messages
- **User:** Global identity (Membership.userId)
- **Customer:** Commercial relation (Cliente); does NOT require User identity
- **Membership:** User ↔ Business relation; controls role and status
- **Admin:** Participant with isAdmin = true (conversation-scoped, requires OWNER role)
- **Soft Delete:** Record marked deleted (deletedAt ≠ NULL) but not removed from DB
- **Association:** Link from Conversation to commercial entity (Order, Sale, Customer, etc.)

---

## 11. Authorship & Sign-Off

**Implemented by:** Claude Haiku 4.5 (Workstream 1, feat/messaging-http-ui-recovery)  
**Reviewed by:** (pending Owner review)  
**Approved by:** (pending Owner approval)

**Date:** 2026-10-18  
**Reference:** apps/api/src/messaging/messaging.service.ts (v0.2+), messaging-participation.integration-spec.ts, messaging.service.spec.ts

---

## 12. Document History

| Version | Date | Change | Author |
|---------|------|--------|--------|
| 0.1 | 2026-09-29 | Initial (unwritten; reserved for future) | — |
| 0.2 | 2026-10-18 | Implemented; core conversation and participant invariants defined from code | Claude Haiku 4.5 |
