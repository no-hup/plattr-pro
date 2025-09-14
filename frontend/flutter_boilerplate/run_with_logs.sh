#!/bin/bash
# Script to run Flutter app and capture logs in debug mode

# Make sure logs directory exists
mkdir -p logs

# Set default arguments
DEVICE_ARG=""
DEBUG_FLAG="--debug"

# Clear the log file
> logs/flutter_run.log

# Check if device argument is already provided
if [[ ! "$*" == *"-d "* && ! "$*" == *"--device "* ]]; then
  # If no device is specified, default to chrome
  DEVICE_ARG="-d chrome"
fi

echo "Starting Flutter in debug mode at $(date)" > logs/flutter_run.log
echo "Command: flutter run ${DEVICE_ARG} ${DEBUG_FLAG} $@" >> logs/flutter_run.log
echo "----------------------------------------" >> logs/flutter_run.log

# Start Flutter in debug mode
# Use unbuffer to ensure we get clean output with proper color codes and emojis
flutter run ${DEVICE_ARG} ${DEBUG_FLAG} "$@" 2>&1 | tee -a logs/flutter_run.log

# For viewing logs specifically relating to cart pricing
echo ""
echo "To view cart pricing logs, use: grep -E '(CART|💰|🛒)' logs/flutter_run.log" 