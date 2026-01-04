const { Timestamp } = require('../admin/admin');
const functions = require('firebase-functions');
const timestamp = require('../utils/timestamp');

const OTP_CONFIG = {
  VALIDITY_MINUTES: 5,
  LENGTH: 6
};

/**
 * Generates a numeric OTP of specified length
 * @returns {string} Generated OTP
 */
function generateOTP() {
  const min = Math.pow(10, OTP_CONFIG.LENGTH - 1);
  const max = Math.pow(10, OTP_CONFIG.LENGTH) - 1;
  return Math.floor(min + Math.random() * (max - min + 1)).toString();
}

/**
 * Creates an OTP object with creation and expiry timestamps
 * @returns {Object} OTP object with code, createdAt, and expiresAt
 */
function createOTPObject() {
  return {
    code: generateOTP(),
    createdAt: timestamp.now(),
    expiresAt: timestamp.fromDate(
      new Date(Date.now() + (OTP_CONFIG.VALIDITY_MINUTES * 60 * 1000))
    )
  };
}

/**
 * Validates an OTP object
 * @param {Object} otpObject - The OTP object to validate
 * @returns {boolean} Whether the OTP is valid
 */
function isOTPValid(otpObject) {
  if (!otpObject?.expiresAt) return false;

  const expiryDate = timestamp.safeToDate(otpObject.expiresAt);

  // If we couldn't parse the expiry date, it's invalid
  if (!expiryDate) return false;

  return new Date() < expiryDate;
}

/**
 * Gets or generates an OTP object for a table
 * @param {Object} tableData - The table data object
 * @returns {Object} OTP object
 */
function handleOTPGeneration(tableData) {
  if (!isOTPValid(tableData.currentOTP)) {
    return createOTPObject();
  }
  return tableData.currentOTP;
}

module.exports = {
  OTP_CONFIG,
  generateOTP,
  createOTPObject,
  isOTPValid,
  handleOTPGeneration
}; 