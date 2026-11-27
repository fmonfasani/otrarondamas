#!/usr/bin/env bash
# OR-B4-054 — Wapsell's own map. Cuts Argentina out of Protomaps' daily planet build
# (OpenStreetMap data, ODbL) and publishes it at https://app.wapsell.com/tiles/argentina.pmtiles
# (nginx: location /tiles/ → alias /opt/wapsell-tiles/, see infra/nginx/app.wapsell.com.conf).
#
# Run on the server as root, only with the Owner's OK. The builds are listed at
# https://build-metadata.protomaps.dev/builds.json and kept for a few weeks.
#   infra/maps/update-argentina-map.sh 20261126 --dry-run   # how big it will be; writes nothing
#   infra/maps/update-argentina-map.sh 20261126             # cut, verify, publish
#
# Not in the backups on purpose: it can be cut again. The previous extract stays next to it, so
# going back is: ln -sfn argentina-<previous>.pmtiles /opt/wapsell-tiles/argentina.pmtiles
# Without any file there, the app falls back to OpenStreetMap's tiles by itself.
set -euo pipefail

BUILD="${1:?usage: update-argentina-map.sh YYYYMMDD [--dry-run]}"
if [[ ! "$BUILD" =~ ^[0-9]{8}$ ]]; then
  echo "The build is a date: YYYYMMDD" >&2
  exit 2
fi
IMAGE=protomaps/go-pmtiles:v1.31.2
SOURCE="https://build.protomaps.com/${BUILD}.pmtiles"
# Argentina's box, with its neighbours' border towns: min_lon,min_lat,max_lon,max_lat.
BBOX=-73.6,-55.2,-53.5,-21.7
SERVED=/opt/wapsell-tiles
WORK=/opt/wapsell-tiles-work # same disk as SERVED, so the final move is atomic
NAME="argentina-${BUILD}.pmtiles"

mkdir -p "$SERVED" "$WORK"
if [[ "${2:-}" == "--dry-run" ]]; then
  docker run --rm -v "$WORK:/work" "$IMAGE" extract "$SOURCE" "/work/$NAME" --bbox="$BBOX" --dry-run
  exit 0
fi

docker run --rm -v "$WORK:/work" "$IMAGE" extract "$SOURCE" "/work/$NAME" --bbox="$BBOX"
docker run --rm -v "$WORK:/work" "$IMAGE" verify "/work/$NAME"
chmod 644 "$WORK/$NAME"
mv "$WORK/$NAME" "$SERVED/$NAME"
ln -sfn "$NAME" "$SERVED/argentina.pmtiles.next"
mv -T "$SERVED/argentina.pmtiles.next" "$SERVED/argentina.pmtiles"
# Keep this extract and the one before it; older ones go.
ls -1t "$SERVED"/argentina-*.pmtiles | tail -n +3 | xargs -r rm -f --
ls -l "$SERVED"
