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