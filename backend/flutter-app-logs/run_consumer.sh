#!/bin/bash

# Script to run Flutter consumer app (boilerplate) with logging
# Creates log directory and truncates log file before starting
# Default port is set to avoid clashing with platter_server.
# Hot reload is enabled by default - press 'r' to hot reload, 'R' to hot restart

LOG_DIR="/Users/shauryajaiswal/Desktop/dev/plattr-pro/backend/flutter-app-logs"
LOG_FILE="$LOG_DIR/consumer.log"
APP_DIR="/Users/shauryajaiswal/Desktop/dev/plattr-pro/frontend/flutter_boilerplate"
WEB_HOST="127.0.0.1"
WEB_PORT="5051"

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Truncate log file (create fresh)
: > "$LOG_FILE"

# Navigate to app directory and run
cd "$APP_DIR"
echo "Starting Flutter consumer app at http://${WEB_HOST}:${WEB_PORT}"
echo "Hot reload enabled: press 'r' to reload, 'R' to restart, 'q' to quit"
flutter run -d chrome --web-hostname "$WEB_HOST" --web-port "$WEB_PORT" 2>&1 | tee "$LOG_FILE"
