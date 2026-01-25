#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=contract_test_config.sh
source "${SCRIPT_DIR}/contract_test_config.sh"

: "${BASE_URL:?BASE_URL must be set in contract_test_config.sh}"
: "${RESTAURANT_ID:?RESTAURANT_ID must be set in contract_test_config.sh}"
: "${TABLE_ID:?TABLE_ID must be set in contract_test_config.sh}"
: "${TABLE_OTP:?TABLE_OTP must be set in contract_test_config.sh}"
: "${CUSTOMER_PHONE:?CUSTOMER_PHONE must be set in contract_test_config.sh}"
: "${CUSTOMER_NAME:?CUSTOMER_NAME must be set in contract_test_config.sh}"
: "${MENU_ITEM_ID:?MENU_ITEM_ID must be set in contract_test_config.sh}"
: "${ITEM_QTY:?ITEM_QTY must be set in contract_test_config.sh}"
: "${EXPECTED_ORDER_PRICE:?EXPECTED_ORDER_PRICE must be set in contract_test_config.sh}"
: "${SERVER_USERNAME:?SERVER_USERNAME must be set in contract_test_config.sh}"
: "${SERVER_PASSWORD:?SERVER_PASSWORD must be set in contract_test_config.sh}"

log() {
  echo "[contract] $*"
}

assert_success() {
  local response="$1"
  RESPONSE="$response" python3 - <<'PY'
import json
import os

data = json.loads(os.environ["RESPONSE"])
result = data.get("result") or {}

ok = (result.get("status") == "success") or (result.get("success") is True)
if not ok:
  print("[contract] ERROR: unexpected response", file=sys.stderr)
  print(json.dumps(data, indent=2), file=sys.stderr)
  sys.exit(1)
PY
}

assert_success_and_extract() {
  local response="$1"
  local field="$2"
  RESPONSE="$response" python3 - "$field" <<'PY'
import json
import os
import sys

field = sys.argv[1]

data = json.loads(os.environ["RESPONSE"])
result = data.get("result") or {}

ok = (result.get("status") == "success") or (result.get("success") is True)
if not ok:
  print("[contract] ERROR: unexpected response", file=sys.stderr)
  print(json.dumps(data, indent=2), file=sys.stderr)
  sys.exit(1)

payload = result.get("data") or {}
value = payload.get(field)
if value in (None, ""):
  print(f"[contract] ERROR: missing field {field}", file=sys.stderr)
  print(json.dumps(data, indent=2), file=sys.stderr)
  sys.exit(1)

print(value)
PY
}

assert_orders_contains_price() {
  local response="$1"
  local order_id="$2"
  local expected_price="$3"
  RESPONSE="$response" python3 - "$order_id" "$expected_price" <<'PY'
import json
import os
import sys

order_id = sys.argv[1]
expected_price = float(sys.argv[2])

data = json.loads(os.environ["RESPONSE"])
result = data.get("result") or {}

if result.get("status") != "success":
  print("[contract] ERROR: orders response not success", file=sys.stderr)
  print(json.dumps(data, indent=2), file=sys.stderr)
  sys.exit(1)

orders = (result.get("data") or {}).get("orders") or []
order = None
for candidate in orders:
  if candidate.get("orderId") == order_id or candidate.get("id") == order_id:
    order = candidate
    break

if not order:
  print(f"[contract] ERROR: order not found: {order_id}", file=sys.stderr)
  print(json.dumps(data, indent=2), file=sys.stderr)
  sys.exit(1)

price = (order.get("priceInfo") or {}).get("finalPrice")
if price is None:
  print("[contract] ERROR: priceInfo.finalPrice missing", file=sys.stderr)
  print(json.dumps(order, indent=2), file=sys.stderr)
  sys.exit(1)

if float(price) != expected_price:
  print(f"[contract] ERROR: unexpected price {price} (expected {expected_price})", file=sys.stderr)
  print(json.dumps(order, indent=2), file=sys.stderr)
  sys.exit(1)

print(price)
PY
}

log "Emulator check: ${BASE_URL}/dev-listRestaurants"
status_code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${BASE_URL}/dev-listRestaurants")
if [[ "$status_code" != "200" ]]; then
  echo "[contract] ERROR: emulator not reachable (HTTP ${status_code})." >&2
  exit 1
fi
log "Emulator check: OK (${status_code})"

log "Customer login: table-validateOTP (table=${TABLE_ID}, otp=${TABLE_OTP})"
customer_login_response=$(curl -sS -X POST "${BASE_URL}/table-validateOTP" \
  -H "Content-Type: application/json" \
  -d "{\"data\":{\"restaurantId\":\"${RESTAURANT_ID}\",\"tableId\":\"${TABLE_ID}\",\"otp\":\"${TABLE_OTP}\",\"phoneNumber\":\"${CUSTOMER_PHONE}\",\"name\":\"${CUSTOMER_NAME}\"}}")
customer_session_id=$(assert_success_and_extract "$customer_login_response" "sessionId")
log "Customer sessionId=${customer_session_id}"

log "Add item to cart: cart-addItemToCart (item=${MENU_ITEM_ID}, qty=${ITEM_QTY})"
add_item_response=$(curl -sS -X POST "${BASE_URL}/cart-addItemToCart" \
  -H "Content-Type: application/json" \
  -d "{\"data\":{\"restaurantId\":\"${RESTAURANT_ID}\",\"tableId\":\"${TABLE_ID}\",\"menuItemId\":\"${MENU_ITEM_ID}\",\"quantity\":${ITEM_QTY},\"sessionId\":\"${customer_session_id}\"}}")
assert_success "$add_item_response"
log "Add item to cart: OK"

log "Checkout cart: cart-checkoutCart"
checkout_response=$(curl -sS -X POST "${BASE_URL}/cart-checkoutCart" \
  -H "Content-Type: application/json" \
  -d "{\"data\":{\"restaurantId\":\"${RESTAURANT_ID}\",\"tableId\":\"${TABLE_ID}\",\"sessionId\":\"${customer_session_id}\"}}")
order_id=$(assert_success_and_extract "$checkout_response" "orderId")
log "Checkout OK: orderId=${order_id}"

log "Server login: server-serverLogin"
server_login_response=$(curl -sS -X POST "${BASE_URL}/server-serverLogin" \
  -H "Content-Type: application/json" \
  -d "{\"data\":{\"restaurantId\":\"${RESTAURANT_ID}\",\"username\":\"${SERVER_USERNAME}\",\"password\":\"${SERVER_PASSWORD}\"}}")
server_session_id=$(assert_success_and_extract "$server_login_response" "sessionId")
log "Server sessionId=${server_session_id}"

log "Get active orders: order-getActiveOrdersForRestaurant"
orders_response=$(curl -sS -X POST "${BASE_URL}/order-getActiveOrdersForRestaurant" \
  -H "Content-Type: application/json" \
  -d "{\"data\":{\"restaurantId\":\"${RESTAURANT_ID}\",\"sessionId\":\"${server_session_id}\"}}")
price=$(assert_orders_contains_price "$orders_response" "$order_id" "$EXPECTED_ORDER_PRICE")
log "Order found with expected price: ${price}"

log "Flow complete"
