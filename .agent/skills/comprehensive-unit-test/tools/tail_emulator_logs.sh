#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(git -C "$(dirname "${BASH_SOURCE[0]}")" rev-parse --show-toplevel)"
LOG_FILE="${ROOT_DIR}/backend/src-plattr/firebase-debug-logs/emulator.log"

if [[ ! -f "${LOG_FILE}" ]]; then
  echo "[contract] Emulator log not found: ${LOG_FILE}" >&2
  exit 1
fi

tail -n 200 "${LOG_FILE}"
