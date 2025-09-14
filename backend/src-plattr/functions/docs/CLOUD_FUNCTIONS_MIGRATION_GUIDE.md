# Firebase Cloud Functions Migration Guide: .onCall to .onRequest

## Table of Contents
1. [Overview](#overview)
2. [Migration Process](#migration-process)
3. [Function Groups](#function-groups)
4. [Testing Protocol](#testing-protocol)
5. [Deployment Strategy](#deployment-strategy)
6. [Critical Considerations](#critical-considerations)
7. [Troubleshooting Guide](#troubleshooting-guide)

## Overview

This guide provides a detailed, step-by-step approach for migrating Firebase Cloud Functions from `.onCall` to `.onRequest` while maintaining exact request/response compatibility. The migration is critical for removing Firebase SDK dependencies from client applications.

### Key Objectives
- Maintain exact request/response structure
- Preserve all business logic
- Ensure backward compatibility
- Minimize client-side changes
- Maintain security and session handling

## Migration Process

### 1. Pre-Migration Steps

#### A. Backup and Documentation
1. Create backup of original function:
   ```bash
   cp functions/[module]/[function].js functions/[module]/[function].js.bak
   ```
2. Document current implementation:
   - Request structure
   - Response structure
   - Error cases
   - Session requirements
   - Dependencies

#### B. Test Case Creation
1. Create test matrix:
   - Success scenarios
   - Error scenarios
   - Edge cases
   - Session validation cases
2. Document expected responses
3. Create test data sets

### 2. Function Migration Steps

#### A. Create New HTTP Function File
```javascript
// functions/[module]/[module]Http.js
const functions = require('firebase-functions');
const { admin, db } = require('../admin/admin');
const timestamp = require('../utils/timestamp');
// Import other required utilities
```

#### B. Implement HTTP Function
1. **Basic Structure**
```javascript
exports.functionName = functions.https.onRequest(async (req, res) => {
  // CORS Headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  // Method Check
  if (req.method !== 'POST') {
    res.status(405).json({
      error: {
        code: 'method-not-allowed',
        message: 'Only POST requests are allowed'
      }
    });
    return;
  }
```

2. **Request Validation**
```javascript
  try {
    // Log request for debugging
    console.log("Function called with:", JSON.stringify(req.body));
    
    // Validate request body
    if (!req.body) {
      res.status(400).json({
        error: {
          code: 'invalid-argument',
          message: 'Missing request body'
        }
      });
      return;
    }
    
    // Extract and validate required fields
    const { field1, field2 } = req.body;
    if (!field1) {
      res.status(400).json({
        error: {
          code: 'invalid-argument',
          message: 'field1 is required'
        }
      });
      return;
    }
```

3. **Business Logic**
```javascript
    // Maintain exact same business logic as original function
    // Only change the way we access data (req.body instead of request.data)
    // Keep all existing validation and processing logic
    
    // Example:
    const result = await processData(field1, field2);
```

4. **Response Handling**
```javascript
    // Match exact response structure of original function
    res.status(200).json(result);
  } catch (error) {
    console.error("Error in function:", error);
    res.status(500).json({
      error: {
        code: 'internal',
        message: `Operation failed: ${error.message}`
      }
    });
  }
});
```

### 3. Update Exports
```javascript
// functions/index.js
// Original exports
exports.customer = require('./customer/customer');
// New HTTP exports
exports.customerHttp = require('./customer/customerHttp');
```

## Function Groups

### Group 1: Core Customer & Authentication (High Priority)
1. `createOrUpdateCustomerProfile`
   - Export: `exports.customerHttp.createOrUpdateCustomerProfile`
   - Original: `exports.customer.createOrUpdateCustomerProfile`

2. `getOrCreateCustomerProfile`
   - Export: `exports.customerHttp.getOrCreateCustomerProfile`
   - Original: `exports.customer.getOrCreateCustomerProfile`

3. `updateCustomerVisit`
   - Export: `exports.customerHttp.updateCustomerVisit`
   - Original: `exports.customer.updateCustomerVisit`

4. `endCustomerVisit`
   - Export: `exports.customerHttp.endCustomerVisit`
   - Original: `exports.customer.endCustomerVisit`

5. `validateTableAndLocation`
   - Export: `exports.tableHttp.validateTableAndLocation`
   - Original: `exports.table.validateTableAndLocation`

6. `validateOTP`
   - Export: `exports.tableHttp.validateOTP`
   - Original: `exports.table.validateOTP`

7. `checkTableStatus`
   - Export: `exports.tableHttp.checkTableStatus`
   - Original: `exports.table.checkTableStatus`

### Group 2: Order & Cart Management (Medium Priority)
1. `getOrder`
   - Export: `exports.orderHttp.getOrder`
   - Original: `exports.order.getOrder`

2. `createOrUpdateOrder`
   - Export: `exports.orderHttp.createOrUpdateOrder`
   - Original: `exports.order.createOrder`

3. `updateCartStatus`
   - Export: `exports.orderHttp.updateCartStatus`
   - Original: `exports.order.updateCartStatus`

4. `getActiveOrdersForRestaurant`
   - Export: `exports.orderHttp.getActiveOrdersForRestaurant`
   - Original: `exports.order.getActiveOrdersForRestaurant`

5. `checkoutCart`
   - Export: `exports.cartHttp.checkoutCart`
   - Original: `exports.cart.checkoutCart`

6. `clearCart`
   - Export: `exports.cartHttp.clearCart`
   - Original: `exports.cart.clearCart`

7. `updateOrderStatus`
   - Export: `exports.orderHttp.updateOrderStatus`
   - Original: `exports.order.updateOrderStatus`

### Group 3: Restaurant & Menu Management (Lower Priority)
1. `getRestaurantMenu`
   - Export: `exports.menuHttp.getRestaurantMenu`
   - Original: `exports.menu.getRestaurantMenu`

2. `fetchMenu`
   - Export: `exports.menuHttp.fetchMenu`
   - Original: `exports.menu.fetchMenu`

3. `createServer`
   - Export: `exports.serverHttp.createServer`
   - Original: `exports.server.createServer`

4. `updateServer`
   - Export: `exports.serverHttp.updateServer`
   - Original: `exports.server.updateServer`

5. `getServer`
   - Export: `exports.serverHttp.getServer`
   - Original: `exports.server.getServer`

6. `assignTable`
   - Export: `exports.serverHttp.assignTable`
   - Original: `exports.server.assignTable`

7. `unassignTable`
   - Export: `exports.serverHttp.unassignTable`
   - Original: `exports.server.unassignTable`

8. `getTablesForRestaurant`
   - Export: `exports.tableHttp.getTablesForRestaurant`
   - Original: `exports.table.getTablesForRestaurant`

9. `generateTableOTP`
   - Export: `exports.tableHttp.generateTableOTP`
   - Original: `exports.table.generateTableOTP`

10. `updateServerFCMToken`
    - Export: `exports.notificationHttp.updateServerFCMToken`
    - Original: `exports.notifications.updateServerFCMToken`

11. `handleTableQRScan`
    - Export: `exports.notificationHttp.handleTableQRScan`
    - Original: `exports.notifications.handleTableQRScan`

## Testing Protocol

### 1. Local Testing

#### A. Request Testing
```bash
# Success case
curl -X POST "http://localhost:5001/[project-id]/[region]/[function-name]" \
  -H "Content-Type: application/json" \
  -d '{"field1": "value1", "field2": "value2"}'

# Error cases
curl -X POST "http://localhost:5001/[project-id]/[region]/[function-name]" \
  -H "Content-Type: application/json" \
  -d '{"field1": "value1"}'  # Missing required field

curl -X POST "http://localhost:5001/[project-id]/[region]/[function-name]" \
  -H "Content-Type: application/json" \
  -d '{}'  # Empty body
```

#### B. Response Validation
1. Compare response structure with original function
2. Verify all fields are present and correctly formatted
3. Check error responses match original function
4. Validate session handling
5. Test all error scenarios

### 2. Integration Testing
1. Test with existing client code
2. Verify client applications can handle new HTTP endpoints
3. Ensure no changes needed in client-side code
4. Test all client-side error handling
5. Validate session management

## Deployment Strategy

### 1. Pre-Deployment Checklist
- [ ] All tests passing
- [ ] Response structure matches original
- [ ] Error handling matches original
- [ ] CORS headers properly set
- [ ] Session handling maintained
- [ ] Logging implemented
- [ ] Documentation updated
- [ ] Backup created

### 2. Deployment Steps
1. Deploy new HTTP function
2. Keep original function running
3. Test in staging environment
4. Verify all client applications
5. Monitor for errors
6. Check logs for issues

### 3. Post-Deployment
1. Monitor for errors
2. Verify client applications
3. Check logs for any issues
4. Plan removal of original function

## Critical Considerations

### 1. DO NOT
- Change request/response structure
- Modify business logic
- Alter error handling patterns
- Skip any validation steps
- Remove any logging
- Change session handling
- Modify security checks

### 2. ALWAYS
- Test thoroughly before deployment
- Maintain exact response format
- Keep all existing validations
- Document all changes
- Test with real client data
- Verify session handling
- Check error scenarios

### 3. VERIFY
- All error cases are handled
- Response structure is identical
- Session handling works
- CORS is properly configured
- Logging is comprehensive
- Security is maintained
- Client compatibility

## Troubleshooting Guide

### Common Issues

1. **CORS Errors**
   - Verify CORS headers are set correctly
   - Check preflight request handling
   - Validate allowed origins

2. **Session Issues**
   - Verify session validation logic
   - Check session token handling
   - Validate session expiration

3. **Response Structure Mismatch**
   - Compare with original function
   - Check all fields are present
   - Verify error format

4. **Error Handling**
   - Verify all error cases
   - Check error response format
   - Validate error logging

### Debugging Steps
1. Check function logs
2. Verify request format
3. Test with sample data
4. Compare with original function
5. Validate session handling
6. Check error responses

## Migration Order
1. Start with Group 1 functions
2. Test thoroughly before moving to next function
3. Document any issues or special cases
4. Maintain backup of original functions
5. Deploy one function at a time
6. Verify client applications after each deployment

## Conclusion
This migration is critical for removing Firebase SDK dependencies while maintaining functionality. Follow this guide strictly to ensure a smooth transition with minimal risk of breaking changes or client-side issues. 