#!/usr/bin/env bash
# Isolated Firebase emulator, one per Claude Code session.
#
#   EMU_SLOT=1 ./emu.sh                  # start slot 1 (firestore 8180, functions 5102)
#   eval "$(EMU_SLOT=1 ./emu.sh env)"    # in the OTHER shell, before importing/testing
#
# Ports = base + slot*100. Slot 0 is today's 8080/5002/4001/4501, so every
# existing doc and default keeps working unchanged.
set -euo pipefail
cd "$(dirname "$0")"

# Four slots, not ten. The port math overlaps past slot 3: UI is 4001+100*s and logging is
# 4501+100*s, so slot 5's UI is slot 0's logging port, and firebase's own emulator hub takes
# 4400 upward as each one starts. Four covers every agent that has ever run here at once.
slot_free() { local o=$(( $1 * 100 )); for p in $((8080+o)) $((5002+o)) $((4001+o)) $((4501+o)); do
  lsof -nP -iTCP:"$p" -sTCP:LISTEN -t >/dev/null 2>&1 && return 1; done; return 0; }

# No EMU_SLOT? Take the first slot nobody is on. Several agents share this machine, and a taken
# port has never been a reason not to test — it only ever meant "not this slot".
if [[ -z "${EMU_SLOT:-}" ]]; then
  if [[ "${1:-}" == "env" ]]; then
    # Guessing here would point your tests at somebody else's database. Say which one.
    echo "REFUSING: 'env' needs the slot you started, e.g. eval \"\$(EMU_SLOT=3 $0 env)\"." >&2
    RUNNING=""; for s in 0 1 2 3; do slot_free "$s" || RUNNING="$RUNNING $s"; done
    echo "  Slots running now:${RUNNING:- none}" >&2
    exit 1
  fi
  for s in 0 1 2 3; do slot_free "$s" && { EMU_SLOT=$s; break; }; done
  if [[ -z "${EMU_SLOT:-}" ]]; then echo "REFUSING: slots 0-3 are all in use; wait for one to free up." >&2; exit 1; fi
  echo "── no EMU_SLOT given; taking free slot $EMU_SLOT ──"
fi

SLOT=${EMU_SLOT}
OFF=$((SLOT * 100))
FS_PORT=$((8080 + OFF)); FN_PORT=$((5002 + OFF))
UI_PORT=$((4001 + OFF)); LOG_PORT=$((4501 + OFF))
CFG="firebase.emu-$SLOT.json"
FS_HOST="127.0.0.1:$FS_PORT"
BASE_URL="http://127.0.0.1:$FN_PORT/rms-app-dd875/us-central1"

if [[ "${1:-}" == "env" ]]; then
  echo "export FIRESTORE_EMULATOR_HOST=$FS_HOST"
  echo "export PLATTR_BASE_URL=$BASE_URL"
  exit 0
fi

# Guard 1: disk. macOS keeps swap on this volume; a full disk hangs the machine.
FREE_GB=$(df -g /System/Volumes/Data | awk 'NR==2{print $4}')
if (( FREE_GB < 3 )); then
  echo "REFUSING: ${FREE_GB} GB free on /System/Volumes/Data, need 3." >&2
  echo "  Try: bash scripts/reclaim-disk.sh   (dry run; --yes to delete)" >&2
  exit 1
fi

# Guard 2: ports. Another session on this slot would get its data wiped.
for p in $FS_PORT $FN_PORT $UI_PORT $LOG_PORT; do
  PID=$(lsof -nP -iTCP:"$p" -sTCP:LISTEN -t 2>/dev/null | head -1 || true)
  if [[ -n "$PID" ]]; then
    echo "REFUSING: slot $SLOT port $p is held by pid $PID ($(ps -o comm= -p "$PID" 2>/dev/null || echo '?'))." >&2
    echo "  Another session owns this slot. Use: EMU_SLOT=$((SLOT + 1)) $0" >&2
    exit 1
  fi
done

# firebase.json with this slot's ports swapped in (gitignored).
CFG="$CFG" node -e '
const f = require("fs");
const c = JSON.parse(f.readFileSync("firebase.json", "utf8"));
const [fs, fn, ui, lg] = process.argv.slice(1).map(Number);
c.emulators.firestore.port = fs; c.emulators.functions.port = fn;
c.emulators.ui.port = ui; c.emulators.logging.port = lg;
f.writeFileSync(process.env.CFG, JSON.stringify(c, null, 2));
' "$FS_PORT" "$FN_PORT" "$UI_PORT" "$LOG_PORT"

# New TypeScript layers (domain/app/adapters/api) run from functions/lib; build them so index.js can load them.
(cd functions && npm run build --silent)

echo "── emulator slot $SLOT · firestore $FS_PORT · functions $FN_PORT · ui $UI_PORT ──"
echo "In your test shell run:"
echo "    eval \"\$(EMU_SLOT=$SLOT $0 env)\""
echo "(exports FIRESTORE_EMULATOR_HOST=$FS_HOST, PLATTR_BASE_URL=$BASE_URL)"
echo

exec env \
  GOOGLE_APPLICATION_CREDENTIALS="$PWD/functions/secure_stuff/service-account.json" \
  FIREBASE_DEBUG_MODE=true \
  FIREBASE_DEBUG_FEATURES='{"skipTokenVerification":true}' \
  firebase emulators:start --config "$CFG" --project rms-app-dd875 --only firestore,functions
