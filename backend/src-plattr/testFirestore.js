const admin = require("firebase-admin");
require('dotenv').config();

// ✅ Log environment variables for debugging
console.log("poopoo 🔥 Firestore Test Script Running...");
console.log("poopoo NODE_ENV:", process.env.NODE_ENV);
console.log("poopoo FIRESTORE_EMULATOR_HOST:", process.env.FIRESTORE_EMULATOR_HOST);
console.log("poopoo FUNCTIONS_EMULATOR:", process.env.FUNCTIONS_EMULATOR);

// ✅ Step 1: Test direct initialization without any configuration
console.log("poopoo \n✅ Test 1: Direct initialization");
if (!admin.apps.length) {
  console.log("poopoo Initializing Firebase Admin...");
  admin.initializeApp();
} else {
  console.log("poopoo Firebase Admin already initialized");
}

// Get FieldValue before applying emulator settings
const dbDirect = admin.firestore();
const FieldValueDirect = admin.firestore.FieldValue;

console.log("poopoo Direct Initialization Firestore Settings:");
console.log("poopoo - FieldValue:", FieldValueDirect ? "Available" : "Undefined");
console.log("poopoo - FieldValue.serverTimestamp:", FieldValueDirect?.serverTimestamp ? "Available" : "Undefined");

try {
  console.log("poopoo - Testing FieldValue.serverTimestamp():", 
    FieldValueDirect?.serverTimestamp ? 
    "Result: " + JSON.stringify(FieldValueDirect.serverTimestamp()) : 
    "Not available");
} catch (error) {
  console.error("❌ Error using FieldValue.serverTimestamp():", error);
}

// ✅ Step 2: Test with emulator settings
console.log("poopoo \n✅ Test 2: With emulator settings");
admin.apps.forEach(app => app.delete());

// Re-initialize with emulator settings applied before using Firestore
console.log("poopoo Re-initializing Firebase Admin for emulator test");
admin.initializeApp();
const dbEmulator = admin.firestore();

// Apply emulator settings before getting any other references
if (process.env.FIRESTORE_EMULATOR_HOST) {
  console.log("poopoo Applying emulator settings BEFORE getting FieldValue");
  dbEmulator.settings({
    host: process.env.FIRESTORE_EMULATOR_HOST || "localhost:8080",
    ssl: false
  });
}

// Get FieldValue after settings
const FieldValueEmulator = admin.firestore.FieldValue;

console.log("poopoo Emulator Initialization Firestore Settings:");
console.log("poopoo - FieldValue:", FieldValueEmulator ? "Available" : "Undefined");
console.log("poopoo - FieldValue.serverTimestamp:", FieldValueEmulator?.serverTimestamp ? "Available" : "Undefined");

try {
  console.log("poopoo - Testing FieldValue.serverTimestamp():", 
    FieldValueEmulator?.serverTimestamp ? 
    "Result: " + JSON.stringify(FieldValueEmulator.serverTimestamp()) : 
    "Not available");
} catch (error) {
  console.error("❌ Error using FieldValue.serverTimestamp():", error);
}

// ✅ Step 3: Check the actual import pattern used in the project
console.log("poopoo \n✅ Test 3: Testing the import pattern from admin.js");
admin.apps.forEach(app => app.delete());

// Similar to the pattern in admin.js
if (!admin.apps.length) {
  // First initialize Firebase
  admin.initializeApp();
  const db = admin.firestore();
  
  // Get references to FieldValue BEFORE applying settings
  const FieldValue = admin.firestore.FieldValue;
  const Timestamp = admin.firestore.Timestamp;
  
  console.log("poopoo Project Pattern Initialization:");
  console.log("poopoo - FieldValue:", FieldValue ? "Available" : "Undefined");
  console.log("poopoo - FieldValue.serverTimestamp:", FieldValue?.serverTimestamp ? "Available" : "Undefined");
  
  // Then apply settings to db
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    console.log("poopoo Applying emulator settings AFTER getting FieldValue");
    db.settings({
      host: process.env.FIRESTORE_EMULATOR_HOST || "localhost:8080",
      ssl: false
    });
  }
  
  try {
    const updateData = {
      lastActivity: FieldValue.serverTimestamp()
    };
    console.log("poopoo - Testing FieldValue.serverTimestamp():", updateData.lastActivity ? "Success" : "Failed");
  } catch (error) {
    console.error("❌ Error using FieldValue.serverTimestamp():", error);
  }
}

// ✅ Step 4: Test with a fixed order of operations
console.log("poopoo \n✅ Test 4: Fixed initialization order");
admin.apps.forEach(app => app.delete());

// 1. Initialize Firebase Admin
admin.initializeApp();

// 2. Get Firestore instance
const db = admin.firestore();

// 3. Get FieldValue BEFORE applying emulator settings
const FieldValue = admin.firestore.FieldValue; 
const Timestamp = admin.firestore.Timestamp;

console.log("poopoo Fixed Order Initialization:");
console.log("poopoo - FieldValue:", FieldValue ? "Available" : "Undefined");
console.log("poopoo - FieldValue.serverTimestamp:", FieldValue?.serverTimestamp ? "Available" : "Undefined");

// 4. Apply emulator settings AFTER getting FieldValue reference
if (process.env.FIRESTORE_EMULATOR_HOST) {
  console.log("poopoo Applying emulator settings AFTER getting FieldValue reference");
  db.settings({
    host: process.env.FIRESTORE_EMULATOR_HOST || "localhost:8080",
    ssl: false
  });
}

// 5. Test if serverTimestamp() works
try {
  const updateData = {
    lastActivity: FieldValue.serverTimestamp()
  };
  console.log("poopoo ✅ Success! FieldValue.serverTimestamp() works:", 
    updateData.lastActivity ? "Value exists" : "Value is undefined");
} catch (error) {
  console.error("❌ Error using FieldValue.serverTimestamp():", error);
}

console.log("poopoo \n🔍 CONCLUSION: If any test succeeded, use that pattern to fix your code.");
console.log("poopoo Make sure to get FieldValue reference BEFORE applying emulator settings."); 