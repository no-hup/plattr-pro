#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(git -C "$(dirname "${BASH_SOURCE[0]}")" rev-parse --show-toplevel)"
LOG_DIR="${ROOT_DIR}/backend/src-plattr/firebase-debug-logs"
LOG_FILE="${LOG_DIR}/emulator.log"

mkdir -p "${LOG_DIR}"

status_code=$(bash "${ROOT_DIR}/.agent/skills/comprehensive-unit-test/tools/check_emulator.sh" || true)
if [[ "$status_code" == "200" ]]; then
  echo "[contract] Emulator already running (HTTP 200)."
  exit 0
fi

nohup npm run emulators > "${LOG_FILE}" 2>&1 &

sleep 3
status_code=$(bash "${ROOT_DIR}/.agent/skills/comprehensive-unit-test/tools/check_emulator.sh" || true)
if [[ "$status_code" != "200" ]]; then
  echo "[contract] Emulator start attempted, but check returned HTTP ${status_code}."
  echo "[contract] See logs: ${LOG_FILE}"
  exit 1
fi

echo "[contract] Emulator started. Logs: ${LOG_FILE}"
