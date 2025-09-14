# Menu Flow Requirements

## Front-end Requirements

1. Display a list of menu categories.
2. Show menu items within each category.
3. Present detailed information for each menu item, including name, description, price, and image.
4. Allow selection of variants (e.g., size, temperature) for applicable menu items.
5. Enable addition of optional add-ons to menu items.
6. Display nutritional information and allergen tags for each menu item.
7. Indicate whether a menu item is in stock or not.
8. Show customization options for items marked as customizable.
9. Calculate and display the final price based on selected variants and add-ons.
10. Provide a search functionality for menu items.
11. Allow filtering of menu items (e.g., by allergens, nutritional info).
12. Display a running total of the order as items are added.

## Backend API

1. `getRestaurantMenu(restaurantId: string): Promise<RestaurantMenu>`
   - Retrieves the entire menu structure for a specific restaurant

## Pseudo-code for getRestaurantMenu function

function getRestaurantMenu(restaurantId):
    categories = fetchCategories(restaurantId)
    menuItems = fetchMenuItems(restaurantId)
    variants = fetchVariants(restaurantId)
    addons = fetchInStockAddons(restaurantId)
    
    organizedMenu = {
        categories: categories,
        menuItems: {}
    }
    
    for each category in categories:
        organizedMenu.menuItems[category.id] = []
    
    for each item in menuItems:
        itemVariants = []
        for each variantId in item.variants:
            variant = variants[variantId]
            itemVariants.push(variant)
        
        itemAddons = []
        for each addonId in item.addons:
            addon = addons[addonId]
            if addon.isInStock:
                itemAddons.push(addon)
        
        organizedItem = {
            ...item,
            variants: itemVariants,
            addons: itemAddons
        }
        
        organizedMenu.menuItems[item.categoryId].push(organizedItem)
    
    return organizedMenu

function fetchCategories(restaurantId):
    // Fetch and return categories from the database

function fetchMenuItems(restaurantId):
    // Fetch and return menu items from the database

function fetchVariants(restaurantId):
    // Fetch and return variants from the database

function fetchInStockAddons(restaurantId):
    // Fetch and return in-stock addons from the database

## Response Structure

{
  "categories": [
    {
      "id": "cat001",
      "name": "Burgers",
      "description": "Delicious handcrafted burgers",
      "image": "https://example.com/images/burger-category.jpg",
      "order": 1
    },
    {
      "id": "cat002",
      "name": "Beverages",
      "description": "Refreshing drinks and hot beverages",
      "image": "https://example.com/images/beverages-category.jpg",
      "order": 2
    }
  ],
  "menuItems": {
    "cat001": [
      {
        "menuItemId": "item001",
        "meta": {
          "name": "Classic Cheeseburger",
          "description": "Juicy beef patty with melted cheddar cheese",
          "image": "https://example.com/images/classic-cheeseburger.jpg"
        },
        "priceInfo": {
          "basePrice": 12.99,
          "discount": 1.00,
          "finalPrice": 11.99
        },
        "variants": [
          {
            "id": "variant_burger_size",
            "meta": {
              "name": "Burger Size",
              "description": "Choose your preferred burger size"
            },
            "options": [
              {
                "id": "burger_size_regular",
                "name": "Regular",
                "priceInfo": {
                  "basePrice": 1.50,
                  "discount": 0.50,
                  "finalPrice": 1.00
                }
              },
              {
                "id": "burger_size_large",
                "name": "Large",
                "priceInfo": {
                  "basePrice": 2.50,
                  "discount": 0.50,
                  "finalPrice": 2.00
                }
              }
            ],
            "isMandatory": true
          }
        ],
        "addons": [
          {
            "id": "addon001",
            "meta": {
              "name": "French Fries",
              "description": "Crispy golden fries"
            },
            "priceInfo": {
              "basePrice": 2.99,
              "discount": 0,
              "finalPrice": 2.99
            },
            "isInStock": true
          },
          {
            "id": "addon002",
            "meta": {
              "name": "Potato Chips",
              "description": "Crunchy house-made potato chips"
            },
            "priceInfo": {
              "basePrice": 1.99,
              "discount": 0,
              "finalPrice": 1.99
            },
            "isInStock": true
          }
        ],
        "nutritionalInfo": {
          "calories": 650,
          "protein": 35,
          "carbs": 40,
          "fat": 38
        },
        "allergenTags": ["dairy", "gluten"],
        "isInStock": true,
        "isCustomizable": true
      }
    ],
    "cat002": [
      {
        "menuItemId": "item002",
        "meta": {
          "name": "Gourmet Coffee",
          "description": "Rich, aromatic coffee made from freshly ground beans",
          "image": "https://example.com/images/gourmet-coffee.jpg"
        },
        "priceInfo": {
          "basePrice": 3.99,
          "discount": 0,
          "finalPrice": 3.99
        },
        "variants": [
          {
            "id": "variant_temperature_beverage",
            "meta": {
              "name": "Temperature",
              "description": "Choose between hot or cold coffee"
            },
            "options": [
              {
                "id": "beverage_temp_hot",
                "name": "Hot",
                "priceInfo": {
                  "basePrice": 1.50,
                  "discount": 0,
                  "finalPrice": 1.50
                }
              },
              {
                "id": "beverage_temp_cold",
                "name": "Cold",
                "priceInfo": {
                  "basePrice": 1.50,
                  "discount": 0,
                  "finalPrice": 1.50
                }
              }
            ],
            "isMandatory": true
          },
          {
            "id": "variant_beverage_size",
            "meta": {
              "name": "Beverage Size",
              "description": "Choose your preferred coffee size"
            },
            "options": [
              {
                "id": "beverage_size_regular",
                "name": "Regular",
                "priceInfo": {
                  "basePrice": 1.00,
                  "discount": 0,
                  "finalPrice": 1.00
                }
              },
              {
                "id": "beverage_size_large",
                "name": "Large",
                "priceInfo": {
                  "basePrice": 1.50,
                  "discount": 0,
                  "finalPrice": 1.50
                }
              }
            ],
            "isMandatory": true
          }
        ],
        "addons": [
          {
            "id": "addon003",
            "meta": {
              "name": "Hazelnut Syrup",
              "description": "Rich hazelnut flavored syrup"
            },
            "priceInfo": {
              "basePrice": 0.99,
              "discount": 0,
              "finalPrice": 0.99
            },
            "isInStock": true
          },
          {
            "id": "addon004",
            "meta": {
              "name": "Vanilla Syrup",
              "description": "Sweet vanilla flavored syrup"
            },
            "priceInfo": {
              "basePrice": 0.99,
              "discount": 0,
              "finalPrice": 0.99
            },
            "isInStock": true
          }
        ],
        "nutritionalInfo": {
          "calories": 5,
          "protein": 0,
          "carbs": 0,
          "fat": 0
        },
        "allergenTags": [],
        "isInStock": true,
        "isCustomizable": true
      }
    ]
  }
}
