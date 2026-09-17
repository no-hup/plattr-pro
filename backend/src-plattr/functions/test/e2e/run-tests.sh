#!/bin/bash
# Plattr Pro E2E Test Wrapper
# Usage:
#   bash run-tests.sh                    # run all suites (summary-only)
#   bash run-tests.sh --verbose          # run all suites (full output)
#   bash run-tests.sh --suite cart       # run single suite
#   bash run-tests.sh --no-reset         # skip data reset
#
# For human observation, tail the narrative log in a second terminal:
#   tail -f backend/claude-api-testing-workflow/results/narrative.log

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# ── 1. Check emulator health ────────────────────────────────────
EMULATOR_URL="${PLATTR_BASE_URL:-http://127.0.0.1:5002}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$EMULATOR_URL" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "000" ]; then
  echo "[run-tests] ERROR: Firebase emulator not reachable at $EMULATOR_URL"
  echo "[run-tests] Start it with:"
  echo "  cd backend/src-plattr && ./emu.sh   # or EMU_SLOT=1 ./emu.sh for a private one"
  exit 1
fi
echo "[run-tests] Emulator: OK"

# ── 2. Run tests ────────────────────────────────────────────────
node run.js "$@"
EXIT_CODE=$?

# ── 3. Print one-line result ────────────────────────────────────
if [ -f results/last_run.txt ]; then
  echo ""
  echo "[run-tests] $(cat results/last_run.txt)"
fi

exit $EXIT_CODE
