#!/bin/bash

# Script to run Flutter server app with logging
# Creates log directory and truncates log file before starting

LOG_DIR="/Users/shauryajaiswal/Desktop/dev/plattr-pro/backend/flutter-app-logs"
LOG_FILE="$LOG_DIR/server.log"
APP_DIR="/Users/shauryajaiswal/Desktop/dev/plattr-pro/frontend/src-platter-apps/apps/platter_server"

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Truncate log file (create fresh)
: > "$LOG_FILE"

# Navigate to app directory and run
cd "$APP_DIR"
flutter run -d chrome 2>&1 | tee "$LOG_FILE"
