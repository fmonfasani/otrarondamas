/**
 * ADR-DAT-019 — which database role each Prisma client uses.
 *
 * - DATABASE_URL → `wapsell_app`: everything that runs inside one business
 *   (CompanyScopedPrismaService.forCompany()). No DDL, no identity tables.
 * - SYSTEM_DATABASE_URL → `wapsell_system`: what crosses businesses on purpose — login,
 *   password recovery, platform administration, webhooks, jobs (PrismaService).
 * - Migrations run as `wapsell_owner`, only from the deploy (prisma/db-roles/README.md).
 *
 * A local database with a single role can leave SYSTEM_DATABASE_URL unset: both clients then
 * use DATABASE_URL, as before the roles existed.
 */
export function systemDatasource(): { datasourceUrl: string } | undefined {
  const url = process.env.SYSTEM_DATABASE_URL?.trim();
  return url ? { datasourceUrl: url } : undefined;
}
