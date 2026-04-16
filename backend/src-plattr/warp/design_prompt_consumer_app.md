# Plattr Consumer Web App - Design Brief

## What This Is

**Plattr** is a web-based restaurant ordering system. Customers scan a QR code at their table and use the website to browse the menu, add items to cart, and place orders—all without downloading an app.

**Platform**: Website (built with Flutter for Web)  
**Primary Use**: Mobile browsers (customers scan QR at restaurant tables)  
**Secondary Use**: Desktop/tablet browsers

---

## The Customer Journey

A customer walks into a restaurant, sits at a table, and sees a QR code. Here's what happens:

### Step 1: Scan QR Code
Customer scans the QR code with their phone camera. This opens a URL like:
```
https://plattr.app/r/restaurant123/t/table5
```

### Step 2: Table Verification Page
This is the landing page after scanning. The system:
1. Validates that this is a real table at a real restaurant
2. Checks the customer's location (to confirm they're actually at the restaurant)
3. Triggers OTP authentication

**Key behavior**: If authentication is required, an **OTP bottom sheet** slides up on this same page. The customer enters their phone number, receives an OTP via SMS, and enters it. Upon success, they proceed to the menu.

**What can go wrong**:
- Location services disabled → Show message asking to enable
- Not at restaurant location → Show error
- Invalid table/restaurant → Show error
- OTP incorrect/expired → Show error in the bottom sheet

### Step 3: Menu Page
The main browsing experience. Customer sees the restaurant's menu organized by categories (Starters, Mains, Beverages, etc.).

**Key behavior**:
- Menus can be **very large** (50+ items across many categories)
- Each menu item shows: name, price, discount (if any), stock status
- Items can have **variants** (e.g., Size: Small/Medium/Large) and **add-ons** (e.g., Extra cheese, Fries)
- When customer taps an item to customize or add, an **Item Bottom Sheet** slides up on this same page
- A **floating cart summary** is always visible showing item count and total

**The Item Bottom Sheet contains**:
- Item name and description
- Variant options (some mandatory, some optional) with price adjustments
- Add-on options with prices
- Quantity selector
- Calculated total price
- "Add to Cart" button

**What can go wrong**:
- Failed to load menu → Show error with retry
- Item out of stock → Show as unavailable
- Session expired → Redirect to verification

### Step 4: Cart Page
Customer reviews their cart before placing the order.

**What's shown**:
- List of all cart items with:
  - Item name
  - Selected variants and add-ons
  - Quantity (editable)
  - Line item price
  - Remove option
- Price summary:
  - Subtotal
  - Discounts applied
  - Final total
- "Place Order" button

**What can go wrong**:
- Empty cart → Show empty state with link back to menu
- Failed to load → Show error with retry
- Item became unavailable → Show notification, update cart
- Session expired → Redirect to verification

### Step 5: Orders Page
After placing an order (or anytime via navigation), customer can view their orders.

**What's shown**:
- List of orders placed during this session
- Each order shows:
  - Order number
  - Status (Placed → Preparing → Ready → Completed)
  - Items summary
  - Total amount
  - Time placed
  - Estimated completion time (if available)

**Order status meanings**:
| Status | Meaning |
|--------|---------|
| Placed | Kitchen received the order |
| Preparing | Kitchen is making the food |
| Ready | Food is ready for pickup/serving |
| Completed | Order delivered to customer |

**What can go wrong**:
- No orders yet → Show empty state
- Failed to load → Show error with retry

---

## Technical Constraints

### Screens (Fixed — 4 Total)
| Screen | URL Pattern |
|--------|-------------|
| Table Verification | `/r/:restaurantId/t/:tableId` |
| Menu | `/r/:restaurantId/t/:tableId/menu` |
| Cart | `/r/:restaurantId/t/:tableId/cart` |
| Orders | `/r/:restaurantId/t/:tableId/orders` |

### Overlays (Not Separate Pages)
These appear as bottom sheets/modals on their parent page:
- **OTP Bottom Sheet** → appears on Table Verification page
- **Item Bottom Sheet** → appears on Menu page
- **Confirmation Dialogs** → appear where needed (e.g., remove item from cart)

### States Per Screen
Every screen should handle these states:
- **Loading** — data being fetched
- **Error** — something went wrong, offer retry
- **Empty** — no data to show (where applicable)
- **Success** — normal view with data

### User Feedback
The app shows brief messages for actions:
- Success: "Item added to cart", "Order placed successfully"
- Error: "Failed to add item", "Session expired"
- Info: "Cart updated"

---

## Critical Design Priorities

### #1: Maximize Visible Line Items
On the **Menu, Cart, and Orders pages**, the most important goal is to show **as many line items as possible** on screen at once. Customers need to quickly scan through items without excessive scrolling.

This is more important than large visuals or spacious layouts.

### #2: Product Images Are Optional
Dish/product images are **not critical** to this experience. If images make each item card too large (reducing visible items), they can be deprioritized or made very small. The textual information (name, price, variants) is what matters.

### #3: Mobile-First Web
While this is a website, most users access it on mobile browsers after scanning a QR code at their table.

---

## Deliverables

**Create 4 different design versions** of the complete flow. Each version should take a distinct approach—this allows us to compare and potentially combine elements from different versions.

For each version, design:
1. All 4 screens
2. The 2 bottom sheets (OTP, Item customization)
3. All states (loading, error, empty, success)
4. Confirmation dialogs and feedback messages

You have full creative freedom on visual design, layout strategies, interactions, and aesthetics. The flows and requirements above are fixed; everything else is open for your interpretation.
