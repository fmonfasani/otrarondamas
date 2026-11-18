# Database roles (ADR-DAT-019)

The API no longer connects as the Postgres superuser.

| Role | Used by | Variable | Can | Cannot |
|---|---|---|---|---|
| `wapsell_owner` | the deploy, to run migrations | `MIGRATE_DATABASE_URL` (prod: `/opt/wapsell/secrets/migrate.env`, root only) | create and alter the schema | — (never in the API container) |
| `wapsell_app` | the API inside one business (`CompanyScopedPrismaService.forCompany()`) | `DATABASE_URL` | read and write business data | DDL, `TRUNCATE`, identity tables, edit or delete the audit trail; row-level security applies (INIT-019 step 5) |
| `wapsell_system` | the API across businesses: login, password recovery, platform, webhooks, jobs (`PrismaService`) | `SYSTEM_DATABASE_URL` | read and write everything, skipping row-level security | DDL, `TRUNCATE`, edit the audit trail |

The superuser stays for backups and emergencies, from the server only.

## Files

- `roles.sql` (run as superuser): creates or updates the three roles and their passwords, and gives the schema objects to `wapsell_owner`. Idempotent; run it again to rotate passwords. Passwords come from `WAPSELL_OWNER_PW`, `WAPSELL_APP_PW` and `WAPSELL_SYSTEM_PW`.
- `grants.sql` (run as `wapsell_owner` after every `prisma migrate deploy`): table privileges of the two API roles. A new identity table, catalog or append-only table must be added to its exceptions.

## Where each step runs

- **Production.** The switch runs once, as a manual step authorized by the Owner: `scripts/db-roles-switch.sh`.
  - It backs up first, generates the passwords on the host, runs `roles.sql` and `grants.sql`, and checks that each role logs in.
  - It writes the owner URL to `/opt/wapsell/secrets/migrate.env` and points the API at the two roles.
  - It restores the previous configuration if the API does not become healthy.
  - After that, `scripts/deploy-docker.sh` runs the migrations as the owner, then `grants.sql`. Without `migrate.env`, the deploy keeps the previous behavior.
- **CI.** `b4-verification` and `post-merge-verification` create the roles, migrate as the owner and run every suite with the API roles. `p18-1-roles-base-de-datos` checks the privileges.
- **Local.** Optional. Without `SYSTEM_DATABASE_URL`, both clients use `DATABASE_URL`. To work with the roles:

  ```sh
  WAPSELL_OWNER_PW=owner WAPSELL_APP_PW=app WAPSELL_SYSTEM_PW=system \
    psql -v ON_ERROR_STOP=1 "$SUPERUSER_URL" -f apps/api/prisma/db-roles/roles.sql
  DATABASE_URL=<owner url> npx prisma migrate deploy --schema apps/api/prisma/schema.prisma
  DATABASE_URL=<owner url> npx prisma db execute --schema apps/api/prisma/schema.prisma --file apps/api/prisma/db-roles/grants.sql
  # then run the API with DATABASE_URL=<app url> and SYSTEM_DATABASE_URL=<system url>
  ```
