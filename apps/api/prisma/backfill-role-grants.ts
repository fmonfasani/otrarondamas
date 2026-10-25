import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Backfill script for Phase 2 P1-2: Populate RoleGrant from existing Membership.role
 *
 * For each Membership without a RoleGrant, creates a RoleGrant pointing to the
 * corresponding RoleTemplate (based on Membership.role).
 *
 * Design Decision (D-005): RoleTemplate is global; mapping is name-based.
 *
 * Pre-requisites:
 * - CapabilityDefinition entities must be seeded
 * - RoleTemplate entities must be seeded (OWNER, ASISTENTE_LOCAL, PROVEEDOR, REPARTIDOR)
 * - Migration must have created RoleGrant table + Membership.roleGrant relation
 *
 * Idempotent: Safe to run multiple times. Uses upsert logic (create if missing).
 */

async function backfillRoleGrants() {
  try {
    console.log('Starting RoleGrant backfill...');

    // Validate RoleTemplate entities exist
    const expectedRoles = [
      'OWNER',
      'ASISTENTE_LOCAL',
      'PROVEEDOR',
      'REPARTIDOR',
    ];
    const existingRoles = await prisma.roleTemplate.findMany({
      where: {
        name: {
          in: expectedRoles,
        },
      },
    });

    if (existingRoles.length !== expectedRoles.length) {
      const missing = expectedRoles.filter(
        (r) => !existingRoles.find((er) => er.name === r),
      );
      throw new Error(
        `Missing RoleTemplate entities: ${missing.join(', ')}. Run seed-role-hierarchy.ts first.`,
      );
    }

    // Create a map of role name → RoleTemplate ID for fast lookup
    const roleMap = new Map(existingRoles.map((r) => [r.name, r.id]));

    // Find all Memberships without a RoleGrant
    const membershipsToBackfill = await prisma.membership.findMany({
      where: {
        RoleGrant: null,
      },
    });

    console.log(
      `Found ${membershipsToBackfill.length} Memberships without RoleGrant`,
    );

    if (membershipsToBackfill.length === 0) {
      console.log('✅ All Memberships already have RoleGrant. Nothing to do.');
      return;
    }

    // Backfill RoleGrant for each Membership
    let created = 0;
    let skipped = 0;

    for (const membership of membershipsToBackfill) {
      const roleTemplateName = membership.role as string;
      const roleTemplateId = roleMap.get(roleTemplateName);

      if (!roleTemplateId) {
        console.warn(
          `  ⚠️  Skipping Membership ${membership.id}: unknown role '${roleTemplateName}'`,
        );
        skipped++;
        continue;
      }

      try {
        await prisma.roleGrant.create({
          data: {
            membershipId: membership.id,
            roleTemplateId,
          },
        });
        created++;
        console.log(
          `  ✓ Membership ${membership.id} → RoleGrant (${roleTemplateName})`,
        );
      } catch (error: any) {
        // Handle race condition: RoleGrant might have been created by another process
        if (error.code === 'P2002') {
          // Unique constraint violation
          console.log(
            `  - Membership ${membership.id} already has RoleGrant (race condition)`,
          );
          skipped++;
        } else {
          throw error;
        }
      }
    }

    console.log(
      `\n✅ Backfill completed: ${created} created, ${skipped} skipped`,
    );

    // Validation: Verify all Memberships now have RoleGrant
    const stillMissing = await prisma.membership.findMany({
      where: {
        RoleGrant: null,
      },
    });

    if (stillMissing.length > 0) {
      console.warn(
        `⚠️  Warning: ${stillMissing.length} Memberships still lack RoleGrant`,
      );
      console.warn('Failed Memberships:', stillMissing.map((m) => m.id));
    } else {
      console.log(
        '✓ All Memberships now have RoleGrant (validation passed)',
      );
    }
  } catch (error) {
    console.error('❌ Backfill failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

backfillRoleGrants();
