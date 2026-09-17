# Launch-1 — first production deployment (2026-09-08)

Restaurant: **Kaanchipuram Kaapi, HSR Layout, Bengaluru** (South-Indian tiffin; menu from 2 photos).
Restaurant id `res_kaanchipuram_kaapi_hsr` (name + area). Tables: 10 placeholder (owner to confirm).
Staff: 1 kitchen, 1 server, 1 manager.

Project `rms-app-dd875` (Blaze). Functions region us-central1. Hosting site `plattrpro`
(https://plattrpro.web.app, already exists). Firestore `(default)` exists, rules locked (`if false`).
Prod currently has 41 stale nodejs18 functions from an old deploy (inventory in scratchpad).

Working tree deployed = tag `deploy/prod-2026-09-08-pre` (git stash-create snapshot of the
uncommitted tree, jest 104/104 at that point). Nothing is committed on behalf of other sessions.

## Phases

| # | What | Who | Depends on |
|---|------|-----|-----------|
| A | Menu photos → `firestore-launch-1.json` (big-brewski format) + validator + emulator smoke | Opus agent | — |
| B | Backend prod-readiness (CORS, indexes, dev guards) → deploy rules+indexes+functions, curl-verify | Opus agent | — |
| C | Consumer web: prod `.env` build script → `flutter build web` → hosting deploy | Opus agent | — |
| D | Staff APKs (kitchen, server, admin) release builds; fix platter_server pub get | Opus agent | — |
| E | Seed prod Firestore, scripted prod smoke (scan→OTP→menu→cart→checkout→kitchen→served→paid), cleanup | Opus agent | A, B |
| F | QR sheet (per-table URLs), browser verification of the hosted app, memory notes | me | C, E |

## Guard rails
- Never `--clean` against prod (the import script's clean is emulator-REST only, but don't rely on it).
- Prod writes only with `GOOGLE_APPLICATION_CREDENTIALS=<abs path to functions/secure_stuff/service-account.json>` and NO `FIRESTORE_EMULATOR_HOST`.
- Staff passwords are generated, bcrypt-hashed in the seed, plaintext only in `CREDENTIALS.local.md` (gitignored).
- Every phase appends observations/issues to `PROD_DEPLOY_LOG.md`.
