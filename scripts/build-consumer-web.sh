#!/usr/bin/env bash
# Build the consumer web app pointed at prod Cloud Functions.
# Deploy afterwards with: (cd backend/src-plattr && firebase deploy --only hosting)
set -euo pipefail
cd "$(dirname "$0")/../frontend/flutter_boilerplate"
flutter build web --dart-define=API_BASE_URL=https://us-central1-rms-app-dd875.cloudfunctions.net
