# New File Requests

## 2024-12-03 – TemporaryPlanning/codex593.md
- **Purpose:** Document the backend API response audit, outline the shared response structure, and track the endpoints that deviate from it.
- **Duplicate search:** Ran `rg --files | rg 'TemporaryPlanning'` and reviewed the existing `backend/TemporaryPlanning/codex_167.md`, `backend/TemporaryPlanning/codex483.md`, and `backend/TemporaryPlanning/codex742.md`. These files cover legacy investigations inside `backend/TemporaryPlanning`, but there is no root-level `TemporaryPlanning` directory dedicated to the current task, so a new file is required.

## 2025-11-14 – backend-overview package (Purpose.md, TODO.md, data & UI assets)
- **Purpose:** Create a standalone `backend-overview` package that visualizes the backend API flow (canvas-style diagram, scenario drilldowns, sample requests/responses) so new developers can understand relationships between callable functions.
- **Duplicate search:** Looked for existing overview tooling via `glob '**/backend-overview'` (no matches) and `glob '**/*overview*'`, which only surfaced server-app docs (`backend/src-plattr/functions/mock/server-app-docs/server_app_overview.md` and `frontend/src-platter-apps/apps/platter_server/lib/docs/server_app_overview.md`). No reusable HTML/JS package exists for backend API flow, so new files are necessary.
