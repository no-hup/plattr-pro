const functions = require('firebase-functions');
const { admin, db, FieldValue } = require('../admin/admin');
const timestamp = require('../utils/timestamp');
const { safeArrayUnion, safeArrayRemove, applyArrayOperation } = require('../utils/arrayOperations');

/**
 * Creates or updates customer profile
 * @param {Object} request - Request object
 * @param {Object} request.data - Data payload
 * @param {string} request.data.phoneNumber - Customer phone number (used as document ID)
 * @param {string} request.data.name - Customer name
 * @returns {Promise<Object>} Created or updated customer profile
 */
exports.createOrUpdateCustomerProfile = functions.https.onCall(async (request, context) => {
  try {
    console.log("createOrUpdateCustomerProfile called with:", JSON.stringify(request.data));
    
    if (!request?.data) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing request data');
    }
    
    const { phoneNumber, name } = request.data;
    
    if (!phoneNumber) {
      throw new functions.https.HttpsError('invalid-argument', 'Phone number is required');
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
    console.error("Error in createOrUpdateCustomerProfile:", error);
    throw new functions.https.HttpsError('internal', `Failed to create/update customer profile: ${error.message}`);
  }
});

// Function to get or create customer profile
exports.getOrCreateCustomerProfile = functions.https.onCall(async (data, context) => {
    
    // Ensure the user is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
    }

    const phoneNumber = context.auth.uid;

    try {
        const customerRef = db.collection('customers').doc(phoneNumber);
        const customerDoc = await customerRef.get();

        if (!customerDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Customer profile not found');
        }

        return customerDoc.data();
    } catch (error) {
        console.error('Error in getOrCreateCustomerProfile:', error);
        throw new functions.https.HttpsError('internal', 'Failed to get customer profile');
    }
});

// Function to update customer's current visit
exports.updateCustomerVisit = functions.https.onCall(async (data, context) => {
    // Ensure the user is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
    }

    const { restaurantId, tableId } = data;
    const uid = context.auth.uid;

    try {
        const customerRef = db.collection('customers').doc(uid);
        const customerDoc = await customerRef.get();

        if (!customerDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Customer profile not found');
        }

        const newVisit = {
            restaurantId: restaurantId,
            tableId: tableId,
            startTime: timestamp.now() // concrete: this object is arrayUnion-ed into visits[]
        };

        // Get current customer data for applying array operations
        const customerData = customerDoc.data();
        const updateData = {
            currentVisit: newVisit,
            updatedAt: timestamp.serverTimestamp()
        };
        
        // Use safe array operations
        const visitsOp = safeArrayUnion(newVisit);
        applyArrayOperation(updateData, 'visits', customerData.visits, visitsOp);

        await customerRef.update(updateData);

        return { message: 'Customer visit updated successfully' };
    } catch (error) {
        console.error('Error in updateCustomerVisit:', error);
        throw new functions.https.HttpsError('internal', 'Failed to update customer visit');
    }
});

// Function to end customer's current visit
exports.endCustomerVisit = functions.https.onCall(async (data, context) => {
    // Ensure the user is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
    }

    const uid = context.auth.uid;

    try {
        const customerRef = db.collection('customers').doc(uid);
        const customerDoc = await customerRef.get();

        if (!customerDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Customer profile not found');
        }

        const customerData = customerDoc.data();
        if (!customerData.currentVisit) {
            throw new functions.https.HttpsError('failed-precondition', 'No active visit found');
        }

        const endedVisit = {
            ...customerData.currentVisit,
            endTime: timestamp.now() // concrete: arrayUnion-ed into visits[]
        };

        const updateData = {
            currentVisit: null,
            updatedAt: timestamp.serverTimestamp()
        };
        
        // Use safe array operations for removing old visit
        const removeOp = safeArrayRemove(customerData.currentVisit);
        applyArrayOperation(updateData, 'visits', customerData.visits, removeOp);
        
        // Use safe array operations for adding ended visit
        const addOp = safeArrayUnion(endedVisit);
        applyArrayOperation(updateData, 'visits', 
            // Apply after removing the old visit
            updateData.visits || customerData.visits, 
            addOp
        );

        await customerRef.update(updateData);

        // Update table status
        const tableRef = db.collection('restaurants').doc(endedVisit.restaurantId).collection('tables').doc(endedVisit.tableId);
        await tableRef.update({
            status: 'vacant',
            occupiedBy: null,
            lastActivity: timestamp.serverTimestamp()
        });

        return { message: 'Customer visit ended successfully' };
    } catch (error) {
        console.error('Error in endCustomerVisit:', error);
        throw new functions.https.HttpsError('internal', 'Failed to end customer visit');
    }
});
