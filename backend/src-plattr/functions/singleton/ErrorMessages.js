/**
 * ErrorMessages - Singleton class to manage error messages across the application
 */
class ErrorMessages {
  constructor() {
    if (ErrorMessages.instance) {
      return ErrorMessages.instance;
    }
    
    // Initialize error messages
    this.messages = {
      // Cart related errors
      CART_DIFFERENT_VARIANT_EXISTS: "Different variant of this menu item is already added to cart",
      CART_ITEM_NOT_FOUND: "Item not found in cart",
      CART_EMPTY: "Cart is empty",
      
      // Menu item related errors
      MENU_ITEM_NOT_FOUND: "Menu item not found",
      MENU_ITEM_OUT_OF_STOCK: "Menu item is currently out of stock",
      
      // Variant and addon related errors
      VARIANT_NOT_FOUND: "Variant not found",
      VARIANT_OPTION_NOT_FOUND: "Selected option not found for the variant",
      ADDON_NOT_FOUND: "Addon not found",
      
      // General errors
      INVALID_INPUT: "Invalid input parameters",
      DATABASE_ERROR: "Error accessing database",
      UNEXPECTED_ERROR: "An unexpected error occurred while processing your request"
    };
    
    ErrorMessages.instance = this;
  }
  
  /**
   * Get an error message
   * @param {string} messageKey - The key of the error message
   * @returns {string} - The error message
   */
  get(messageKey) {
    if (this.messages.hasOwnProperty(messageKey)) {
      return this.messages[messageKey];
    }
    console.warn(`Error message key '${messageKey}' not found`);
    return "Unknown error";
  }
}

// Export a singleton instance
const errorMessages = new ErrorMessages();
Object.freeze(errorMessages);

module.exports = errorMessages; 