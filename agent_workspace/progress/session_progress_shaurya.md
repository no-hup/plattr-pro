9th jan 26

menu refactor done to accomodate sub categories and multiple menus

todo: FE menu page seems to be breaking. secitons are not clickable, need to checkl


13th jan

@menu_v2 design stragtegy prepared. need to execute. SCROLL_SYNC_STRATEGY, MENU_MIGRATION_STRATEGY

designs added 
todo - post migration make stragegy for design and theming changes to accomodate new design

15th Jan

How does offer actually get applied on backend and its realtion with prices.

20th jan

move from branch - 9-jan-db-schema-change-subcategory-menu

to 20-jan-server-app-resume
todo test all apps
Search & Filter
dish level status update and cancellation at server app?

Fix the 

updateOrderStatus
 placeholder in the Server App, implement proper status consolidation using a single source of truth, and ensure robust error handling for status updates.

User Review Required
IMPORTANT

Cart vs Order Status Strategy: The UI only exposes "Mark Ready" at the order level. To support the multi-cart backend, "Mark Ready" will iterate through all active carts in the order and update them individually. This is a workaround to avoid rebuilding the UI at this stage (Tech Debt). "Cancel Order" will use the order-level cancellation endpoint.


mock data for testing end to end flow

23rd Jan 26

**What's Done:**
• Consolidated `CART_STATUS` and `CART_ITEM_STATUS` into a unified `FULFILLMENT_STATUS` in the backend.
• Simplified fulfillment flow by removing the redundant `ACCEPTED` status. New flow: `PENDING` → `PREPARING`/`READY` → `SERVED`.
• Refactored Server App shell to include a global `ServerAppBarWidget` and `NoInternetBannerWidget` using `connectivity_plus`.
• Updated Server App L0 screens (`Orders`, `Tables`, `Menu`) to integrate with the new shell and support dynamic app bar actions.
• Added `profileImageUrl` to server login response and updated the UI to display it in the app bar.
• Synchronized Consumer App status handling and UI colors with the new backend fulfillment statuses.

**Things to Test in UI (Manual):**
• **Server App Login**: Verify successful login and check if the profile image and restaurant name appear correctly in the new app bar.
• **Server App Navigation**: Switch between Orders, Tables, and Menu tabs; ensure the app bar title and actions (refresh button) update correctly.
• **Server App Connectivity**: Toggle internet connection and verify that the "No Internet" banner appears/disappears smoothly.
• **Server App Order Status**: Mark a cart as "Preparing" or "Ready" and verify the status update reflects in the UI without the `ACCEPTED` step.
• **Consumer App Order History**: Check if the order and cart statuses (`Preparing`, `Ready`, `Served`) are displayed with correct colors in the order history.

28th Jan 26
mockdata v5 is minimal to test all apps. make it more robust to cover all feature flags.
test offer and kitchen app.
finish work on admin app