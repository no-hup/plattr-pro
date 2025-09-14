# 📌 Table Scanning & OTP Validation Requirements

## 1️⃣ Table Scanning Flow

### 🔹 Initial Scan Requirements
User must provide:
- ✅ **Restaurant ID**
- ✅ **Table ID**
- ✅ **Location coordinates** (latitude/longitude)
- ➕ Optional: **Existing session ID**

---

### 📌 Response Scenarios

#### 🟢 **A. Immediate Access (No OTP Required)**
**✅ Conditions:**
- User has a **valid session**, OR
- Table is **vacant**, OR
- Table is **active** but OTP check is **disabled**

**🔹 Required Actions:**
- Store session ID (if provided)
- Navigate to **menu**
- If `otpRequiredForOrder = true`, show an **indicator** that OTP will be required for ordering

---

#### 🔴 **B. OTP Required**
**⚠️ Conditions:**
- Table is **active**
- User has **no valid session**
- OTP check is **mandatory**

**⚠️ Response Format Note:**
- The backend returns a nested error format when OTP is required:
```json
{
  "error": {
    "details": {
      "status": "error",
      "message": "Authentication required",
      "httpCode": 401,
      "data": {
        // Table and authentication data...
        "isUsernameMandatory": true,
        "isPhoneNumberMandatory": true, 
        "isMultiUserSupported": false,
        "otpRequired": true
      }
    }
  }
}
```
- The client must parse this structure to extract authentication requirements

**🔹 Required Actions:**
- Display **OTP input dialog** (on `401 Unauthorized` error)
- Show required fields based on flags:
  - **Username field** → if `isUsernameMandatory = true`
  - **Phone number field** → if `isPhoneNumberMandatory = true`
- Display `authMessage` with guidance to get OTP:
  - **Primary customer exists:** `"Please ask [primaryCustomer.name] for the OTP to join this table"`
  - **Assigned server exists:** `"Please ask your server [assignedServer.name] for the OTP to join this table"`
  - **Both exist:** `"Please ask [primaryCustomer.name] or [assignedServer.name] for the OTP"`
  - **Neither exists:** `"Please ask the restaurant staff for the OTP"`

---

#### ⛔ **C. Table Disabled**
**⚠️ Conditions:**
- Table status = `"disabled"`

**🔹 Required Actions:**
- Show **disabled state UI**
- Prevent any further actions

---

#### 🌍 **D. Location Error**
**⚠️ Conditions:**
- User's **location** doesn't match restaurant premises

**🔹 Required Actions:**
- Show **location permission request**
- Display **error message**
- Provide **retry option**

---

## 2️⃣ OTP Validation Requirements

### 🔹 Input Requirements
**Mandatory Fields:**
- ✅ **Restaurant ID**
- ✅ **Table ID**
- ✅ **OTP** (6 digits)

**Optional Fields (based on conditions):**
- 📞 Phone number
- 🏷️ Name

---

### 📌 Response Scenarios

#### ✅ **A. Successful Validation**
**Conditions:**
- Valid OTP **provided**
- Required fields **present**

**🔹 Required Actions:**
- If **phone number provided**, sign in to Firebase with a **custom token**
- Store **session ID**
- Navigate to **menu**

---

#### ❌ **B. Wrong OTP for Active Table**
**Conditions:**
- OTP is **invalid** for an **active table**

**🔹 Required Actions:**
- Show **error message** asking user to get OTP from primary customer/server
- Allow **retry**

---

#### ⚠️ **C. Missing Required Fields**
**Conditions:**
- Phone number missing **when required**
- Name missing **when required**

**🔹 Required Actions:**
- Show **specific error messages** for missing fields
- Highlight **required fields**

---

#### ⏳ **D. No Active Session**
**Conditions:**
- User **attempts to join** table with **no active session**

**🔹 Required Actions:**
- Show **session expired** message
- Redirect user to **scan flow**

---

## 3️⃣ Feature Flag Requirements

### 🔹 OTP at Scan Time
**Flag:** `isOtpMandatoryAtScan`
- ✅ If `true`:  
  - **Require OTP** immediately for **menu access**
- ❌ If `false`:  
  - Allow **menu access without OTP**  
  - Require OTP **only for ordering**

---

### 🔹 Username Requirement
**Flag:** `isUsernameEnabled`
- ✅ If `true`:  
  - Always require **username**
- ❌ If `false`:  
  - Only require **username** for **primary customer**

---

### 🔹 Multi-user Support
**Flag:** `isMultiUserSupportEnabled`
- ✅ If `true`:  
  - Allow **multiple users** with phone numbers
- ❌ If `false`:  
  - Allow **anonymous access** for secondary users

---

## 4️⃣ Session Management Requirements

### 🔹 Session Storage
Store:
- 🆔 **Session ID**
- ⏳ **Expiration time**
- 👤 **Primary customer status**

---

### 🔹 Session Expiration
Handle:
- **4-hour session expiration**
- **1-hour inactivity timeout**
- **Session refresh mechanism**

---

### 🔹 Session Cleanup
Clear session data on:
- 🚪 **Logout**
- ⏳ **Session expiration**
- 💤 **Inactivity timeout**

---

## 5️⃣ Error Handling Requirements

### 🔹 Input Validation Errors
- Handle **missing required parameters**
- Validate **input formats**
- Show **clear error messages**

---

### 🔹 Authentication Errors
- Handle **invalid OTP**
- Handle **missing authentication**
- Show **appropriate error messages**

---

### 🔹 Access Control Errors
- Handle **disabled table access**
- Handle **location verification failures**
- Show **clear access denied messages**

---

### 🔹 System Errors
- Handle **server errors gracefully**
- Provide **retry options**
- Show **user-friendly error messages**

---

## 6️⃣ UI/UX Requirements

### 🔹 Loading States
Show **loading indicators** during:
- **Table scanning**
- **OTP validation**
- **Session operations**

---

### 🔹 Error States
- Clear **error messages**
- **Retry options**
- **Helpful guidance**

---

### 🔹 Success States
- **Clear success indicators**
- **Smooth navigation**
- **Session status display**

---

### 🔹 Accessibility
- Support **screen readers**
- **Keyboard navigation**
- **Clear focus states**

---

## 7️⃣ Security Requirements

### 🔹 Data Protection
- 🔒 **Secure storage** of session data
- 🔒 **Secure transmission** of sensitive data
- 🔒 **Proper handling** of authentication tokens

---

### 🔹 Location Privacy
- 📍 **Clear location permission requests**
- 📍 **Secure location data handling**
- 📍 **User privacy considerations**

---

### 🔹 Session Security
- 🔐 **Secure session management**
- 🔐 **Proper session cleanup**
- 🔐 **Protection against session hijacking**
