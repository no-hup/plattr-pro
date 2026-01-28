# 06 Data Contract: Active Carts & Sorting

## Overview
Define the API contract and data requirements for fetching "Active Carts" (the core data stream for the Kitchen App). This includes specifying how data should be sorted and structured to support the UI.

## In-Scope
-   **API Definition**: `GET /kitchen/active-carts` (or similar).
-   **Data Structure**: Nested objects (Carts -> Items).
-   **Sorting Logic**: Defining the sorting order (e.g., First-In-First-Out, Priority).
-   **Polling/Updates**: How to keep data fresh (Pull-to-refresh vs Polling vs Socket). *Assumption*: Start with Polling/Pull-to-refresh to keep it simple, mirroring Server app if applicable.

## Out-of-Scope
-   Backend implementation of the API.
-   History data (handled in separate endpoint).

## Requirements & Nuances
-   **Fetching Active Carts**:
    -   Must filter by **Restaurant Location** (and potentially **Kitchen Category** if relevant).
    -   Must include **Table Number** and **Assigned Server Name** (Critical for UI).
    -   Must exclude "Served" or "Cancelled" carts (unless "Served" is a specific transient state).
-   **Sorting**:
    -   **Backend-driven**: The API should return the list in the correct display order.
    -   *Strategy*: Oldest active order first (FIFO) typically. Priority orders (if exists) on top.
    -   *Proposal*: Sort by `createdAt` ASC.
-   **Unknowns / Discussion**:
    -   Does the kitchen need to see "Scheduled Orders"? (Future proofing).

## Open Questions / Decisions Needed
-   **Polling Frequency**: 60 seconds.
-   **Manual Refresh**: Yes, implement **pull-to-refresh** in addition to polling.
-   **Background Polling**: Continue polling for Live data even when user is on the History tab.
-   **Discussion Point**: Discuss whether polling logic should be kept generic at the network layer or simplified at the UI layer.
-   **Pagination**: **TODO**: Not required for "Live" view now, but add a TODO for future scalability.

## Dependencies
-   **Backend**: `GET /active-orders` endpoint tailored for active kitchen display.
-   **Models**: Shared models from Task 04.

## Acceptance Criteria
-   [ ] Defined API Contract (Swagger/Docs) for `GET /kitchen/active-carts`.
-   [ ] Contract includes `tableNumber`, `serverName`, `items`, `status`.
-   [ ] Sorting is defined (Oldest first).
-   [ ] Response time < 500ms (no heavy computation on read).
