import config from './config.js';

/**
 * Call a Firebase Cloud Function endpoint.
 *
 * Most endpoints are onCall (response wrapped in { result: ... }).
 * Some (server-serverLogin, dev-*) are onRequest (response at top level).
 *
 * This function returns the INNER result object in both cases, so callers
 * always work with { status, message, data } or { status, message, error }.
 */
export async function call(endpoint, payload = {}, opts = {}) {
  const url = `${config.BASE_URL}/${endpoint}`;

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    body: JSON.stringify({ data: payload }),
  });

  let json;
  try {
    json = await resp.json();
  } catch {
    return {
      status: 'error',
      message: `Non-JSON response from ${endpoint} (HTTP ${resp.status})`,
      _raw: await resp.text().catch(() => ''),
      _httpStatus: resp.status,
    };
  }

  // onCall functions: Firebase emulator wraps the return value in { result: ... }
  // onRequest functions: return raw JSON (which may have { result: ... } or { error: ... })
  let result = json.result || json;

  // server_auth.js error responses use { error: { message } } at top level
  // Normalize to our standard { status: 'error', message, error: {...} }
  if (!result.status && !result.success && json.error) {
    result = {
      status: 'error',
      message: json.error.message || 'Unknown error',
      error: json.error,
    };
  }

  // Attach HTTP status for error assertions
  result._httpStatus = resp.status;

  return result;
}

/**
 * Call a dev endpoint (onRequest, emulator-only).
 * Same as call() but kept explicit for clarity.
 */
export async function callDev(endpoint, payload = {}) {
  return call(endpoint, payload);
}
