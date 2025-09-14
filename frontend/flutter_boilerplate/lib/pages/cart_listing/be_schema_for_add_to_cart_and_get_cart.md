// AddItemToCartResponse/GetCartResponse Schema with Nullable Fields
{
  "result": {
    "message": String,  // Non-nullable
    "status": String,   // Non-nullable
    "data": {
      "cart": {
        "restaurantId": String,  // Non-nullable
        "tableId": String,       // Non-nullable
        "sessionId": String?,    // Nullable - Optional in the input and response
        "lastUpdated": Number?,  // Nullable - May be missing in first addItemToCart response
        "priceInfo": {           // Non-nullable object
          "basePrice": Number,           // Non-nullable (defaults to 0)
          "finalPrice": Number,          // Non-nullable (defaults to 0)
          "totalDiscount": Number,       // Non-nullable (defaults to 0)
          "totalDiscountAmount": Number, // Non-nullable (defaults to 0)
          "totalAddonBasePrice": Number, // Non-nullable (defaults to 0)
          "totalVariantBasePrice": Number // Non-nullable (defaults to 0)
        },
        "items": [               // Non-nullable array, may be empty
          {
            "menuItemId": String,  // Non-nullable
            "cartItemId": Number,  // Non-nullable (generated if missing)
            "quantity": Number,    // Non-nullable (defaults to 1 if invalid)
            "menuItem": {          // Non-nullable
              "menuItemId": String,  // Non-nullable
              "categoryId": String,  // Non-nullable
              "meta": {              // Non-nullable object
                "name": String,        // Non-nullable
                "description": String?, // Nullable
                "categoryName": String, // Non-nullable
                "image": String?       // Nullable
              },
              "priceInfo": {         // Non-nullable
                "basePrice": Number,    // Non-nullable
                "finalPrice": Number,   // Non-nullable
                "discount": Number      // Non-nullable (defaults to 0)
              },
              "nutritionalInfo": {    // Nullable - Optional object
                "calories": Number?,  // Nullable
                "protein": Number?,   // Nullable
                "carbs": Number?,     // Nullable
                "fat": Number?        // Nullable
              },
              "addons": [String]?,    // Nullable - May be empty array or missing
              "variants": [           // Nullable - May be empty array or missing
                {
                  "id": String,       // Non-nullable
                  "name": String      // Non-nullable
                }
              ],
              "isInStock": Boolean,      // Non-nullable (defaults to true)
              "isCustomizable": Boolean?, // Nullable
              "allergenTags": [String]?   // Nullable - May be empty array or missing
            },
            "selectedVariantsDetails": [ // Nullable - May be empty array
              {
                "id": String,                  // Non-nullable
                "isMandatory": Boolean,        // Non-nullable
                "respectParentDiscount": Boolean, // Non-nullable
                "selected_variant_id": String, // Non-nullable
                "selected_variant_name": String, // Non-nullable
                "priceInfo": {                // Non-nullable
                  "basePrice": Number,        // Non-nullable (defaults to 0)
                  "finalPrice": Number,       // Non-nullable (defaults to 0)
                  "discount": Number          // Non-nullable (defaults to 0)
                }
              }
            ],
            "selectedAddonsDetails": [ // Nullable - May be empty array
              {
                "id": String,           // Non-nullable (defaults to "N/A" if missing)
                "name": String,         // Non-nullable (defaults to "N/A" if missing)
                "respectParentDiscount": Boolean, // Non-nullable (defaults to false)
                "priceInfo": {          // Non-nullable (defaults to empty object)
                  "basePrice": Number,  // Non-nullable (defaults to 0)
                  "finalPrice": Number, // Non-nullable (defaults to 0)
                  "discount": Number    // Non-nullable (defaults to 0)
                }
              }
            ],
            "priceInfo": {             // Non-nullable
              "itemBasePrice": Number,       // Non-nullable
              "itemVariantBasePrice": Number, // Non-nullable
              "itemAddonBasePrice": Number,  // Non-nullable
              "itemFinalPrice": Number,      // Non-nullable
              "discount": Number,            // Non-nullable
              "totalBasePrice": Number,      // Non-nullable
              "totalVariantBasePrice": Number, // Non-nullable
              "totalAddonBasePrice": Number, // Non-nullable
              "finalPrice": Number           // Non-nullable
            },
            "status": String?          // Nullable - May be missing or present (e.g., "cancelled")
          }
        ]
      }
    }
  }
}