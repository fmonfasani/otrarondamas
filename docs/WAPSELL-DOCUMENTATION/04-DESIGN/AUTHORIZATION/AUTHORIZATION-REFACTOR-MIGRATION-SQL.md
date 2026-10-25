# Authorization Refactor - Migration SQL & Seed Scripts

---

## 1. Prisma Migration Schema (Phase 2 P1-2)

**File:** `apps/api/prisma/migrations/[timestamp]_add_role_hierarchy/migration.sql`

```sql
-- Create RoleTemplate (predefined roles)
CREATE TABLE "RoleTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "empresaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoleTemplate_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "RoleTemplate_name_key" UNIQUE("name"),
    CONSTRAINT "RoleTemplate_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Create CapabilityDefinition (fine-grained capabilities catalog)
CREATE TABLE "CapabilityDefinition" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CapabilityDefinition_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CapabilityDefinition_code_key" UNIQUE("code")
);

-- Create RoleCapability junction (role → capabilities)
CREATE TABLE "RoleCapability" (
    "id" TEXT NOT NULL,
    "roleTemplateId" TEXT NOT NULL,
    "capabilityDefId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoleCapability_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "RoleCapability_roleTemplateId_capabilityDefId_key" UNIQUE("roleTemplateId", "capabilityDefId"),
    CONSTRAINT "RoleCapability_roleTemplateId_fkey" FOREIGN KEY ("roleTemplateId") REFERENCES "RoleTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RoleCapability_capabilityDefId_fkey" FOREIGN KEY ("capabilityDefId") REFERENCES "CapabilityDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create index for RoleCapability queries
CREATE INDEX "RoleCapability_roleTemplateId_idx" ON "RoleCapability"("roleTemplateId");

-- Create RoleGrant (Membership → Role assignment)
CREATE TABLE "RoleGrant" (
    "id" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "roleTemplateId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoleGrant_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "RoleGrant_membershipId_key" UNIQUE("membershipId"),
    CONSTRAINT "RoleGrant_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RoleGrant_roleTemplateId_fkey" FOREIGN KEY ("roleTemplateId") REFERENCES "RoleTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Create index for RoleGrant queries
CREATE INDEX "RoleGrant_roleTemplateId_idx" ON "RoleGrant"("roleTemplateId");

-- Create enum for CapabilityGrantType
CREATE TYPE "CapabilityGrantType" AS ENUM ('GRANT', 'DENY');

-- Create CapabilityGrant junction (Membership → capability overrides)
CREATE TABLE "CapabilityGrant" (
    "id" TEXT NOT NULL,
    "roleGrantId" TEXT NOT NULL,
    "capabilityDefId" TEXT NOT NULL,
    "grantType" "CapabilityGrantType" NOT NULL DEFAULT 'GRANT',
    "reason" TEXT,
    "grantedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CapabilityGrant_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CapabilityGrant_roleGrantId_capabilityDefId_key" UNIQUE("roleGrantId", "capabilityDefId"),
    CONSTRAINT "CapabilityGrant_roleGrantId_fkey" FOREIGN KEY ("roleGrantId") REFERENCES "RoleGrant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CapabilityGrant_capabilityDefId_fkey" FOREIGN KEY ("capabilityDefId") REFERENCES "CapabilityDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Create index for CapabilityGrant queries
CREATE INDEX "CapabilityGrant_roleGrantId_idx" ON "CapabilityGrant"("roleGrantId");

-- Add roleGrantId foreign key to Membership (nullable during migration)
ALTER TABLE "Membership" ADD COLUMN "roleGrantId" TEXT;
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_roleGrantId_fkey" FOREIGN KEY ("roleGrantId") REFERENCES "RoleGrant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create index for Membership.roleGrantId queries
CREATE INDEX "Membership_roleGrantId_idx" ON "Membership"("roleGrantId");
```

---

## 2. Seed Script for RoleTemplate + CapabilityDefinition

**File:** `apps/api/prisma/seed-role-hierarchy.ts`

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedRoleHierarchy() {
  console.log('🌱 Seeding role hierarchy...');

  // ===== CAPABILITIES =====
  const capabilities = [
    // Financial
    {
      code: 'cash.register_movement',
      description: 'Register cash inflows/outflows (gavetas, expenses)',
      category: 'cash',
    },
    // Inventory
    {
      code: 'inventory.adjust_stock',
      description: 'Register inventory adjustments and corrections',
      category: 'inventory',
    },
    // Catalog (Pricing + Products)
    {
      code: 'catalog.change_prices',
      description: 'Change product prices (bulk or individual)',
      category: 'catalog',
    },
    {
      code: 'catalog.manage_products',
      description: 'Manage product catalog (name, description, family, images)',
      category: 'catalog',
    },
    // Sales
    {
      code: 'sales.create',
      description: 'Create in-person sales and quote prices',
      category: 'sales',
    },
    {
      code: 'sales.view',
      description: 'View sales history, details, and receipts',
      category: 'sales',
    },
    {
      code: 'sales.cancel',
      description: 'Cancel confirmed sales (reversals)',
      category: 'sales',
    },
    // Users & Invitations
    {
      code: 'users.manage',
      description: 'Create and revoke user invitations',
      category: 'users',
    },
    // Customers
    {
      code: 'customers.manage',
      description: 'Manage customer profiles (name, email, phone, address)',
      category: 'customers',
    },
    // Purchases & Suppliers
    {
      code: 'purchases.manage',
      description: 'Create/issue purchase orders and confirm receptions',
      category: 'purchases',
    },
    // Orders (Web)
    {
      code: 'orders.manage',
      description: 'Manage web orders (confirm, cancel, take from inbox)',
      category: 'orders',
    },
    // Loyalty
    {
      code: 'loyalty.manage_rules',
      description: 'Create and edit automatic loyalty discount rules',
      category: 'loyalty',
    },
    // Payments
    {
      code: 'payments.manage',
      description: 'Manage payment processing and refunds',
      category: 'payments',
    },
  ];

  console.log(`  Creating ${capabilities.length} capability definitions...`);
  const capabilityMap = new Map<string, string>();

  for (const cap of capabilities) {
    const created = await prisma.capabilityDefinition.upsert({
      where: { code: cap.code },
      update: { description: cap.description, category: cap.category },
      create: cap,
    });
    capabilityMap.set(cap.code, created.id);
    console.log(`    ✓ ${cap.code}`);
  }

  // ===== ROLE TEMPLATES =====
  const roles = [
    {
      name: 'OWNER',
      description: 'Business owner - full system access',
      capabilities: [
        'cash.register_movement',
        'inventory.adjust_stock',
        'catalog.change_prices',
        'catalog.manage_products',
        'sales.create',
        'sales.view',
        'sales.cancel',
        'users.manage',
        'customers.manage',
        'purchases.manage',
        'orders.manage',
        'loyalty.manage_rules',
        'payments.manage',
      ],
    },
    {
      name: 'ASISTENTE_LOCAL',
      description: 'Store assistant - operational tasks (sales, inventory, customer mgmt)',
      capabilities: [
        'cash.register_movement',
        'inventory.adjust_stock',
        'catalog.manage_products',
        'sales.create',
        'sales.view',
        'customers.manage',
        'orders.manage',
      ],
    },
    {
      name: 'PROVEEDOR',
      description: 'Supplier - placeholder for Phase 3+',
      capabilities: [],
    },
    {
      name: 'REPARTIDOR',
      description: 'Delivery driver - placeholder for Phase 3+',
      capabilities: [],
    },
  ];

  console.log(`  Creating ${roles.length} role templates...`);

  for (const role of roles) {
    const createdRole = await prisma.roleTemplate.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: {
        name: role.name,
        description: role.description,
      },
    });
    console.log(`    ✓ ${role.name}`);

    // Link capabilities to role
    console.log(`      Linking ${role.capabilities.length} capabilities...`);
    for (const capCode of role.capabilities) {
      const capId = capabilityMap.get(capCode);
      if (!capId) {
        throw new Error(`Capability ${capCode} not found in map`);
      }

      await prisma.roleCapability.upsert({
        where: {
          roleTemplateId_capabilityDefId: {
            roleTemplateId: createdRole.id,
            capabilityDefId: capId,
          },
        },
        update: {},
        create: {
          roleTemplateId: createdRole.id,
          capabilityDefId: capId,
        },
      });
    }
  }

  console.log('✅ Role hierarchy seeded successfully');
}

seedRoleHierarchy()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

---

## 3. Backfill Script for RoleGrant

**File:** `apps/api/prisma/backfill-role-grants.ts`

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Backfills RoleGrant for all existing Memberships that don't have one yet.
 * This maps Membership.role (legacy) to RoleTemplate.
 *
 * Safe to re-run: uses upsert, skips already-migrated Memberships.
 *
 * Usage: npm run prisma:backfill-role-grants
 */
async function backfillRoleGrants() {
  console.log('🔄 Backfilling RoleGrant for existing Memberships...');

  // Fetch all RoleTemplates for quick lookup
  const roleTemplates = await prisma.roleTemplate.findMany();
  const roleTemplateMap = new Map(roleTemplates.map((rt) => [rt.name, rt.id]));

  if (roleTemplateMap.size === 0) {
    throw new Error(
      '❌ No RoleTemplates found. Run seed-role-hierarchy.ts first.',
    );
  }

  // Fetch all Memberships that don't have a RoleGrant yet
  const membershipsToMigrate = await prisma.membership.findMany({
    where: { roleGrantId: null },
    select: {
      id: true,
      userId: true,
      businessId: true,
      role: true,
    },
  });

  console.log(
    `  Found ${membershipsToMigrate.length} Memberships without RoleGrant`,
  );

  if (membershipsToMigrate.length === 0) {
    console.log('  ✅ All Memberships already migrated.');
    return;
  }

  // Backfill RoleGrant for each Membership
  let successCount = 0;
  const errors: Array<{ membershipId: string; error: string }> = [];

  for (const membership of membershipsToMigrate) {
    try {
      const roleTemplateId = roleTemplateMap.get(membership.role);

      if (!roleTemplateId) {
        errors.push({
          membershipId: membership.id,
          error: `Unknown RolUsuario: ${membership.role}`,
        });
        continue;
      }

      // Create RoleGrant
      const roleGrant = await prisma.roleGrant.create({
        data: {
          membershipId: membership.id,
          roleTemplateId,
        },
      });

      // Update Membership.roleGrantId
      await prisma.membership.update({
        where: { id: membership.id },
        data: { roleGrantId: roleGrant.id },
      });

      console.log(
        `  ✓ ${membership.userId} @ ${membership.businessId} → ${membership.role}`,
      );
      successCount++;
    } catch (e) {
      errors.push({
        membershipId: membership.id,
        error: String(e),
      });
    }
  }

  // Summary
  console.log(`\n📊 Backfill Complete:`);
  console.log(`  ✅ Migrated: ${successCount} Memberships`);
  console.log(`  ❌ Errors: ${errors.length}`);

  if (errors.length > 0) {
    console.error(`\n⚠️  Failed Memberships:`);
    errors.forEach((err) => {
      console.error(`    ${err.membershipId}: ${err.error}`);
    });
    process.exit(1);
  }

  console.log('\n✅ RoleGrant backfill complete');
}

backfillRoleGrants()
  .catch((e) => {
    console.error('❌ Backfill failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

---

## 4. Validation Script

**File:** `apps/api/prisma/validate-role-hierarchy.ts`

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ValidationResult {
  passed: boolean;
  checks: Array<{ name: string; status: 'PASS' | 'FAIL'; message: string }>;
}

/**
 * Validates data integrity after migration.
 * Run after backfill to ensure no orphaned or inconsistent data.
 */
async function validateRoleHierarchy(): Promise<ValidationResult> {
  const result: ValidationResult = {
    passed: true,
    checks: [],
  };

  const check = (name: string, passed: boolean, message: string) => {
    result.checks.push({
      name,
      status: passed ? 'PASS' : 'FAIL',
      message,
    });
    if (!passed) result.passed = false;
  };

  console.log('🔍 Validating role hierarchy...\n');

  // 1. RoleTemplate count
  const roleCount = await prisma.roleTemplate.count();
  check('RoleTemplate count', roleCount === 4, `Found ${roleCount}/4 roles`);

  // 2. CapabilityDefinition count
  const capCount = await prisma.capabilityDefinition.count();
  check(
    'CapabilityDefinition count',
    capCount === 13,
    `Found ${capCount}/13 capabilities`,
  );

  // 3. RoleCapability entries
  const roleCapCount = await prisma.roleCapability.count();
  check(
    'RoleCapability entries',
    roleCapCount === 20, // OWNER: 13, ASISTENTE_LOCAL: 7
    `Found ${roleCapCount} edges (expected 20: OWNER 13 + ASISTENTE_LOCAL 7)`,
  );

  // 4. All Memberships have RoleGrant
  const membershipsWithoutGrant = await prisma.membership.count({
    where: { roleGrantId: null },
  });
  check(
    'Memberships with RoleGrant',
    membershipsWithoutGrant === 0,
    `${membershipsWithoutGrant} Memberships missing RoleGrant`,
  );

  // 5. RoleGrant.roleTemplateId references valid RoleTemplate
  const orphanedGrants = await prisma.$queryRaw`
    SELECT COUNT(*) as count
    FROM "RoleGrant" rg
    LEFT JOIN "RoleTemplate" rt ON rg."roleTemplateId" = rt.id
    WHERE rt.id IS NULL
  `;
  const orphanGrantCount = (orphanedGrants as any)[0]?.count || 0;
  check(
    'RoleGrant referential integrity',
    orphanGrantCount === 0,
    `${orphanGrantCount} orphaned RoleGrants`,
  );

  // 6. OWNER role has 13 capabilities
  const ownerCaps = await prisma.roleCapability.count({
    where: { roleTemplate: { name: 'OWNER' } },
  });
  check('OWNER role capabilities', ownerCaps === 13, `OWNER has ${ownerCaps}/13`);

  // 7. ASISTENTE_LOCAL role has 7 capabilities
  const asistenteCapS = await prisma.roleCapability.count({
    where: { roleTemplate: { name: 'ASISTENTE_LOCAL' } },
  });
  check(
    'ASISTENTE_LOCAL role capabilities',
    asistenteCapS === 7,
    `ASISTENTE_LOCAL has ${asistenteCapS}/7`,
  );

  // 8. PROVEEDOR and REPARTIDOR are placeholders (0 capabilities)
  const proveedorCaps = await prisma.roleCapability.count({
    where: { roleTemplate: { name: 'PROVEEDOR' } },
  });
  check(
    'PROVEEDOR role placeholder',
    proveedorCaps === 0,
    `PROVEEDOR has ${proveedorCaps} capabilities`,
  );

  const repartidorCaps = await prisma.roleCapability.count({
    where: { roleTemplate: { name: 'REPARTIDOR' } },
  });
  check(
    'REPARTIDOR role placeholder',
    repartidorCaps === 0,
    `REPARTIDOR has ${repartidorCaps} capabilities`,
  );

  // 9. CapabilityDefinition.code is unique
  const dupCodes = await prisma.$queryRaw`
    SELECT "code", COUNT(*) as count
    FROM "CapabilityDefinition"
    GROUP BY "code"
    HAVING COUNT(*) > 1
  `;
  check(
    'CapabilityDefinition uniqueness',
    (dupCodes as any).length === 0,
    `${(dupCodes as any).length} duplicate codes`,
  );

  // 10. All expected capability codes exist
  const expectedCodes = [
    'cash.register_movement',
    'inventory.adjust_stock',
    'catalog.change_prices',
    'catalog.manage_products',
    'sales.create',
    'sales.view',
    'sales.cancel',
    'users.manage',
    'customers.manage',
    'purchases.manage',
    'orders.manage',
    'loyalty.manage_rules',
    'payments.manage',
  ];
  const foundCodes = (
    await prisma.capabilityDefinition.findMany({
      select: { code: true },
    })
  ).map((c) => c.code);
  const missingCodes = expectedCodes.filter((c) => !foundCodes.includes(c));
  check(
    'Expected capabilities present',
    missingCodes.length === 0,
    `Missing: ${missingCodes.join(', ')}`,
  );

  // Print results
  console.log('📋 Validation Results:\n');
  result.checks.forEach((check) => {
    const icon = check.status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} ${check.name}: ${check.message}`);
  });

  console.log(`\n${result.passed ? '✅' : '❌'} Overall: ${result.passed ? 'PASSED' : 'FAILED'}`);

  return result;
}

validateRoleHierarchy()
  .catch((e) => {
    console.error('❌ Validation error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

---

## 5. Package.json Scripts

**Add to `apps/api/package.json`:**

```json
{
  "scripts": {
    "prisma:seed:roles": "tsx prisma/seed-role-hierarchy.ts",
    "prisma:backfill:roles": "tsx prisma/backfill-role-grants.ts",
    "prisma:validate:roles": "tsx prisma/validate-role-hierarchy.ts",
    "prisma:migrate:roles": "npx prisma migrate dev --name add_role_hierarchy && npm run prisma:seed:roles && npm run prisma:backfill:roles && npm run prisma:validate:roles"
  }
}
```

---

## 6. Migration Execution Plan

### Phase 2 P1-2 Only

**Step 1: Create Prisma Migration**
```bash
npx prisma migrate dev --name add_role_hierarchy
# Generates migration file from schema.prisma
# Runs SQL in migration.sql
# ✅ Creates all new tables
# ✅ Adds roleGrantId to Membership
```

**Step 2: Seed RoleTemplate + CapabilityDefinition**
```bash
npm run prisma:seed:roles
# ✅ Creates 4 RoleTemplates (OWNER, ASISTENTE_LOCAL, PROVEEDOR, REPARTIDOR)
# ✅ Creates 13 CapabilityDefinitions
# ✅ Links capabilities to roles (20 RoleCapability edges)
```

**Step 3: Backfill Existing Memberships**
```bash
npm run prisma:backfill:roles
# ✅ For each Membership where roleGrantId IS NULL:
#   - Look up RoleTemplate by Membership.role
#   - Create RoleGrant
#   - Update Membership.roleGrantId
```

**Step 4: Validate Data Integrity**
```bash
npm run prisma:validate:roles
# ✅ Verify all RoleTemplates exist
# ✅ Verify all CapabilityDefinitions exist
# ✅ Verify all Memberships have RoleGrant
# ✅ Verify referential integrity
# ✅ Verify role capability counts
```

### Expected Output

```
🌱 Seeding role hierarchy...
  Creating 13 capability definitions...
    ✓ cash.register_movement
    ✓ inventory.adjust_stock
    ... (13 total)
  Creating 4 role templates...
    ✓ OWNER
      Linking 13 capabilities...
    ✓ ASISTENTE_LOCAL
      Linking 7 capabilities...
    ✓ PROVEEDOR
      Linking 0 capabilities...
    ✓ REPARTIDOR
      Linking 0 capabilities...
✅ Role hierarchy seeded successfully

🔄 Backfilling RoleGrant for existing Memberships...
  Found N Memberships without RoleGrant
  ✓ user-1 @ empresa-1 → OWNER
  ✓ user-2 @ empresa-1 → ASISTENTE_LOCAL
  ... (N total)

📊 Backfill Complete:
  ✅ Migrated: N Memberships
  ❌ Errors: 0

✅ RoleGrant backfill complete

🔍 Validating role hierarchy...

📋 Validation Results:

✅ RoleTemplate count: Found 4/4 roles
✅ CapabilityDefinition count: Found 13/13 capabilities
✅ RoleCapability entries: Found 20 edges (expected 20)
✅ Memberships with RoleGrant: 0 Memberships missing RoleGrant
✅ RoleGrant referential integrity: 0 orphaned RoleGrants
✅ OWNER role capabilities: OWNER has 13/13
✅ ASISTENTE_LOCAL role capabilities: ASISTENTE_LOCAL has 7/7
✅ PROVEEDOR role placeholder: PROVEEDOR has 0 capabilities
✅ REPARTIDOR role placeholder: REPARTIDOR has 0 capabilities
✅ CapabilityDefinition uniqueness: 0 duplicate codes
✅ Expected capabilities present: (all found)

✅ Overall: PASSED
```

---

## 7. Rollback Plan (Emergency Only)

If migration needs to be rolled back (not recommended):

```bash
# Remove all Phase 2 P1-2 data
npx prisma migrate resolve --rolled-back add_role_hierarchy

# This rolls back:
# - Drops RoleTemplate, CapabilityDefinition, RoleCapability, RoleGrant, CapabilityGrant
# - Removes roleGrantId from Membership
# - Restores schema to pre-migration state

# Then run old seed (if needed):
npm run seed  # Restores legacy Permiso + UsuarioPermiso
```

⚠️ **Note:** Rollback loses any CapabilityGrant data created during Phase P1-3+. Only use in emergency.

---

**Migration Version:** 1.0  
**Phase:** 2 P1-2  
**Status:** Ready for Implementation
