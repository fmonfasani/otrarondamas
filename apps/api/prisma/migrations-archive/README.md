# Archived migrations (do not use)

These 34 migrations (2026-09-19 → 2026-10-26) are kept for history only. Prisma
does not read this folder.

They could not be applied from scratch (`20261025040623_p0_1_add_business_table`
fails: `Membership.businessId` already exists), so CI and production used
`prisma db push` instead and production never had a `_prisma_migrations` table.

On 2026-11-17 (ADR-DAT-016) the history was reset:

- `migrations/00000000000000_baseline` is generated from `schema.prisma`
  (`prisma migrate diff --from-empty --to-schema-datamodel`). Before creating it,
  production was checked to be identical to `schema.prisma` (empty diff).
- On its first run, `scripts/deploy-docker.sh` records the baseline as applied
  in production (`migrate resolve --applied`) only if the live schema still has
  no difference; otherwise it aborts without changes.
- From then on every schema change is a new migration (`npm run db:migrate`),
  CI fails if `schema.prisma` and `migrations/` disagree, and `db push` is no
  longer used against shared databases.
