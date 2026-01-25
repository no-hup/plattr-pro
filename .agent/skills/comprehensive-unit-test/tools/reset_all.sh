#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(git -C "$(dirname "${BASH_SOURCE[0]}")" rev-parse --show-toplevel)"

bash "${ROOT_DIR}/.agent/skills/comprehensive-unit-test/tools/start_emulator.sh"
bash "${ROOT_DIR}/.agent/skills/comprehensive-unit-test/tools/import_mock_data.sh"
