```mermaid
erDiagram
    RESTAURANTS {
        string id PK
        string name
        string address
        string phone
        string email
        geopoint location
    }

    MENUITEMS {
        string menuItemId PK
        string categoryId FK
        string name
        string description
        string categoryName
        string image
        number basePrice
        number discount
        number finalPrice
        boolean isInStock
        boolean isCustomizable
        timestamp lastUpdated
    }

    CATEGORIES {
        string id PK
        string name
        string description
        string image
        number order
    }

    VARIANTS {
        string id PK
        string name
        string description
        string categoryAssociatedWith
        number basePrice
        number discount
        number finalPrice
        boolean isMandatory
        boolean respectParentDiscount
        timestamp lastUpdated
    }

    TABLES {
        string id PK
        string number
        number capacity
        string status
        string assignedServerId FK
        timestamp lastActivity
    }

    SERVERS {
        string id PK
        string name
        string email
        string role
        string status
        timestamp createdAt
        timestamp updatedAt
    }

    ORDERS {
        string id PK
        string customerId
        string tableId FK
        string serverId FK
        string status
        number totalAmount
        timestamp createdAt
        timestamp updatedAt
    }

    USERS {
        string id PK
        string name
        string email
    }

    CARTS {
        string tableId FK
        number totalAmount
        timestamp lastUpdated
    }

    CART_ITEMS {
        string menuItemId FK
        number quantity
        number basePrice
        number finalPrice
    }

    RESTAURANTS ||--o{ MENUITEMS : contains
    RESTAURANTS ||--o{ CATEGORIES : has
    RESTAURANTS ||--o{ VARIANTS : offers
    RESTAURANTS ||--o{ TABLES : manages
    RESTAURANTS ||--o{ SERVERS : employs
    RESTAURANTS ||--o{ ORDERS : processes
    RESTAURANTS ||--o{ CARTS : has
    CARTS||--o{ CART_ITEMS : contains

    MENUITEMS }o--|| CATEGORIES : belongs_to
    CART_ITEMS ||--|| MENUITEMS : references
    TABLES }o--|| SERVERS : assigned_to
    ORDERS }o--|| TABLES : placed_at
    ORDERS }o--|| SERVERS : served_by
