#!/usr/bin/env bash
# Deploys the Wapsell API to the production host (runs ON the host, over SSH).
#
# Production topology (verified 2026-11-10): Docker Compose project `wapsell`,
# file /opt/wapsell/docker-compose.wapsell.core.yml, service `api` running the
# image wapsell-api:latest. The host is shared with other products, so this
# script only touches wapsell-api images and the `api` container (--no-deps).
#
# Steps, each of which aborts the deploy on failure:
#   1. Fresh checkout of the commit in /opt/wapsell-build-<sha>
#      (/opt/wapsell has local, uncommitted host config and is never modified).
#   2. Build the runtime image and the builder stage (which has the Prisma CLI).
#   3. Apply versioned migrations with `prisma migrate deploy` (ADR-DAT-016).
#      The first run records the baseline on the db-push-era database, only if
#      the live schema is identical; pending migrations get a pg_dump first.
#      Migrations run as the schema owner (ADR-DAT-019), whose URL is only in
#      /opt/wapsell/secrets/migrate.env (root only), followed by the API roles'
#      privileges (apps/api/prisma/db-roles/grants.sql).
#   4. Boot the new image in an isolated container (no ports) with the live
#      environment and require /health 200 before touching production.
#   5. Swap: tag the running image as wapsell-api:previous, retag latest,
#      recreate only `api`, and wait for the healthcheck. If it does not become
#      healthy, roll back to wapsell-api:previous and fail.
#
# Usage: deploy-docker.sh <git-sha>
set -euo pipefail

SHA="${1:?usage: deploy-docker.sh <git-sha>}"
REPO="https://github.com/fmonfasani/OtraRondaMas.git"
COMPOSE_DIR="/opt/wapsell"
COMPOSE_FILE="docker-compose.wapsell.core.yml"
PROJECT="wapsell"
CONTAINER="wapsell-api"
BUILD_DIR="/opt/wapsell-build-${SHA}"
CHECK="wapsell-api-check"
ENV_FILE="$(mktemp)"
MIGRATE_ENV_FILE="$(mktemp)"
chmod 600 "$ENV_FILE" "$MIGRATE_ENV_FILE"
MIGRATE_SECRET="/opt/wapsell/secrets/migrate.env"

cleanup() {
  rm -f "$ENV_FILE" "$MIGRATE_ENV_FILE"
  docker rm -f "$CHECK" >/dev/null 2>&1 || true
}
trap cleanup EXIT

log() { printf '[deploy %s] %s\n' "$SHA" "$*"; }

wait_healthy() { # <container> <seconds>
  local name="$1" deadline=$((SECONDS + $2)) state
  while (( SECONDS < deadline )); do
    state="$(docker inspect "$name" --format '{{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{end}}' 2>/dev/null || true)"
    [[ "$state" == "running healthy" ]] && return 0
    sleep 5
  done
  log "$name not healthy: ${state:-missing}"
  return 1
}

log "1/5 checkout"
rm -rf "$BUILD_DIR"
GIT_TERMINAL_PROMPT=0 git clone -q --filter=blob:none "$REPO" "$BUILD_DIR"
git -C "$BUILD_DIR" checkout -q "$SHA"

log "2/5 build"
docker build -q -f "$BUILD_DIR/apps/api/Dockerfile" -t "wapsell-api:${SHA}" "$BUILD_DIR" >/dev/null
docker build -q -f "$BUILD_DIR/apps/api/Dockerfile" --target builder \
  -t "wapsell-api-builder:${SHA}" "$BUILD_DIR" >/dev/null

# The live container's environment (DATABASE_URL, JWT_SECRET, ...) is reused
# from a 0600 temp file; values are never printed.
NETWORK="$(docker inspect "$CONTAINER" --format '{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}' | awk '{print $1}')"
docker inspect "$CONTAINER" --format '{{range .Config.Env}}{{println .}}{{end}}' \
  | grep -vE '^(PATH|NODE_VERSION|YARN_VERSION|HOSTNAME)=' > "$ENV_FILE"

log "3/5 schema migrations (prisma migrate deploy)"
# ADR-DAT-019: the API's roles cannot change the schema, so migrations run as
# wapsell_owner. Its URL is never in the API container; it comes from a root-only
# file on this host. Without the file (before the roles exist) the API's own
# DATABASE_URL is used, as before.
if [[ -f "$MIGRATE_SECRET" ]]; then
  grep -v '^DATABASE_URL=' "$ENV_FILE" > "$MIGRATE_ENV_FILE"
  sed -n 's/^MIGRATE_DATABASE_URL=/DATABASE_URL=/p' "$MIGRATE_SECRET" >> "$MIGRATE_ENV_FILE"
  [[ "$(grep -c '^DATABASE_URL=' "$MIGRATE_ENV_FILE")" == 1 ]] \
    || { log "$MIGRATE_SECRET must define MIGRATE_DATABASE_URL once; no changes made"; exit 1; }
  DB_ROLES=yes
else
  cp "$ENV_FILE" "$MIGRATE_ENV_FILE"
  DB_ROLES=no
  log "no $MIGRATE_SECRET: migrations use the API's DATABASE_URL"
fi
prisma_run() { # runs a command in the builder image against the live database, as the owner
  docker run --rm --network "$NETWORK" --env-file "$MIGRATE_ENV_FILE" "wapsell-api-builder:${SHA}" "$@"
}
SCHEMA=apps/api/prisma/schema.prisma

# One-time baseline (ADR-DAT-016): production was created with `db push` and
# has no _prisma_migrations table. If the table is missing, the live schema
# must be IDENTICAL to this commit's schema (which CI proves equal to the
# migrations); only then is the baseline recorded as applied, without running
# its SQL. Any difference aborts the deploy before anything changes.
HAS_HISTORY="$(prisma_run node -e '
  const { PrismaClient } = require("@prisma/client");
  const p = new PrismaClient();
  p.$queryRaw`SELECT to_regclass(${"public._prisma_migrations"})::text AS t`
    .then(r => { process.stdout.write(r[0].t ? "yes" : "no"); return p.$disconnect(); })
    .catch(e => { console.error(e.message); process.exit(1); });
')"
if [[ "$HAS_HISTORY" == "no" ]]; then
  log "no migration history: verifying the live schema matches before baselining"
  prisma_run sh -c "npx prisma migrate diff --from-url \"\$DATABASE_URL\" --to-schema-datamodel $SCHEMA --exit-code >/dev/null" \
    || { log "live schema differs from ${SHA}; refusing to baseline (no changes made)"; exit 1; }
  prisma_run npx prisma migrate resolve --schema "$SCHEMA" --applied 00000000000000_baseline
  log "baseline recorded"
fi

# Back up the database before applying any pending migration.
if ! prisma_run npx prisma migrate status --schema "$SCHEMA" >/dev/null 2>&1; then
  BACKUP="/opt/wapsell/backups/pre-migrate-${SHA:0:12}-$(date -u +%Y%m%dT%H%M%SZ).dump"
  log "pending migrations: backing up to $BACKUP"
  (umask 077; docker exec wapsell-postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$BACKUP.part")
  docker exec -i wapsell-postgres pg_restore --list < "$BACKUP.part" > /dev/null
  mv "$BACKUP.part" "$BACKUP"
fi
prisma_run npx prisma migrate deploy --schema "$SCHEMA"
if [[ "$DB_ROLES" == yes ]]; then
  prisma_run npx prisma db execute --schema "$SCHEMA" --file apps/api/prisma/db-roles/grants.sql
  log "API role privileges applied (grants.sql)"
fi

log "4/5 isolated boot test"
docker rm -f "$CHECK" >/dev/null 2>&1 || true
docker run -d --name "$CHECK" --network "$NETWORK" --env-file "$ENV_FILE" "wapsell-api:${SHA}" >/dev/null
for _ in $(seq 1 24); do
  if docker exec "$CHECK" curl -fsS -o /dev/null http://localhost:3000/health 2>/dev/null; then
    break
  fi
  if [[ "$(docker inspect "$CHECK" --format '{{.State.Status}}')" != "running" ]]; then
    docker logs --tail 20 "$CHECK" || true
    log "new image exited during the boot test; production untouched"
    exit 1
  fi
  sleep 5
done
docker exec "$CHECK" curl -fsS -o /dev/null http://localhost:3000/health \
  || { docker logs --tail 20 "$CHECK" || true; log "boot test failed; production untouched"; exit 1; }
docker rm -f "$CHECK" >/dev/null

log "5/5 swap"
docker tag "$(docker inspect "$CONTAINER" --format '{{.Image}}')" wapsell-api:previous
docker tag "wapsell-api:${SHA}" wapsell-api:latest
(cd "$COMPOSE_DIR" && docker compose -p "$PROJECT" -f "$COMPOSE_FILE" up -d --no-deps api)
if ! wait_healthy "$CONTAINER" 120; then
  log "rolling back to wapsell-api:previous"
  docker tag wapsell-api:previous wapsell-api:latest
  (cd "$COMPOSE_DIR" && docker compose -p "$PROJECT" -f "$COMPOSE_FILE" up -d --no-deps api)
  wait_healthy "$CONTAINER" 120 || log "ROLLBACK DID NOT BECOME HEALTHY - manual action required"
  exit 1
fi

# Keep the three most recent build checkouts.
ls -dt /opt/wapsell-build-* 2>/dev/null | tail -n +4 | xargs -r rm -rf
log "deployed: $(docker inspect "$CONTAINER" --format '{{.Config.Image}} {{.State.Health.Status}}')"
