const { Timestamp } = require('../admin/admin');
const functions = require('firebase-functions');
const timestamp = require('../utils/timestamp');
const environment = require('../singleton/Environment');

// THE CODE DOES NOT EXPIRE. Read this before changing anything here (decided 2026-09-21,
// moonshot/reviews/2026-09-21-otp-and-table-state.md).
//
// A table carries one code for as long as a party sits at it. It is replaced when the table is
// freed — `vacateTable` and FL's Clear write `currentOTP: null`, and the next scan mints a fresh
// one — so last night's party cannot order to tonight's table. Nothing rotates it in between,
// which is the point: the code is read out loud by a waiter, and a code that changes under them
// makes the number they just said wrong.
//
// What DOES expire is the HOLD: `currentOTP.expiresAt` is the moment the claim lapses, not the
// moment the code dies. A scan sets it; while it is in the future and nobody has signed in, the
// floor treats that table as being claimed and refuses to merge or move it. Because it is a
// timestamp and not a stored status, it lapses by itself and no cleanup job has to run.
const OTP_CONFIG = {
  // How long one scan holds a table. 10 minutes, not 5: on a busy night a waiter can take that
  // long to reach the table and read the code out. Shaurya, 2026-09-21.
  HOLD_MINUTES: environment.isEmulator() ? 60 : 10,
  LENGTH: 6
};

console.log(`OTP_CONFIG: hold=${OTP_CONFIG.HOLD_MINUTES}min, length=${OTP_CONFIG.LENGTH} (${environment.mode})`);

/**
 * Generates a numeric OTP of specified length
 * In emulator mode, always returns '123456' for easy testing
 * @returns {string} Generated OTP
 */
function generateOTP() {
  if (environment.isEmulator()) {
    return '123456';
  }
  const min = Math.pow(10, OTP_CONFIG.LENGTH - 1);
  const max = Math.pow(10, OTP_CONFIG.LENGTH) - 1;
  return Math.floor(min + Math.random() * (max - min + 1)).toString();
}

/**
 * A fresh code, holding nothing yet. `expiresAt: null` means no claim on the table — the code
 * works, but nobody has scanned for it, so the floor may still merge or move that table.
 * @returns {Object} OTP object with code, createdAt and a null hold
 */
function createOTPObject() {
  return {
    code: generateOTP(),
    createdAt: timestamp.now(),
    expiresAt: null
  };
}

/** The moment a scan's claim on the table lapses. Written onto the existing code, not a new one. */
function holdExpiry() {
  return timestamp.fromDate(new Date(Date.now() + (OTP_CONFIG.HOLD_MINUTES * 60 * 1000)));
}

/**
 * Is someone part way through signing in at this table?
 *
 * NOT "is the code still good" — the code is always good (see the note at the top). This is the
 * hold a scan puts on the table, and it is the whole of what replaced the old `pending` status.
 * @param {Object} otpObject - The table's currentOTP
 * @returns {boolean} Whether a scan is still holding the table
 */
function isHoldActive(otpObject) {
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
  if (!tableData.currentOTP?.code) {
    return createOTPObject();
  }
  return tableData.currentOTP;
}

module.exports = {
  OTP_CONFIG,
  generateOTP,
  createOTPObject,
  holdExpiry,
  isHoldActive,
  handleOTPGeneration
}; 