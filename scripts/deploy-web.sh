#!/usr/bin/env bash
# Deploys the Wapsell web app (Remix, apps/wapsell-remix) to the production host
# (runs ON the host, over SSH, after scripts/deploy-docker.sh deployed the API).
#
# Topology: container `wapsell-web` (image wapsell-web:latest) on the API's Docker
# network, published on 127.0.0.1:3050 and served by the host nginx as
# https://app.wapsell.com (infra/nginx/app.wapsell.com.conf). The web server talks to
# the API over the internal network (http://wapsell-api:3000). Only wapsell-web
# containers and images are touched.
#
# Steps, each of which aborts the deploy on failure:
#   1. Checkout of the commit in /opt/wapsell-build-<sha> (reused if the API deploy
#      already cloned it).
#   2. Build the image.
#   3. Session secret: created once in /opt/wapsell-web/session-secret (0600) and
#      reused, so deploys do not log everybody out. Never printed.
#   4. Boot the new image in an isolated container (no ports) and require
#      /api/health and the login page to answer 200 before touching production.
#   5. Swap: keep the running image as wapsell-web:previous, start the new one and
#      wait for it to be healthy; otherwise restore the previous one and fail.
#
# Usage: deploy-web.sh <git-sha>
set -euo pipefail

SHA="${1:?usage: deploy-web.sh <git-sha>}"
REPO="https://github.com/fmonfasani/OtraRondaMas.git"
BUILD_DIR="/opt/wapsell-build-${SHA}"
STATE_DIR="/opt/wapsell-web"
SECRET_FILE="${STATE_DIR}/session-secret"
CONTAINER="wapsell-web"
CHECK="wapsell-web-check"
API_CONTAINER="wapsell-api"
PUBLISH="127.0.0.1:3050:3000"
ENV_FILE="$(mktemp)"
chmod 600 "$ENV_FILE"

cleanup() {
  rm -f "$ENV_FILE"
  docker rm -f "$CHECK" >/dev/null 2>&1 || true
}
trap cleanup EXIT

log() { printf '[deploy-web %s] %s\n' "$SHA" "$*"; }

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

run_web() { # <container-name> <image> [extra docker args...]
  local name="$1" image="$2"
  shift 2
  docker run -d --name "$name" --network "$NETWORK" --env-file "$ENV_FILE" "$@" "$image" >/dev/null
}

log "1/5 checkout"
if [[ ! -d "$BUILD_DIR/.git" ]]; then
  rm -rf "$BUILD_DIR"
  GIT_TERMINAL_PROMPT=0 git clone -q --filter=blob:none "$REPO" "$BUILD_DIR"
fi
git -C "$BUILD_DIR" fetch -q origin "$SHA" 2>/dev/null || true
git -C "$BUILD_DIR" checkout -q "$SHA"

log "2/5 build"
docker build -q -t "wapsell-web:${SHA}" "$BUILD_DIR/apps/wapsell-remix" >/dev/null

log "3/5 environment"
install -d -m 700 "$STATE_DIR"
if [[ ! -s "$SECRET_FILE" ]]; then
  (umask 077 && openssl rand -hex 32 > "$SECRET_FILE")
fi
NETWORK="$(docker inspect "$API_CONTAINER" --format '{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}' | awk '{print $1}')"
# Container-to-container call on the host's private Docker bridge network: it never
# leaves the host, and TLS terminates at the host nginx for public traffic.
INTERNAL_API_URL="http://${API_CONTAINER}:3000" # NOSONAR (S5332) private Docker network
{
  printf 'NODE_ENV=production\nPORT=3000\n'
  printf 'API_BASE_URL=%s\nVITE_API_URL=%s\n' "$INTERNAL_API_URL" "$INTERNAL_API_URL"
  printf 'SESSION_SECRET=%s\n' "$(cat "$SECRET_FILE")"
} > "$ENV_FILE"

log "4/5 isolated boot test"
docker rm -f "$CHECK" >/dev/null 2>&1 || true
run_web "$CHECK" "wapsell-web:${SHA}"
probe() { # <path>
  local path="$1"
  # Inside the check container itself (loopback). NOSONAR (S5332)
  docker exec "$CHECK" node -e \
    "fetch('http://localhost:3000${path}').then(r=>process.exit(r.status===200?0:1)).catch(()=>process.exit(1))" # NOSONAR
}
for _ in $(seq 1 24); do
  probe /api/health && break
  if [[ "$(docker inspect "$CHECK" --format '{{.State.Status}}')" != "running" ]]; then
    docker logs --tail 20 "$CHECK" || true
    log "new image exited during the boot test; production untouched"
    exit 1
  fi
  sleep 5
done
probe /api/health && probe /es/auth/login \
  || { docker logs --tail 20 "$CHECK" || true; log "boot test failed; production untouched"; exit 1; }
docker rm -f "$CHECK" >/dev/null

log "5/5 swap"
HAD_PREVIOUS=0
if docker inspect "$CONTAINER" >/dev/null 2>&1; then
  docker tag "$(docker inspect "$CONTAINER" --format '{{.Image}}')" wapsell-web:previous
  HAD_PREVIOUS=1
fi
docker tag "wapsell-web:${SHA}" wapsell-web:latest
docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
run_web "$CONTAINER" wapsell-web:latest --restart unless-stopped -p "$PUBLISH"
if ! wait_healthy "$CONTAINER" 120; then
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
  if (( HAD_PREVIOUS )); then
    log "rolling back to wapsell-web:previous"
    docker tag wapsell-web:previous wapsell-web:latest
    run_web "$CONTAINER" wapsell-web:latest --restart unless-stopped -p "$PUBLISH"
    wait_healthy "$CONTAINER" 120 || log "ROLLBACK DID NOT BECOME HEALTHY - manual action required"
  fi
  exit 1
fi

# Keep the five most recent web images (plus latest/previous tags).
docker images wapsell-web --format '{{.Tag}}' | grep -vE '^(latest|previous)$' | tail -n +6 \
  | xargs -r -I{} docker rmi "wapsell-web:{}" >/dev/null 2>&1 || true
log "deployed: $(docker inspect "$CONTAINER" --format '{{.Config.Image}} {{.State.Health.Status}}')"
