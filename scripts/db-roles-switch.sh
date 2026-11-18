#!/usr/bin/env bash
# ADR-DAT-019 — one-time switch of production to the database roles. Runs on the host as
# root (ssh ... 'bash -s' < scripts/db-roles-switch.sh), AFTER the deploy that ships apps/api/prisma/db-roles.
# Prints no secret. Reversible: restore the compose backup and recreate the api service.
set -euo pipefail
cd /opt/wapsell
F=docker-compose.wapsell.core.yml
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
SECRETS=/opt/wapsell/secrets
log() { printf '[db-roles] %s\n' "$*"; }

[[ ! -e "$SECRETS/migrate.env" ]] || { log "already switched ($SECRETS/migrate.env exists)"; exit 1; }
[[ "$(grep -cE '^\s*- DATABASE_URL=' "$F")" == 1 ]] || { log "expected exactly one DATABASE_URL line"; exit 1; }
! grep -q 'SYSTEM_DATABASE_URL' "$F" || { log "SYSTEM_DATABASE_URL already present"; exit 1; }
docker exec wapsell-api test -f apps/api/prisma/db-roles/roles.sql \
  || { log "the running image has no db-roles: deploy the PR first"; exit 1; }

log "1/9 backups (database, then compose file)"
/opt/wapsell/scripts/backup-db.sh
cp -p "$F" "$F.bak-$STAMP"
log "compose backup: /opt/wapsell/$F.bak-$STAMP"

log "2/9 passwords, generated here and never printed"
umask 077
WAPSELL_OWNER_PW="$(openssl rand -hex 24)"
WAPSELL_APP_PW="$(openssl rand -hex 24)"
WAPSELL_SYSTEM_PW="$(openssl rand -hex 24)"
export WAPSELL_OWNER_PW WAPSELL_APP_PW WAPSELL_SYSTEM_PW

log "3/9 roles and ownership of the schema objects (roles.sql, as superuser)"
docker exec wapsell-api cat apps/api/prisma/db-roles/roles.sql \
  | docker exec -i -e WAPSELL_OWNER_PW -e WAPSELL_APP_PW -e WAPSELL_SYSTEM_PW wapsell-postgres \
      sh -c 'psql -q -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -f -'

log "4/9 connection strings: same host, database and options; new user and password"
CUR="$(docker exec wapsell-api printenv DATABASE_URL)"
url() { printf '%s' "$CUR" | sed -E "s#^(postgres(ql)?://)[^@]*@#\1$1:$2@#"; }
APP_URL="$(url wapsell_app "$WAPSELL_APP_PW")"
SYSTEM_URL="$(url wapsell_system "$WAPSELL_SYSTEM_PW")"
OWNER_URL="$(url wapsell_owner "$WAPSELL_OWNER_PW")"
export APP_URL SYSTEM_URL OWNER_URL

log "5/9 each role logs in over the Docker network with its password"
for v in APP_URL SYSTEM_URL OWNER_URL; do
  TEST_URL="${!v}" docker exec -e TEST_URL wapsell-api node -e '
    const { PrismaClient } = require("@prisma/client");
    const p = new PrismaClient({ datasourceUrl: process.env.TEST_URL });
    p.$queryRaw`SELECT current_user::text AS u, (SELECT rolsuper FROM pg_roles WHERE rolname = current_user) AS s`
      .then((r) => { console.log("  " + r[0].u + (r[0].s ? " IS SUPERUSER" : " ok")); if (r[0].s) process.exit(1); return p.$disconnect(); })
      .catch((e) => { console.error("  login failed: " + e.message.split("\n").pop()); process.exit(1); });'
done

log "6/9 privileges (grants.sql, as the owner)"
docker exec wapsell-api cat apps/api/prisma/db-roles/grants.sql \
  | docker exec -i wapsell-postgres sh -c 'psql -q -h 127.0.0.1 -U wapsell_owner -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -f -'

log "7/9 owner URL for the deploy, root only"
install -d -m 700 "$SECRETS"
printf 'MIGRATE_DATABASE_URL=%s\n' "$OWNER_URL" > "$SECRETS/migrate.env"
chmod 600 "$SECRETS/migrate.env"

log "8/9 API: DATABASE_URL -> wapsell_app, SYSTEM_DATABASE_URL -> wapsell_system; recreate"
perl -i -pe 'if (/^(\s*)- DATABASE_URL=/) { $_ = "$1- DATABASE_URL=$ENV{APP_URL}\n$1- SYSTEM_DATABASE_URL=$ENV{SYSTEM_URL}\n" }' "$F"
docker compose -p wapsell -f "$F" config --quiet
if ! docker compose -p wapsell -f "$F" up -d --no-deps --wait api; then
  log "NOT HEALTHY - restoring the previous configuration"
  cp -p "$F.bak-$STAMP" "$F"
  rm -f "$SECRETS/migrate.env"
  docker compose -p wapsell -f "$F" up -d --no-deps --wait api
  exit 1
fi

log "9/9 verification"
docker exec wapsell-api sh -c 'printf "DATABASE_URL user: %s\nSYSTEM_DATABASE_URL user: %s\n" \
  "$(printf %s "$DATABASE_URL" | sed -E "s#^[a-z]+://([^:]+):.*#\1#")" \
  "$(printf %s "$SYSTEM_DATABASE_URL" | sed -E "s#^[a-z]+://([^:]+):.*#\1#")"'
docker exec wapsell-api curl -fsS -o /dev/null -w 'health %{http_code}\n' http://localhost:3000/health
docker exec -i wapsell-postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tA' <<'SQL'
SELECT 'connections by role: ' || string_agg(usename || '=' || n, ', ' ORDER BY usename)
FROM (SELECT usename, count(*) AS n FROM pg_stat_activity
      WHERE datname = current_database() AND backend_type = 'client backend' AND pid <> pg_backend_pid()
      GROUP BY usename) s;
SELECT 'tables owned by wapsell_owner: ' || count(*) FILTER (WHERE tableowner = 'wapsell_owner') || '/' || count(*)
FROM pg_tables WHERE schemaname = 'public';
SQL
log "done"
