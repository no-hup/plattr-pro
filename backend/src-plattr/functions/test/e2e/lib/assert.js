/**
 * Assertion utilities for E2E tests.
 * Each assertion returns { pass: boolean, message: string }.
 * On failure, includes the actual response for debugging.
 */

/**
 * Assert the response has status === 'success'.
 */
export function assertSuccess(resp, label = '') {
  const ok = resp?.status === 'success' || resp?.success === true;
  if (ok) {
    return { pass: true, message: `${label} → success` };
  }
  return {
    pass: false,
    message: `${label} → expected success, got status="${resp?.status}"`,
    actual: resp,
  };
}

/**
 * Assert the response is an error with the expected error code.
 * Checks both resp.error.code and resp.data.code patterns.
 */
export function assertError(resp, expectedCode = null, label = '') {
  const isError = resp?.status === 'error' || resp?._httpStatus >= 400;
  if (!isError) {
    return {
      pass: false,
      message: `${label} → expected error${expectedCode ? ` (${expectedCode})` : ''}, got status="${resp?.status}"`,
      actual: resp,
    };
  }
  if (expectedCode) {
    const actualCode = resp?.error?.code || resp?.data?.code || '';
    if (actualCode !== expectedCode) {
      return {
        pass: false,
        message: `${label} → expected error code "${expectedCode}", got "${actualCode}"`,
        actual: resp,
      };
    }
  }
  return { pass: true, message: `${label} → error as expected${expectedCode ? ` (${expectedCode})` : ''}` };
}

/**
 * Extract a value from a nested object by dot-separated path.
 * e.g., getField(resp, 'data.cart.items') → resp.data.cart.items
 */
function getField(obj, path) {
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

/**
 * Assert a nested field equals the expected value.
 */
export function assertField(resp, path, expected, label = '') {
  const actual = getField(resp, path);
  if (actual === expected) {
    return { pass: true, message: `${label} → ${path} === ${JSON.stringify(expected)}` };
  }
  return {
    pass: false,
    message: `${label} → ${path}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    actual: resp,
  };
}

/**
 * Assert a nested field exists and is not null/undefined.
 */
export function assertFieldExists(resp, path, label = '') {
  const value = getField(resp, path);
  if (value !== null && value !== undefined) {
    return { pass: true, message: `${label} → ${path} exists` };
  }
  return {
    pass: false,
    message: `${label} → ${path} is missing or null`,
    actual: resp,
  };
}

/**
 * Assert a numeric field equals the expected price (with tolerance for floating point).
 */
export function assertPrice(resp, path, expected, label = '') {
  const actual = getField(resp, path);
  if (typeof actual !== 'number') {
    return {
      pass: false,
      message: `${label} → ${path}: expected number ${expected}, got ${typeof actual} ${JSON.stringify(actual)}`,
      actual: resp,
    };
  }
  // Allow 0.01 tolerance for floating-point arithmetic
  if (Math.abs(actual - expected) <= 0.01) {
    return { pass: true, message: `${label} → ${path} === ${expected}` };
  }
  return {
    pass: false,
    message: `${label} → ${path}: expected ${expected}, got ${actual}`,
    actual: resp,
  };
}

/**
 * Assert an array field has the expected length.
 */
export function assertArrayLength(resp, path, expectedLength, label = '') {
  const arr = getField(resp, path);
  if (!Array.isArray(arr)) {
    return {
      pass: false,
      message: `${label} → ${path}: expected array, got ${typeof arr}`,
      actual: resp,
    };
  }
  if (arr.length === expectedLength) {
    return { pass: true, message: `${label} → ${path}.length === ${expectedLength}` };
  }
  return {
    pass: false,
    message: `${label} → ${path}.length: expected ${expectedLength}, got ${arr.length}`,
    actual: resp,
  };
}

/**
 * Assert a numeric field falls within a range (inclusive).
 */
export function assertPriceRange(resp, path, min, max, label = '') {
  const actual = getField(resp, path);
  if (typeof actual !== 'number') {
    return {
      pass: false,
      message: `${label} → ${path}: expected number in [${min}, ${max}], got ${typeof actual}`,
      actual: resp,
    };
  }
  if (actual >= min - 0.01 && actual <= max + 0.01) {
    return { pass: true, message: `${label} → ${path} in [${min}, ${max}] (got ${actual})` };
  }
  return {
    pass: false,
    message: `${label} → ${path}: expected [${min}, ${max}], got ${actual}`,
    actual: resp,
  };
}

/**
 * Assert a string field contains an expected substring.
 */
export function assertContains(resp, path, substring, label = '') {
  const actual = getField(resp, path);
  if (typeof actual !== 'string') {
    return {
      pass: false,
      message: `${label} → ${path}: expected string containing "${substring}", got ${typeof actual}`,
      actual: resp,
    };
  }
  if (actual.includes(substring)) {
    return { pass: true, message: `${label} → ${path} contains "${substring}"` };
  }
  return {
    pass: false,
    message: `${label} → ${path}: expected to contain "${substring}", got "${actual.substring(0, 100)}"`,
    actual: resp,
  };
}

/**
 * Assert a field value is one of the allowed values.
 */
export function assertOneOf(resp, path, allowedValues, label = '') {
  const actual = getField(resp, path);
  if (allowedValues.includes(actual)) {
    return { pass: true, message: `${label} → ${path} === ${JSON.stringify(actual)}` };
  }
  return {
    pass: false,
    message: `${label} → ${path}: expected one of ${JSON.stringify(allowedValues)}, got ${JSON.stringify(actual)}`,
    actual: resp,
  };
}
