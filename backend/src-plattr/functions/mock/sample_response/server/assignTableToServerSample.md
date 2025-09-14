/**
 * Sample Response: assignTableToServer Function
 * 
 * This file shows the expected response format from the table.assignTableToServer cloud function.
 * You can use this to understand the data structure returned by the function.
 */

// Sample response when assignment is successful
const successResponse = {
    "status": "success",
    "message": "Table assigned to server successfully",
    "data": {
        "tableId": "table001",
        "tableNumber": "T1",
        "serverId": "server001",
        "serverName": "John Server"
    }
};

// Sample response when table is already assigned to the specified server
const alreadyAssignedResponse = {
    "status": "success",
    "message": "Table is already assigned to this server",
    "data": {
        "tableId": "table001",
        "tableNumber": "T1",
        "serverId": "server001",
        "serverName": "John Server"
    }
};

// Sample error response (if server not found)
const errorResponse = {
    "status": "error",
    "code": "not-found",
    "message": "Server not found",
    "details": {
        "details": "Server with ID server999 was not found in restaurant rest001",
        "serverId": "server999",
        "restaurantId": "rest001"
    }
};

// Client-side code example (JavaScript)
const clientExample = `
// How to call the function from a client app
const assignTableToServer = async (restaurantId, tableId, serverId) => {
  try {
    const assignTable = firebase.functions().httpsCallable('table-assignTableToServer');
    const result = await assignTable({ 
      restaurantId,
      tableId,
      serverId
    });
    
    // Access the response data
    const { tableNumber, serverName } = result.data;
    console.log(\`Table \${tableNumber} assigned to \${serverName}\`);
    
    return result.data;
  } catch (error) {
    console.error('Error assigning table to server:', error);
    throw error;
  }
};
`;

// CURL command example
const curlExample = `
curl -X POST "http://localhost:5002/rms-app-dd875/us-central1/table-assignTableToServer" \\
  -H "Content-Type: application/json" \\
  -d '{"data":{"restaurantId":"rest001","tableId":"table001","serverId":"server001"}}'
`;

// Export the examples
module.exports = {
    successResponse,
    alreadyAssignedResponse,
    errorResponse,
    clientExample,
    curlExample
};
