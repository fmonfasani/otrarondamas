#!/usr/bin/env bash
# Capacity test of the chat (Owner, 2026-11-26) — on an ISOLATED copy, on the same server.
#
# Builds a throwaway copy: its own empty Postgres 16, Redis and the same API image production runs,
# all on their own network («wapsell-lt»), the API only on 127.0.0.1:8700. Fills it with fake
# stores and customers (seed.mjs) and simulates them chatting in steps (load.mjs) until it answers
# slowly or fails, watching production and stopping if production suffers. Real data is never
# read nor touched. Whatever happens, everything it created is removed at the end (trap).
#
# Results (no secrets): $LT_RESULTS/<UTC time>/{resumen.txt, results.json, stats.txt, run.log}.
#
#   sudo bash tools/loadtest/run.sh
# Options (env): LT_API_IMAGE, LT_BUILDER_IMAGE, LT_STEPS, LT_STEP_SECONDS, LT_CUSTOMERS,
#   LT_BUSINESSES, LT_LOAD_NETWORK (host), LT_API (http://127.0.0.1:8700), PROD_HEALTH, LT_RESULTS.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_IMAGE="${LT_API_IMAGE:-wapsell-api:latest}"
# The tools image (Prisma, socket.io-client) of the same commit as the API image under test.
API_ID="$(docker image inspect -f '{{.Id}}' "$API_IMAGE" 2>/dev/null || true)"
API_SHA="$(docker images --no-trunc --format '{{.Tag}} {{.ID}}' wapsell-api | awk -v id="$API_ID" '$2 == id && $1 ~ /^[0-9a-f]{40}$/ { print $1; exit }')"
BUILDER_IMAGE="${LT_BUILDER_IMAGE:-${API_SHA:+wapsell-api-builder:$API_SHA}}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
RESULTS="${LT_RESULTS:-/opt/wapsell/loadtest-results}/$STAMP"
LOAD_NET="${LT_LOAD_NETWORK:-host}"
NET=wapsell-lt
DB=wapsell-lt-db
REDIS=wapsell-lt-redis
API=wapsell-lt-api
LOAD=wapsell-lt-load

mkdir -p "$RESULTS"
exec > >(tee -a "$RESULTS/run.log") 2>&1
log() { echo "$(date -u +%H:%M:%S) $*"; }

WORK="$(mktemp -d)"
chmod 700 "$WORK"
mkdir -p "$WORK/out"
# Paths as Docker sees them (only differs on a Windows development machine).
dpath() { if command -v cygpath >/dev/null 2>&1; then cygpath -m "$1"; else echo "$1"; fi; }
W="$(dpath "$WORK")"; H="$(dpath "$HERE")"
STATS_PID=""

cleanup() {
  local code=$?
  [ -n "$STATS_PID" ] && kill "$STATS_PID" 2>/dev/null || true
  cp "$WORK/out/resumen.txt" "$WORK/out/results.json" "$WORK/out/stats.txt" "$RESULTS/" 2>/dev/null || true
  docker rm -f "$LOAD" "$API" "$REDIS" "$DB" >/dev/null 2>&1 || true
  docker network rm "$NET" >/dev/null 2>&1 || true
  rm -rf "$WORK"
  log "copia aislada borrada (salida $code); resultados en $RESULTS"
}
trap cleanup EXIT

[ -n "$BUILDER_IMAGE" ] || { log "no hay imagen wapsell-api-builder"; exit 1; }
for name in "$DB" "$REDIS" "$API" "$LOAD"; do
  if docker ps -a --format '{{.Names}}' | grep -qx "$name"; then log "ya existe $name: otra prueba en curso"; exit 1; fi
done
log "imagen de la API: $API_IMAGE · herramientas: $BUILDER_IMAGE"

# Throwaway secrets: only in $WORK (700), deleted at the end, never printed.
pw() { head -c 48 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 32; }
SUPER_PW="$(pw)"; OWNER_PW="$(pw)"; APP_PW="$(pw)"; SYSTEM_PW="$(pw)"
URL() { echo "postgresql://$1:$2@$DB:5432/wapsell_lt"; }
{
  echo "POSTGRES_USER=lt_super"; echo "POSTGRES_PASSWORD=$SUPER_PW"; echo "POSTGRES_DB=wapsell_lt"
} > "$WORK/db.env"
{
  echo "WAPSELL_OWNER_PW=$OWNER_PW"; echo "WAPSELL_APP_PW=$APP_PW"; echo "WAPSELL_SYSTEM_PW=$SYSTEM_PW"
} > "$WORK/roles.env"
echo "DATABASE_URL=$(URL wapsell_owner "$OWNER_PW")" > "$WORK/owner.env"
JWT_SECRET="$(pw)$(pw)"
{
  echo "NODE_ENV=production"; echo "PORT=3000"
  echo "DATABASE_URL=$(URL wapsell_app "$APP_PW")"
  echo "SYSTEM_DATABASE_URL=$(URL wapsell_system "$SYSTEM_PW")"
  echo "JWT_SECRET=$JWT_SECRET"; echo "MFA_SECRET_KEY=$(pw)"
  echo "REDIS_URL=redis://$REDIS:6379"
  echo "MESSAGING_STORAGE_DIR=/tmp/mensajes"; echo "LEGAJO_STORAGE_DIR=/tmp/legajos"
  # Required at start; nobody signs in with Google during the test.
  echo "GOOGLE_CLIENT_ID=loadtest"; echo "GOOGLE_CLIENT_SECRET=loadtest"
  echo "GOOGLE_CALLBACK_URL=http://127.0.0.1:8700/auth/google/callback"
} > "$WORK/api.env"
echo "SYSTEM_DATABASE_URL=$(URL wapsell_system "$SYSTEM_PW")" > "$WORK/seed.env"
echo "JWT_SECRET=$JWT_SECRET" > "$WORK/load.env"
chmod 600 "$WORK"/*.env

log "1/6 base de datos y Redis de prueba"
docker network create "$NET" >/dev/null
docker run -d --name "$DB" --network "$NET" --env-file "$W/db.env" --shm-size=256m postgres:16-alpine >/dev/null
docker run -d --name "$REDIS" --network "$NET" redis:7-alpine >/dev/null
for _ in $(seq 1 60); do docker exec "$DB" pg_isready -U lt_super -d wapsell_lt >/dev/null 2>&1 && break; sleep 1; done
sleep 2

log "2/6 roles y migraciones (igual que el deploy)"
# The roles recipe of the same commit (from the tools image, not from any checkout on disk).
docker run --rm --entrypoint cat "$BUILDER_IMAGE" apps/api/prisma/db-roles/roles.sql > "$WORK/roles.sql"
docker cp "$W/roles.sql" "$DB:/tmp/roles.sql"
docker exec --env-file "$W/roles.env" "$DB" psql -q -v ON_ERROR_STOP=1 -U lt_super -d wapsell_lt -f /tmp/roles.sql >/dev/null
docker run --rm --network "$NET" --env-file "$W/owner.env" "$BUILDER_IMAGE" sh -c \
  'npx prisma migrate deploy --schema apps/api/prisma/schema.prisma >/dev/null && npx prisma db execute --schema apps/api/prisma/schema.prisma --file apps/api/prisma/db-roles/grants.sql >/dev/null'

log "3/6 API de prueba (127.0.0.1:8700)"
docker run -d --name "$API" --network "$NET" -p 127.0.0.1:8700:3000 --env-file "$W/api.env" "$API_IMAGE" >/dev/null
for i in $(seq 1 90); do
  docker exec "$API" node -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" >/dev/null 2>&1 && break
  if [ "$i" = 90 ] || [ "$(docker inspect -f '{{.State.Running}}' "$API")" != "true" ]; then
    log "la API de prueba no arrancó"; docker logs --tail 30 "$API"; exit 1
  fi
  sleep 2
done

log "4/6 negocios y clientes de prueba"
docker run --rm --network "$NET" --env-file "$W/seed.env" -e OUT=/out \
  -e LT_CUSTOMERS="${LT_CUSTOMERS:-1600}" -e LT_BUSINESSES="${LT_BUSINESSES:-10}" \
  -v "$H:/lt:ro" -v "$W/out:/out" "$BUILDER_IMAGE" node /lt/seed.mjs

log "5/6 la carga (escalones: ${LT_STEPS:-50,100,200,400,800,1600})"
( while true; do
    docker stats --no-stream --format '{{.Name}} cpu={{.CPUPerc}} mem={{.MemUsage}}' "$API" "$DB" 2>/dev/null \
      | sed "s/^/$(date -u +%H:%M:%S) /" >> "$WORK/out/stats.txt"
    sleep 10
  done ) &
STATS_PID=$!
docker run --name "$LOAD" --network "$LOAD_NET" --cpus=2 --env-file "$W/load.env" -e OUT=/out \
  -e LT_API="${LT_API:-http://127.0.0.1:8700}" -e PROD_HEALTH="${PROD_HEALTH:-http://127.0.0.1:8600/health}" \
  -e LT_STEPS="${LT_STEPS:-50,100,200,400,800,1600}" -e LT_STEP_SECONDS="${LT_STEP_SECONDS:-120}" \
  -v "$H:/lt:ro" -v "$W/out:/out" "$BUILDER_IMAGE" node /lt/load.mjs || log "la carga terminó con error"

log "6/6 listo"
