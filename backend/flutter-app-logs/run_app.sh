#!/bin/bash

# Run one Flutter web app with logging.
#   ./run_app.sh consumer|server|kitchen|admin
#
# Uses `-d web-server` (NOT `-d chrome`) so no browser is spawned: the agent's
# headless Chromium is the only browser, which is what keeps this 16 GB machine
# alive. Open the printed URL yourself if you want to look at it.
# Hot reload still works on stdin: 'r' reload, 'R' restart, 'q' quit.

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LOG_DIR="$PROJECT_ROOT/backend/flutter-app-logs"
APPS_DIR="$PROJECT_ROOT/frontend/src-platter-apps/apps"
WEB_HOST="127.0.0.1"

case "$1" in
  consumer) APP_DIR="$PROJECT_ROOT/frontend/flutter_boilerplate"; WEB_PORT=5051 ;;
  server)   APP_DIR="$APPS_DIR/platter_server";  WEB_PORT=5050 ;;
  kitchen)  APP_DIR="$APPS_DIR/platter_kitchen"; WEB_PORT=5052 ;;
  admin)    APP_DIR="$APPS_DIR/platter_admin";   WEB_PORT=5053 ;;
  *) echo "usage: $0 consumer|server|kitchen|admin" >&2; exit 1 ;;
esac

LOG_FILE="$LOG_DIR/$1.log"
mkdir -p "$LOG_DIR"
: > "$LOG_FILE"

cd "$APP_DIR" || exit 1
echo "Starting Flutter $1 app at http://${WEB_HOST}:${WEB_PORT}"
echo "Hot reload enabled: press 'r' to reload, 'R' to restart, 'q' to quit"
flutter run -d web-server --web-hostname "$WEB_HOST" --web-port "$WEB_PORT" 2>&1 | tee "$LOG_FILE"
