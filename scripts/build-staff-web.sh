#!/usr/bin/env bash
# Build the 3 staff Flutter apps for web into one dir, each under its own path.
# Served from https://rms-app-dd875.web.app/<path>/ — an origin already in the
# prod CORS whitelist (utils/cors.js), so no backend change is needed.
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APPS="$ROOT/frontend/src-platter-apps/apps"
OUT="$ROOT/backend/src-plattr/staff-web"
LOG="$ROOT/restaurant-menu-setup-prod/launch-1/deploy-logs"
mkdir -p "$OUT" "$LOG"

build() { # $1=app dir  $2=url path
  local app="$1" path="$2"
  echo "=== $app → /$path/ ==="
  ( cd "$APPS/$app" \
    && flutter pub get \
    && nice -n 10 flutter build web --release --base-href "/$path/" ) \
    > "$LOG/web-$app.txt" 2>&1
  local rc=$?
  if [ $rc -ne 0 ]; then echo "FAILED ($rc) — see deploy-logs/web-$app.txt"; tail -n 15 "$LOG/web-$app.txt"; return $rc; fi
  rm -rf "${OUT:?}/$path"
  cp -R "$APPS/$app/build/web" "$OUT/$path"
  echo "OK → $OUT/$path"
}

rc=0
build platter_server  server  || rc=1
build platter_kitchen kitchen || rc=1
build platter_admin   admin   || rc=1
exit $rc
