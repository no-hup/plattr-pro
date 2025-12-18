# Supervisor Review: warp-docs-reorg
**Date:** 12-18
**Files Reviewed:** 14

## Summary
Specs and reference docs were moved, but the rollout left broken navigation, missing shared styles, and duplicate sources of truth. A new pair of top-level docs no longer consume `styles.css`, API references in `specs/` still point to the wrong CSS path, and every spec continues to inline the same CSS that was just centralized.

## File-by-File Review
📄 **backend/src-plattr/.cursor/rules/agent-must-do.mdc:125**
   - ✅ OK
   - Absolute-path quick-reference now matches the root `agent_workspace` layout, so agents know exactly where to log work.

📄 **backend/src-plattr/.cursor/rules/agent-supervisor.mdc:20**
   - ✅ OK
   - Output-location guidance now points at `/agent_workspace/supervisor/`, aligning with the directories you created.

📄 **backend/src-plattr/.cursor/rules/agent-befe-supervisor.mdc:21**
   - ✅ OK
   - New BE-FE supervisor rules include the same absolute-path convention and can be followed as-is.

📄 **backend/src-plattr/warp/complete_app_flow_html/styles.css:952**
   - ⚠️ Concern
   - You moved all of the spec-specific classes (`.imp`, `.flow-step`, `.api-accordion`, etc.) into the shared stylesheet, but every spec still declares the identical rules inline (see files below). Until those `<style>` blocks are removed, we now have two copies of every rule and any change will have to be mirrored in multiple places.

📄 **backend/src-plattr/warp/CART_CHECKOUT_SYSTEM.html:9**
   - ⚠️ Concern
   - This new top-level copy no longer links to `styles.css`, so the entire 500-line base style sheet is duplicated inside the file and will drift from the canonical version in `complete_app_flow_html/CART_CHECKOUT_SYSTEM.html:1`.
   - Links at `backend/src-plattr/warp/CART_CHECKOUT_SYSTEM.html:586-588` point to `AUTH_SYSTEM.html` and `ORDER_LIFECYCLE_SYSTEM.html`, but those files do not exist in `backend/src-plattr/warp/`, so two nav buttons now 404.

📄 **backend/src-plattr/warp/CONSUMER_APP_FLOW.html:8**
   - ⚠️ Concern
   - Like the cart doc, this duplicate drops the shared `styles.css` import and keeps a bespoke `<style>` block, creating another divergent source beside `complete_app_flow_html/CONSUMER_APP_FLOW.html:1`.
   - Nav CTAs at `backend/src-plattr/warp/CONSUMER_APP_FLOW.html:353-355` reference `ORDER_LIFECYCLE_SYSTEM.html` and `AUTH_SYSTEM.html` that are missing from this folder, so those links are broken.

📄 **backend/src-plattr/warp/complete_app_flow_html/specs/cart_flow_detailed_spec.html:13**
   - ⚠️ Concern
   - The file still embeds the same `.imp`/`.flow-step` CSS block even though those selectors now live in `styles.css:952`; edits must be made in two places until the inline `<style>` is removed.

📄 **backend/src-plattr/warp/complete_app_flow_html/specs/menu_flow_detailed_spec.html:13**
   - ⚠️ Concern
   - Same duplicated inline CSS as above—please rely on the shared stylesheet instead of keeping a second copy.

📄 **backend/src-plattr/warp/complete_app_flow_html/specs/order_flow_detailed_spec.html:13**
   - ⚠️ Concern
   - Inline `<style>` block duplicates the shared rules; remove it so specs inherit from `styles.css` only.

📄 **backend/src-plattr/warp/complete_app_flow_html/specs/table_session_flow_detailed_spec.html:13**
   - ⚠️ Concern
   - Still carries the entire base CSS inline despite the centralized definitions—this will drift quickly.

📄 **backend/src-plattr/warp/complete_app_flow_html/specs/cart_api_reference.html:8**
   - ⚠️ Concern
   - The stylesheet href never gained the `../` prefix after moving into `specs/`, so the page attempts to load `specs/styles.css` (404) and renders unstyled.
   - The `<style>` block beginning at line 9 also duplicates the shared `.api-accordion` rules.

📄 **backend/src-plattr/warp/complete_app_flow_html/specs/menu_api_reference.html:12**
   - ⚠️ Concern
   - Same missing `../` prefix on the stylesheet plus redundant inline CSS; the doc currently renders without the shared typography/colors.

📄 **backend/src-plattr/warp/complete_app_flow_html/specs/order_api_reference.html:8**
   - ⚠️ Concern
   - Even though this one points to `../styles.css`, it still repeats all of the accordion/list styles inline, so edits will require touching both files.

📄 **backend/src-plattr/warp/complete_app_flow_html/specs/table_session_api_reference.html:11**
   - ⚠️ Concern
   - Stylesheet path still reads `styles.css`, so the moved file loses all shared styling, and the inline CSS duplicates the new shared selectors.
   - The nav link at `backend/src-plattr/warp/complete_app_flow_html/specs/table_session_api_reference.html:238` references `CONSUMER_APP_FLOW.html` without the new `../` prefix, so it resolves to `specs/CONSUMER_APP_FLOW.html` (missing) instead of the actual document.

## Action Items
1. Decide on a single source for each high-level doc—either move everything under `backend/src-plattr/warp/` and bring the shared `styles.css` import with you, or drop the duplicates and keep the `complete_app_flow_html` versions so navigation stays intact.
2. Fix the stylesheet hrefs for every file now living in `specs/` (e.g., cart/menu/table-session API references) so they load `../styles.css`, and repair the broken `CONSUMER_APP_FLOW` link in `table_session_api_reference.html`.
3. Remove the redundant inline `<style>` blocks from all flow and API specs now that `styles.css` carries those selectors, otherwise future UI tweaks will require multi-file edits and drift is guaranteed.
