#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(git -C "$(dirname "${BASH_SOURCE[0]}")" rev-parse --show-toplevel)"

source "${ROOT_DIR}/backend/src-plattr/contract-tests/contract_test_config.sh"

: "${MOCK_IMPORT_SCRIPT:?MOCK_IMPORT_SCRIPT must be set in contract_test_config.sh}"

node "${ROOT_DIR}/${MOCK_IMPORT_SCRIPT}"
