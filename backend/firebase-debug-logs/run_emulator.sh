#!/bin/bash

# Script to run Firebase Emulator with clean logging
# Creates log directory, truncates log file, and filters output

# Define absolute paths
PROJECT_ROOT="/Users/shauryajaiswal/Desktop/dev/plattr-pro"
LOG_DIR="$PROJECT_ROOT/backend/firebase-debug-logs"
LOG_FILE="$LOG_DIR/emulator.log"
BACKEND_DIR="$PROJECT_ROOT/backend/src-plattr"

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Truncate log file (create fresh)
: > "$LOG_FILE"

echo "Starting Firebase Emulator..."
echo "Logs are being written to: $LOG_FILE"

# Navigate to backend directory and run
cd "$BACKEND_DIR"

# Run emulators, redirect stderr to stdout, filter noise, and tee to log file
# grep -vE filters out lines containing "[debug]" or "work-queue" or "Info" to keep terminal clean
# but we actually want to log everything to file usually, but the user requested cleaning specifically.
# The previous command was: npm run emulators 2>&1 | grep -vE "\[debug\]|work-queue" | tee ../firebase-debug-logs/emulator.log
# We will replicate that behavior.

npm run emulators 2>&1 | grep -vE "\[debug\]|work-queue" | tee "$LOG_FILE"
