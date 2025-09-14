# Menu APIs Documentation

This document outlines the menu-related APIs available for the server (waiter) application. These APIs enable waiters to view the restaurant menu, update menu item details, mark items as out of stock, add new items, and delete existing items.

## API Overview

| Endpoint | Function | Description |
|----------|----------|-------------|
| `/menu/get` | `getRestaurantMenu` | Retrieve the complete restaurant menu with categories and items |
| `/menu/update-item` | `updateMenuItem` | Update menu item details (including marking items as out of stock) |
| `/menu/add-item` | `addMenuItem` | Add a new menu item to the restaurant menu |
| `/menu/delete-item` | `deleteMenuItem` | Remove a menu item from the restaurant menu |

## Detailed API Specifications

### 1. Get Restaurant Menu (`/menu/get`)

**Purpose**: Retrieve the complete restaurant menu, organized by categories with all menu items.

**Request Parameters**:
```json
{
  "restaurantId": "REST001",
  "inStock": true  // Optional, default is true. If true, returns only in-stock items
}
```

**Response Format**: See `getRestaurantMenuSample.md`

**Frontend Usage**:
- Used in the Menu tab to display all menu items
- Used when waiters need to verify item availability or details
- Supports filtering to show only in-stock items

### 2. Update Menu Item (`/menu/update-item`)

**Purpose**: Update details of an existing menu item, including marking items as out of stock.

**Request Parameters**:
```json
{
  "restaurantId": "REST001",
  "menuItemId": "ITEM001",
  "updateData": {
    "meta": {
      "name": "Updated Item Name",  // Optional
      "description": "Updated description",  // Optional
      "image": "https://example.com/image.jpg"  // Optional
    },
    "priceInfo": {
      "basePrice": 9.99,  // Optional
      "discount": 1.00,  // Optional
      "finalPrice": 8.99  // Optional
    },
    "isInStock": false,  // Optional, use this to mark items out of stock
    "categoryId": "CAT002"  // Optional, to move item to a different category
  }
}
```

**Response Format**: See `updateMenuItemSample.md`

**Frontend Usage**:
- Primarily used for marking items as out of stock in the Menu tab
- Can be used to update other item details like price, description, etc.
- Allows waiters to quickly respond to kitchen inventory changes

### 3. Add Menu Item (`/menu/add-item`)

**Purpose**: Add a new menu item to the restaurant's menu.

**Request Parameters**:
```json
{
  "restaurantId": "REST001",
  "menuItemData": {
    "categoryId": "CAT001",
    "meta": {
      "name": "New Item Name",  // Required
      "description": "Item description",  // Optional
      "image": "https://example.com/image.jpg"  // Optional
    },
    "priceInfo": {
      "basePrice": 9.99,  // Required
      "discount": 0,  // Optional
      "finalPrice": 9.99  // Optional, calculated automatically if not provided
    },
    "variants": [],  // Optional
    "addons": [],  // Optional
    "isInStock": true  // Optional, default is true
  }
}
```

**Response Format**: See `addMenuItemSample.md`

**Frontend Usage**:
- Used when adding new seasonal items or specials to the menu
- Available to authorized staff for menu management
- Can be used to quickly add promotional items

### 4. Delete Menu Item (`/menu/delete-item`)

**Purpose**: Remove a menu item from the restaurant's menu completely.

**Request Parameters**:
```json
{
  "restaurantId": "REST001",
  "menuItemId": "ITEM001"
}
```

**Response Format**: See `deleteMenuItemSample.md`

**Frontend Usage**:
- Used when items are permanently removed from the menu
- Available to authorized staff for menu management
- Less common than marking items as out of stock, which is the preferred approach for temporary unavailability

## Implementation Notes

1. **Optimizing Menu Loading**:
   - The menu is cached on the client side to improve performance
   - Consider implementing real-time updates for out-of-stock status changes

2. **Image Handling**:
   - Menu item images are referenced by URL
   - Consider implementing image optimization for faster loading

3. **Best Practices**:
   - For temporary unavailability, use `updateMenuItem` to mark items as out of stock rather than deleting them
   - When creating new items, ensure all required fields are provided
   - Use appropriate error handling for failed API calls

4. **Security Considerations**:
   - These APIs require appropriate authentication
   - Only authorized staff should be able to add, update, or delete menu items

For sample responses and CURL examples for testing, refer to the respective sample files in the `sample_response/server` directory.
