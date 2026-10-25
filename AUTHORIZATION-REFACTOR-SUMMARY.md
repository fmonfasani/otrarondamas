# Authorization Refactor (Phase 2 P1-2) - Executive Summary

**Date:** 2026-10-25  
**Code Quality Lead:** Claude Code  
**Status:** Design Complete - Pending Owner Approval  
**Decision References:** D-005, D-006

---

## What This Design Covers

Complete specification for migrating Otra Ronda Más from a flat permission model to a hierarchical role-based authorization system. The design includes:

1. **New Data Models** (5 tables, 1 enum)
2. **Capability Taxonomy** (13 capabilities from existing permissions)
3. **Role Definitions** (4 roles: OWNER, ASISTENTE_LOCAL, PROVEEDOR, REPARTIDOR)
4. **Authorization Contract** (decorator + guard signatures)
5. **Migration Strategy** (backfill, validation, rollback)
6. **Test Plan** (15+ test scenarios)
7. **Risk Assessment** (6 critical/moderate, 4 low)
8. **Visual Diagrams** (ERD, flows, hierarchies)

---

## Key Findings from Current State Analysis

### Existing Authorization System

| Aspect | Details |
|---|---|
| **Roles** | 4 enum values (RolUsuario) — OWNER, ASISTENTE_LOCAL, PROVEEDOR, REPARTIDOR |
| **Permissions** | 13 flat entries (Permiso table) — no hierarchy |
| **Assignment Model** | UsuarioPermiso (N:M junction) — each user gets set of permissions |
| **Current Usage** | Only role-based filtering (dossier approval); permission checks are flat (permission name match) |
| **Permission List** | `caja.gastos`, `inventario.ajustes`, `precios.cambiar`, `ventas.crear`, `ventas.anular`, `usuarios.gestionar`, `clientes.gestionar`, `productos.gestionar`, `compras.gestionar`, `pedidos.gestionar`, `fidelizacion.gestionar`, `ventas.ver`, `pagos.gestionar` |
| **Token Claims** | JWT carries `role` + `permisos[]`, but permisos is informational only; PermissionsGuard always queries DB |
| **Enforcement Surface** | 18 files use `@RequirePermission()` decorator; 10 hardcode role checks (`context.role === 'OWNER'`) |

### Gaps Identified

1. **No role → permission hierarchy** — ASISTENTE_LOCAL hardcoded to 3 permissions; OWNER has all; no clear mapping
2. **Flat permission catalog** — No way to grant override permissions per user/role instance
3. **Role is informational only** — Membership.role exists but doesn't affect authorization (only affects dossier, UI)
4. **Difficult to audit** — Must manually inspect UsuarioPermiso table to know what a user can do; no role-based view
5. **No support for future refinement** — Adding role variants (MANAGER, SUPERVISOR, etc.) requires schema change + code changes

---

## New Models (TO-BE)

### RoleTemplate (Global Role Definitions)

```
RoleTemplate {
  id: UUID (PK)
  name: String (UNIQUE) → 'OWNER', 'ASISTENTE_LOCAL', 'PROVEEDOR', 'REPARTIDOR'
  description: String?
  empresaId: String? (FK) → NULL (global Phase 2; tenant-scoped Phase 3+)
  createdAt, updatedAt
}
```

### CapabilityDefinition (Fine-Grained Capabilities Catalog)

```
CapabilityDefinition {
  id: UUID (PK)
  code: String (UNIQUE) → 'sales.create', 'users.manage', 'inventory.adjust_stock', etc.
  description: String?
  category: String? → 'sales', 'inventory', 'users', 'catalog', 'cash', 'orders', 'loyalty', 'purchases', 'customers', 'payments'
  createdAt, updatedAt
}

13 capabilities in Phase 2 P1-2:
  - cash.register_movement (financial)
  - inventory.adjust_stock (inventory)
  - catalog.change_prices (pricing)
  - catalog.manage_products (products)
  - sales.create (sales)
  - sales.view (sales)
  - sales.cancel (sales)
  - users.manage (users)
  - customers.manage (customers)
  - purchases.manage (purchases)
  - orders.manage (orders)
  - loyalty.manage_rules (loyalty)
  - payments.manage (payments)
```

### RoleCapability (Role → Capability Assignment)

```
RoleCapability {
  id: UUID (PK)
  roleTemplateId: String (FK)
  capabilityDefId: String (FK)
  createdAt
  @@unique([roleTemplateId, capabilityDefId])
}

Maps role defaults:
  OWNER → all 13 capabilities
  ASISTENTE_LOCAL → 7 capabilities (operational subset)
  PROVEEDOR → 0 capabilities (placeholder)
  REPARTIDOR → 0 capabilities (placeholder)
```

### RoleGrant (Membership → Role Assignment)

```
RoleGrant {
  id: UUID (PK)
  membershipId: String (FK, UNIQUE) → 1:1 with Membership
  roleTemplateId: String (FK)
  createdAt, updatedAt
}

Replaces implicit role; enables future role changes per Membership.
```

### CapabilityGrant (Membership-Level Overrides)

```
CapabilityGrant {
  id: UUID (PK)
  roleGrantId: String (FK)
  capabilityDefId: String (FK)
  grantType: enum (GRANT | DENY) → Phase 2: GRANT only; Phase 3+: DENY
  reason: String? → Audit trail
  grantedBy: String? → User ID who granted
  createdAt, updatedAt
  @@unique([roleGrantId, capabilityDefId])
}

Enables per-Membership exceptions:
  - Grant capability not in role (e.g., ASISTENTE_LOCAL gets 'catalog.change_prices')
  - Deny capability from role (Phase 3+)
```

---

## Authorization Matrix

### Role → Capability Inheritance

```
┌──────────────────────────┬───────┬──────────────┬───────────┬────────────┐
│ Capability               │ OWNER │ ASISTENTE_L  │ PROVEEDOR │ REPARTIDOR │
├──────────────────────────┼───────┼──────────────┼───────────┼────────────┤
│ cash.register_movement   │  ✅   │      ✅      │     ❌    │     ❌     │
│ inventory.adjust_stock   │  ✅   │      ✅      │     ❌    │     ❌     │
│ catalog.change_prices    │  ✅   │      ❌      │     ❌    │     ❌     │
│ catalog.manage_products  │  ✅   │      ✅      │     ❌    │     ❌     │
│ sales.create             │  ✅   │      ✅      │     ❌    │     ❌     │
│ sales.view               │  ✅   │      ✅      │     ❌    │     ❌     │
│ sales.cancel             │  ✅   │      ❌      │     ❌    │     ❌     │
│ users.manage             │  ✅   │      ❌      │     ❌    │     ❌     │
│ customers.manage         │  ✅   │      ✅      │     ❌    │     ❌     │
│ purchases.manage         │  ✅   │      ❌      │     ❌    │     ❌     │
│ orders.manage            │  ✅   │      ✅      │     ❌    │     ❌     │
│ loyalty.manage_rules     │  ✅   │      ❌      │     ❌    │     ❌     │
│ payments.manage          │  ✅   │      ❌      │     ❌    │     ❌     │
└──────────────────────────┴───────┴──────────────┴───────────┴────────────┘

OWNER:             13/13 (100%)
ASISTENTE_LOCAL:    7/13 (54%) — excludes: pricing, cancellations, user mgmt, supplier mgmt, loyalty, payments
PROVEEDOR:          0/13  (0%)  — placeholder for Phase 3+
REPARTIDOR:         0/13  (0%)  — placeholder for Phase 3+
```

### Capability Mapping (Old Permissions → New Codes)

```
caja.gastos                   → cash.register_movement
inventario.ajustes            → inventory.adjust_stock
precios.cambiar               → catalog.change_prices
ventas.crear                  → sales.create
ventas.anular                 → sales.cancel
usuarios.gestionar            → users.manage
clientes.gestionar            → customers.manage
productos.gestionar           → catalog.manage_products
compras.gestionar             → purchases.manage
pedidos.gestionar             → orders.manage
fidelizacion.gestionar        → loyalty.manage_rules
ventas.ver                    → sales.view
pagos.gestionar               → payments.manage
```

---

## Decorator & Guard Contract

### @Authorize(capability) Decorator (NEW)

```typescript
export const CAPABILITY_KEY = 'capabilityRequerida';

/**
 * Marks a handler as restricted to users who hold the given capability
 * (hierarchical check via RoleGrant + CapabilityGrant).
 *
 * Must be combined with JwtAuthGuard + AuthorizationGuard.
 * This decorator alone restricts nothing.
 */
export const Authorize = (capability: string) => 
  SetMetadata(CAPABILITY_KEY, capability);

// Usage (Phase P1-3):
@Authorize('sales.create')
@Post()
async createSale(...) { }
```

### AuthorizationGuard (NEW)

**Replaces PermissionsGuard gradually (both coexist in Phase 2).**

```typescript
@Injectable()
export class AuthorizationGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Extract required capability from @Authorize metadata
    const requiredCapability = ...;
    
    // 2. If no metadata → authentication-only (no capability check)
    if (!requiredCapability) return true;
    
    // 3. Load Membership + RoleGrant + capabilities from DB
    const membership = await prisma.membership.findUnique({
      include: {
        roleGrant: {
          include: {
            roleTemplate: { include: { capabilities: {...} } },
            capabilityGrants: {...}
          }
        }
      }
    });
    
    // 4. Flatten capabilities: role defaults + grants - denials
    capabilities = new Set<string>();
    membership.roleGrant?.roleTemplate.capabilities.forEach(rc => {
      capabilities.add(rc.capabilityDef.code);
    });
    membership.roleGrant?.capabilityGrants.forEach(cg => {
      if (cg.grantType === 'GRANT') {
        capabilities.add(cg.capability.code);
      } else {
        capabilities.delete(cg.capability.code);
      }
    });
    
    // 5. Check & return
    if (!capabilities.has(requiredCapability)) {
      throw new ForbiddenException(`Requires capability: ${requiredCapability}`);
    }
    return true;
  }
}
```

### Backward Compatibility

```typescript
// Phase 2 P1-2 & P1-3: Both guards coexist
@UseGuards(JwtAuthGuard, PermissionsGuard, AuthorizationGuard)
@RequirePermission('ventas.crear')  // Legacy (Phase 2)
@Authorize('sales.create')           // New (Phase P1-3+)
@Post()
async createSale(...) { }

// Phase 3: PermissionsGuard deprecated (warning)
// Phase 4+: PermissionsGuard removed
```

---

## Migration Workflow

### Phase 2 P1-2 (This Design)

1. **Create Prisma migration** (5 new tables, 1 enum, new Membership.roleGrantId column)
2. **Seed RoleTemplate entities** (4 global roles with fixed capability sets)
3. **Seed CapabilityDefinition entities** (13 capabilities)
4. **Seed RoleCapability junctions** (role → capability mappings)
5. **Backfill RoleGrant** (for all existing Memberships, map role → RoleTemplate)
6. **Validate data integrity** (no orphans, all counts correct)
7. **Preserve old tables** (Permiso, UsuarioPermiso remain live)

### Phase 2 P1-3 (Not in this design)

1. Define & implement @Authorize decorator
2. Define & implement AuthorizationGuard
3. Update @CurrentUser extractor (optional: include capabilities)
4. Gradually replace @RequirePermission → @Authorize in controllers
5. Add tests for hierarchical inheritance + overrides

### Phase 3+ (Future)

1. Deprecate @RequirePermission (add lint rule, show warnings)
2. Archive old Permiso/UsuarioPermiso tables (no active code uses them)
3. Enable CapabilityGrantType.DENY (explicit denials)
4. Support tenant-scoped RoleTemplate (empresaId != NULL)
5. Support role composition (future: N:M role assignment)

---

## Test Coverage (15+ Scenarios)

### Unit (3)

- ✅ RoleTemplate seed: 4 roles created, correct names
- ✅ CapabilityDefinition seed: 13 capabilities created, codes unique
- ✅ RoleCapability junction: OWNER has 13, ASISTENTE_LOCAL has 7

### Integration (12)

**Baseline (4):**
- ✅ OWNER can access endpoint requiring `sales.create`
- ✅ ASISTENTE_LOCAL can access endpoint requiring `sales.create`
- ✅ ASISTENTE_LOCAL cannot access endpoint requiring `users.manage`
- ✅ PROVEEDOR cannot access any operational endpoint

**Overrides (4):**
- ✅ ASISTENTE_LOCAL + grant for `catalog.change_prices` can access pricing
- ✅ ASISTENTE_LOCAL + deny for `sales.create` cannot access sales (Phase 3+)
- ✅ CapabilityGrant persists across requests (DB source of truth)
- ✅ Multiple CapabilityGrants on membership union correctly

**Guard Behavior (4):**
- ✅ Endpoints without @Authorize allow auth-only (no capability check)
- ✅ Membership status SUSPENDED → ForbiddenException
- ✅ Customer identity (`type: 'cliente'`) → ForbiddenException
- ✅ Invalid capability code → graceful error (logged or 400)

### Contract (3)

- ✅ @RequirePermission ('ventas.crear') still works with PermissionsGuard
- ✅ PermissionsGuard + AuthorizationGuard can coexist
- ✅ JWT payload backward compatible (still includes permisos[])

---

## Risk Assessment Summary

### Critical/Moderate Risks (6)

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Data inconsistency: Membership.role ≠ RoleGrant.roleTemplate.name | Medium | High | Constraint + validation test; sync job Phase 3 |
| Capability code mismatch in decorator vs table | Low | High | Lint rule + CapabilityDefinition lookup at boot |
| Missing capabilities in seed | Medium | Medium | Seed validation test; migration checklist |
| Forgot to backfill RoleGrant | Medium | High | Defensive null-coalescing; mandatory flag |
| Legacy @RequirePermission + new @Authorize double-check | Low | Low | Deprecation warning; code review |
| Membership status not checked | Low | Medium | Guard checks `status !== 'ACTIVE'` |

### Low Risks (4)

- Performance regression (unlikely; guard query ~5ms slower than old one) → Profile & index
- JWT `permisos[]` becomes stale (clients trust JWT instead of DB check) → Documentation
- Capability renaming breaks auth checks → Alias table Phase 3
- Custom role creation before Phase 3 exists → Document limitations

---

## Implementation Checklist (Phase 2 P1-2 Only)

### Deliverables

- [x] Design document (this suite of 3 files + diagrams)
- [x] Capability taxonomy (13 capabilities, mapping from old permissions)
- [x] Role definitions (4 roles, inheritance matrix)
- [x] Data models (Prisma schema, 5 tables, 1 enum)
- [x] Migration SQL (create tables, indexes, constraints)
- [x] Seed scripts (RoleTemplate, CapabilityDefinition, RoleCapability)
- [x] Backfill script (RoleGrant for existing Memberships)
- [x] Validation script (15 data integrity checks)
- [x] Decorator pseudocode (@Authorize signature)
- [x] Guard pseudocode (AuthorizationGuard logic)
- [x] Test plan (15+ scenarios, unit/integration/contract)
- [x] Risk assessment (10 risks, probability/impact/mitigation)
- [x] Visual diagrams (ERD, flows, hierarchies, execution traces)

### In Scope (Phase 2 P1-2)

- ✅ Data modeling
- ✅ Backfill & validation
- ✅ Migration scripts
- ✅ Design documentation

### Out of Scope (Phases P1-3+)

- ❌ Implement AuthorizationGuard
- ❌ Implement @Authorize decorator
- ❌ Replace @RequirePermission in controllers
- ❌ Delete old tables
- ❌ Custom roles or role composition
- ❌ Explicit denials

---

## Key Decisions (For Owner Approval)

1. **Capability Granularity:** Is `sales.create` + `sales.view` the right split?
   - Current: Separate (follows existing permission split)
   - Owner to confirm: Yes / Suggest coarser grouping

2. **Explicit Denials (Phase 3+):** Support `CapabilityGrant.grantType = 'DENY'`?
   - Current: Placeholder (not Phase 2)
   - Owner to confirm: Yes, proceed with design / No, simplify design

3. **Tenant-Scoped Roles (Phase 3+):** Allow enterprises to create custom RoleTemplates?
   - Current: Global only (RoleTemplate.empresaId = NULL)
   - Owner to confirm: Yes, plan Phase 3 / No, always global

4. **Backward Compatibility Timeline:** How long coexist @RequirePermission?
   - Current: Phase 2 (both) → Phase 3 (deprecation warning) → Phase 4+ (removed)
   - Owner to confirm: Acceptable / Too fast / Too slow

---

## Documents Included

### 1. AUTHORIZATION-REFACTOR-DESIGN-P2-P1-2.md (Main Design)

Comprehensive 11-section design document covering:
- AS-IS analysis (RolUsuario enum, Permiso table, PermissionsGuard)
- TO-BE models (RoleTemplate, CapabilityDefinition, RoleGrant, CapabilityGrant)
- Capability taxonomy (13 items with mapping)
- Role definitions (4 roles with inheritance)
- Decorator & guard contract
- Migration strategy (backfill, validation)
- Test coverage (15+ scenarios)
- Assumptions & decisions
- Risk assessment (10 risks)
- Implementation checklist
- 4 open questions for owner approval

### 2. AUTHORIZATION-REFACTOR-DIAGRAMS.md (Visual Reference)

6 sections of diagrams covering:
- AS-IS vs TO-BE entity relationship diagrams
- Authorization check flow (current PermissionsGuard)
- Authorization check flow (proposed AuthorizationGuard)
- Capability inheritance example (execution trace)
- Migration data flow (3 steps)
- Guard sequence diagram (happy path + deny path)
- Role hierarchy visualization

### 3. AUTHORIZATION-REFACTOR-MIGRATION-SQL.md (Technical Reference)

Complete migration implementation covering:
- Prisma migration SQL (5 tables, 1 enum, indexes, constraints)
- Seed script for RoleTemplate + CapabilityDefinition (13 capabilities)
- Backfill script for existing Memberships → RoleGrant
- Validation script (10 integrity checks)
- Package.json scripts (npm commands)
- Step-by-step execution plan
- Expected output
- Emergency rollback procedure

---

## What Comes Next (After Owner Approval)

1. **Phase 2 P1-2 Implementation:** (1-2 days)
   - Create Prisma migration & seed scripts
   - Run backfill on dev/test databases
   - Validate data integrity
   - Commit to feature branch (no code changes yet, just data model)

2. **Phase 2 P1-3 Implementation:** (3-5 days)
   - Implement @Authorize decorator
   - Implement AuthorizationGuard
   - Update @CurrentUser extractor
   - Add unit & integration tests
   - Gradually migrate controllers to @Authorize

3. **Phase 2 P1-4 Validation:** (2-3 days)
   - E2E test coverage
   - Performance benchmarking
   - Backward compatibility verification
   - Release notes & documentation

---

## Sign-Off

**Owner Approval Required:**

- [ ] Approve capability taxonomy (13 capabilities, names, mappings)
- [ ] Approve role definitions (which capabilities per role)
- [ ] Approve granularity (read/write split vs combined manage)
- [ ] Approve explicit denials scope (Phase 3+ vs earlier)
- [ ] Approve tenant-scoped roles (Phase 3+ vs earlier)
- [ ] Approve backward compatibility timeline
- [ ] Approve risk mitigations
- [ ] **Sign off to proceed with Phase 2 P1-2 implementation**

**Once approved:**
1. Move design documents to `docs/engineering/` (tracked in Git)
2. Create Phase 2 P1-2 implementation task
3. Implementation team to follow migration SQL + seed scripts
4. Code review gate: verify backfill + validation before merge to main

---

**Design Document Suite Version:** 1.0  
**Phase:** 2 P1-2  
**Status:** COMPLETE - PENDING OWNER APPROVAL  
**Last Updated:** 2026-10-25  
**Author:** Claude Code (Authorization Refactor Design Team)

---

## File Locations (Scratchpad)

- **Main Design:** `AUTHORIZATION-REFACTOR-DESIGN-P2-P1-2.md`
- **Diagrams:** `AUTHORIZATION-REFACTOR-DIAGRAMS.md`
- **Migration SQL:** `AUTHORIZATION-REFACTOR-MIGRATION-SQL.md`
- **Summary:** `AUTHORIZATION-REFACTOR-SUMMARY.md` (this file)

**Next:** Move to `docs/engineering/authorization/` once approved.
