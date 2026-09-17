#!/usr/bin/env bash
# Build the consumer web app pointed at prod Cloud Functions.
# Deploy afterwards with: (cd backend/src-plattr && firebase deploy --only hosting)
#
# Two base URLs must be set:
#   API_BASE_URL dart-define -> ApiConfig.baseUrl -> DioClient (every repository; the live path)
#   .env SERVER_URL          -> Env.serverUrl    -> main.dart's GetIt HttpClient
# `build_runner clean` is required: envied reads .env with dart:io, so build_runner's
# asset graph never sees it change and would otherwise emit a stale env.g.dart.
set -euo pipefail
PROD_URL=https://us-central1-rms-app-dd875.cloudfunctions.net

FREE_GB=$(df -g /System/Volumes/Data | awk 'NR==2{print $4}')
if (( FREE_GB < 3 )); then
  echo "REFUSING: ${FREE_GB} GB free on /System/Volumes/Data, need 3 for a web build." >&2
  echo "  Try: bash scripts/reclaim-disk.sh   (dry run; --yes to delete)" >&2
  exit 1
fi
echo "Disk: ${FREE_GB} GB free."

cd "$(dirname "$0")/../frontend/flutter_boilerplate"

regen() { dart run build_runner clean >/dev/null; dart run build_runner build --delete-conflicting-outputs; }

cp .env .env.bak
trap 'mv .env.bak .env; regen' EXIT

echo "SERVER_URL=$PROD_URL" > .env
regen
# Build straight into the hosting public dir. firebase.json's hosting.public is
# "consumer-web", and firebase refuses a public dir outside the project dir — so
# write there directly instead of symlinking build/web in.
flutter build web --release --dart-define=API_BASE_URL="$PROD_URL" -o ../../backend/src-plattr/consumer-web
