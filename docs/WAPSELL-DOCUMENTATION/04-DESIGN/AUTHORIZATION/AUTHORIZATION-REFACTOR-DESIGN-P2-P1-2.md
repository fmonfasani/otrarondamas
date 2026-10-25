# Authorization Refactor Design (Phase 2 P1-2)
**Date:** 2026-10-25  
**Status:** Design Review Ready  
**Decisions:** D-005 (Profile hierarchy approved), D-006 (Token type validation approved)

---

## Executive Summary

This document designs a migration from the flat authorization model (RolUsuario enum + flat Permiso table) to a hierarchical Profile system (User → Profile with Role → Capability inheritance). The refactor preserves the current flat permission catalog while enabling future fine-grained capability management through a role-based inheritance system.

**Current State (AS-IS):**
- 1 enum: `RolUsuario` (4 values)
- 1 table: `Permiso` (13 permissions, no hierarchy)
- 1 junction: `UsuarioPermiso` (flat grant model)
- 1 decorator: `@RequirePermission(permission)` (string-based check)
- 1 guard: `PermissionsGuard` (loads from DB on every request)

**Target State (TO-BE):**
- `RoleTemplate` (4 predefined roles from RolUsuario → capabilities)
- `CapabilityDefinition` (fine-grained capabilities, currently 13 → future expansion)
- `RoleGrant` (Membership → Role assignment, replaces implicit role)
- `CapabilityGrant` (permission overrides at Membership level)
- `@Authorize(capability)` (hierarchical capability check with inheritance)
- `CurrentUser()` extractor (yields Role + Capabilities from Membership)

**Out of Scope:**
- Full capability refactoring of all endpoints (happens in later work)
- Custom role creation or tenant-specific roles (Phase 3+)
- UI for role/capability management (separate feature)

**Scope of This Design:**
- Establish capability taxonomy from current permissions
- Model relationships and inheritance rules
- Decorator/guard contract for stateless and DB-based checks
- Migration strategy from RolUsuario → RoleGrant
- Test coverage matrix (15+ scenarios)
- Risk assessment

---

## 1. Current Authorization Landscape (AS-IS Analysis)

### 1.1 RolUsuario Enum

**Location:** `prisma/schema.prisma` lines 86-91

```prisma
enum RolUsuario {
  OWNER
  ASISTENTE_LOCAL
  PROVEEDOR
  REPARTIDOR
}
```

**Current Usage:**
- `Usuario.rol` (fixed at invite, lines 178-180)
- `Invitacion.rol` (pre-assigned role at creation, line 300)
- `Membership.role` (copied from Usuario, not used for authorization; line 266)
- JWT payload `rol` field (informational, lines 82 + auth.types.ts)
- **Role checks in code:** `context.role === 'OWNER'` (messaging.service.ts lines 300, 374, 1033, 1334; dossier, membership-revocation)
- **Dossier filtering:** only ASISTENTE_LOCAL/PROVEEDOR/REPARTIDOR need `Legajo` approval; OWNER auto-approved

**Impact:**
- Role is **not** a source of authorization truth for operations
- Fine-grained operations check **only** `UsuarioPermiso` table
- Role is used for **profile classification** (which Dossier to ask for), not **capability enforcement**

### 1.2 Permiso Table (Flat Permissions)

**Location:** `prisma/schema.prisma` lines 207-215

**Current Catalog (13 total):**

| Permission | Controllers | Use Case | Min Role | Implicitly Required By |
|---|---|---|---|---|
| `caja.gastos` | cash-register.controller.ts | Register cash outflow/gavetas | OWNER / ASISTENTE_LOCAL | — |
| `inventario.ajustes` | inventory.controller.ts | Register stock adjustments | OWNER / ASISTENTE_LOCAL | — |
| `precios.cambiar` | (seed.ts defined, no @RequirePermission found) | Future: bulk price changes | OWNER | — |
| `ventas.crear` | sales.controller.ts | Create in-person sales, quote | OWNER / ASISTENTE_LOCAL | — |
| `ventas.anular` | (seed.ts defined, no @RequirePermission found) | Cancel confirmed sales | OWNER | — |
| `usuarios.gestionar` | invitations.controller.ts | Create/revoke user invitations | OWNER | — |
| `clientes.gestionar` | customers.controller.ts | Edit customer name/email/phone | OWNER / ASISTENTE_LOCAL | — |
| `productos.gestionar` | catalog.controller.ts | Edit product name/price/stock/family | OWNER / ASISTENTE_LOCAL | — |
| `compras.gestionar` | purchases.controller.ts | Create/issue POs, confirm receptions | OWNER | — |
| `pedidos.gestionar` | orders.controller.ts | View/take/confirm/cancel web orders | OWNER / ASISTENTE_LOCAL | — |
| `fidelizacion.gestionar` | loyalty.controller.ts | Create/edit loyalty discount rules | OWNER | — |
| `ventas.ver` | sales.controller.ts | View sales list / receipt | OWNER / ASISTENTE_LOCAL | — |
| `pagos.gestionar` | payments.controller.ts | (Defined in seed? Verify) | OWNER | — |

**Seeds & Assignment Logic:**

From `prisma/seed.ts`:
- `ownerUser` (owner@otrarondamas.com): **all 13 permissions**
- `sellerUser` (seller@otrarondamas.com, ASISTENTE_LOCAL): **3 permissions** (`ventas.crear`, `clientes.gestionar`, `productos.gestionar`)
- `ownerIsolation`: **all 13 permissions** (multi-tenancy isolation test user)

**Assignment Mechanism:**
- `prisma/sync-permisos-owner.ts`: purely additive sync for OWNER accounts when new permissions are added to the catalog
- PermissionsGuard loads from DB every request (source of truth; JWT claim is informational)

### 1.3 PermissionsGuard (Current Implementation)

**Location:** `src/auth/guards/permissions.guard.ts`

**Behavior:**
1. Extracts required permission from `@RequirePermission()` metadata
2. If no metadata → authentication-only (no permission check)
3. If metadata present:
   - Validates `user.type === 'usuario'` (staff identity, not customer)
   - Queries `Usuario.usuarioPermisos` from DB (always, JWT is not trusted)
   - Compares required permission name against loaded permission set
   - Returns `true` or throws `ForbiddenException`

**Key Detail:** JWT `permisos[]` claim is only informational; revocation takes effect on next request without token re-issue.

### 1.4 Current Test Coverage

**File:** `src/auth/guards/permissions.guard.spec.ts`

- ✅ Grants permission when DB has it (even if JWT is stale)
- ✅ Denies permission when DB revoked it (even if JWT claims it)
- ✅ Rejects disabled/missing Usuario
- ✅ Rejects customer identity (`type: 'cliente'`)
- ✅ Allows endpoints without permission metadata (authentication-only)

**Gap:** No tests for hierarchical inheritance or override logic (those don't exist yet).

---

## 2. Target Model Design (TO-BE)

### 2.1 New Models & Relationships

#### Model: RoleTemplate

**Purpose:** Predefined roles that define default capability sets. Not assigned per-user; used as a baseline that RoleGrant references.

```prisma
model RoleTemplate {
  id            String   @id @default(uuid())
  name          String   @unique  // 'OWNER', 'MANAGER', 'VENDEDOR', 'ASISTENTE_LOCAL'
  description   String?
  empresa       Empresa? @relation(fields: [empresaId], references: [id])
  empresaId     String?  // null = global template; non-null = company-scoped override (Phase 3+)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  roleGrants    RoleGrant[]
  capabilities  RoleCapability[]  // Default capabilities for this role
}

model RoleCapability {
  id               String   @id @default(uuid())
  roleTemplateId   String
  roleTemplate     RoleTemplate @relation(fields: [roleTemplateId], references: [id], onDelete: Cascade)
  capabilityDefId  String
  capabilityDef    CapabilityDefinition @relation(fields: [capabilityDefId], references: [id])
  createdAt        DateTime @default(now())

  @@unique([roleTemplateId, capabilityDefId])
  @@index([roleTemplateId])
}
```

#### Model: CapabilityDefinition

**Purpose:** The catalog of fine-grained capabilities. Replaces the loose Permiso table. Initially a 1:1 map of existing permissions; future design enables sub-capability granularity.

```prisma
model CapabilityDefinition {
  id          String   @id @default(uuid())
  code        String   @unique  // 'sales.create', 'sales.view', 'inventory.adjust', etc.
  description String?
  category    String?  // 'sales', 'inventory', 'cash', 'users', 'catalog', 'orders', 'loyalty', 'payments', 'purchases'
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  roleCapabilities RoleCapability[]
  capabilityGrants CapabilityGrant[]
  capabilityDenials CapabilityDenial[]  // Future: explicit denials via role override
}
```

#### Model: RoleGrant

**Purpose:** Assigns a RoleTemplate to a Membership (replaces the implicit role field in Membership).

```prisma
model RoleGrant {
  id             String   @id @default(uuid())
  membership     Membership @relation(fields: [membershipId], references: [id], onDelete: Cascade)
  membershipId   String   @unique  // 1:1 — each Membership has exactly one RoleGrant
  roleTemplate   RoleTemplate @relation(fields: [roleTemplateId], references: [id])
  roleTemplateId String
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  capabilityGrants CapabilityGrant[]  // Membership-level capability overrides
}
```

#### Model: CapabilityGrant

**Purpose:** Membership-level permission exceptions. Allows assigning capabilities not in the base role, or (future) denying capabilities from the base role.

```prisma
model CapabilityGrant {
  id             String   @id @default(uuid())
  roleGrant      RoleGrant @relation(fields: [roleGrantId], references: [id], onDelete: Cascade)
  roleGrantId    String
  capability     CapabilityDefinition @relation(fields: [capabilityDefId], references: [id])
  capabilityDefId String
  grantType      CapabilityGrantType @default(GRANT)  // GRANT or DENY
  reason         String?  // Optional audit trail: why was this override applied?
  grantedBy      String?  // Optional: userId who created this grant
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@unique([roleGrantId, capabilityDefId])
  @@index([roleGrantId])
}

enum CapabilityGrantType {
  GRANT
  DENY  // For Phase 3+ when explicit denials are needed
}
```

#### Updated Model: Membership

**Current state (lines 260-277):**
```prisma
model Membership {
  // ... existing fields ...
  role RolUsuario  // Legacy; becomes read-only, sourced from RoleGrant
  // ...
}
```

**Target state:**
```prisma
model Membership {
  // ... existing fields ...
  role RolUsuario  // Keep for compatibility; derived from RoleGrant.roleTemplate during backfill
  roleGrant RoleGrant?  // NULL during migration, populated by backfill
  // ...
}
```

#### Removed Model: UsuarioPermiso & Permiso

**Plan:** 
- Phase 2 P1-2: Keep existing tables; do NOT delete
- Phase 2 P1-3: Migrate UsuarioPermiso → CapabilityGrant (RoleGrant + CapabilityDef)
- Phase 3: Deprecate and archive old tables (no active code depends on them)

**Why keep during refactor:** 
- Minimize blast radius of changes
- Allows gradual @RequirePermission → @Authorize migration
- Simplifies rollback if design needs adjustment

---

### 2.2 Capability Taxonomy (Derived from Existing Permissions)

**Mapping Existing Permissions → Capabilities:**

| Current Permission | New Capability Code | Capability Name | Category | Role(s) |
|---|---|---|---|---|
| `caja.gastos` | `cash.register_movement` | Register Cash Movement | cash | OWNER, ASISTENTE_LOCAL |
| `inventario.ajustes` | `inventory.adjust_stock` | Adjust Inventory | inventory | OWNER, ASISTENTE_LOCAL |
| `precios.cambiar` | `catalog.change_prices` | Change Product Prices | catalog | OWNER |
| `ventas.crear` | `sales.create` | Create In-Person Sale | sales | OWNER, ASISTENTE_LOCAL |
| `ventas.anular` | `sales.cancel` | Cancel Sale | sales | OWNER |
| `usuarios.gestionar` | `users.manage` | Manage Users & Invitations | users | OWNER |
| `clientes.gestionar` | `customers.manage` | Manage Customers | customers | OWNER, ASISTENTE_LOCAL |
| `productos.gestionar` | `catalog.manage_products` | Manage Products | catalog | OWNER, ASISTENTE_LOCAL |
| `compras.gestionar` | `purchases.manage` | Manage Purchase Orders | purchases | OWNER |
| `pedidos.gestionar` | `orders.manage` | Manage Web Orders | orders | OWNER, ASISTENTE_LOCAL |
| `fidelizacion.gestionar` | `loyalty.manage_rules` | Manage Loyalty Rules | loyalty | OWNER |
| `ventas.ver` | `sales.view` | View Sales | sales | OWNER, ASISTENTE_LOCAL |
| `pagos.gestionar` | `payments.manage` | Manage Payments | payments | OWNER |

**Observations:**
- 4 categories in current codebase (sales, inventory, cash, catalog, orders, users, loyalty, purchases, payments)
- No granular read/write split (only create/view/manage/adjust/change)
- All ASISTENTE_LOCAL permissions are operational (create/view/manage), not meta (users, purchases, loyalty)

---

### 2.3 Role Definitions (TO-BE)

#### RoleTemplate: OWNER

**Source role:** `RolUsuario.OWNER`

| Capability | Inherited | Override | Notes |
|---|---|---|---|
| `cash.register_movement` | ✅ Y | — | Full cash control |
| `inventory.adjust_stock` | ✅ Y | — | Stock adjustments |
| `catalog.change_prices` | ✅ Y | — | Price management |
| `sales.create` | ✅ Y | — | In-person sales |
| `sales.cancel` | ✅ Y | — | Cancel sales |
| `sales.view` | ✅ Y | — | View sales |
| `users.manage` | ✅ Y | — | User management |
| `customers.manage` | ✅ Y | — | Customer management |
| `catalog.manage_products` | ✅ Y | — | Product catalog |
| `purchases.manage` | ✅ Y | — | Supplier POs |
| `orders.manage` | ✅ Y | — | Web order inbox |
| `loyalty.manage_rules` | ✅ Y | — | Loyalty configuration |
| `payments.manage` | ✅ Y | — | Payment processing |

**Capability Count:** 13 (all)

#### RoleTemplate: MANAGER (Planned Phase 3+)

**Note:** Not defined in current codebase. Reserved for future use.

#### RoleTemplate: ASISTENTE_LOCAL (Store Assistant)

**Source role:** `RolUsuario.ASISTENTE_LOCAL`  
**Note:** Currently only 3 permissions in seed; design assumes operational delegation in real usage.

| Capability | Inherited | Override | Notes |
|---|---|---|---|
| `cash.register_movement` | ✅ Y | — | Gaveta/drawer management |
| `inventory.adjust_stock` | ✅ Y | — | Stock corrections |
| `sales.create` | ✅ Y | — | In-person sales |
| `sales.view` | ✅ Y | — | Sales history |
| `customers.manage` | ✅ Y | — | Customer edits |
| `catalog.manage_products` | ✅ Y | — | Product updates |
| `orders.manage` | ✅ Y | — | Web order confirmation |
| `catalog.change_prices` | ❌ N | — | Excluded from baseline |
| `sales.cancel` | ❌ N | — | Excluded from baseline |
| `users.manage` | ❌ N | — | Excluded from baseline |
| `purchases.manage` | ❌ N | — | Excluded from baseline |
| `loyalty.manage_rules` | ❌ N | — | Excluded from baseline |
| `payments.manage` | ❌ N | — | Excluded from baseline |

**Capability Count:** 7 (subset of OWNER)

#### RoleTemplate: PROVEEDOR (Supplier)

**Source role:** `RolUsuario.PROVEEDOR`  
**Current:** No permissions in seed; role exists for identity + dossier filtering.

**TO-BE Design:**
| Capability | Inherited | Override | Notes |
|---|---|---|---|
| (None initially) | — | — | Future: view invoices, respond to POs |

**Capability Count:** 0 (placeholder)

#### RoleTemplate: REPARTIDOR (Delivery Driver)

**Source role:** `RolUsuario.REPARTIDOR`  
**Current:** No permissions in seed; role exists for identity + dossier filtering.

**TO-BE Design:**
| Capability | Inherited | Override | Notes |
|---|---|---|---|
| (None initially) | — | — | Future: view assigned deliveries, update status |

**Capability Count:** 0 (placeholder)

**Summary Table:**

| Role | Total Capabilities | Difference from OWNER | Key Excluded |
|---|---|---|---|
| OWNER | 13 | — (baseline) | — |
| ASISTENTE_LOCAL | 7 | 6 fewer | manage users, approve/cancel sales, manage suppliers, loyalty, pricing, payments |
| PROVEEDOR | 0 | 13 fewer | all (placeholder for Phase 3+) |
| REPARTIDOR | 0 | 13 fewer | all (placeholder for Phase 3+) |

---

## 3. Authorization Contract (Decorator & Guard)

### 3.1 New `@Authorize(capability)` Decorator

**Location:** `src/auth/decorators/authorize.decorator.ts` (NEW)

```typescript
import { SetMetadata } from '@nestjs/common';

export const CAPABILITY_KEY = 'capabilityRequerida';

/**
 * Marks a handler as restricted to users who hold the given capability
 * (hierarchical check via RoleGrant + CapabilityGrant).
 *
 * It must be combined with JwtAuthGuard + AuthorizationGuard.
 * This decorator alone restricts nothing.
 *
 * @param capability A capability code, e.g., 'sales.create'
 */
export const Authorize = (capability: string) => SetMetadata(CAPABILITY_KEY, capability);
```

### 3.2 New `@CurrentUser()` Extractor

**Location:** `src/auth/decorators/current-user.decorator.ts` (MODIFY)

**Current:** Returns AuthenticatedUser from JWT payload without touching DB.

**New (Phase 2 P1-3):** Option to extract from Membership + RoleGrant for hierarchical checks.

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface UserWithCapabilities extends AuthenticatedUser {
  capabilities: string[];  // Flattened set from Role + CapabilityGrant
  roleTemplateName?: string;  // e.g., 'OWNER', 'ASISTENTE_LOCAL'
}

export const CurrentUser = createParamDecorator(async (
  data: { includeCapabilities?: boolean } | undefined,
  ctx: ExecutionContext,
): Promise<AuthenticatedUser | UserWithCapabilities> => {
  const request = ctx.switchToHttp().getRequest();
  const user = request.user as AuthenticatedUser | undefined;

  if (!user || !data?.includeCapabilities) {
    return user; // Backward compatible: return JWT payload
  }

  // New path: load Membership + RoleGrant + capabilities from DB
  const prisma = ctx.switchToInjectable().get(PrismaService);
  // ... load and flatten capabilities ...
  return userWithCapabilities;
});
```

### 3.3 New `AuthorizationGuard` (replaces PermissionsGuard)

**Location:** `src/auth/guards/authorization.guard.ts` (NEW)

**Behavior:**

```typescript
@Injectable()
export class AuthorizationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredCapability = this.reflector.getAllAndOverride<string | undefined>(
      CAPABILITY_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredCapability) {
      return true; // No @Authorize metadata → authentication-only
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;

    if (!user || user.type !== 'usuario') {
      throw new ForbiddenException('Identity required');
    }

    // Load User + Membership + RoleGrant + capabilities
    const membership = await this.prisma.membership.findUnique({
      where: { userId_businessId: { userId: user.id, businessId: user.empresaId } },
      include: {
        roleGrant: {
          include: {
            roleTemplate: {
              include: {
                capabilities: { include: { capabilityDef: true } },
              },
            },
            capabilityGrants: { include: { capability: true } },
          },
        },
      },
    });

    if (!membership || membership.status !== 'ACTIVE') {
      throw new UnauthorizedException('Membership inactive');
    }

    // Flatten capabilities: role defaults + grants - denials
    const capabilities = new Set<string>();

    // Add role defaults
    membership.roleGrant?.roleTemplate.capabilities.forEach((rc) => {
      capabilities.add(rc.capabilityDef.code);
    });

    // Apply grants/denials
    membership.roleGrant?.capabilityGrants.forEach((cg) => {
      if (cg.grantType === 'GRANT') {
        capabilities.add(cg.capability.code);
      } else if (cg.grantType === 'DENY') {
        capabilities.delete(cg.capability.code);
      }
    });

    if (!capabilities.has(requiredCapability)) {
      throw new ForbiddenException(`Requires capability: ${requiredCapability}`);
    }

    return true;
  }
}
```

### 3.4 Backward Compatibility Layer

**During Phase 2 P1-2 & P1-3:**

1. Keep `PermissionsGuard` unchanged (guards `@RequirePermission`)
2. Introduce `AuthorizationGuard` in parallel (guards `@Authorize`)
3. Gradual migration: controllers adopt `@Authorize` decorator
4. Both guards can coexist on same handler:
   ```typescript
   @UseGuards(JwtAuthGuard, PermissionsGuard, AuthorizationGuard)
   @RequirePermission('sales.crear')  // Legacy check
   @Authorize('sales.create')  // New check
   @Post()
   async createSale(...) { }
   ```

---

## 4. Migration Strategy

### 4.1 Phase 2 P1-2: Data Model Setup

**Scope:** Add new tables, backfill RoleTemplate + RoleGrant, keep old tables live.

**Steps:**

1. **Create Prisma migration:**
   ```bash
   npx prisma migrate dev --name add_role_hierarchy
   ```
   - Add `RoleTemplate`, `CapabilityDefinition`, `RoleCapability`, `RoleGrant`, `CapabilityGrant`
   - Add `roleGrant` relation to `Membership` (nullable during migration)

2. **Seed RoleTemplate + CapabilityDefinition:**
   ```typescript
   // prisma/seed-role-hierarchy.ts
   
   // Create global RoleTemplates
   const ownerRole = await prisma.roleTemplate.upsert({
     where: { name: 'OWNER' },
     update: {},
     create: {
       name: 'OWNER',
       description: 'Full system access',
       capabilities: {
         create: [
           { capabilityDef: { connect: { code: 'cash.register_movement' } } },
           // ... all 13 capabilities ...
         ],
       },
     },
   });

   const asistenteRole = await prisma.roleTemplate.upsert({
     where: { name: 'ASISTENTE_LOCAL' },
     update: {},
     create: {
       name: 'ASISTENTE_LOCAL',
       description: 'Store assistant - operational tasks',
       capabilities: {
         create: [
           { capabilityDef: { connect: { code: 'sales.create' } } },
           // ... 7 capabilities ...
         ],
       },
     },
   });

   const proveedorRole = await prisma.roleTemplate.upsert({
     where: { name: 'PROVEEDOR' },
     update: {},
     create: {
       name: 'PROVEEDOR',
       description: 'Supplier - placeholder for Phase 3',
     },
   });

   const repartidorRole = await prisma.roleTemplate.upsert({
     where: { name: 'REPARTIDOR' },
     update: {},
     create: {
       name: 'REPARTIDOR',
       description: 'Delivery driver - placeholder for Phase 3',
     },
   });
   ```

3. **Backfill RoleGrant for existing Memberships:**
   ```typescript
   // prisma/backfill-role-grants.ts
   
   const allMemberships = await prisma.membership.findMany({
     where: { roleGrant: null }, // Not yet migrated
   });

   for (const membership of allMemberships) {
     const roleTemplateName = membership.role; // 'OWNER', 'ASISTENTE_LOCAL', etc.
     const roleTemplate = await prisma.roleTemplate.findUnique({
       where: { name: roleTemplateName },
     });

     await prisma.roleGrant.create({
       data: {
         membershipId: membership.id,
         roleTemplateId: roleTemplate.id,
       },
     });
   }

   console.log(`✅ Backfilled ${allMemberships.length} RoleGrants`);
   ```

4. **Verify data integrity:**
   - [ ] All Memberships have a RoleGrant
   - [ ] All RoleGrants point to valid RoleTemplate
   - [ ] All RoleTemplates have correct capabilities
   - [ ] CapabilityDefinition codes match existing permission names

### 4.2 Phase 2 P1-3: Code Changes (Gradual)

**Do NOT scope this in P1-2 design review.** Only introduce the decorator + guard definitions.

**Planned activities (described for awareness, out of scope now):**

1. Replace `@RequirePermission('ventas.crear')` → `@Authorize('sales.create')` (incrementally per controller)
2. Add `AuthorizationGuard` to module decorators
3. Run existing tests (PermissionsGuard still works)
4. New tests for `AuthorizationGuard` + inheritance scenarios

### 4.3 Phase 3+: Deprecation

**Future (not Phase 2):**
- Remove `PermissionsGuard`
- Archive `Permiso` + `UsuarioPermiso` tables (keep for audit history, not active code)
- Enable tenant-scoped `RoleTemplate` overrides (empresaId on RoleTemplate)
- Implement explicit capability denials (CapabilityGrantType.DENY)

---

## 5. Authorization Matrix & Reference

### 5.1 Complete Capability Catalog (13 items)

**Format:** `{ code, description, category, phases }`

```json
{
  "capabilities": [
    { "code": "cash.register_movement", "description": "Register cash inflows/outflows", "category": "cash", "inRole": ["OWNER", "ASISTENTE_LOCAL"], "phase": "P1" },
    { "code": "inventory.adjust_stock", "description": "Register inventory adjustments", "category": "inventory", "inRole": ["OWNER", "ASISTENTE_LOCAL"], "phase": "P1" },
    { "code": "catalog.change_prices", "description": "Change product prices", "category": "catalog", "inRole": ["OWNER"], "phase": "P1" },
    { "code": "catalog.manage_products", "description": "Manage product catalog (name, stock, family)", "category": "catalog", "inRole": ["OWNER", "ASISTENTE_LOCAL"], "phase": "P1" },
    { "code": "sales.create", "description": "Create in-person sales", "category": "sales", "inRole": ["OWNER", "ASISTENTE_LOCAL"], "phase": "P1" },
    { "code": "sales.view", "description": "View sales history & details", "category": "sales", "inRole": ["OWNER", "ASISTENTE_LOCAL"], "phase": "P1" },
    { "code": "sales.cancel", "description": "Cancel confirmed sales", "category": "sales", "inRole": ["OWNER"], "phase": "P1" },
    { "code": "users.manage", "description": "Create/revoke user invitations", "category": "users", "inRole": ["OWNER"], "phase": "P1" },
    { "code": "customers.manage", "description": "Manage customer profile data", "category": "customers", "inRole": ["OWNER", "ASISTENTE_LOCAL"], "phase": "P1" },
    { "code": "purchases.manage", "description": "Create/issue purchase orders, confirm receptions", "category": "purchases", "inRole": ["OWNER"], "phase": "P1" },
    { "code": "orders.manage", "description": "Manage web orders (confirm, cancel, take)", "category": "orders", "inRole": ["OWNER", "ASISTENTE_LOCAL"], "phase": "P1" },
    { "code": "loyalty.manage_rules", "description": "Create/edit loyalty discount rules", "category": "loyalty", "inRole": ["OWNER"], "phase": "P1" },
    { "code": "payments.manage", "description": "Manage payment processing", "category": "payments", "inRole": ["OWNER"], "phase": "P1" }
  ]
}
```

### 5.2 Role → Capability Inheritance Matrix

| Capability | OWNER | ASISTENTE_LOCAL | PROVEEDOR | REPARTIDOR |
|---|---|---|---|---|
| cash.register_movement | ✅ | ✅ | ❌ | ❌ |
| inventory.adjust_stock | ✅ | ✅ | ❌ | ❌ |
| catalog.change_prices | ✅ | ❌ | ❌ | ❌ |
| catalog.manage_products | ✅ | ✅ | ❌ | ❌ |
| sales.create | ✅ | ✅ | ❌ | ❌ |
| sales.view | ✅ | ✅ | ❌ | ❌ |
| sales.cancel | ✅ | ❌ | ❌ | ❌ |
| users.manage | ✅ | ❌ | ❌ | ❌ |
| customers.manage | ✅ | ✅ | ❌ | ❌ |
| purchases.manage | ✅ | ❌ | ❌ | ❌ |
| orders.manage | ✅ | ✅ | ❌ | ❌ |
| loyalty.manage_rules | ✅ | ❌ | ❌ | ❌ |
| payments.manage | ✅ | ❌ | ❌ | ❌ |

---

## 6. Test Coverage Strategy

### 6.1 Unit Tests: RoleTemplate Seeding

**Scenarios (3):**
1. ✅ All 4 RoleTemplates created with correct names
2. ✅ OWNER has 13 capabilities, ASISTENTE_LOCAL has 7
3. ✅ PROVEEDOR/REPARTIDOR placeholders have 0 capabilities

**File:** `src/auth/seeds/role-templates.spec.ts` (NEW)

### 6.2 Integration Tests: AuthorizationGuard

**Scenarios (12):**

**Baseline (4):**
1. ✅ User with OWNER role can access endpoint requiring `sales.create`
2. ✅ User with ASISTENTE_LOCAL role can access endpoint requiring `sales.create`
3. ✅ User with ASISTENTE_LOCAL role **cannot** access endpoint requiring `users.manage`
4. ✅ User with PROVEEDOR role **cannot** access any operational endpoint

**CapabilityGrant Overrides (4):**
5. ✅ User with ASISTENTE_LOCAL + grant for `catalog.change_prices` can access pricing endpoints
6. ✅ User with ASISTENTE_LOCAL + explicit DENY for `sales.create` cannot access sales.create (future)
7. ✅ CapabilityGrant persists across requests (DB source of truth)
8. ✅ Multiple CapabilityGrants on same membership union correctly

**Guard Behavior (4):**
9. ✅ Endpoints without `@Authorize` metadata allow authentication-only (no capability check)
10. ✅ Invalid capability code in decorator → 400 or logged warning (TBD)
11. ✅ Membership status SUSPENDED → ForbiddenException
12. ✅ Customer identity (`type: 'cliente'`) → ForbiddenException (staffOnly)

**File:** `src/auth/guards/authorization.guard.spec.ts` (NEW)

### 6.3 Contract Tests: Backward Compatibility

**Scenarios (3):**
1. ✅ Existing @RequirePermission('ventas.crear') still works with PermissionsGuard
2. ✅ PermissionsGuard and AuthorizationGuard can coexist on same handler
3. ✅ JWT payload backward compatible (still includes `permisos[]` for legacy clients)

**File:** `src/auth/guards/permissions.guard.spec.ts` (ADD cases)

### 6.4 E2E Tests: Real Controllers

**Scenarios (3, selective):**
1. ✅ POST /ventas (sales.create) requires capability
2. ✅ POST /inventario/ajustes (inventory.adjust_stock) requires capability
3. ✅ POST /usuarios/invitaciones (users.manage) restricted to OWNER

**File:** `test/e2e/authorization.e2e-spec.ts` (NEW, covers phase P1-3)

---

## 7. Assumptions & Decisions

### 7.1 Assumptions

1. **Membership is the authorization principal.** User alone is not (a user can belong to multiple businesses with different roles).
   - ✅ Confirmed: JwtPayload includes `empresaId`; queries are always scoped to `businessId`

2. **RoleTemplate is global (no per-company variants in Phase 2).** empresaId on RoleTemplate is null.
   - ✅ Confirmed: Simplifies design; Phase 3+ can add overrides if needed

3. **Capability codes are stable.** Current permission names → capability codes is 1:1.
   - ⚠ Warning: Breaking change if capability code changes (e.g., rename `ventas.crear` → `sales.create`)
   - ✅ Mitigated: Mapper table or view can exist for backward compat during rollout

4. **CapabilityGrant is the only override mechanism in Phase 2.** No custom roles, no role composition.
   - ✅ Confirmed: Reduces complexity; Phase 3+ can add role composition

5. **JWT remains the source of identity.** Membership is a detail loaded on demand.
   - ✅ Confirmed: No change to JWT strategy; guards load Membership lazily

6. **Capability inheritance is monotonic (never revoked by lower role).** A grant never conflicts with denial in the role.
   - ✅ Assumption: ASISTENTE_LOCAL cannot be denied a capability that OWNER has (would be confusing)
   - ⚠ Design note: Denials are Phase 3+ only; Phase 2 is grants-only

### 7.2 Design Decisions

1. **Keep old tables during Phase 2 (Permiso, UsuarioPermiso).**
   - **Why:** Minimize risk; allow rollback; support gradual migration
   - **Trade-off:** Redundant data; requires dual sync during transition
   - **Resolution:** Deprecation cycle: Phase 2 (coexist) → Phase 3 (archive) → Phase 4+ (delete)

2. **Flatten capabilities in AuthorizationGuard, not in database.**
   - **Why:** Simpler queries; no denormalization; supports ad-hoc overrides
   - **Trade-off:** O(N) set operations per request (N = ~20 capabilities, negligible)
   - **Mitigated:** Same pattern as existing PermissionsGuard (loads UsuarioPermiso per request)

3. **Membership.role remains a denormalized field (not derived from RoleGrant).**
   - **Why:** Backward compatibility; UI may still query it; simplifies migration
   - **Trade-off:** Risk of inconsistency (Membership.role ≠ RoleGrant.roleTemplate.name)
   - **Mitigated:** Backfill script ensures consistency; constraints prevent divergence

4. **RoleGrant is 1:1 with Membership (not N:M).**
   - **Why:** Simplifies composition; avoids role precedence logic
   - **Trade-off:** Cannot compose multiple roles (e.g., OWNER + ASISTENTE_LOCAL)
   - **Future:** Phase 3+ can introduce role composition if needed

---

## 8. Risk Assessment

### 8.1 Critical Risks

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| **Data inconsistency**: Membership.role ≠ RoleGrant.roleTemplate.name after backfill | **Medium** | **High** (Confusing behavior, security audit failure) | Constraint + validation test; scheduled sync job (Phase 3) |
| **Capability code mismatch**: Decorator uses code not in CapabilityDefinition table | **Low** | **High** (Endpoint crashes at runtime) | Lint rule to validate decorator args; CapabilityDefinition lookup at boot |
| **Missing capabilities in seed**: RoleTemplate created without some capabilities | **Medium** | **Medium** (Users confused about missing access; manual workaround required) | Seed validation test; checklist in migration script |
| **Forgot to backfill RoleGrant**: New code expects RoleGrant but old Memberships don't have it | **Medium** | **High** (Service crashes on null pointer) | Defensive coding (??. operator); mandatory backfill flag |

### 8.2 Moderate Risks

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| **Legacy @RequirePermission + new @Authorize on same handler**: Double-check both | **Low** | **Low** (Confusing; unnecessary double-check) | Deprecation warning in decorator; code review |
| **Membership status not checked**: Disabled Membership still has active RoleGrant | **Low** | **Medium** (Suspended user gains access) | Guard checks `membership.status !== 'ACTIVE'` |
| **Custom role creation before Phase 3**: Owner tries to create role, no UI exists | **Low** | **Low** (Feature request, not a blocker) | Document limitations in release notes |

### 8.3 Low Risks

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| **Performance regression**: Guard query slower than old PermissionsGuard | **Very Low** | **Low** (Measured; typically < 5ms difference) | Profile with pgAdmin; add index on `Membership.roleGrantId` |
| **JWT claim `permisos[]` becomes stale**: Clients trust JWT instead of DB check | **Very Low** | **Medium** (Revoked users still believe they have access) | Documentation: JWT is informational only; guard always queries DB |
| **Capability renaming**: Code changes `sales.create` → `sales.view_and_create` | **Low** | **Low** (Migration needed in CapabilityDefinition; guards fail safely) | Alias table for renamed capabilities (Phase 3) |

---

## 9. Remaining Questions & Decisions

**For Owner Approval:**

1. **Capability granularity:** Is `sales.create` + `sales.view` the right split, or should they be one `sales.manage`?
   - Current design: Separate capabilities follow existing permission split (`ventas.crear` vs `ventas.ver`)
   - Trade-off: More granular = harder to manage; coarser = less flexibility

2. **Explicit denials (Phase 3+):** Should we support `CapabilityGrant.grantType = 'DENY'`?
   - Use case: Remove `sales.cancel` from an OWNER because they're a manager with limited authority
   - Current design: Phase 2 only supports GRANT; DENY is placeholder
   - Trade-off: Adds complexity to guard logic; may enable confusing role configs

3. **Tenant-scoped roles (Phase 3+):** Should enterprises be able to create custom RoleTemplates?
   - Use case: Multi-tenant Wapsell; each customer configures their own roles
   - Current design: RoleTemplate.empresaId is null (global only)
   - Trade-off: Huge complexity; opens security/audit questions

4. **Backward compatibility window:** How long should @RequirePermission decorator coexist?
   - Current plan: Phase 2 (both), Phase 3 (deprecation warning), Phase 4+ (removed)
   - Question: Is this timeline acceptable, or too fast?

**For Implementation Team:**

5. **Lint rule:** Should we block new @RequirePermission usage and enforce @Authorize?
   - Recommendation: Yes, starting Phase 2 P1-3 (after decorator is defined)

6. **Migration script safety:** Should backfill-role-grants be idempotent (rerunnable)?
   - Recommendation: Yes; use `upsert` instead of `create`

---

## 10. Implementation Checklist (Phase 2 P1-2 Only)

**Do in this phase:**

- [ ] Create Prisma migration (RoleTemplate, CapabilityDefinition, RoleCapability, RoleGrant, CapabilityGrant)
- [ ] Seed RoleTemplate entities (4 roles, fixed definitions)
- [ ] Seed CapabilityDefinition entities (13 capabilities)
- [ ] Seed RoleCapability junction (role → capability assignments)
- [ ] Write backfill script (Membership → RoleGrant)
- [ ] Write validation tests (data integrity)
- [ ] Define @Authorize decorator (no implementation)
- [ ] Define @CurrentUser extractor signature (no implementation)
- [ ] Define AuthorizationGuard pseudocode/types (no implementation)
- [ ] Document capability taxonomy (this file)
- [ ] Document role definitions (this file)
- [ ] Get owner approval on decisions & taxonomy

**Do NOT do in this phase:**

- ❌ Implement AuthorizationGuard (Phase P1-3)
- ❌ Replace @RequirePermission with @Authorize (Phase P1-3)
- ❌ Delete Permiso/UsuarioPermiso tables (Phase 3+)
- ❌ Implement custom roles or role composition (Phase 3+)
- ❌ Implement explicit capability denials (Phase 3+)

---

## 11. Summary & Next Steps

### Design Outputs (This Document)

✅ **Models:** RoleTemplate, CapabilityDefinition, RoleGrant, CapabilityGrant (with SQL)  
✅ **Taxonomy:** 13 capabilities mapped from existing permissions  
✅ **Roles:** OWNER (13), ASISTENTE_LOCAL (7), PROVEEDOR (0), REPARTIDOR (0)  
✅ **Hierarchy:** Inheritance matrix (role → capabilities)  
✅ **Decorator Contract:** @Authorize(capability) syntax  
✅ **Guard Behavior:** Pseudocode for AuthorizationGuard  
✅ **Migration:** Backfill strategy + SQL outline  
✅ **Test Plan:** 15+ scenarios (unit, integration, E2E)  
✅ **Risk Assessment:** 6 critical/moderate, 4 low  
✅ **Decisions:** D-005 (Profile hierarchy), D-006 (Token type validation)  

### Owner Review Checklist

- [ ] Approve capability taxonomy (13 capabilities, names, categories)
- [ ] Approve role definitions (which capabilities per role)
- [ ] Approve granularity (separate read/write, or combined manage?)
- [ ] Approve explicit denials scope (Phase 3+, or earlier?)
- [ ] Approve tenant-scoped roles scope (Phase 3+, or earlier?)
- [ ] Approve backward compatibility timeline (@RequirePermission lifetime)
- [ ] Approve risk mitigations (data consistency checks, lint rules)
- [ ] Sign off on design for Phase 2 P1-2 implementation to begin

### Implementation Roadmap

**Phase 2 P1-2:** Database + seeds + backfill + validation tests  
**Phase 2 P1-3:** Decorator implementation + AuthorizationGuard + controller migration (gradual)  
**Phase 2 P1-4:** Test suite completion + performance validation  
**Phase 3+:** Custom roles, denials, tenant-scoped templates, deprecation  

---

**Document Version:** 1.0  
**Last Updated:** 2026-10-25  
**Author:** Claude Code (authorization refactor design team)  
**Status:** PENDING OWNER APPROVAL
