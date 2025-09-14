# Firestore Database Structure for Restaurant Management System

restaurants/
└── {restaurantId}/
├── info/
│   ├── name: string
│   ├── address: string
│   ├── phone: string
│   ├── email: string
│   └── location: geopoint
│
├── menuItems/
│   └── {menuItemId}/
│       ├── menuItemId: string
│       ├── categoryId: string
│       ├── meta/
│       │   ├── name: string
│       │   ├── description: string
│       │   ├── categoryName: string
│       │   └── image: string
│       ├── priceInfo/
│       │   ├── basePrice: number
│       │   ├── discount: number
│       │   └── finalPrice: number
│       ├── variants: array<object>
│       ├── addons: array<string>
│       ├── nutritionalInfo: object
│       ├── allergenTags: array<string>
│       ├── isInStock: boolean
│       ├── isCustomizable: boolean
│       └── lastUpdated: timestamp
│
├── categories/
│   └── {categoryId}/
│       ├── name: string
│       ├── description: string
│       ├── image: string
│       └── order: number
│
├── variants/
│   └── {variantId}/
│       ├── meta/
│       │   ├── name: string
│       │   ├── description: string
│       │   └── categoryAssociatedWith: array<string>
│       ├── options: array<object>
│       │   └── {optionId}/
│       │       ├── id: string
│       │       ├── name: string
│       │       ├── priceInfo/
│       │       │   ├── basePrice: number
│       │       │   ├── finalPrice: number
│       │       │   └── discount: number
│       │       └── isMandatory: boolean
│       ├── isMandatory: boolean
│       ├── respectParentDiscount: boolean
│       ├── relatedMenuItems: array<string>
│       └── lastUpdated: timestamp
│
├── tables/
│   └── {tableId}/
│       ├── number: string
│       ├── capacity: number
│       ├── status: string (vacant/occupied)
│       ├── currentOTP/
│       │   ├── code: string
│       │   ├── createdAt: timestamp
│       │   └── expiresAt: timestamp
│       ├── occupiedBy: array<string> (phone numbers)
│       ├── primaryCustomer/
│       │   ├── phoneNumber: string
│       │   └── name: string
│       ├── assignedServerId: string
│       └── lastActivity: timestamp
│
├── servers/
│   └── {serverId}/
│       ├── name: string
│       ├── email: string
│       ├── role: string
│       ├── status: string
│       ├── createdAt: timestamp
│       ├── updatedAt: timestamp
│       └── assignedTables: array<string>
│
├── orders/
│   └── {orderId}/
│       ├── customerId: string
│       ├── tableId: string
│       ├── serverId: string
│       ├── status: string
│       ├── items: array<object>
│       ├── totalAmount: number
│       ├── createdAt: timestamp
│       └── updatedAt: timestamp
│
├── addons/
│   └── {addonId}/
│       ├── meta/
│       │   ├── name: string
│       │   ├── description: string
│       │   └── categoryAssociatedWith: array<string>
│       ├── priceInfo/
│       │   ├── basePrice: number
│       │   ├── discount: number
│       │   └── finalPrice: number
│       ├── isMandatory: boolean
│       ├── respectParentDiscount: boolean
│       ├── itemsAssociatedWith: array<string>
│       └── isInStock: boolean
│
└── carts/
    └── {tableId}/
        ├── totalAmount: number
        ├── lastUpdated: timestamp
        └── items/
            └── {itemId}/
                ├── menuItemId: string
                ├── quantity: number
                ├── priceInfo: {
                │   ├── basePrice: number
                │   ├── finalPrice: number
                │   └── discount: number
                ├
                ├── selectedVariants: object
                ├── selectedAddons: array<string>
                

.
This updated visualization uses indentation and symbols (└── and ├──) to better illustrate the nested structure of collections and documents within the Firestore database. It clearly shows how each subcollection (menuItems, categories, variants, tables, servers, orders, and cart) is nested under the restaurant document, and how fields are organized within each document.
This representation makes it easier to understand the hierarchical structure of the database at a glance, while still providing detailed information about the fields within each document.
