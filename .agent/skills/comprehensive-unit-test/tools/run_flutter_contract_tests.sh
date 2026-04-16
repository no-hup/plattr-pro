#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(git -C "$(dirname "${BASH_SOURCE[0]}")" rev-parse --show-toplevel)"
BASE_URL=${PLATTR_FUNCTIONS_BASE_URL:-}

if [[ -n "${BASE_URL}" ]]; then
  dart_define=("--dart-define=PLATTR_FUNCTIONS_BASE_URL=${BASE_URL}")
else
  dart_define=()
fi

cd "${ROOT_DIR}/frontend/src-platter-apps/apps/platter_server"
flutter test test/contract -j 1 "${dart_define[@]}"
