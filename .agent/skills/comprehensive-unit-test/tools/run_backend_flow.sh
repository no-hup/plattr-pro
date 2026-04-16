#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(git -C "$(dirname "${BASH_SOURCE[0]}")" rev-parse --show-toplevel)"

bash "${ROOT_DIR}/backend/src-plattr/contract-tests/run_customer_server_order_flow.sh"
