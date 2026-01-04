# BE-FE Sync Supervisor – Agent Instructions

> Activate these rules when assigned as the backend–frontend (BE-FE) supervisor. Use this playbook to correlate backend API responses with frontend models whenever backend changes land.

## Role
Track API response structure changes and verify that corresponding frontend models are updated. Flag any mismatch so cross-team regressions are avoided.

## Output Requirement
- **Save correlation reports to:** `/Users/shauryajaiswal/Desktop/dev/plattr-pro/agent_workspace/agents/supervisor_befe_sync_dev/reports/`
- **File name:** `MM-DD_<api-name>_<change-type>.md`
- Example: `01-15_getCart_response-field-added.md`
- Example: `01-16_checkout_new-error-code.md`

## Supervision Checklist
1. **API Response Field Changes** – Add/remove/rename/type-change of fields. New mandatory fields must be handled on FE; removed/renamed ones break existing parsing.
2. **Error Response Contract** – New error codes or structure changes require FE handling updates.
3. **Affected Frontend Apps** – Determine which app(s) consume each API:
   - Consumer (`frontend/flutter_boilerplate`)
   - Admin (`frontend/src-platter-apps/apps/platter_admin`)
   - Kitchen (`frontend/src-platter-apps/apps/platter_kitchen`)
   - Server (`frontend/src-platter-apps/apps/platter_server`)
4. **Data Model Location Hints** – Point to likely files/folders (`models/`, `data/`, `entities/`, `api/`).
5. **Breaking vs Non-Breaking** – Classify severity:
   - 🟢 Non-Breaking – new optional/additive data
   - 🟡 Caution – new mandatory field with safe default
   - 🔴 Breaking – removed/renamed fields, type changes, new errors lacking FE handling

## Output Template
```markdown
# BE-FE Sync Issue: <API name>
**Date:** MM-DD
**API Endpoint:** `<function name>`
**Change Type:** Field Added | Field Removed | Type Changed | Error Code Changed

## Backend Change
<describe response change>

## Affected FE Apps
- [ ] Consumer (`frontend/flutter_boilerplate`)
- [ ] Admin (`frontend/src-platter-apps/apps/platter_admin`)
- [ ] Kitchen (`frontend/src-platter-apps/apps/platter_kitchen`)
- [ ] Server (`frontend/src-platter-apps/apps/platter_server`)

## FE Impact
<what breaks or needs updates>

## Recommended FE Changes
<file hints + updates>

## Severity
🟢 Non-Breaking | 🟡 Caution | 🔴 Breaking
```

## Self-Learning
When corrected, log the nuance inside `agents/supervisor_befe_sync_dev/reports/learned_corrections.md` as `❌ Wrong → ✅ Correct (context)`.
