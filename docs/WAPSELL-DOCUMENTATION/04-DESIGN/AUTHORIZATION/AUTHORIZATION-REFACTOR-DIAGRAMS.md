# Authorization Refactor - Entity Relationship Diagrams

---

## 1. Data Model (Entity-Relationship Diagram)

### Current State (AS-IS)

```
┌─────────────────────────────┐
│        Usuario              │
├─────────────────────────────┤
│ id (PK)                     │
│ email                       │
│ rol: RolUsuario             │ ◄──────── Enum: OWNER | ASISTENTE_LOCAL | PROVEEDOR | REPARTIDOR
│ estadoLegajo                │
│ ...                         │
└────────┬────────────────────┘
         │
         │ 1:N
         │
         ▼
┌─────────────────────────────┐
│   UsuarioPermiso            │
├─────────────────────────────┤
│ id (PK)                     │
│ usuarioId (FK)              │
│ permisoId (FK)              │
│ createdAt                   │
└────────┬────────────────────┘
         │
         │ N:1
         │
         ▼
┌─────────────────────────────┐
│      Permiso                │
├─────────────────────────────┤
│ id (PK)                     │
│ nombre (UNIQUE)             │ ◄─ 'caja.gastos', 'ventas.crear', 'usuarios.gestionar', ...
│ descripcion                 │
│ createdAt                   │
└─────────────────────────────┘

Authorization Flow (AS-IS):
  1. User logs in → JWT contains `rol` (OWNER, ASISTENTE_LOCAL, etc.)
  2. Request to @RequirePermission('ventas.crear') endpoint
  3. PermissionsGuard queries Usuario.usuarioPermisos to load permissions from DB
  4. Guard checks if 'ventas.crear' is in loaded set
  5. Grant or deny access

⚠️  Issues with AS-IS:
  - No role-to-capability mapping (role is informational only)
  - All permission management is flat (no inheritance hierarchy)
  - Difficult to audit role composition (need to manually inspect permission assignments)
  - No way to grant override capabilities per role instance
```

---

### Target State (TO-BE)

```
User
  └─ Membership (1:N per Business)
       └─ RoleGrant (1:1)
            └─ RoleTemplate
                 └─ RoleCapability (1:N)
                      └─ CapabilityDefinition

Detailed diagram:

┌──────────────────────────┐
│         User             │
├──────────────────────────┤
│ id (PK)                  │
│ email                    │
│ nombre                   │
│ ...                      │
└────────┬─────────────────┘
         │
         │ 1:N
         │
         ▼
┌──────────────────────────┐
│     Membership           │
├──────────────────────────┤
│ id (PK)                  │
│ userId (FK)              │
│ businessId (FK) → Empresa│
│ role: RolUsuario         │ ◄─── Denormalized from RoleGrant.roleTemplate.name
│ status: ACTIVE|SUSPENDED │
│ roleGrantId (FK) ──────┐ │
│ createdAt              │ │
└────────┬───────────────┤─┘
         │               │
         │               │ 1:1
         │               │
         │               ▼
         │        ┌──────────────────────────┐
         │        │    RoleGrant            │
         │        ├──────────────────────────┤
         │        │ id (PK)                  │
         │        │ membershipId (FK, UNIQUE)│
         │        │ roleTemplateId (FK)      │
         │        │ createdAt                │
         │        └────────┬─────────────────┘
         │                 │
         │                 │ N:1
         │                 │
         │                 ▼
         │        ┌──────────────────────────┐
         │        │   RoleTemplate           │
         │        ├──────────────────────────┤
         │        │ id (PK)                  │
         │        │ name (UNIQUE)            │ ◄─── 'OWNER', 'ASISTENTE_LOCAL', 'PROVEEDOR', 'REPARTIDOR'
         │        │ description              │
         │        │ empresaId (FK) [NULL]    │ ◄─── Global (Phase 2); tenant-scoped Phase 3+
         │        │ createdAt                │
         │        └────────┬─────────────────┘
         │                 │
         │                 │ 1:N
         │                 │
         │                 ▼
         │        ┌──────────────────────────────┐
         │        │   RoleCapability             │
         │        ├──────────────────────────────┤
         │        │ id (PK)                      │
         │        │ roleTemplateId (FK)          │
         │        │ capabilityDefId (FK)         │
         │        │ createdAt                    │
         │        │ @@unique([roleTemplate,cap]) │
         │        └────────┬─────────────────────┘
         │                 │
         │                 │ N:1
         │                 │
         │                 ▼
         │        ┌──────────────────────────┐
         │        │ CapabilityDefinition     │
         │        ├──────────────────────────┤
         │        │ id (PK)                  │
         │        │ code (UNIQUE)            │ ◄─── 'sales.create', 'users.manage', ...
         │        │ description              │
         │        │ category                 │ ◄─── 'sales', 'inventory', 'users', ...
         │        │ createdAt                │
         │        └─────────────────────────┘
         │
         │ 1:N (Overrides: grants + future denials)
         │
         ▼
┌──────────────────────────────────┐
│   CapabilityGrant                │
├──────────────────────────────────┤
│ id (PK)                          │
│ roleGrantId (FK)                 │
│ capabilityDefId (FK)             │
│ grantType: GRANT | DENY          │ ◄─── Phase 2: GRANT only; Phase 3+: DENY
│ reason (optional)                │ ◄─── Audit trail
│ grantedBy (optional)             │
│ createdAt                        │
│ @@unique([roleGrant, capabilityD])
└──────────────────────────────────┘

Authorization Flow (TO-BE):
  1. User logs in → JWT contains `empresaId` (same as now)
  2. Request to @Authorize('sales.create') endpoint
  3. AuthorizationGuard loads Membership + RoleGrant + CapabilityDef
  4. Guard flattens capabilities:
     a. Start with RoleTemplate.capabilities
     b. Apply CapabilityGrant overrides (GRANT adds, DENY removes)
  5. Check if 'sales.create' is in flattened set
  6. Grant or deny access

✅ Advantages:
  - Role is now a source of truth (RoleTemplate)
  - Capabilities inherited from role (RoleCapability)
  - Per-Membership overrides possible (CapabilityGrant)
  - Future support for denials (CapabilityGrant.grantType)
  - Backward compatible (Membership.role stays populated)
```

---

## 2. Authorization Check Flow

### Current PermissionsGuard (AS-IS)

```
Request with @RequirePermission('ventas.crear')
           │
           ▼
    JwtAuthGuard ✅ (validates JWT signature)
           │
           ▼
   PermissionsGuard.canActivate()
           │
           ├─ Extract metadata: requiredPermission = 'ventas.crear'
           │
           ├─ Load user from request.user (from JWT)
           │
           ├─ Query DB:
           │  SELECT usuarioPermisos
           │  FROM UsuarioPermiso up
           │  JOIN Permiso p ON up.permisoId = p.id
           │  WHERE up.usuarioId = ?
           │  → [{ permiso: { nombre: 'ventas.crear' } }, ...]
           │
           ├─ Flatten permission names: ['ventas.crear', 'usuarios.gestionar', ...]
           │
           ├─ Check: 'ventas.crear' in permissions?
           │  ├─ YES → return true
           │  └─ NO → throw ForbiddenException
           │
           ▼
      Handler or reject
```

### Proposed AuthorizationGuard (TO-BE)

```
Request with @Authorize('sales.create')
           │
           ▼
    JwtAuthGuard ✅ (validates JWT signature)
           │
           ▼
   AuthorizationGuard.canActivate()
           │
           ├─ Extract metadata: requiredCapability = 'sales.create'
           │
           ├─ Load user from request.user (from JWT)
           │
           ├─ Query DB:
           │  SELECT m.*, rg.*, rt.*, rc.*, cg.*
           │  FROM Membership m
           │  LEFT JOIN RoleGrant rg ON m.roleGrantId = rg.id
           │  LEFT JOIN RoleTemplate rt ON rg.roleTemplateId = rt.id
           │  LEFT JOIN RoleCapability rc ON rt.id = rc.roleTemplateId
           │  LEFT JOIN CapabilityDefinition cd ON rc.capabilityDefId = cd.id
           │  LEFT JOIN CapabilityGrant cg ON rg.id = cg.roleGrantId
           │  WHERE m.userId = ? AND m.businessId = ?
           │
           ├─ Flatten capabilities:
           │  ├─ Start: capabilities = Set()
           │  ├─ Add role defaults: for each RoleCapability → add capabilityDef.code
           │  │  capabilities = { 'sales.create', 'sales.view', 'users.manage', ... }
           │  ├─ Apply grants: for each CapabilityGrant (GRANT) → add
           │  │  capabilities = { ..., 'catalog.change_prices' }
           │  └─ Apply denials: for each CapabilityGrant (DENY) → remove (Phase 3+)
           │
           ├─ Check: 'sales.create' in capabilities?
           │  ├─ YES → return true
           │  └─ NO → throw ForbiddenException
           │
           ▼
      Handler or reject
```

---

## 3. Capability Inheritance Example (Execution Trace)

### Scenario: ASISTENTE_LOCAL user with sales.create grant

**Initial state:**
- User: `alice@example.com`
- Membership: userId=alice, businessId=empresa-1, role=ASISTENTE_LOCAL
- RoleGrant: membershipId=mg-1, roleTemplateId=rt-asistente
- RoleTemplate: id=rt-asistente, name=ASISTENTE_LOCAL
- RoleCapability (for ASISTENTE_LOCAL role):
  - rc-1: → `sales.create`
  - rc-2: → `sales.view`
  - rc-3: → `inventory.adjust_stock`
  - ... 4 more
- CapabilityGrant (membership overrides):
  - (none initially)

**Request:** POST /precios → @Authorize('catalog.change_prices')

**Guard execution:**
```
1. Load Membership (alice, empresa-1)
   → role = 'ASISTENTE_LOCAL'
   → roleGrant.roleTemplate.name = 'ASISTENTE_LOCAL'

2. Load RoleCapability for ASISTENTE_LOCAL role:
   capabilities = {
     'sales.create',
     'sales.view',
     'inventory.adjust_stock',
     'customers.manage',
     'catalog.manage_products',
     'orders.manage',
     'cash.register_movement'
   }

3. Load CapabilityGrant overrides:
   (empty)

4. Final flattened set:
   capabilities = {
     'sales.create',
     'sales.view',
     'inventory.adjust_stock',
     'customers.manage',
     'catalog.manage_products',
     'orders.manage',
     'cash.register_movement'
   }

5. Check: 'catalog.change_prices' in capabilities?
   → NOT FOUND
   → throw ForbiddenException("Requires capability: catalog.change_prices")
```

**Response:** 403 Forbidden

---

### Scenario: ASISTENTE_LOCAL + override grant

**After admin grants alice the 'catalog.change_prices' capability:**

**New state:**
- CapabilityGrant added:
  - cg-1: roleGrantId=rg-1, capabilityDefId=cap-pricing, grantType=GRANT, reason="Manager override"

**Request:** POST /precios → @Authorize('catalog.change_prices')

**Guard execution:**
```
1. Load Membership (alice, empresa-1)
   → role = 'ASISTENTE_LOCAL'

2. Load RoleCapability for ASISTENTE_LOCAL:
   capabilities = { 'sales.create', 'sales.view', ... }

3. Load CapabilityGrant overrides:
   for (grant in capabilityGrants) {
     if (grant.grantType === 'GRANT') {
       capabilities.add(grant.capability.code)  // 'catalog.change_prices'
     } else if (grant.grantType === 'DENY') {
       capabilities.delete(grant.capability.code)
     }
   }

4. Final flattened set:
   capabilities = {
     'sales.create',
     'sales.view',
     'inventory.adjust_stock',
     'customers.manage',
     'catalog.manage_products',
     'orders.manage',
     'cash.register_movement',
     'catalog.change_prices'  // ← Added by grant
   }

5. Check: 'catalog.change_prices' in capabilities?
   → FOUND
   → return true
```

**Response:** 200 OK (handler executes)

---

## 4. Migration Data Flow

### Step 1: Create RoleTemplate + CapabilityDefinition

```
Prisma Migration
  ├─ CREATE TABLE RoleTemplate (...)
  ├─ CREATE TABLE CapabilityDefinition (...)
  ├─ CREATE TABLE RoleCapability (...)
  ├─ CREATE TABLE RoleGrant (...)
  ├─ CREATE TABLE CapabilityGrant (...)
  └─ ALTER TABLE Membership ADD roleGrantId (nullable)

Seed Script (seed-role-hierarchy.ts)
  ├─ Create 4 RoleTemplate rows:
  │  ├─ OWNER
  │  ├─ ASISTENTE_LOCAL
  │  ├─ PROVEEDOR
  │  └─ REPARTIDOR
  │
  ├─ Create 13 CapabilityDefinition rows:
  │  ├─ 'cash.register_movement'
  │  ├─ 'sales.create'
  │  ├─ ... (13 total)
  │
  └─ Create RoleCapability edges:
     ├─ OWNER → all 13 capabilities
     ├─ ASISTENTE_LOCAL → 7 capabilities
     ├─ PROVEEDOR → 0 capabilities
     └─ REPARTIDOR → 0 capabilities
```

### Step 2: Backfill RoleGrant for Existing Memberships

```
For each Membership where roleGrant IS NULL:

Before:
┌──────────────────┐       ┌──────────────────┐
│   Membership     │       │   RoleGrant      │
├──────────────────┤       ├──────────────────┤
│ id: m-1          │       │ (does not exist) │
│ userId: u-1      │       │                  │
│ businessId: e-1  │       │                  │
│ role: OWNER      │       │                  │
│ roleGrantId: NULL│       │                  │
└──────────────────┘       └──────────────────┘

After:
┌──────────────────┐       ┌──────────────────┐
│   Membership     │       │   RoleGrant      │
├──────────────────┤       ├──────────────────┤
│ id: m-1          │       │ id: rg-1         │
│ userId: u-1      │       │ membershipId: m-1│
│ businessId: e-1  │───────┼─ roleTemplateId: rt-owner
│ role: OWNER      │       │ createdAt: now   │
│ roleGrantId: rg-1│       │                  │
└──────────────────┘       └──────────────────┘

Backfill Logic (backfill-role-grants.ts):
  FOR m IN SELECT * FROM Membership WHERE roleGrantId IS NULL:
    roleTemplate = SELECT * FROM RoleTemplate WHERE name = m.role
    INSERT INTO RoleGrant (membershipId, roleTemplateId)
    VALUES (m.id, roleTemplate.id)
  ENDFOR
```

### Step 3: Verify Data Integrity

```
Post-Migration Validation (validation test):

  ✅ All Memberships have non-NULL roleGrantId
  ✅ All RoleGrants reference valid RoleTemplate
  ✅ No broken foreign keys (referential integrity)
  ✅ RoleTemplate names match expected values
  ✅ OWNER has 13 RoleCapability entries
  ✅ ASISTENTE_LOCAL has 7 RoleCapability entries
  ✅ CapabilityDefinition.code values are unique
  ✅ No orphaned CapabilityDefinition entries (all referenced by RoleCapability)
```

---

## 5. Guard Sequence Diagram

### Request → Response (Happy Path)

```
Client                    PermissionsGuard         AuthorizationGuard         Prisma                     Handler
  │                             │                         │                        │                       │
  ├─ POST /ventas               │                         │                        │                       │
  │  + JWT token                │                         │                        │                       │
  │  + @RequirePermission       │                         │                        │                       │
  │  + @Authorize               │                         │                        │                       │
  │                             │                         │                        │                       │
  ├────────────────────────────→│                         │                        │                       │
  │                      JwtAuthGuard validates JWT       │                        │                       │
  │                             │                         │                        │                       │
  │                             ├─ canActivate()          │                        │                       │
  │                             │  (extract permission)   │                        │                       │
  │                             │                         │                        │                       │
  │                             ├─────────────────────────┼──→ findUnique()      │
  │                             │   (load Membership)     │  (userId, businessId)│
  │                             │                         │                        │
  │                             │                    ┌────────────────────────┐  │
  │                             │                    │ SELECT m.*, rg.*, rt. │  │
  │                             │                    │ FROM Membership        │  │
  │                             │                    │ WHERE ...              │  │
  │                             │                    └────────────────────────┘  │
  │                             │                         │← { membership: {...} }│
  │                             │                         │                       │
  │                             │ ✅ canActivate() = true  │                       │
  │                             │────────┬────────────────→│                       │
  │                             │        │                 │                       │
  │                             │        │  ✅ canActivate() = true                │
  │                             │        │                  │                       │
  │                             │        └──────────────────┴──────────────────────→│
  │                             │                           │                       │
  │                             │                           │                       ├─ handler()
  │                             │                           │                       │
  │← 200 OK + Response          │                           │                       │
  │                             │                           │                       │
```

### Request → Response (Deny Path)

```
Client                    AuthorizationGuard       Prisma
  │                             │                    │
  ├─ POST /inventario/ajustes   │                    │
  │  + JWT (ASISTENTE_LOCAL)    │                    │
  │  + @Authorize('users.manage')                    │
  │                             │                    │
  ├────────────────────────────→│                    │
  │                      ✅ JwtAuthGuard passes      │
  │                             │                    │
  │                             ├─ canActivate()    │
  │                             │  (extract cap)    │
  │                             │                    │
  │                             ├──────→ findUnique │
  │                             │  (Membership)     │
  │                             │                    │
  │                             │← {..., roleGrant: │
  │                             │  { roleTemplate: │
  │                             │    {capabilities: │
  │                             │     [ 'sales...', │
  │                             │       'inventry..│
  │                             │    ]             │
  │                             │  }}              │
  │                             │                   │
  │                             │ ✅ Flatten caps   │
  │                             │ capabilities = {  │
  │                             │   'sales.create', │
  │                             │   'inventory...', │
  │                             │   ...             │
  │                             │ }                 │
  │                             │                   │
  │                             │ ❌ 'users.manage' │
  │                             │    NOT in set     │
  │                             │                   │
  │← 403 Forbidden              │                   │
  │  "Requires capability:      │                   │
  │   users.manage"             │                   │
```

---

## 6. Role Hierarchy Visualization

### OWNER (Apex Role)

```
OWNER
  ├─ cash.register_movement        (Financial)
  ├─ inventory.adjust_stock        (Inventory)
  ├─ catalog.change_prices         (Catalog)
  ├─ catalog.manage_products       (Catalog)
  ├─ sales.create                  (Sales)
  ├─ sales.view                    (Sales)
  ├─ sales.cancel                  (Sales)
  ├─ users.manage                  (Users)
  ├─ customers.manage              (Customers)
  ├─ purchases.manage              (Purchases)
  ├─ orders.manage                 (Orders)
  ├─ loyalty.manage_rules          (Loyalty)
  └─ payments.manage               (Payments)

Total: 13 capabilities (100%)
```

### ASISTENTE_LOCAL (7/13 - Operational Subset)

```
ASISTENTE_LOCAL
  ├─ cash.register_movement        (Financial)
  ├─ inventory.adjust_stock        (Inventory)
  │  (NO catalog.change_prices)     ❌ Excluded
  ├─ catalog.manage_products       (Catalog)
  ├─ sales.create                  (Sales)
  ├─ sales.view                    (Sales)
  │  (NO sales.cancel)              ❌ Excluded
  │  (NO users.manage)              ❌ Excluded
  ├─ customers.manage              (Customers)
  │  (NO purchases.manage)          ❌ Excluded
  ├─ orders.manage                 (Orders)
  │  (NO loyalty.manage_rules)      ❌ Excluded
  │  (NO payments.manage)           ❌ Excluded

Total: 7 capabilities (54%)
Excluded: 6 (pricing changes, reversals, user mgmt, supplier mgmt, loyalty, payments)
```

### PROVEEDOR & REPARTIDOR (Placeholders)

```
PROVEEDOR
  (No capabilities in Phase 2)
  Future (Phase 3+):
    - purchase_order.view
    - purchase_order.respond
    - payments.view

REPARTIDOR
  (No capabilities in Phase 2)
  Future (Phase 3+):
    - delivery.view_assigned
    - delivery.update_status
```

---

**Diagram Summary:** This visualization set clarifies how the new hierarchy works and provides a reference for implementation and testing.
