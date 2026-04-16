#!/bin/bash
# Preflight: find free ports for functions/firestore and write a temp firebase config
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TEMPLATE_JSON="$ROOT_DIR/firebase.json"
TMP_JSON="$ROOT_DIR/firebase.temp.json"

EMULATOR_HOST="127.0.0.1"
DEFAULT_FUNCTIONS_PORT=5002
DEFAULT_FIRESTORE_PORT=8080
DEFAULT_LOGGING_PORT=4501

is_port_free() {
  local host="$1"; local port="$2"
  nc -z "$host" "$port" >/dev/null 2>&1 && return 1 || return 0
}

find_free_port() {
  local host="$1"; local start="$2"; local max_tries=20
  local p=$start
  for i in $(seq 1 $max_tries); do
    if is_port_free "$host" "$p"; then echo "$p"; return 0; fi
    p=$((p+1))
  done
  echo "$start" # fallback
}

FUNCTIONS_PORT=$(find_free_port "$EMULATOR_HOST" "$DEFAULT_FUNCTIONS_PORT")
FIRESTORE_PORT=$(find_free_port "$EMULATOR_HOST" "$DEFAULT_FIRESTORE_PORT")
LOGGING_PORT=$(find_free_port "$EMULATOR_HOST" "$DEFAULT_LOGGING_PORT")

echo "Using functions port: $FUNCTIONS_PORT"
echo "Using firestore port: $FIRESTORE_PORT"

# Create temp firebase.json with updated ports
cat "$TEMPLATE_JSON" \
  | sed "s/\"port\": 5002/\"port\": $FUNCTIONS_PORT/" \
  | sed "s/\"port\": 8080/\"port\": $FIRESTORE_PORT/" \
  > "$TMP_JSON"

echo "EMULATOR_HOST=$EMULATOR_HOST" > "$ROOT_DIR/tests/.env.ports"
echo "FUNCTIONS_PORT=$FUNCTIONS_PORT" >> "$ROOT_DIR/tests/.env.ports"
echo "FIRESTORE_PORT=$FIRESTORE_PORT" >> "$ROOT_DIR/tests/.env.ports"

echo "Preflight complete. Temp config: $TMP_JSON"

# Also patch logging emulator port if present
if grep -q '"logging"' "$TEMPLATE_JSON"; then
  cat "$TMP_JSON" \
    | sed "s/\"port\": 4501/\"port\": $LOGGING_PORT/" \
    > "$TMP_JSON.tmp" && mv "$TMP_JSON.tmp" "$TMP_JSON"
fi

echo "LOGGING_PORT=$LOGGING_PORT" >> "$ROOT_DIR/tests/.env.ports"

