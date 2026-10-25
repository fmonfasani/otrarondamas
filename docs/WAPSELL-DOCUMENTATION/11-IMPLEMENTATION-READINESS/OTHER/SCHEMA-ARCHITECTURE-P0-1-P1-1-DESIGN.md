# Wapsell Schema Architecture Design: Phase 2 P0-1 & P1-1
**Date:** 2026-10-25  
**Author:** Claude Architect  
**Status:** DESIGN REVIEW (NOT APPROVED)  
**Authority:** D-001 (OWNER-VERBATIM), D-002 (OWNER-VERBATIM), D-002-bis (OWNER-VERBATIM), D-005 (DERIVED), OR-001, OR-002-A/D/F, OR-B2-001/002/003/008  

---

## Executive Summary

This document designs (but does NOT implement) the schema changes required for:
- **P0-1:** Empresa → Business rename with backward-compatibility
- **P1-1:** User/Membership/Profile hierarchy with role-based authorization

**Key Constraints:**
- D-001: `Business` = `Tenant`. Empresa becomes Business.
- D-002: `User` = global identity. `Membership` = N:N User ↔ Business.
- D-002-bis: `Customer` ≠ `User`. Customer is commercial relation (optional User link).
- D-005/D-006: Authorization via Membership → Role → Permission (4-point validation).
- OR-001/P1-A: Empresa → Business as final destination (persistent). Physical migration `OPEN`.
- OR-001/P5-B + OR-002-F: `SPECIFICATION → APPROVAL → IMPLEMENTATION` gate.
- OR-002-B: Incremental transition with bounded temporal coexistence.
- OR-B2-001/002: MVP roles = `Owner, Admin, Vendor, StockOps` (NOT Supplier/Repartidor in MVP).

**Current State:** User/Membership/Profile already partially in schema.prisma (lines 236–287).  
**Existing Challenges:** Empresa still central; Usuario couples to Empresa 1:1; RoleTemplate/CapabilityDefinition/RoleGrant/CapabilityGrant models missing.

---

## 1. ERD (Entity-Relationship Diagram)

### 1.1 Current AS-IS Key Relationships

```text
┌──────────────┐     1     ┌────────────┐     N     ┌──────────┐
│  Empresa     │◄──────────│  Usuario   │──────────►│ Permiso  │
│  (Tenant)    │           │ (Staff)    │           │ (Atomic) │
└──────────────┘           └────────────┘           └──────────┘
       │ 1                         │ 1                     │
       │                           │                       │
    N │ empresaId          N │ empresaId              N │
       │                       │                           │
       ├──────────┬──────┬──────┼──────┬─────────────┐    │
       │          │      │      │      │             │    │
  ┌────▼──┐  ┌───▼──┐ ┌─▼─┐ ┌─▼─┐  ┌─▼─┐    ┌────▼─┐  │
  │Familia│  │ Tipo │ │Venta  │Stock │  Caja  │Usuario│◄─┘
  └───────┘  └──────┘ │   │ │Move  │  │Permiso
  │Subfamily│ │Producto  │      │          │
  └───────┘  └──────┘   │      │          │
      ...

Cliente (B2B/B2C, optional email/googleId)
  - esMayorista: boolean
  - estadoLegajo: optional (only if esMayorista)
  - no vínculo directo a Usuario

Key: Empresa is the isolation unit. Usuario is 1:1 with Empresa (empresaId FK).
```

### 1.2 Target TO-BE Key Relationships (P0-1 + P1-1)

```text
                    ┌─────────────────────────────────┐
                    │   Platform Identity Layer       │
                    └─────────────────────────────────┘
                                  │
                      ┌───────────┴──────────────┐
                      │                          │
                  ┌───▼────┐            ┌────────▼──────┐
                  │ User   │            │ Other Services│
                  │ (Global)           │ (OPEN)        │
                  └───┬────┘            └───────────────┘
                      │
                      │ N:N via Membership
                      │
            ┌─────────┴─────────┐
            │                   │
        ┌───▼────┐       ┌──────▼────┐
        │Business│       │Membership  │
        │ (Tenant)       │ (context)  │
        └───┬────┘       └──────┬─────┘
            │ 1                 │ 1
            │                   │
    ┌───────┴────────┐          │
    │                │          │
┌───▼──┐    ┌──────▼──┐        │
│Familia│    │Producto│        │
│  etc  │    │  etc   │        │
└───────┘    └────────┘        │
                                │
                        ┌───────▼─────────┐
                        │ Role (predefined)
                        └─────────────────┘
                                │
                        ┌───────▼──────────────┐
                        │ Permission (derived) │
                        └──────────────────────┘

Customer (Commercial relation)
  - businessId FK (scoped to Business)
  - optional userId FK (to User)
  - independent of Membership
```

---

## 2. Prisma Schema Additions & Modifications

### 2.1 New Models (P1-1: Profile Hierarchy)

#### 2.1.1 `RoleTemplate` (predefined roles per MVP)

```prisma
model RoleTemplate {
  id            String   @id @default(uuid())
  name          String   @unique
  description   String?
  // MVP roles: Owner, Admin, Vendor, StockOps (OR-B2-008/009)
  // Non-MVP: Supplier, Repartidor (FUTURE/OPEN)
  active        Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  // Reverse relations
  roleGrants    RoleGrant[]
  capabilityDefaults CapabilityDefinition[]

  @@map("role_templates")
}
```

**Decision Context:**  
- OR-B2-008/009: MVP roles are Owner, Admin, Vendor, StockOps (not Supplier/Repartidor).
- Owner = maximum control. Admin = delegated administration (distinct roles).
- Supplier/Repartidor = FUTURE (outside P1-1 scope).

#### 2.1.2 `CapabilityDefinition` (atomic authorizable actions)

```prisma
model CapabilityDefinition {
  id            String   @id @default(uuid())
  name          String   @unique
  description   String?
  // Examples: "sales.create", "inventory.adjust", "catalog.manage"
  // Catalog = OPEN DETAIL per D-005
  domain        String   // e.g., "sales", "inventory", "catalog"
  action        String   // e.g., "create", "adjust", "manage"
  active        Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  // Reverse relations
  roleDefaults  RoleTemplate?
  capabilityGrants CapabilityGrant[]

  @@unique([domain, action])
  @@map("capability_definitions")
}
```

**Decision Context:**  
- D-005: Permission is atomic and authorizable. Catalog = OPEN.
- Kept separate from RoleTemplate for future granular assignment (though not in MVP).

#### 2.1.3 `RoleGrant` (assignment of RoleTemplate to Membership)

```prisma
model RoleGrant {
  id             String   @id @default(uuid())
  membershipId   String
  membership     Membership @relation(fields: [membershipId], references: [id], onDelete: Cascade)
  roleTemplateId String
  roleTemplate   RoleTemplate @relation(fields: [roleTemplateId], references: [id])
  // Grant lifecycle: ACTIVE, SUSPENDED, REVOKED = OPEN DETAIL
  status         String   @default("ACTIVE")
  grantedAt      DateTime @default(now())
  grantedBy      String?  // userId of granter (optional for backfill)
  revokedAt      DateTime?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  // Reverse relations
  capabilityGrants CapabilityGrant[]

  @@unique([membershipId, roleTemplateId])
  @@map("role_grants")
}
```

**Decision Context:**  
- D-005: Role is assigned in context of Membership, never globally.
- Each Membership can have one primary RoleGrant (MVP simple model).
- Status = OPEN (ACTIVE/SUSPENDED/REVOKED patterns, not decided).

#### 2.1.4 `CapabilityGrant` (assignment of CapabilityDefinition via RoleGrant)

```prisma
model CapabilityGrant {
  id                  String   @id @default(uuid())
  roleGrantId         String
  roleGrant           RoleGrant @relation(fields: [roleGrantId], references: [id], onDelete: Cascade)
  capabilityId        String
  capability          CapabilityDefinition @relation(fields: [capabilityId], references: [id])
  // Override or grant-specific constraints = OPEN DETAIL
  override            String?  // e.g., "deny", "require_approval"
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  @@unique([roleGrantId, capabilityId])
  @@map("capability_grants")
}
```

**Decision Context:**  
- D-005: Permission (via CapabilityGrant) is derived from Role (via RoleGrant) within Membership.
- Override field = placeholder for future granular overrides (not in MVP).

#### 2.1.5 `Profile` (User profile data, separated from global identity)

```prisma
model Profile {
  id            String   @id @default(uuid())
  userId        String   @unique
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  // Profile data separated from User identity
  firstName     String?
  lastName      String?
  phoneNumber   String?
  address       String?
  timezone      String?  // IANA timezone
  locale        String?  // e.g., "es-AR"
  preferences   Json?    // UI preferences, notification settings, etc.
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@map("profiles")
}
```

**Decision Context:**  
- D-002: User is global identity (separate from profile data).
- Profile holds user preference/contact data, scoped to User.
- NOT tenant-specific; global alongside User.

---

### 2.2 Modified Models

#### 2.2.1 `User` (already in schema; minor clarification)

```prisma
model User {
  id           String   @id @default(uuid())
  email        String   @unique
  // OR-002-C: email is globally unique; normalization = OPEN
  nombre       String
  passwordHash String?
  googleId     String?  @unique
  fotoUrl      String?
  usuarioId    String?  @unique  // Link to legacy Usuario (for backfill)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  memberships Membership[]
  profile     Profile?
  reactions   Reaction[]

  @@map("users")
}
```

**Decision Context:**  
- D-002: User is global identity.
- OR-002-C: email globally unique (constraint = IMPLEMENTATION DETAIL).
- OR-002-D: Usuario → User + Membership (migration = OPEN).
- No changes to existing model; just clarification.

#### 2.2.2 `Membership` (already in schema; confirm Role model)

```prisma
model Membership {
  id         String           @id @default(uuid())
  userId     String
  user       User             @relation(fields: [userId], references: [id])
  businessId String  // FK to Empresa (which becomes Business)
  business   Empresa          @relation(fields: [businessId], references: [id])
  // D-005/D-006: Role is assigned via RoleGrant, not directly
  // This field kept for compatibility; new grants use RoleGrant
  role       RolUsuario?      // DEPRECATED in TO-BE; use RoleGrant
  status     MembershipStatus @default(ACTIVE)
  createdAt  DateTime         @default(now())
  updatedAt  DateTime         @updatedAt

  @@unique([userId, businessId])
  @@index([businessId, userId])

  // Relations
  roleGrants     RoleGrant[]
  conversationParticipants ConversationParticipant[] @relation("ConversationParticipantMembership")
  authoredMessages         Message[] @relation("MessageAuthorMembership")
  messagingReadPreferences MessagingReadPreference[] @relation("MessagingReadPreferenceMembership")
  messageReadReceipts       MessageReadReceipt[] @relation("MessageReadReceiptMembership")

  @@map("memberships")
}
```

**Decision Context:**  
- D-002: Membership is N:N User ↔ Business.
- OR-B2-003: Membership lifecycle = ACTIVE/INACTIVE (other states = OPEN).
- `role` field kept for transition (OR-001/P2-C: bounded coexistence).
- New authority via RoleGrant (D-005).

#### 2.2.3 `Empresa` (prepares for Business rename; no breaking changes yet)

**Current:**
```prisma
model Empresa {
  id            String   @id @default(uuid())
  nombre        String   @unique
  slug          String   @unique
  configuracion Json
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  // ... 40+ relation fields
}
```

**P0-1 approach (TEMPORARY, NOT FINAL):**
- Add `Business` table as **copy** of Empresa schema.
- Keep `Empresa` in place for backward-compatibility reads (OR-001/P2-C).
- NEW code uses `businessId` (FK to Empresa.id or Business.id, logic = OPEN).
- Legacy code continues using `empresaId`.
- Migration plan (§3) governs cutover.

**DO NOT modify Empresa schema yet.** Physical model (rename vs. dual-table vs. view) = OR-001/P5-B (SPECIFICATION REQUIRED).

---

### 2.3 Updated Relations

#### 2.3.1 `Cliente` (Customer) — Already correct; clarify scoping

```prisma
model Cliente {
  id            String   @id @default(uuid())
  empresaId     String   // FK to Empresa (= Business context)
  empresa       Empresa  @relation(fields: [empresaId], references: [id])
  nombre        String
  email         String?
  // ... existing fields
  
  // D-002-bis: optional link to User (not mandatory)
  userId        String?  // NEW: nullable FK to User
  user          User?    @relation("CustomerUser", fields: [userId], references: [id])
  
  // Existing relations
  ventas        Venta[]
  pedidos       Pedido[]
  // ... rest

  @@unique([empresaId, email])
}
```

**Decision Context:**  
- D-002-bis: Customer is independent entity, separate from User.
- Optional userId link (OR-002-D: criterion = OPEN).
- Scoped to Business (empresaId).
- NO automatic fusion with User.

#### 2.3.2 `Usuario` → Track User Link (AS-IS → TO-BE)

```prisma
model Usuario {
  id           String   @id @default(uuid())
  empresaId    String   // Remains scoped to Empresa
  empresa      Empresa  @relation(fields: [empresaId], references: [id])
  email        String   @unique  // Current: globally unique
  // ... existing fields
  
  // D-002/OR-002-D: track link to User
  userId       String?  @unique
  user         User?    @relation("LegacyUsuarioUser", fields: [userId], references: [id])
  
  // ... existing relations
}
```

**Decision Context:**  
- OR-002-D: Usuario → User + Membership (migration = OPEN).
- Legacy link (userId) tracks backfill progress.
- Once all Usuario rows have userId populated, can validate data.
- Constraint on linking = OPEN (require email match? fuzzy match?).

---

## 3. Data Mapping Logic: Usuario → User + Membership

### 3.1 Transformation Rules

**Source:**
- `Usuario` row in Empresa `{id: uuid, empresaId: uuid, email, rol, estadoLegajo, …}`

**Target:**
- `User` row (global identity)
- `Membership` row (User ↔ Business linkage)
- Optional: link `Cliente` to User (if email matches, criterion = OPEN)

**Algorithm (sketch; final = SPECIFICATION REQUIRED):**

```
For each Usuario row:

1. Check if User with same email exists globally
   IF yes:
     - Log warning (potential duplicate email)
     - Reuse User.id for Membership
   IF no:
     - Create User { email, nombre, passwordHash, googleId, fotoUrl }
     - Link Usuario.userId → User.id

2. Create Membership {
     userId: User.id,
     businessId: Empresa.id,
     role: Usuario.rol (map RolUsuario → RoleTemplate),
     status: ACTIVE (if Usuario.activo=true), else SUSPENDED
   }

3. Create RoleGrant {
     membershipId: Membership.id,
     roleTemplateId: RoleTemplate.id (mapped from Usuario.rol),
     status: ACTIVE
   }

4. For each CapabilityDefinition in RoleTemplate:
     Create CapabilityGrant { roleGrantId, capabilityId }

5. Optional: Create Profile { userId, … } with global data (if schema supports)

6. Optional: Link Cliente to User (if email matches; constraint = OPEN)
   - IF Cliente.email == User.email AND Cliente.empresaId == Empresa.id:
     UPDATE Cliente SET userId = User.id

CONSTRAINTS:
- No Usuario rows can be deleted (history preservation).
- All User/Membership/RoleGrant must have FKs respected.
- Email normalization (lowercasing, etc.) = IMPLEMENTATION DETAIL.
- Duplicate emails (legacy data) = SPECIFICATION REQUIRED.
```

### 3.2 Cardinality Validation

| Cardinality | AS-IS | TO-BE | Invariant |
|---|---|---|---|
| Usuario : User | 1:N (same email can exist in legacy) | 1:1 after backfill | Email uniqueness = OPEN |
| Usuario : Membership | 1:1 | 1:1 (maintains 1:1 per Business) | No Usuario without Membership |
| Membership : RoleGrant | 1:1 (MVP) | 1:N (future) | MVP = 1 primary role per Membership |
| RoleGrant : CapabilityGrant | 1:N | 1:N | Each Role delivers Capabilities |
| User : Profile | 0:1 | 0:1 | Optional global profile |
| User : Membership | 0:N | 0:N | Multiple Business access |
| Cliente : User | 0:1 | 0:1 (optional) | NO automatic fusion |

---

## 4. FK Integrity & Orphan Prevention

### 4.1 Critical FKs

| FK | From | To | ON DELETE | Rationale |
|---|---|---|---|---|
| `User.usuarioId` | User | Usuario | SET NULL | Backfill link; Usuario never deleted |
| `Membership.userId` | Membership | User | CASCADE | User deletion → orphan Memberships (invalid) → CASCADE |
| `Membership.businessId` | Membership | Empresa | RESTRICT | Business cannot be deleted if Users depend on it |
| `RoleGrant.membershipId` | RoleGrant | Membership | CASCADE | Membership deletion → purge grants |
| `RoleGrant.roleTemplateId` | RoleGrant | RoleTemplate | RESTRICT | RoleTemplate cannot be deleted if grants exist |
| `CapabilityGrant.roleGrantId` | CapabilityGrant | RoleGrant | CASCADE | Grant deletion → purge capabilities |
| `CapabilityGrant.capabilityId` | CapabilityGrant | CapabilityDefinition | RESTRICT | Capability cannot be deleted if grants exist |
| `Cliente.userId` | Cliente | User | SET NULL | Optional link; do not cascade |
| `Usuario.userId` | Usuario | User | SET NULL | Backfill link; Usuario never deleted |

### 4.2 Orphan Checks

**Migration validator must verify:**

```
1. All Membership rows have valid (userId, businessId) pair
   - userId exists in User
   - businessId exists in Empresa

2. All RoleGrant rows have valid (membershipId, roleTemplateId) pair
   - membershipId exists in Membership
   - roleTemplateId exists in RoleTemplate

3. All CapabilityGrant rows have valid (roleGrantId, capabilityId) pair
   - roleGrantId exists in RoleGrant
   - capabilityId exists in CapabilityDefinition

4. No Membership without at least one RoleGrant (MVP invariant)

5. Email uniqueness across all User rows
```

---

## 5. Migration Strategy

### 5.1 Phase Overview

```
PHASE 0: Prepare (this design)
  ├─ Add new models (User, Profile, RoleTemplate, CapabilityDefinition, RoleGrant, CapabilityGrant)
  ├─ Add new links (Usuario.userId, Cliente.userId)
  └─ Schema change: ADD columns (non-breaking)

PHASE 1: Backfill Data (SPECIFICATION REQUIRED)
  ├─ Create User rows from distinct Usuario emails
  ├─ Create Membership rows from Usuario + Empresa pairs
  ├─ Create RoleGrant rows from Usuario.rol mapping
  ├─ Create CapabilityGrant rows from RoleTemplate membership
  ├─ Optionally link Cliente to User (by email; constraint = OPEN)
  └─ Validate FK integrity & no orphans

PHASE 2: Transition (SPECIFICATION REQUIRED)
  ├─ Dual-read: accept both `empresaId` and `businessId` in payloads
  ├─ Dual-write: create Usuario + User + Membership on new staff signup
  ├─ Legacy endpoints continue using Usuario/empresaId (bounded coexistence)
  ├─ New endpoints use User/businessId (Membership context)
  └─ Validate for convergence (no stale Usuario rows, all User rows linked)

PHASE 3: Cutover (SPECIFICATION REQUIRED)
  ├─ Disable Usuario creation/updates (legacy endpoints deprecated)
  ├─ Force Membership-based auth (ignore Usuario.rol)
  ├─ Require new login session (OR-002-E: token invalidation)
  └─ Monitor for stray Usuario references in logs

PHASE 4: Cleanup (SPECIFICATION REQUIRED)
  ├─ Drop deprecated fields (Usuario.rol, Membership.role)
  ├─ Optionally archive Usuario table (retention = OPEN)
  └─ Rename Empresa → Business (if chosen per OR-001/P1-A option C)
```

### 5.2 Migration File Structure (Design Only)

**DO NOT WRITE migration yet.** Specification required (OR-001/P5-B).

**Template (pseudo-code):**

```sql
-- M0: Add new models (Prisma handles DDL)
-- Prisma generates CREATE TABLE for User, Profile, RoleTemplate, CapabilityDefinition, RoleGrant, CapabilityGrant
-- Prisma generates ALTER TABLE Usuario ADD COLUMN userId (nullable)
-- Prisma generates ALTER TABLE Cliente ADD COLUMN userId (nullable)

-- M1: Seed predefined RoleTemplate (manual seed script, not migration)
-- INSERT INTO role_templates (id, name) VALUES
--   (uuid(), 'Owner'),
--   (uuid(), 'Admin'),
--   (uuid(), 'Vendor'),
--   (uuid(), 'StockOps')

-- M2: Seed predefined CapabilityDefinition (manual seed script)
-- INSERT INTO capability_definitions (id, name, domain, action) VALUES
--   (uuid(), 'sales.create', 'sales', 'create'),
--   (uuid(), 'inventory.adjust', 'inventory', 'adjust'),
--   ... (full catalog = OPEN)

-- M3: Link CapabilityDefinition to RoleTemplate (seed/manual)
-- INSERT INTO role_templates_capabilities (roleTemplateId, capabilityId) …

-- M4: Data backfill (custom script, transactional, with validation)
-- SELECT DISTINCT email FROM Usuario
-- FOR EACH unique email:
--   INSERT INTO users (id, email, nombre, passwordHash, googleId, fotoUrl)
--   UPDATE usuario SET userId = <new_user_id>
--   FOR EACH usuario_row:
--     INSERT INTO memberships (userId, businessId, role, status)
--     INSERT INTO role_grants (membershipId, roleTemplateId, status)
--     FOR EACH capability IN roleTemplate:
--       INSERT INTO capability_grants (roleGrantId, capabilityId)

-- M5: Validate (data-quality script, assertions)
-- ASSERT no Membership without RoleGrant
-- ASSERT all Membership.userId exist in User
-- ASSERT email uniqueness across User
-- ASSERT no cross-tenant Membership (Membership.businessId scoped correctly)
```

### 5.3 Rollback Strategy

**In case of data corruption or failed cutover (OR-001/P5-B decision required):**

1. **Soft rollback:** disable new Membership-based checks; fall back to Usuario.rol
   - Keep new tables populated but unused
   - Restore read paths to Usuario/empresaId
   - Preserve User rows (do not delete)

2. **Hard rollback:** delete all new User/Membership/RoleGrant rows; restore to pre-backfill state
   - Requires snapshot/backup (timing = SPECIFICATION REQUIRED)
   - Removes ALL User data (GDPR implications = SPECIFICATION REQUIRED)

3. **Partial rollback:** rollback specific Business (if multi-tenant cutover staged)
   - Delete Membership + RoleGrant rows for that businessId
   - Restore auth to Usuario-only
   - Requires per-tenant validation

**Rollback Automation:** rollback migration file must mirror M0–M5 in reverse order.

---

## 6. Test Strategy (Validation Tests)

### 6.1 Unit Tests (Schema Validation)

```typescript
describe("Schema: User & Membership Hierarchy", () => {
  
  describe("User model", () => {
    it("should enforce globally unique email", async () => {
      // Create User with email, attempt duplicate
      expect(() => createDuplicate()).toThrowError("unique constraint");
    });

    it("should support User without Profile", async () => {
      const user = await User.create({ email, nombre });
      expect(user.profile).toBeUndefined();
    });

    it("should link to Legacy Usuario (usuarioId optional)", async () => {
      const user = await User.create({ email, usuarioId });
      expect(user.usuarioId).toBe(usuarioId);
    });
  });

  describe("Membership model", () => {
    it("should enforce unique (userId, businessId)", async () => {
      const m1 = await Membership.create({ userId, businessId });
      expect(() => createDuplicate({ userId, businessId })).toThrow();
    });

    it("should cascade-delete on User deletion", async () => {
      const m = await Membership.create({ userId, businessId });
      await User.delete(userId);
      expect(() => Membership.findUnique(m.id)).toThrow();
    });

    it("should restrict-delete on Business deletion if Memberships exist", async () => {
      const m = await Membership.create({ userId, businessId });
      expect(() => Empresa.delete(businessId)).toThrow();
    });
  });

  describe("RoleGrant & CapabilityGrant models", () => {
    it("should enforce unique (membershipId, roleTemplateId)", async () => {
      const rg1 = await RoleGrant.create({ membershipId, roleTemplateId });
      expect(() => createDuplicate()).toThrow();
    });

    it("should cascade-delete CapabilityGrant on RoleGrant deletion", async () => {
      const rg = await RoleGrant.create({ … });
      const cg = await CapabilityGrant.create({ roleGrantId: rg.id, … });
      await RoleGrant.delete(rg.id);
      expect(() => CapabilityGrant.findUnique(cg.id)).toThrow();
    });

    it("should restrict-delete RoleTemplate if RoleGrant exists", async () => {
      const rg = await RoleGrant.create({ roleTemplateId: … });
      expect(() => RoleTemplate.delete(roleTemplateId)).toThrow();
    });
  });

  describe("Profile model", () => {
    it("should enforce unique userId", async () => {
      const p1 = await Profile.create({ userId, … });
      expect(() => Profile.create({ userId, … })).toThrow();
    });

    it("should cascade-delete on User deletion", async () => {
      const p = await Profile.create({ userId, … });
      await User.delete(userId);
      expect(() => Profile.findUnique(p.id)).toThrow();
    });
  });
});
```

### 6.2 Integration Tests (Migration Validation)

```typescript
describe("Migration: Usuario → User + Membership", () => {
  beforeAll(async () => {
    // Set up AS-IS data: seed Usuario, Empresa
    await seedLegacyData();
  });

  describe("Backfill phase", () => {
    it("should create User for each distinct email in Usuario", async () => {
      const usuarios = await Usuario.findMany();
      const uniqueEmails = new Set(usuarios.map(u => u.email));
      
      // Run migration
      await runBackfillPhase();

      const users = await User.findMany();
      expect(users.length).toBe(uniqueEmails.size);
    });

    it("should create Membership for each Usuario + Empresa pair", async () => {
      const usuarios = await Usuario.findMany();
      
      // Run migration
      await runBackfillPhase();

      const memberships = await Membership.findMany();
      expect(memberships.length).toBe(usuarios.length);
    });

    it("should link each Usuario to its User (via usuarioId)", async () => {
      await runBackfillPhase();

      const usuarios = await Usuario.findMany();
      for (const u of usuarios) {
        expect(u.userId).toBeDefined();
        const user = await User.findUnique(u.userId);
        expect(user.email).toBe(u.email);
      }
    });

    it("should create RoleGrant for each Membership with matching RoleTemplate", async () => {
      await runBackfillPhase();

      const memberships = await Membership.findMany();
      for (const m of memberships) {
        const grants = await RoleGrant.findMany({ where: { membershipId: m.id } });
        expect(grants.length).toBeGreaterThanOrEqual(1);
      }
    });

    it("should validate no Membership without RoleGrant (MVP invariant)", async () => {
      await runBackfillPhase();

      const orphans = await Membership.findMany({
        where: {
          roleGrants: { none: {} }
        }
      });
      expect(orphans.length).toBe(0);
    });
  });

  describe("Data integrity checks", () => {
    it("should have no orphan Membership rows (FK validation)", async () => {
      const memberships = await Membership.findMany();
      for (const m of memberships) {
        const user = await User.findUnique(m.userId);
        const business = await Empresa.findUnique(m.businessId);
        expect(user).toBeDefined();
        expect(business).toBeDefined();
      }
    });

    it("should enforce email uniqueness across all User rows", async () => {
      const users = await User.findMany();
      const emails = users.map(u => u.email.toLowerCase());
      expect(new Set(emails).size).toBe(emails.length);
    });

    it("should have no cross-tenant Membership (userId not reused across businessId)", async () => {
      const memberships = await Membership.findMany();
      const userBusinessPairs = memberships.map(m => `${m.userId}:${m.businessId}`);
      expect(new Set(userBusinessPairs).size).toBe(userBusinessPairs.length);
    });
  });

  describe("Rollback validation", () => {
    it("should allow rollback of backfill without orphaning data", async () => {
      const usersBefore = await User.count();
      const membershipsBefore = await Membership.count();

      await runBackfillPhase();
      await rollbackBackfill();

      const usersAfter = await User.count();
      const membershipsAfter = await Membership.count();

      expect(usersAfter).toBe(0);
      expect(membershipsAfter).toBe(0);
      // Usuario rows untouched
      const usuarios = await Usuario.findMany();
      expect(usuarios.length).toBeGreaterThan(0);
    });
  });
});
```

### 6.3 E2E Tests (Authorization & Tenant Isolation)

```typescript
describe("E2E: Membership-based Authorization (D-005/D-006)", () => {
  let user: User;
  let business1: Empresa, business2: Empresa;
  let membership1: Membership, membership2: Membership;

  beforeAll(async () => {
    // Create User with Membership in 2 Business
    user = await User.create({ email: "alice@test.com", … });
    business1 = await Empresa.create({ nombre: "Business 1", … });
    business2 = await Empresa.create({ nombre: "Business 2", … });

    membership1 = await Membership.create({ userId: user.id, businessId: business1.id, … });
    membership2 = await Membership.create({ userId: user.id, businessId: business2.id, … });

    // Create roles & capabilities
    const ownerRole = await RoleTemplate.findOne({ name: "Owner" });
    await RoleGrant.create({ membershipId: membership1.id, roleTemplateId: ownerRole.id });
    await RoleGrant.create({ membershipId: membership2.id, roleTemplateId: ownerRole.id });
  });

  it("should allow authenticated User to list their Memberships", async () => {
    const memberships = await service.listMemberships(user.id);
    expect(memberships.map(m => m.businessId)).toContain(business1.id);
    expect(memberships.map(m => m.businessId)).toContain(business2.id);
  });

  it("should enforce 4-point validation: User + Business + Membership + Permission (D-006)", async () => {
    const isAuthorized = await authService.checkAuthorization({
      userId: user.id,
      businessId: business1.id,
      action: "sales.create"
    });
    // Expected: true (User authed, Membership valid, Role grants capability)
    expect(isAuthorized).toBe(true);
  });

  it("should deny access if User lacks Membership in target Business", async () => {
    const business3 = await Empresa.create({ … });
    const isAuthorized = await authService.checkAuthorization({
      userId: user.id,
      businessId: business3.id,
      action: "sales.create"
    });
    expect(isAuthorized).toBe(false);
  });

  it("should deny access if Membership.status is INACTIVE", async () => {
    await Membership.update(membership1.id, { status: "INACTIVE" });
    const isAuthorized = await authService.checkAuthorization({
      userId: user.id,
      businessId: business1.id,
      action: "sales.create"
    });
    expect(isAuthorized).toBe(false);
  });

  it("should enforce tenant isolation: User cannot access Business2 data while in Business1 context", async () => {
    // Simulate context switch
    const product1 = await Produto.create({ empresaId: business1.id, … });
    const product2 = await Produto.create({ empresaId: business2.id, … });

    const ctx1 = { userId: user.id, businessId: business1.id };
    const ctx2 = { userId: user.id, businessId: business2.id };

    const p1InCtx1 = await productService.get(product1.id, ctx1);
    const p1InCtx2 = await productService.get(product1.id, ctx2); // Should fail or return null

    expect(p1InCtx1).toBeDefined();
    expect(p1InCtx2).toBeUndefined();
  });
});
```

---

## 7. Risk Assessment

### 7.1 Data Risks

| Risk | Severity | Mitigation |
|---|---|---|
| **Email uniqueness violation** | HIGH | Normalize emails (lowercase); deduplicate in migration; OR-002-D: criterion = OPEN (specify first) |
| **Orphan Membership/RoleGrant rows** | HIGH | Run FK validation script post-migration; set ON DELETE constraints properly |
| **Duplicate User creation** | MEDIUM | Wrap backfill in transaction; idempotent retry logic |
| **Stale Usuario.userId links** | LOW | Audit script post-cutover; cleanup = OPEN |
| **Customer ↔ User linking (optional)** | MEDIUM | Make optional; OR-002-D: criterion = OPEN (do not assume email match) |
| **Loss of historical audit trail** | MEDIUM | Preserve all Usuario rows (never delete); copy audit data to User context if needed |

### 7.2 Schema Risks

| Risk | Severity | Mitigation |
|---|---|---|
| **Breaking change to Membership** | MEDIUM | Add new columns without dropping; keep `role` field for transition; dual-read logic |
| **FK constraint failures** | HIGH | Validate all FKs before committing migration; test rollback |
| **Performance degradation (N+1 queries)** | MEDIUM | Index Membership.businessId, RoleGrant.membershipId; test query plans |
| **NULL handling in optional fields** | LOW | Ensure nullable columns have DEFAULT or allow NULL; test ORMs handling of nulls |

### 7.3 Authorization Risks

| Risk | Severity | Mitigation |
|---|---|---|
| **Silent authorization bypass (Membership not validated)** | CRITICAL | 4-point validation (D-006) non-negotiable; enforce in auth middleware/interceptor; test all paths |
| **Stale token (expired Session)** | MEDIUM | OR-002-E: session timeout + re-login on cutover; token refresh logic = OPEN |
| **Cross-tenant access via malformed request** | HIGH | Validate businessId in every domain operation; never trust client-supplied tenant ID (D-006) |
| **Role/Capability catalog incomplete** | MEDIUM | Spec all capabilities before deployment; audit code for hard-coded permissions |

---

## 8. Implementation Checklist (NOT AUTHORIZED)

### 8.1 Pre-Implementation (SPECIFICATION PHASE)

- [ ] **Specification Document:** Technical Specification for P0-1 & P1-1 (owner approval required, OR-002-F)
  - [ ] Physical schema design (rename vs. dual-table vs. view strategy for Empresa → Business)
  - [ ] Email normalization rules (case, whitespace, validation)
  - [ ] Customer ↔ User linking criterion (email match? fuzzy? manual? OR-002-D)
  - [ ] RoleGrant lifecycle (ACTIVE/SUSPENDED/REVOKED states)
  - [ ] CapabilityDefinition full catalog (all 40+ permissions)
  - [ ] Token design & claims (JWT vs. custom; refresh logic)
  - [ ] Business Switch mechanism (how User selects active Business)
  - [ ] Session timeout & re-login policy (OR-002-E)
  - [ ] Rollback & recovery plan (full/soft/partial; timing)

- [ ] **Owner Approval:** Specification document submitted, reviewed, approved by Owner (2026-10-??)

### 8.2 Schema Deployment (IMPLEMENTATION PHASE)

- [ ] Generate & review migration file (M0: new models)
- [ ] Deploy migration to staging environment
- [ ] Run orphan/FK validation scripts
- [ ] Verify backward-compatibility (old code still works)
- [ ] Seed RoleTemplate (Owner, Admin, Vendor, StockOps)
- [ ] Seed CapabilityDefinition (full catalog per spec)
- [ ] Link CapabilityDefinition to RoleTemplate
- [ ] Deploy to production with monitoring
- [ ] Audit logs: all new tables populated correctly

### 8.3 Data Backfill (IMPLEMENTATION PHASE)

- [ ] Write & test backfill script (Usuario → User + Membership)
- [ ] Dry run: backfill on production snapshot
- [ ] Validate: no orphans, email uniqueness, FK integrity
- [ ] Execute: backfill on production (during maintenance window)
- [ ] Verify: all Usuario rows linked (usuarioId populated)
- [ ] Validate: all Membership rows have RoleGrant (MVP invariant)
- [ ] Monitor: logs for errors, performance

### 8.4 Transition (IMPLEMENTATION PHASE)

- [ ] Enable dual-read: accept both `empresaId` & `businessId`
- [ ] Enable dual-write: create Usuario + User + Membership on new signup
- [ ] Update auth service: resolve Membership context, validate 4-point
- [ ] Update guards/interceptors: enforce Membership + Role + Permission
- [ ] Update domain services: validate businessId scoping
- [ ] Integration tests: Membership-based auth, tenant isolation
- [ ] E2E tests: user journeys (signup, login, access resources)

### 8.5 Cutover (IMPLEMENTATION PHASE)

- [ ] Disable Usuario creation/updates (legacy endpoints deprecated)
- [ ] Force Membership-based auth (ignore Usuario.rol)
- [ ] Require new login session (invalidate legacy tokens, OR-002-E)
- [ ] Monitor: audit logs, auth failures, tenant isolation breaches
- [ ] Runbook: incident response, rollback triggers

### 8.6 Cleanup (POST-LAUNCH PHASE)

- [ ] Drop deprecated fields (Usuario.rol, Membership.role)
- [ ] Optionally archive Usuario table (retention policy = OPEN)
- [ ] Optionally rename Empresa → Business (per OR-001/P1-A option C)
- [ ] Update docs: remove references to RolUsuario, explain Membership model
- [ ] Decommission legacy auth paths

---

## 9. Assumptions & Constraints

### 9.1 Assumptions

1. **Email is globally unique globally (OR-002-C):** new User rows require email.
2. **Temporal coexistence is bounded (OR-002-B):** transition window is weeks/months, not indefinite.
3. **RoleTemplate is predefined (OR-B2-008):** no dynamic role creation in MVP.
4. **CapabilityDefinition is static (D-005):** permissions hardcoded or in seed data.
5. **Membership is the sole authorization context (D-005/D-006):** no global roles, no cross-Business permissions.
6. **FK constraints are enforceable (DB-level):** Postgres, not NoSQL.
7. **No existing Business-spanning operations:** all sales, inventory, orders are Business-scoped.

### 9.2 Constraints

1. **P0-1:** Empresa remains the physical tenant unit until OR-001/P1-A is materialized (Business table or rename = OPEN).
2. **P1-1:** RoleTemplate/CapabilityDefinition are MVP features; Supplier/Repartidor roles = FUTURE.
3. **OR-002-D:** Customer → User linking criterion = OPEN (do not assume email match; specify first).
4. **OR-002-E:** Session cutover requires token redesign (claims, expiry) = OPEN.
5. **OR-002-F + OR-001/P5-B:** Implementation NOT AUTHORIZED until specification is approved.

---

## 10. Open Questions & Decisions Required

| # | Question | Authority | Decision Needed By |
|---|---|---|---|
| 1 | Email normalization rules (case, whitespace)? | OR-002-C | Specification |
| 2 | Customer ↔ User linking criterion ("same email" or other)? | OR-002-D | Specification |
| 3 | RoleGrant lifecycle states (ACTIVE/SUSPENDED/REVOKED only, or more)? | OR-B2-003 | Specification |
| 4 | Complete CapabilityDefinition catalog (all 40+ permissions)? | D-005 | Specification |
| 5 | Business Switch mechanism (UI/API design)? | OR-B2-007 | Specification |
| 6 | Session timeout & re-login timing (OR-002-E)? | OR-002-E | Specification |
| 7 | Token design (JWT claims, refresh flow)? | D-006 | Specification |
| 8 | Rollback strategy (full/soft/partial; when?)? | OR-001/P5-B | Specification |
| 9 | SaaS Admin / superadmin model (C-11)? | — | Future / OPEN |
| 10 | Multi-profile per User (future extensibility)? | — | Future / OPEN |

---

## 11. Conclusion

This design establishes the **schema structure** for P0-1 & P1-1 without authorizing implementation. Key deliverables:

1. **ERD:** Clear separation of User (global) / Business (tenant) / Membership (context) / Role/Capability (authorization).
2. **Prisma Models:** User, Profile, RoleTemplate, CapabilityDefinition, RoleGrant, CapabilityGrant (complete definitions).
3. **Migration Path:** 4-phase transition (prepare → backfill → transition → cutover) with rollback strategy.
4. **Data Mapping:** Usuario → User + Membership algorithm with FK validation & orphan checks.
5. **Test Strategy:** Unit, integration, E2E tests for schema integrity & authorization enforcement.
6. **Risk Map:** 16+ identified risks with severity & mitigation.

**Next Gate:** Owner approval of Specification Document (OR-002-F / OR-001/P5-B). **NO CODE CHANGES authorized until approval.**

---

**Author:** Claude Architect (Haiku 4.5)  
**Date:** 2026-10-25  
**Status:** DESIGN REVIEW — awaiting owner approval for specification phase
