import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Seed script for Phase 2 P1-2: Hierarchical Authorization Model
 *
 * Creates:
 * 1. CapabilityDefinition entities (13 capabilities)
 * 2. RoleTemplate entities (4 predefined roles)
 * 3. RoleCapability junction records (role → capability assignments)
 *
 * Design Decision (D-005): RoleTemplate is global (empresaId null).
 * No per-company role variants in Phase 2; Phase 3+ can add overrides.
 *
 * Mapping from existing Permiso → CapabilityDefinition:
 * - caja.gastos → cash.register_movement
 * - inventario.ajustes → inventory.adjust_stock
 * - precios.cambiar → catalog.change_prices
 * - ventas.crear → sales.create
 * - ventas.anular → sales.cancel
 * - ventas.ver → sales.view
 * - usuarios.gestionar → users.manage
 * - clientes.gestionar → customers.manage
 * - productos.gestionar → catalog.manage_products
 * - compras.gestionar → purchases.manage
 * - pedidos.gestionar → orders.manage
 * - fidelizacion.gestionar → loyalty.manage_rules
 * - pagos.gestionar → payments.manage
 */

interface CapabilityDef {
  code: string;
  description: string;
  category: string;
}

interface RoleConfig {
  name: string;
  description: string;
  capabilities: string[]; // CapabilityDefinition codes
}

const CAPABILITY_DEFS: CapabilityDef[] = [
  {
    code: 'cash.register_movement',
    description: 'Register cash inflows/outflows (gavetas, expenses)',
    category: 'cash',
  },
  {
    code: 'inventory.adjust_stock',
    description: 'Register inventory adjustments',
    category: 'inventory',
  },
  {
    code: 'catalog.change_prices',
    description: 'Change product prices',
    category: 'catalog',
  },
  {
    code: 'catalog.manage_products',
    description: 'Manage product catalog (name, stock, family)',
    category: 'catalog',
  },
  {
    code: 'sales.create',
    description: 'Create in-person sales and quotes',
    category: 'sales',
  },
  {
    code: 'sales.view',
    description: 'View sales history and details',
    category: 'sales',
  },
  {
    code: 'sales.cancel',
    description: 'Cancel confirmed sales',
    category: 'sales',
  },
  {
    code: 'users.manage',
    description: 'Create and revoke user invitations',
    category: 'users',
  },
  {
    code: 'customers.manage',
    description: 'Manage customer profile data',
    category: 'customers',
  },
  {
    code: 'purchases.manage',
    description: 'Create/issue purchase orders and confirm receptions',
    category: 'purchases',
  },
  {
    code: 'orders.manage',
    description: 'Manage web orders (confirm, cancel, take)',
    category: 'orders',
  },
  {
    code: 'loyalty.manage_rules',
    description: 'Create and edit loyalty discount rules',
    category: 'loyalty',
  },
  {
    code: 'payments.manage',
    description: 'Manage payment processing',
    category: 'payments',
  },
];

const ROLE_CONFIGS: RoleConfig[] = [
  {
    name: 'OWNER',
    description: 'Full system access - all capabilities',
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
    description: 'Store assistant - operational tasks only',
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
    capabilities: [], // No capabilities in Phase 2
  },
  {
    name: 'REPARTIDOR',
    description: 'Delivery driver - placeholder for Phase 3+',
    capabilities: [], // No capabilities in Phase 2
  },
];

async function seed() {
  try {
    console.log('Starting role hierarchy seed...');

    // Step 1: Create CapabilityDefinition entities
    console.log('\n✓ Creating CapabilityDefinition entities...');
    for (const capDef of CAPABILITY_DEFS) {
      const existing = await prisma.capabilityDefinition.findUnique({
        where: { code: capDef.code },
      });
      if (existing) {
        console.log(`  - ${capDef.code} (already exists)`);
      } else {
        await prisma.capabilityDefinition.create({
          data: capDef,
        });
        console.log(`  + ${capDef.code}`);
      }
    }

    // Step 2: Create RoleTemplate entities with RoleCapability assignments
    console.log('\n✓ Creating RoleTemplate entities...');
    for (const roleConfig of ROLE_CONFIGS) {
      const existing = await prisma.roleTemplate.findUnique({
        where: { name: roleConfig.name },
      });

      if (existing) {
        console.log(`  - ${roleConfig.name} (already exists)`);
        // Verify or update capabilities if needed
        // For now, skip updating existing roles to avoid disruption
      } else {
        const roleTemplate = await prisma.roleTemplate.create({
          data: {
            name: roleConfig.name,
            description: roleConfig.description,
            // RoleCapability will be created separately
          },
        });
        console.log(`  + ${roleConfig.name}`);

        // Create RoleCapability associations
        for (const capabilityCode of roleConfig.capabilities) {
          const capDef = await prisma.capabilityDefinition.findUnique({
            where: { code: capabilityCode },
          });
          if (!capDef) {
            console.error(`    ERROR: Capability ${capabilityCode} not found!`);
            continue;
          }

          await prisma.roleCapability.create({
            data: {
              roleTemplateId: roleTemplate.id,
              capabilityDefId: capDef.id,
            },
          });
        }
        console.log(`    └─ ${roleConfig.capabilities.length} capabilities assigned`);
      }
    }

    // Step 3: Validation
    console.log('\n✓ Validating seeded data...');
    const allCapabilities = await prisma.capabilityDefinition.findMany();
    const allRoles = await prisma.roleTemplate.findMany({
      include: {
        capabilities: {
          include: {
            capabilityDef: true,
          },
        },
      },
    });

    console.log(`  - ${allCapabilities.length} capabilities in catalog`);
    for (const role of allRoles) {
      console.log(
        `  - ${role.name}: ${role.capabilities.length} capabilities`,
      );
    }

    console.log('\n✅ Role hierarchy seed completed successfully');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seed();
