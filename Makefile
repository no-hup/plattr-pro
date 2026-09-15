# make check: lint (boundary grep) + typecheck + unit. Must be green before any commit (moonshot/CLAUDE.md).
F=backend/src-plattr/functions
# macOS ships GNU make 3.81, which ignores .SHELLFLAGS, so pipefail is set in the recipe itself.
SHELL := /bin/bash
.PHONY: check boundary typecheck unit
check: boundary typecheck unit
boundary:
	bash scripts/moonshot-check.sh
typecheck:
	cd $(F) && node node_modules/typescript/bin/tsc -p tsconfig.json
	cd frontend/till && npx tsc -b
unit:
	set -o pipefail; cd $(F) && npx jest --silent 2>&1 | tail -15
