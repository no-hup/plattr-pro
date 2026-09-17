/**
 * Customer Service Module
 * 
 * Provides direct implementation functions for working with customer profiles,
 * separate from the HTTP callable functions in customer.js.
 * This approach allows for direct function calls within the codebase,
 * which works more reliably in emulator environments.
 */

const { admin, db } = require('../admin/admin');
const timestamp = require('../utils/timestamp');

/**
 * Creates or updates a customer profile directly (without HTTP callable wrapper)
 * @param {string} phoneNumber - Customer phone number (used as document ID)
 * @param {string} name - Customer name
 * @returns {Promise<Object>} Created or updated customer profile
 */
async function createOrUpdateCustomerProfileDirect(phoneNumber, name) {
  try {
    console.log(`customerService.createOrUpdateCustomerProfileDirect: Processing for phone ${phoneNumber}`);
    
    if (!phoneNumber) {
      throw new Error('Phone number is required');
    }
    
    const customerRef = db.collection('customers').doc(phoneNumber);
    const customerDoc = await customerRef.get();
    
    // Get current timestamp
    const now = timestamp.serverTimestamp();
    
    if (!customerDoc.exists) {
      // Create new customer profile
      console.log(`Creating new customer profile for ${phoneNumber}`);
      const customerData = {
        phoneNumber,
        name: name || '',
        createdAt: now,
        updatedAt: now,
        visits: []
      };
      
      await customerRef.set(customerData);
      console.log(`New customer profile created for ${phoneNumber}`);
      return { ...customerData, id: phoneNumber };
    } else {
      // Update existing customer profile
      console.log(`Updating existing customer profile for ${phoneNumber}`);
      const updateData = {
        updatedAt: now
      };
      
      // Only update name if provided
      if (name) {
        updateData.name = name;
      }
      
      await customerRef.update(updateData);
      console.log(`Customer profile updated for ${phoneNumber}`);
      
      const updatedDoc = await customerRef.get();
      return { ...updatedDoc.data(), id: phoneNumber };
    }
  } catch (error) {
    console.error("Error in createOrUpdateCustomerProfileDirect:", error);
    throw error; // Rethrow for handling by caller
  }
}

/**
 * Gets a customer profile by phone number
 * @param {string} phoneNumber - Customer phone number
 * @returns {Promise<Object|null>} Customer profile or null if not found
 */
async function getCustomerProfile(phoneNumber) {
  try {
    const customerRef = db.collection('customers').doc(phoneNumber);
    const customerDoc = await customerRef.get();
    
    if (!customerDoc.exists) {
      return null;
    }
    
    return { ...customerDoc.data(), id: phoneNumber };
  } catch (error) {
    console.error(`Error getting customer profile for ${phoneNumber}:`, error);
    throw error;
  }
}

module.exports = {
  createOrUpdateCustomerProfileDirect,
  getCustomerProfile
}; 