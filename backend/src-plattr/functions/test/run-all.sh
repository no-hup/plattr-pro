#!/usr/bin/env bash
#
# run-all.sh — the whole pre-launch test stack, in one command.
#
#   bash test/run-all.sh              # everything
#   bash test/run-all.sh --quick      # skip the 5-restaurant sweep and flag matrix
#
# Layers, cheapest first, so a failure shows up as early as possible:
#   A  jest unit + pricing matrix   offline, milliseconds
#   B  verifyGolden                 offline, golden values vs real backend code
#   C  goalline + e2e suites        live, known-good regression bar
#   D  lifecycle matrix             live, adversarial multi-actor scenarios
#   E  contracts                    captured responses vs Flutter model requirements
#   F  flutter test                 real Dart models parsing real responses
#
# Everything writes into ONE issue log: test/e2e/results/FINDINGS.md
set -uo pipefail
cd "$(dirname "$0")/.."          # functions/

QUICK=0
[[ "${1:-}" == "--quick" ]] && QUICK=1

FAILED=()
step() { echo; echo "───────────────────────────────────────────────"; echo "  $1"; echo "───────────────────────────────────────────────"; }
note() { echo "  ! $1"; }

step "A · unit + offline pricing matrix"
npx jest --coverage=false 2>&1 | tail -6 || FAILED+=("jest")

step "B · golden values vs real backend code (offline)"
node mock/verifyGolden.js 2>&1 | tail -3 || FAILED+=("verifyGolden")

# Everything below needs the emulator.
if ! curl -s -o /dev/null -X POST http://127.0.0.1:5002/rms-app-dd875/us-central1/dev-listRestaurants \
      -H 'Content-Type: application/json' -d '{"data":{}}' 2>/dev/null; then
  note "Emulator not reachable on 127.0.0.1:5002 — skipping the live layers."
  note "Start it from backend/src-plattr with the firebase emulators:start command in AGENTS/README."
  exit 1
fi

step "C · goal-line (golden scenarios against the live backend)"
# Rebuild first: the seed bakes wall-clock dates into offer validity as ISO
# strings, which --refresh-timestamps does not rewrite, so an old seed silently
# turns "future offer" negative cases into live offers.
node mock/buildMockData7.js >/dev/null 2>&1
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node mock/importMockData5.js \
  --file=mock/MockData7ProductionMenus.json --clean --refresh-timestamps >/dev/null 2>&1
( cd test/e2e && node goalline.mjs 2>&1 | tail -4 ) || FAILED+=("goalline")

step "D · live lifecycle matrix (multi-actor, adversarial)"
if [[ $QUICK -eq 1 ]]; then
  ( cd test/e2e && node matrix/run-matrix.mjs --restaurant res_meghana 2>&1 | tail -12 ) || FAILED+=("matrix")
else
  ( cd test/e2e && node matrix/run-matrix.mjs --flags all 2>&1 | tail -12 ) || FAILED+=("matrix")
fi

step "E · response contracts vs Flutter model requirements"
node test/e2e/contracts/check-contracts.mjs 2>&1 | tail -14 || FAILED+=("contracts")

step "F · Flutter models parsing the captured responses"
if command -v flutter >/dev/null 2>&1; then
  for app in ../../../frontend/flutter_boilerplate \
             ../../../frontend/src-platter-apps/apps/platter_kitchen; do
    name=$(basename "$app")
    if [[ -d "$app/test/contract" ]]; then
      echo "  · $name"
      ( cd "$app" && flutter test test/contract 2>&1 | tail -3 ) || {
        FAILED+=("flutter:$name")
        note "$name could not run its contract tests — see FINDINGS.md for the build blocker"
      }
    fi
  done
else
  note "flutter not on PATH — skipping the Dart layer"
fi

step "Findings"
node -e "
const F=require('./test/findings.cjs');
const l=F.render();
const by=l.reduce((m,f)=>{m[f.severity]=(m[f.severity]||0)+1;return m;},{});
for (const s of ['CRITICAL','HIGH','MEDIUM','LOW','INFO']) if(by[s]) console.log('  '+s.padEnd(9)+by[s]);
console.log('  ─────────────');
console.log('  total    ', l.length);
console.log();
console.log('  Confirmed by a live test: '+l.filter(f=>f.status==='confirmed').length);
console.log('  Read from the code only : '+l.filter(f=>f.status==='unconfirmed').length);
console.log();
console.log('  Full report -> test/e2e/results/FINDINGS.md');
"

if [[ ${#FAILED[@]} -gt 0 ]]; then
  echo; echo "Layers with failures: ${FAILED[*]}"
  echo "That is expected while known issues are open — read FINDINGS.md, not the exit code."
fi
