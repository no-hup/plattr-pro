#!/usr/bin/env bash
# dev-up — the whole local stack in one command, for a human to click around in.
#
#   scripts/dev-up.sh              emulator + MockData7 + four apps + one Chrome window
#   scripts/dev-up.sh --no-browser everything except Chrome
#   scripts/dev-up.sh --no-seed    skip the rebuild/import (data already in the emulator)
#   scripts/dev-up.sh down         stop everything this script started
#
# The apps are hardcoded to the functions emulator on :5002, which is emu.sh slot 0, so this
# always takes slot 0 and refuses if another session holds it. Agent browser testing is a
# different job with different rules — see FRONTEND_TESTING.md and scripts/ab.sh.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN="$ROOT/backend/flutter-app-logs"
FN=http://127.0.0.1:5002/rms-app-dd875/us-central1
APPS=(server:5050 consumer:5051 kitchen:5052 admin:5053)

# The tab set. Consumer deep-links straight to a seated table so there is no QR to scan;
# the staff apps land on a login form that is already filled in (debug builds only).
URLS=(
  "http://127.0.0.1:5050/"                                     # server   · server@meg.test
  "http://127.0.0.1:5052/"                                     # kitchen  · kitchen@meg.test
  "http://127.0.0.1:5053/"                                     # admin    · admin@meg.test
  "http://127.0.0.1:5051/#/r/res_meghana/t/tbl_meg_1"           # consumer · table 1, OTP prefilled
)

# curl is wrapped or aliased in some shells on this machine, so probe with python3 instead:
# it is the one thing guaranteed present, and a false "failed" on a healthy app is the worst
# outcome here. A listening port is the readiness signal for an app; the emulator needs a real
# call, because :5002 accepts connections before the functions have finished loading.
tcp_up() { python3 -c 'import socket,sys;s=socket.socket();s.settimeout(2);sys.exit(s.connect_ex(("127.0.0.1",int(sys.argv[1]))))' "$1" >/dev/null 2>&1; }
fns_up() { python3 -c 'import sys,urllib.request as u;u.urlopen(u.Request(sys.argv[1]+"/dev-listRestaurants",data=b"{\"data\":{}}",headers={"Content-Type":"application/json"}),timeout=4).read()' "$FN" >/dev/null 2>&1; }

say()  { printf '\n\033[1m%s\033[0m\n' "$*"; }
warn() { printf '  \033[33m! %s\033[0m\n' "$*"; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$*"; }

stop_all() {
  say "Stopping"
  for a in "${APPS[@]}"; do
    port="${a#*:}"
    pid=$(lsof -nP -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null | head -1)
    [ -n "$pid" ] && { kill "$pid" 2>/dev/null; ok "${a%%:*} (:$port)"; }
  done
  pkill -f 'flutter_tools.snapshot run' 2>/dev/null
  for port in 8080 5002 4001 4501; do
    pid=$(lsof -nP -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null | head -1)
    [ -n "$pid" ] && kill "$pid" 2>/dev/null
  done
  pkill -f 'firebase.*emulators:start' 2>/dev/null
  ok "emulator"
  echo
  exit 0
}

[ "${1:-}" = "down" ] && stop_all
NO_BROWSER=0; NO_SEED=0
for arg in "$@"; do
  case "$arg" in
    --no-browser) NO_BROWSER=1 ;;
    --no-seed)    NO_SEED=1 ;;
    *) echo "dev-up: unknown option '$arg'" >&2; exit 1 ;;
  esac
done

# ── 0. can this machine afford it ───────────────────────────────────────────────
say "Checking the machine"
FREE=$(vm_stat | awk '/Pages free/{f=$3} /Pages inactive/{i=$3} END {printf "%.1f", (f+i)*16384/1073741824}')
DISK=$(df -g /System/Volumes/Data | awk 'NR==2{print $4}')
echo "  free+inactive memory: ${FREE} GB   ·   disk: ${DISK} GB"
awk -v f="$FREE" 'BEGIN{exit !(f<2.0)}' && { echo "  REFUSING: under 2 GB free. Close something first." >&2; exit 1; }
awk -v f="$FREE" 'BEGIN{exit !(f<4.0)}' && warn "tight for four Flutter apps plus four canvas tabs — expect it to be slow"

for a in "${APPS[@]}"; do
  port="${a#*:}"
  pid=$(lsof -nP -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null | head -1)
  [ -n "$pid" ] && { echo "  REFUSING: :$port already held by pid $pid. Run 'scripts/dev-up.sh down' first." >&2; exit 1; }
done
ok "app ports 5050-5053 are free"

# ── 1. emulator ─────────────────────────────────────────────────────────────────
say "Starting the emulator (slot 0)"
mkdir -p "$RUN"
if fns_up; then
  ok "already up on :5002, reusing it"
else
  ( cd "$ROOT/backend/src-plattr" && EMU_SLOT=0 ./emu.sh >"$RUN/emulator.log" 2>&1 & )
  printf '  waiting'
  for _ in $(seq 1 90); do
    fns_up && break
    printf '.'; sleep 2
  done
  echo
  fns_up || { echo "  emulator never answered — see $RUN/emulator.log" >&2; tail -20 "$RUN/emulator.log" >&2; exit 1; }
  ok "functions :5002 · firestore :8080 · UI http://127.0.0.1:4001"
fi

# ── 2. seed ─────────────────────────────────────────────────────────────────────
if [ "$NO_SEED" = 0 ]; then
  say "Seeding MockData7 (5 restaurants, the fullest seed there is)"
  cd "$ROOT/backend/src-plattr/functions" || exit 1
  # Rebuild first: offer validity windows are baked as absolute dates and go stale.
  node mock/buildMockData7.js >/dev/null || { echo "  build failed" >&2; exit 1; }
  FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node mock/importMockData5.js \
    --file=mock/MockData7ProductionMenus.json --clean --refresh-timestamps >"$RUN/seed.log" 2>&1 \
    || { echo "  import failed — see $RUN/seed.log" >&2; tail -20 "$RUN/seed.log" >&2; exit 1; }
  ok "Meghana · Pizza Bakery · Truffles · SALT · Chowman"
fi

# ── 3. the four apps ────────────────────────────────────────────────────────────
say "Starting the apps (first run compiles, give it a minute)"
for a in "${APPS[@]}"; do
  name="${a%%:*}"
  ( "$RUN/run_app.sh" "$name" >/dev/null 2>&1 & )
done
for a in "${APPS[@]}"; do
  name="${a%%:*}"; port="${a#*:}"
  printf '  %-9s' "$name"
  for _ in $(seq 1 150); do
    tcp_up "$port" && break
    printf '.'; sleep 2
  done
  if tcp_up "$port"; then
    printf ' \033[32mup\033[0m  http://127.0.0.1:%s/\n' "$port"
  else
    printf ' \033[31mfailed\033[0m — see %s/%s.log\n' "$RUN" "$name"
  fi
done

# ── 4. one browser window ───────────────────────────────────────────────────────
if [ "$NO_BROWSER" = 0 ]; then
  say "Opening one Chrome window with four tabs"
  # `open -na Chrome --args --new-window` only activates an already-running Chrome and drops the
  # URLs, so drive it by AppleScript: one new window, four tabs, existing windows untouched.
  osascript >/dev/null 2>&1 <<OSA
tell application "Google Chrome"
  activate
  set w to make new window
  set URL of active tab of w to "${URLS[0]}"
  make new tab at end of tabs of w with properties {URL:"${URLS[1]}"}
  make new tab at end of tabs of w with properties {URL:"${URLS[2]}"}
  make new tab at end of tabs of w with properties {URL:"${URLS[3]}"}
  set index of w to 1
end tell
OSA
  if [ $? -eq 0 ]; then ok "server · kitchen · admin · consumer"
  else warn "could not drive Chrome; open these yourself:"; printf '     %s\n' "${URLS[@]}"; fi
fi

cat <<'EOF'

  Logins — one rule: the app's own name is the username.

    restaurant   res_meghana        (or res_pizzabakery / res_truffles / res_salt / res_chowman)
    server app   server@meg.test    password 1234
    kitchen app  kitchen@meg.test   password 1234
    admin app    admin@meg.test     password 1234
    consumer     table 1, OTP 123456, guest Customer One / 9876543210

  All three staff logins come pre-filled; tap a card under the form to switch restaurant.
  Emulator UI: http://127.0.0.1:4001      Stop everything: scripts/dev-up.sh down

EOF
