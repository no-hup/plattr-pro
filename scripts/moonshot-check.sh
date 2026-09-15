#!/usr/bin/env bash
# Boundary grep for the new POS layers (moonshot/CLAUDE.md "Layout and boundaries").
# Illegal: domain -> anything, app -> firebase, till -> adapters/firebase, `restaurantId ===` in business logic.
set -euo pipefail
cd "$(dirname "$0")/.."
F=backend/src-plattr/functions
fail=0
bad() { echo "BOUNDARY: $1"; fail=1; }
if [ -d "$F/domain" ]; then
  rg -n "from ['\"](\.\./|firebase|@google)|require\(['\"](\.\./|firebase|@google)" "$F/domain" -g '*.ts' -g '!*.test.ts' && bad "domain imports outside domain"
fi
if [ -d "$F/app" ]; then
  rg -n "firebase|@google-cloud" "$F/app" -g '*.ts' -g '!*.test.ts' && bad "app imports firebase"
fi
if [ -d frontend/till/src ]; then
  rg -n "firebase|adapters/" frontend/till/src -g '*.ts' -g '*.tsx' && bad "till imports firebase or adapters"
fi
rg -n "restaurantId\s*===|===\s*restaurantId|restaurantId\s*==\s*['\"]" "$F/domain" "$F/app" "$F/api" frontend/till/src -g '*.ts' -g '*.tsx' 2>/dev/null && bad "restaurantId compared in business logic (config, not code)"
exit $fail
