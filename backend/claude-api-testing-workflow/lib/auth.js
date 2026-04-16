import { call } from './api.js';
import config from './config.js';

/**
 * Authenticate a customer via OTP and return the sessionId.
 * Calls table-validateOTP which creates a session.
 */
export async function customerLogin(
  restaurantId = config.RESTAURANT_ID,
  tableId = config.TABLE_CLEAN_1,
  otp = config.TABLE_OTP,
  phoneNumber = config.CUSTOMER_PHONE,
  name = config.CUSTOMER_NAME,
) {
  const resp = await call('table-validateOTP', {
    restaurantId,
    tableId,
    otp,
    phoneNumber,
    name,
  });

  if (resp.status !== 'success') {
    throw new Error(`customerLogin failed: ${resp.message || JSON.stringify(resp)}`);
  }

  const sessionId = resp.data?.sessionId;
  if (!sessionId) {
    throw new Error(`customerLogin: no sessionId in response: ${JSON.stringify(resp)}`);
  }

  return sessionId;
}

/**
 * Authenticate a server via credentials and return the sessionId.
 * server-serverLogin is an onRequest endpoint.
 */
export async function serverLogin(
  restaurantId = config.RESTAURANT_ID,
  username = config.SERVER_EMAIL,
  password = config.SERVER_PASSWORD,
) {
  const resp = await call('server-serverLogin', {
    restaurantId,
    username,
    password,
  });

  // server-serverLogin uses { success: true } instead of { status: 'success' }
  const ok = resp.status === 'success' || resp.success === true;
  if (!ok) {
    throw new Error(`serverLogin failed: ${resp.message || JSON.stringify(resp)}`);
  }

  const sessionId = resp.data?.sessionId;
  if (!sessionId) {
    throw new Error(`serverLogin: no sessionId in response: ${JSON.stringify(resp)}`);
  }

  return sessionId;
}
