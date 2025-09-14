/**
* Builds authentication details including auth message and server info
* @param {Object} tableData - The table data object
* @param {string} restaurantId - The restaurant ID
* @param {FirebaseFirestore.Firestore} db - Firestore instance
* @returns {Promise<{authMessage: string, assignedServerInfo: Object|null}>}
*/
async function buildAuthDetails(tableData, restaurantId, db) {
    let authMessage = "Please ask the restaurant staff for the OTP to join this table";
    let assignedServerInfo = null;
    
    if (tableData.primaryCustomer?.name) {
        authMessage = `Please ask ${tableData.primaryCustomer.name} for the OTP to join this table`;
    }
    
    if (tableData.assignedServerId) {
        const serverDoc = await db
        .collection('restaurants')
        .doc(restaurantId)
        .collection('servers')
        .doc(tableData.assignedServerId)
        .get();
        
        if (serverDoc.exists) {
            const serverName = serverDoc.data().name;
            assignedServerInfo = {
                name: serverName,
                id: tableData.assignedServerId
            };
            
            if (tableData.primaryCustomer?.name) {
                authMessage = `Please ask ${tableData.primaryCustomer.name} or your server ${serverName} for the OTP`;
            } else {
                authMessage = `Please ask your server ${serverName} for the OTP to join this table`;
            }
        }
    }
    
    return { authMessage, assignedServerInfo };
}

module.exports = {
    buildAuthDetails
};