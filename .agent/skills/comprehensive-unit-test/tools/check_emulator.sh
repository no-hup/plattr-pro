#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(git -C "$(dirname "${BASH_SOURCE[0]}")" rev-parse --show-toplevel)"
source "${ROOT_DIR}/backend/src-plattr/contract-tests/contract_test_config.sh"

: "${BASE_URL:?BASE_URL must be set in contract_test_config.sh}"

curl -s -o /dev/null -w "%{http_code}" -X POST "${BASE_URL}/dev-listRestaurants"
