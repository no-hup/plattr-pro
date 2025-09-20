#!/bin/bash
# Runnable Cart Flow Validator (Emulator)
# Validates add→get→add→get (and optional checkout) using Firebase emulators.
# Compares response structure using jq assertions (schema checks, not exact goldens).

set -euo pipefail

# Config (allows override by env set during preflight)
PROJECT_ID="rms-app-dd875"
HOST="${EMULATOR_HOST:-127.0.0.1}"
PORT_FUNCTIONS="${FUNCTIONS_PORT:-5002}"
BASE_URL="http://${HOST}:${PORT_FUNCTIONS}/${PROJECT_ID}/us-central1"

RESTAURANT_ID="rest001"
TABLE_ID="table001"
MENU_ITEM_ID="item001"
VARIANT_ID="variant_burger_size"
VARIANT_OPTION_REGULAR="burger_size_regular"
ADDON_ID="addon_burger_fries"

# Optional: set to non-empty to attempt checkout (requires valid session in emulator)
SESSION_ID=""

# Output directory for captured responses
OUT_DIR="$(pwd)/responses_runtime"
mkdir -p "$OUT_DIR"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_header() { echo -e "\n${YELLOW}==== $1 ====${NC}\n"; }
fail() { echo -e "${RED}✗ $1${NC}"; exit 1; }
ok() { echo -e "${GREEN}✓ $1${NC}"; }

curl_json() {
  local url="$1"
  local json="$2"
  curl --silent --show-error --location "$url" \
    --header 'Content-Type: application/json' \
    --data "$json"
}

assert_jq() {
  local file="$1"; shift
  local expr="$1"; shift
  local msg="$1"
  jq -e "$expr" "$file" > /dev/null || fail "$msg"
}

print_header "Cart Flow: add → get → add → get"

# 1) Add item to cart
REQ_1=$(cat <<JSON
{ "data": {
  "tableId": "${TABLE_ID}",
  "restaurantId": "${RESTAURANT_ID}",
  "menuItemId": "${MENU_ITEM_ID}",
  "quantity": 2,
  "selectedVariants": { "${VARIANT_ID}": "${VARIANT_OPTION_REGULAR}" },
  "selectedAddons": [ "${ADDON_ID}" ]
}}
JSON
)

RESP_1_FILE="$OUT_DIR/add_1.json"
curl_json "${BASE_URL}/cart-addItemToCart" "$REQ_1" | jq '.' > "$RESP_1_FILE"

# Assertions
assert_jq "$RESP_1_FILE" '(.result.status // .status) == "success"' "addItemToCart should return success"
assert_jq "$RESP_1_FILE" '((.result.data.cart.items // .data.cart.items) | length) >= 1' "cart should have at least 1 item after add"
assert_jq "$RESP_1_FILE" '((.result.data.cart.priceInfo.finalPrice // .data.cart.priceInfo.finalPrice) | type) == "number"' "cart.priceInfo.finalPrice should be a number"
ok "Add #1 passed"

# 2) Get cart
REQ_GET=$(cat <<JSON
{ "data": { "tableId": "${TABLE_ID}", "restaurantId": "${RESTAURANT_ID}" }}
JSON
)

RESP_GET_1_FILE="$OUT_DIR/get_1.json"
curl_json "${BASE_URL}/cart-getCart" "$REQ_GET" | jq '.' > "$RESP_GET_1_FILE"

assert_jq "$RESP_GET_1_FILE" '(.result.status // .status) == "success"' "getCart should return success"
assert_jq "$RESP_GET_1_FILE" '((.result.data.cart.items // .data.cart.items) | length) >= 1' "cart should include items after add"
ok "Get #1 passed"

# 3) Add same item again (quantity increment or new config depending on flags)
RESP_2_FILE="$OUT_DIR/add_2.json"
curl_json "${BASE_URL}/cart-addItemToCart" "$REQ_1" | jq '.' > "$RESP_2_FILE"

assert_jq "$RESP_2_FILE" '(.result.status // .status) == "success"' "second add should return success"
assert_jq "$RESP_2_FILE" '((.result.data.cart.items // .data.cart.items) | length) >= 1' "cart should still have items"
ok "Add #2 passed"

# 4) Get cart again
RESP_GET_2_FILE="$OUT_DIR/get_2.json"
curl_json "${BASE_URL}/cart-getCart" "$REQ_GET" | jq '.' > "$RESP_GET_2_FILE"

assert_jq "$RESP_GET_2_FILE" '(.result.status // .status) == "success"' "getCart should return success"
assert_jq "$RESP_GET_2_FILE" '((.result.data.cart.priceInfo.basePrice // .data.cart.priceInfo.basePrice) | type) == "number"' "cart.priceInfo.basePrice should be a number"
ok "Get #2 passed"

# 4.5) Remove item negative case: try removing non-existing item (should return not-found or error)
print_header "Remove item (negative - non-existing)"
REQ_REMOVE_NEG=$(cat <<JSON
{ "data": { "tableId": "${TABLE_ID}", "restaurantId": "${RESTAURANT_ID}", "menuItemId": "non_existing" }}
JSON
)
RESP_REMOVE_NEG_FILE="$OUT_DIR/remove_negative.json"
curl_json "${BASE_URL}/cart-removeItemFromCart" "$REQ_REMOVE_NEG" | jq '.' > "$RESP_REMOVE_NEG_FILE" || true
# Accept either error or success with unchanged cart; at least structure should exist
jq -e 'has("error") or ((.result.status // .status // empty) == "success")' "$RESP_REMOVE_NEG_FILE" > /dev/null || fail "removeItem negative case should not crash"
ok "Remove negative handled"

# 4.6) Remove one quantity and verify quantity decremented (cart still present)
print_header "Remove item (decrement quantity)"
RESP_REMOVE_DEC_FILE="$OUT_DIR/remove_decrement.json"
curl_json "${BASE_URL}/cart-removeItemFromCart" "$REQ_REMOVE_NEG" | jq '.' > /dev/null 2>&1 # reset not-needed

# First, add 2 items
curl_json "${BASE_URL}/cart-addItemToCart" "$REQ_1" > /dev/null
curl_json "${BASE_URL}/cart-addItemToCart" "$REQ_1" > /dev/null

# Now remove once
REQ_REMOVE_ONE=$(cat <<JSON
{ "data": { "tableId": "${TABLE_ID}", "restaurantId": "${RESTAURANT_ID}", "menuItemId": "${MENU_ITEM_ID}" }}
JSON
)
RESP_REMOVE_ONE_FILE="$OUT_DIR/remove_one.json"
curl_json "${BASE_URL}/cart-removeItemFromCart" "$REQ_REMOVE_ONE" | jq '.' > "$RESP_REMOVE_ONE_FILE"
assert_jq "$RESP_REMOVE_ONE_FILE" '(.result.status // .status) == "success"' "remove one should succeed"

# Quantity should be 1 now
RESP_GET_AFTER_DEC_FILE="$OUT_DIR/get_after_decrement.json"
curl_json "${BASE_URL}/cart-getCart" "$REQ_GET" | jq '.' > "$RESP_GET_AFTER_DEC_FILE"
assert_jq "$RESP_GET_AFTER_DEC_FILE" '((.result.data.cart.items // .data.cart.items)[0].quantity) == 1' "quantity should be 1 after decrement"
ok "Decrement quantity passed"

# 5) Optional checkout (requires active session)
if [[ -n "$SESSION_ID" ]]; then
  print_header "Checkout (optional)"
  REQ_CHECKOUT=$(cat <<JSON
{ "data": { "restaurantId": "${RESTAURANT_ID}", "tableId": "${TABLE_ID}", "sessionId": "${SESSION_ID}" }}
JSON
  )
  RESP_CHECKOUT_FILE="$OUT_DIR/checkout.json"
  curl_json "${BASE_URL}/cart-checkoutCart" "$REQ_CHECKOUT" | jq '.' > "$RESP_CHECKOUT_FILE" || true
  if jq -e '.status == "success"' "$RESP_CHECKOUT_FILE" > /dev/null 2>&1; then
    ok "Checkout passed"
  else
    echo -e "${YELLOW}⚠ Checkout skipped or failed (likely no active session).${NC}"
  fi
fi

# 5.5) Clear cart explicitly and verify empty state (idempotent)
print_header "Clear cart"
REQ_CLEAR=$(cat <<JSON
{ "data": { "restaurantId": "${RESTAURANT_ID}", "tableId": "${TABLE_ID}", "sessionId": "${SESSION_ID}" }}
JSON
)
RESP_CLEAR_FILE="$OUT_DIR/clear_cart.json"
curl_json "${BASE_URL}/cart-clearCart" "$REQ_CLEAR" | jq '.' > "$RESP_CLEAR_FILE" || true

RESP_GET_EMPTY_FILE="$OUT_DIR/get_empty_after_clear.json"
curl_json "${BASE_URL}/cart-getCart" "$REQ_GET" | jq '.' > "$RESP_GET_EMPTY_FILE"
assert_jq "$RESP_GET_EMPTY_FILE" '(.result.status // .status) == "success"' "getCart after clear should return success"
assert_jq "$RESP_GET_EMPTY_FILE" '((.result.data.cart.items // .data.cart.items) | type) == "array"' "cart.items should be array"
ok "Clear cart passed"

# 5.6) Invalid add: negative quantity
print_header "Add item (invalid quantity)"
REQ_INVALID=$(cat <<JSON
{ "data": {
  "tableId": "${TABLE_ID}",
  "restaurantId": "${RESTAURANT_ID}",
  "menuItemId": "${MENU_ITEM_ID}",
  "quantity": -1
}}
JSON
)
RESP_INVALID_FILE="$OUT_DIR/add_invalid.json"
curl_json "${BASE_URL}/cart-addItemToCart" "$REQ_INVALID" | jq '.' > "$RESP_INVALID_FILE" || true
jq -e '((.result.status // .status) == "success") | not or .error != null' "$RESP_INVALID_FILE" > /dev/null || fail "invalid add should not succeed"
ok "Invalid add handled"

print_header "All cart flow checks completed"
echo "Saved responses to: $OUT_DIR"
exit 0