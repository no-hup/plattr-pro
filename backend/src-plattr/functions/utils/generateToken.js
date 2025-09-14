const admin = require('firebase-admin');
const path = require('path');

// Initialize admin with service account
const serviceAccount = require('../../secure_stuff/service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Create a custom token
async function generateToken() {
  try {
    const token = await admin.auth().createCustomToken('test-user');
    console.log('Generated token:', token);
    return token;
  } catch (error) {
    console.error('Error generating token:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  generateToken()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = generateToken; 