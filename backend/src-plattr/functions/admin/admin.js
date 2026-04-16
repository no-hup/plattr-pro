const admin = require("firebase-admin");
const environment = require('../singleton/Environment');
let db;

// Initialize Firebase Admin first
if (!admin.apps.length) {
  // console.log(`Initializing Firebase Admin SDK in ${environment.mode} mode`);

  // Initialize with project ID
  admin.initializeApp({
    projectId: environment.projectId
  });

  // Get Firestore instance
  db = admin.firestore();

  // Get FieldValue and Timestamp BEFORE applying any settings
  // This is critical as settings can affect the availability of serverTimestamp()
  const FieldValue = admin.firestore.FieldValue;
  const Timestamp = admin.firestore.Timestamp;

  // Apply settings AFTER getting FieldValue reference
  db.settings(environment.getFirestoreSettings());

  // Verify FieldValue is working
  // console.log('FieldValue available:', !!FieldValue);
  // console.log('serverTimestamp available:', !!FieldValue?.serverTimestamp);

  // Re-export the initialized objects
  module.exports = {
    admin,
    db,
    FieldValue,
    Timestamp
  };
} else {
  // If already initialized, just re-export the existing references
  // console.log('Firebase Admin SDK already initialized');
  db = admin.firestore();
  const FieldValue = admin.firestore.FieldValue;
  const Timestamp = admin.firestore.Timestamp;

  module.exports = {
    admin,
    db,
    FieldValue,
    Timestamp
  };
}

