# Table, Session & Customer System - Detailed Flow Specification

## Overview

The Table-Session-Customer system manages restaurant table authentication, session lifecycle, and customer profiles. It enables multi-user table access via OTP validation with session-based ordering.

---

## Table State Machine

```
    ┌─────────────┐
    │             │
    │   VACANT    │◄───────────────────────────────────────┐
    │             │                                         │
    └──────┬──────┘                                         │
           │                                                │
           │ QR Scanned                                     │
           │ (OTP Generated)                                │
           ▼                                                │
    ┌─────────────┐                                         │
    │             │        OTP Expires (5 min)              │
    │ OTP_PENDING │─────────────────────────────────────────┤
    │             │                                         │
    └──────┬──────┘                                         │
           │                                                │
           │ OTP Validated                                  │
           │ (Session Created)                              │
           ▼                                                │
    ┌─────────────┐                                         │
    │             │        Session Ended                    │
    │   ACTIVE    │─────────────────────────────────────────┤
    │             │        (Bill Paid / Timeout / Manual)   │
    └──────┬──────┘                                         │
           │                                                │
           │ Secondary User Joins                           │
           │ (Same Session)                                 │
           └──────────┐                                     │
                      │                                     │
                      ▼                                     │
               ┌─────────────┐                              │
               │   ACTIVE    │──────────────────────────────┘
               │ (Same)      │
               └─────────────┘

    ┌─────────────┐
    │             │
    │  DISABLED   │◄──── Admin Disables (no customer access)
    │             │
    └─────────────┘
```

### TABLE_STATUS Constants
```javascript
const TABLE_STATUS = {
    ACTIVE: 'active',      // Table in use with active session
    VACANT: 'vacant',      // Available for new customers
    DISABLED: 'disabled',  // Unavailable (admin controlled)
    OTP_PENDING: 'pending' // OTP generated, awaiting validation
};
```

---

## Database Structure

```
restaurants/{restaurantId}/
├── tables/{tableId}
│   ├── status: 'active' | 'vacant' | 'disabled' | 'pending'
│   ├── number: string
│   ├── capacity: number
│   ├── primaryCustomer: { phoneNumber, name }
│   ├── occupiedBy: [phoneNumber1, phoneNumber2, ...]
│   ├── currentOTP: { code, createdAt, expiresAt }
│   ├── assignedServerId: string
│   ├── lastActivity: Timestamp
│   └── activeOrderId: string
│
├── sessions/{sessionId}
│   ├── tableId: string
│   ├── primaryUserId: string (phone number)
│   ├── users: [userId1, userId2, ...]
│   ├── status: 'active' | 'ended' | 'expired'
│   ├── createdAt: Timestamp
│   ├── updatedAt: Timestamp
│   └── expiresAt: Timestamp
│
└── orders/{orderId}
    └── ... (references sessionId)

customers/{phoneNumber}/
├── phoneNumber: string
├── name: string
├── createdAt: Timestamp
├── updatedAt: Timestamp
├── visits: [{ restaurantId, tableId, startTime, endTime? }]
└── currentVisit: { restaurantId, tableId, startTime }
```

---

## Table Validation Flow

### API: `validateTableAndLocation` 
**Cloud Function:** `table-validateTableAndLocation`

#### Request
```javascript
{
  restaurantId: string,      // Required
  tableId: string,           // Required
  userLocation: {            // Required
    latitude: number,
    longitude: number
  },
  sessionId: string          // Optional - for existing session validation
}
```

#### Flow
1. **Input Validation** - Validate required parameters
2. **Data Fetching** - Get restaurant and table data
3. **Guard Clauses:**
   - **IMP:** If `status === 'disabled'` → HTTP 403 Forbidden
   - **IMP:** If `!isWithinRadius(userLocation, restaurantLocation)` → HTTP 412 Precondition Failed
   - If valid `sessionId` provided and validated → Return success with session
4. **OTP Generation** (for VACANT tables):
   - Generate OTP via `otpService.createOTPObject()`
   - Update table: `status: OTP_PENDING`, set `currentOTP`, `firstScannedAt`
5. **Feature Flag Check:**
   - If `isOtpManadatoryAtScan = true` → HTTP 401 with auth requirements
   - If `false` → Return success with limited access

#### IMP: Feature Flag Effects
```javascript
isOtpManadatoryAtScan: boolean       // Controls if OTP required at QR scan
isUsernameEnabled: boolean           // Makes name mandatory for users
isMultiUserSupportEnabled: boolean   // Allows multiple users per table
```

#### Response (OTP Required)
```javascript
{
  tableStatus: 'pending',
  restaurant: { name, id },
  table: { number, id, capacity },
  primaryCustomer: { phoneNumber, name } | null,
  authMessage: "Please ask the primary customer for the OTP",
  isUsernameMandatory: boolean,
  isPhoneNumberMandatory: boolean,
  isMultiUserSupported: boolean,
  otpRequired: true
}
```

---

## OTP System

### OTP Configuration
```javascript
const OTP_CONFIG = {
  VALIDITY_MINUTES: 5,    // IMP: 5-minute expiry window
  LENGTH: 6               // 6-digit numeric code
};
```

### OTP Object Structure
```javascript
{
  code: string,           // 6-digit numeric code
  createdAt: Timestamp,   // OTP generation time
  expiresAt: Timestamp    // createdAt + 5 minutes
}
```

### Key Functions
| Function | Purpose |
|----------|---------|
| `generateOTP()` | Creates random 6-digit numeric string |
| `createOTPObject()` | Creates OTP with timestamps |
| `isOTPValid(otpObject)` | Checks if OTP hasn't expired |
| `handleOTPGeneration(tableData)` | Returns existing valid OTP or creates new one |

### IMP: OTP Generation Triggers
- **QR Scan on VACANT table** → Auto-generates OTP, sets table to OTP_PENDING
- **Server App** → Can manually regenerate via `generateTableOTP`

---

## OTP Validation Flow

### API: `validateOTP`
**Cloud Function:** `table-validateOTP`

#### Request
```javascript
{
  restaurantId: string,    // Required
  tableId: string,         // Required
  otp: string,             // Required - 6-digit code
  phoneNumber: string,     // Conditional (required for primary or when multi-user disabled)
  name: string             // Conditional (required when isUsernameEnabled and primary)
}
```

#### Flow
1. **Input Validation** - Validate restaurantId, tableId, otp
2. **Requirement Calculation:**
   - **IMP:** `isPhoneNumberRequired = (VACANT || OTP_PENDING) || !isMultiUserSupportEnabled`
   - **IMP:** `isUsernameRequired = isUsernameEnabled && potentiallyPrimary`
3. **OTP Validation:**
   - For **VACANT/OTP_PENDING**: Validates OTP, user becomes **primary customer**
   - For **ACTIVE**: Validates OTP, user becomes **secondary customer**
4. **Table Update:**
   - Set `status: ACTIVE`
   - Set `primaryCustomer: { phoneNumber, name }` (primary only)
   - Add phoneNumber to `occupiedBy[]` array
5. **Customer Profile** - Create/update via `customerService.createOrUpdateCustomerProfileDirect()`
6. **Session Management:**
   - **Primary:** `sessionService.createOrGetTableSession()`
   - **Secondary:** `sessionService.addUserToTableSession()`
7. **Token Generation** - Create Firebase custom token using phoneNumber as UID

#### Response
```javascript
{
  status: 'success',
  customToken: string,         // Firebase auth token
  isPrimaryCustomer: boolean,
  sessionId: string
}
```

### IMP: Primary vs Secondary Customer Logic
| Table Status | User Type | Actions |
|-------------|-----------|---------|
| VACANT/OTP_PENDING | PRIMARY | Creates session, sets primaryCustomer |
| ACTIVE | SECONDARY | Joins existing session, added to occupiedBy |

---

## Session Management

### SESSION_STATUS Constants
```javascript
const SESSION_STATUS = {
  ACTIVE: 'active',    // Session in use
  ENDED: 'ended',      // Manually ended (table cleared)
  EXPIRED: 'expired'   // Time expired (4 hours)
};
```

### Session Schema
```javascript
{
  id: string,                    // Auto-generated
  tableId: string,
  primaryUserId: string,         // First customer's phone number
  users: [string],               // All customers' phone numbers
  status: 'active' | 'ended' | 'expired',
  createdAt: Timestamp,
  updatedAt: Timestamp,
  expiresAt: Timestamp           // IMP: 4 hours from creation
}
```

### Key Functions

#### `createOrGetTableSession(restaurantId, tableId, primaryUserId)`
- Checks for existing active session for tableId
- If exists: Adds user to session, returns existing
- If not: Creates new session with 4-hour expiry
- **IMP:** Session expiry is **4 hours** (code shows `4 * 60 * 60 * 1000`)

#### `addUserToTableSession(restaurantId, sessionId, userId)`
- Validates session exists and is not expired
- Adds user to `users[]` array
- **IMP:** Auto-expires session if past `expiresAt`

#### `validateTableSession(restaurantId, tableId, options)`
- Finds active session for table
- Checks expiry, marks as EXPIRED if needed
- Optionally adds authenticated user to session
- Returns null or session based on `throwError` option

#### `endTableSessions(restaurantId, tableId)`
- Ends active session for a table
- Sets `status: 'ended'`

### IMP: Session Propagation
```
Session → Cart Operations (addItemToCart requires sessionId)
Session → Orders (checkoutCart creates order linked to session)
Session → Order History (getOrder filters by sessionId)
```

---

## Customer Management

### Customer Schema
```javascript
{
  phoneNumber: string,           // Document ID
  name: string,
  createdAt: Timestamp,
  updatedAt: Timestamp,
  visits: [{
    restaurantId: string,
    tableId: string,
    startTime: Timestamp,
    endTime: Timestamp | null
  }],
  currentVisit: {                // Active visit (if any)
    restaurantId: string,
    tableId: string,
    startTime: Timestamp
  } | null
}
```

### Key Functions

#### `createOrUpdateCustomerProfile` (Cloud Function)
- Creates new customer doc if doesn't exist
- Updates name and `updatedAt` if exists
- **IMP:** Uses phoneNumber as document ID

#### `createOrUpdateCustomerProfileDirect` (Internal)
- Same as above but callable directly (not via HTTP)
- Used by `validateOTP` internally

#### `updateCustomerVisit` (Cloud Function)
- Adds new visit to `visits[]` array
- Sets `currentVisit` object

#### `endCustomerVisit` (Cloud Function)
- Ends current visit (adds `endTime`)
- Updates table status to `vacant`
- Clears table `occupiedBy`

---

## Cross-Entity Relationships

### Table → Session Link
```javascript
// Table has reference via OTP validation
// Session references table via tableId
restaurants/{restaurantId}/sessions/
  └── where('tableId', '==', tableId)
```

### Session → Customer(s) Link
```javascript
// Session tracks all users
session.users = ['phone1', 'phone2', ...]
session.primaryUserId = 'phone1'

// Customers are in separate collection
customers/{phoneNumber}/
```

### Table Fields for Customer Tracking
```javascript
{
  primaryCustomer: {
    phoneNumber: string,
    name: string
  },
  occupiedBy: [phoneNumber1, phoneNumber2, ...]  // All users at table
}
```

### Session → Cart/Order Flow
```
validateOTP
    ↓
sessionId returned
    ↓
addItemToCart(sessionId) → Cart Operations
    ↓
checkoutCart(sessionId) → Order created with sessionId
    ↓
getOrder(sessionId) → Order retrieval
```

---

## Feature Flags Impact

### `isOtpManadatoryAtScan`
- **true:** Every QR scan requires OTP entry (HTTP 401 if not validated)
- **false:** Limited access granted without OTP (otpRequiredForOrder flag set)

### `isUsernameEnabled`
- **true:** Name field required for primary customers
- **false:** Name optional

### `isMultiUserSupportEnabled`
- **true:** Secondary users can join with phone number
- **false:** Phone number required for ALL users (primary must be set)

### IMP: Requirement Calculation
```javascript
const isPhoneNumberMandatory = 
  (status === VACANT || status === OTP_PENDING) || 
  featureFlags.isEnabled('isMultiUserSupportEnabled');

const isUsernameMandatory = 
  featureFlags.isEnabled('isUsernameEnabled') && 
  potentiallyPrimary;
```

---

## Server App Functions (Table Management)

### `getTablesForRestaurant`
- Returns all tables with status, primaryCustomer, OTP code
- Optional filter by serverId

### `getTableDetails`
- Full table info including recent orders (last 3)
- Server assignment info

### `assignTableToServer` / `unassignTableFromServer`
- Manages server-table assignments

### `generateTableOTP`
- Manual OTP generation for servers
- Returns OTP code and expiry timestamps

### `updateTableStatus`
- Change table status manually
- **IMP:** When changing ACTIVE → VACANT: clears `primaryCustomer`, `occupiedBy`, `activeOrderId`

---

## Session Cleanup

### `cleanupInactiveSessions` (Cloud Function)
- Finds tables with `lastActivity` > 1 hour ago
- Ends associated sessions
- Sets table status to VACANT
- **TODO:** Should check for cart/order activity in last 2 hours

---

## Location Validation

### `isWithinRadius(point1, point2, radius)`
- **IMP:** Currently returns `true` always (TODO: implement proper geo calculation)
- Intended: Validate user is within 100m of restaurant

---

## Error Handling

### HTTP Status Codes Used
| Status | Scenario |
|--------|----------|
| 400 | Missing parameters, invalid request |
| 401 | OTP required, invalid OTP |
| 403 | Table disabled |
| 404 | Restaurant/table/session not found |
| 412 | User not in restaurant premises |
| 500 | Internal errors |

---

## Key Nuances Summary

| Area | Nuance |
|------|--------|
| OTP Expiry | **5 minutes** from generation |
| Session Expiry | **4 hours** from creation |
| Primary Customer | First customer to validate OTP on VACANT/OTP_PENDING table |
| Secondary Customer | Subsequent users joining ACTIVE table |
| Phone as UID | Phone number used as Firebase UID and customer doc ID |
| Table → Vacant | Clearing customers also clears primaryCustomer, occupiedBy, activeOrderId |
| Session-Cart Link | sessionId required for cart checkout |
| Feature Flags | Control auth requirements dynamically |
| Location Validation | Currently disabled (always returns true) |
| Multi-user | Phone required for all users when `isMultiUserSupportEnabled = false` |
