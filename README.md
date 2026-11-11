# Plattr Pro

Multi-app restaurant POS and dine-in ordering system connecting guests, waiters, kitchen staff, and cashiers/admins on a shared Firebase Functions + Firestore backend.

## Architecture

- **Backend (`backend/src-plattr/functions/`)**: Firebase Cloud Functions (Node 22 / TypeScript + JS legacy handlers) structured around strict layer boundaries enforced by `scripts/moonshot-check.sh`:
  - `domain/` — pure business rules (billing, tax, floor state machine, offline reconcile, KOT/receipts, print queue, approvals) with zero Firebase imports
  - `app/` — transaction & port orchestration
  - `adapters/` — Firestore and ESC/POS printer adapters
  - `api/` — HTTP / callable endpoints and scheduled tasks
- **Cashier Till (`frontend/till/`)**: React 19 + TypeScript + Vite web app with Playwright E2E coverage (`frontend/till/e2e/`)
- **Consumer App (`frontend/flutter_boilerplate/`)**: Flutter QR dine-in app (menu browsing, shared table cart, split-round checkout, live order polling)
- **Staff Apps (`frontend/src-platter-apps/`)**: Flutter apps for Server/Waiter, Kitchen Display + Print Agent, and Admin (`apps/platter_{server,kitchen,admin}`)
- **Specs & Engineering Record (`moonshot/`)**: Living module specs (`SPEC_*.md`), design reviews (`moonshot/reviews/`), state log (`STATE.md`), and tracked technical debt (`TECH_DEBT.md`)

## Verification

Run the primary static, boundary, typecheck, and unit-test gate from the repo root:

```sh
make check
```

What `make check` runs (see `Makefile`):
1. `bash scripts/moonshot-check.sh` — enforces `domain`/`app`/`till` dependency boundaries and forbids hardcoded tenant checks
2. `tsc -p tsconfig.json` (`backend/src-plattr/functions`) and `tsc -b` (`frontend/till`)
3. `npx jest` (`backend/src-plattr/functions`, 55 suites / 1,377 unit tests)

Additional suites live under:
- `backend/src-plattr/functions/test/e2e/` (Firestore/Functions emulator integration suites)
- `frontend/till/e2e/` (`npm run e2e:ui` Playwright suite)
- `frontend/flutter_boilerplate/test/` and `frontend/src-platter-apps/` (`flutter test` / `flutter analyze`)

## Development workflow

Recent modules are built iteratively in the terminal alongside AI coding assistants, using `moonshot/SPEC_*.md` specifications, explicit boundary checks, and `make check` as the non-negotiable acceptance bar before committing.
