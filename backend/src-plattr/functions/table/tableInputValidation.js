const functions = require('firebase-functions');
const { admin, db, FieldValue } = require('../admin/admin');

class TableInputValidation {
    /**
     * Validates input parameters for table and location validation
     */
    static validateTableAndLocationInput(data) {
        console.log("poopoo TableInputValidation.validateTableAndLocationInput - Starting validation");
        const { restaurantId, tableId, userLocation } = data;

        if (!restaurantId || !tableId || !userLocation) {
            console.error("TableInputValidation.validateTableAndLocationInput - Missing required parameters");
            throw new functions.https.HttpsError('invalid-argument', 'Missing required parameters');
        }
        console.log("poopoo TableInputValidation.validateTableAndLocationInput - Input parameters validated successfully");
        // sessionId is optional, so we don't validate it
    }

    /**
     * Validates input parameters for development table validation
     */
    static validateTableDevInput(data) {
        console.log("poopoo TableInputValidation.validateTableDevInput - Starting validation");
        const { restaurantId, tableId } = data.data;

        if (!restaurantId || !tableId) {
            console.error("TableInputValidation.validateTableDevInput - Missing required parameters");
            throw new functions.https.HttpsError('invalid-argument', 'Missing required parameters: restaurantId, tableId');
        }
        console.log("poopoo TableInputValidation.validateTableDevInput - Input parameters validated successfully");
        // sessionId is optional, so we don't validate it
    }

    /**
     * Validates input parameters for OTP validation
     */
    static validateOTPInput(data) {
        console.log("poopoo TableInputValidation.validateOTPInput - Starting validation");
        const { restaurantId, tableId, otp } = data;

        if (!restaurantId || !tableId || !otp) {
            console.error("TableInputValidation.validateOTPInput - Missing required parameters");
            throw new functions.https.HttpsError('invalid-argument', 'Missing required parameters: restaurantId, tableId, otp');
        }
        console.log("poopoo TableInputValidation.validateOTPInput - Input parameters validated successfully");
        // phoneNumber and name are now optional, handled in validateOTP based on feature flags
    }

    /**
     * Validates input parameters for table status check
     */
    static validateTableStatusInput(data) {
        console.log("poopoo TableInputValidation.validateTableStatusInput - Starting validation");
        const { restaurantId, tableId } = data;

        if (!restaurantId || !tableId) {
            console.error("TableInputValidation.validateTableStatusInput - Missing required parameters");
            throw new functions.https.HttpsError('invalid-argument', 'Missing required parameters: restaurantId, tableId');
        }
        console.log("poopoo TableInputValidation.validateTableStatusInput - Input parameters validated successfully");
    }

    /**
     * Validates input parameters for assign table to server
     */
    static validateAssignTableInput(data) {
        console.log("poopoo TableInputValidation.validateAssignTableInput - Starting validation");
        const { restaurantId, tableId, serverId } = data;

        if (!restaurantId || !tableId || !serverId) {
            console.error("TableInputValidation.validateAssignTableInput - Missing required parameters");
            throw new functions.https.HttpsError('invalid-argument', 'Missing required parameters: restaurantId, tableId, serverId');
        }
        console.log("poopoo TableInputValidation.validateAssignTableInput - Input parameters validated successfully");
    }

    /**
     * Validates input parameters for unassign table from server
     */
    static validateUnassignTableInput(data) {
        console.log("poopoo TableInputValidation.validateUnassignTableInput - Starting validation");
        const { restaurantId, tableId } = data;

        if (!restaurantId || !tableId) {
            console.error("TableInputValidation.validateUnassignTableInput - Missing required parameters");
            throw new functions.https.HttpsError('invalid-argument', 'Missing required parameters: restaurantId, tableId');
        }
        console.log("poopoo TableInputValidation.validateUnassignTableInput - Input parameters validated successfully");
    }

    /**
     * Validates input parameters for generate table OTP
     */
    static validateGenerateOTPInput(data) {
        console.log("poopoo TableInputValidation.validateGenerateOTPInput - Starting validation");
        const { restaurantId, tableId } = data;

        if (!restaurantId || !tableId) {
            console.error("TableInputValidation.validateGenerateOTPInput - Missing required parameters");
            throw new functions.https.HttpsError('invalid-argument', 'Missing required parameters: restaurantId, tableId');
        }
        console.log("poopoo TableInputValidation.validateGenerateOTPInput - Input parameters validated successfully");
    }

    /**
     * Validates input parameters for update table status
     */
    static validateUpdateTableStatusInput(data) {
        console.log("poopoo TableInputValidation.validateUpdateTableStatusInput - Starting validation");
        const { restaurantId, tableId, status } = data;

        if (!restaurantId || !tableId || !status) {
            console.error("TableInputValidation.validateUpdateTableStatusInput - Missing required parameters");
            throw new functions.https.HttpsError('invalid-argument', 'Missing required parameters: restaurantId, tableId, status');
        }
        
        // Validate status is one of the allowed values
        const validStatuses = ['active', 'vacant', 'disabled', 'reserved', 'pending'];
        if (!validStatuses.includes(status)) {
            console.error(`TableInputValidation.validateUpdateTableStatusInput - Invalid status: ${status}`);
            throw new functions.https.HttpsError('invalid-argument', 
                `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
        }
        
        console.log("poopoo TableInputValidation.validateUpdateTableStatusInput - Input parameters validated successfully");
    }

    /**
     * Validates restaurant and table existence
     * @returns {Promise<[FirebaseFirestore.DocumentSnapshot, FirebaseFirestore.DocumentSnapshot]>}
     */
    static async validateRestaurantAndTableExistence(restaurantId, tableId) {
        console.log(`poopoo TableInputValidation.validateRestaurantAndTableExistence - Checking existence of restaurant ${restaurantId} and table ${tableId}`);
        const restaurantRef = db.collection('restaurants').doc(restaurantId);
        const tableRef = restaurantRef.collection('tables').doc(tableId);
        
        try {
            const [restaurantDoc, tableDoc] = await Promise.all([
                restaurantRef.get(),
                tableRef.get()
            ]);

            if (!restaurantDoc.exists) {
                console.error(`TableInputValidation.validateRestaurantAndTableExistence - Restaurant ${restaurantId} not found`);
                throw new functions.https.HttpsError('not-found', 'Restaurant not found');
            }

            if (!tableDoc.exists) {
                console.error(`TableInputValidation.validateRestaurantAndTableExistence - Table ${tableId} not found in restaurant ${restaurantId}`);
                throw new functions.https.HttpsError('not-found', 'Table not found');
            }

            console.log(`poopoo TableInputValidation.validateRestaurantAndTableExistence - Restaurant and table exist and validated successfully`);
            return [restaurantDoc, tableDoc];
        } catch (error) {
            if (error.code === 'not-found') {
                // Re-throw not-found errors
                throw error;
            }
            console.error(`TableInputValidation.validateRestaurantAndTableExistence - Error: ${error.message}`);
            throw new functions.https.HttpsError('internal', 'Error validating restaurant and table existence');
        }
    }

    /**
     * Gets and validates restaurant and table data
     * @param {string} restaurantId - ID of the restaurant
     * @param {string} tableId - ID of the table
     * @returns {Promise<{restaurantDoc, tableDoc, restaurantData, tableData, tableRef}>} 
     */
    static async getTableAndRestaurantData(restaurantId, tableId) {
        console.log(`poopoo TableInputValidation.getTableAndRestaurantData - Fetching data for restaurant ${restaurantId} and table ${tableId}`);
        try {
            const [restaurantDoc, tableDoc] = await this.validateRestaurantAndTableExistence(restaurantId, tableId);
            const restaurantData = restaurantDoc.data();
            const tableData = tableDoc.data();
            const tableRef = restaurantDoc.ref.collection('tables').doc(tableId);
            
            console.log(`poopoo TableInputValidation.getTableAndRestaurantData - Successfully retrieved data`);
            return { restaurantDoc, tableDoc, restaurantData, tableData, tableRef };
        } catch (error) {
            console.error('Error in TableInputValidation.getTableAndRestaurantData:', error);
            throw error; // Re-throw to maintain existing error handling
        }
    }
}

module.exports = TableInputValidation; 