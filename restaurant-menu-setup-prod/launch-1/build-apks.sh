#!/usr/bin/env bash
# Build the three staff apps' release APKs ONE AT A TIME (Gradle is memory-hungry; parallel builds hung this machine).
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/restaurant-menu-setup-prod/launch-1/apks"; LOG="$ROOT/restaurant-menu-setup-prod/launch-1/deploy-logs"
FREE_GB=$(df -g /System/Volumes/Data | awk "NR==2{print \$4}"); [ "$FREE_GB" -lt 8 ] && { echo "ABORT: only ${FREE_GB}G free (need 8G)"; exit 2; }
for app in ${APPS:-platter_kitchen platter_server platter_admin}; do
  d="$ROOT/frontend/src-platter-apps/apps/$app"
  echo "=== $app $(date +%H:%M:%S) ==="
  ( cd "$d" && flutter pub get >/dev/null && nice -n 10 flutter build apk --release --target-platform android-arm64 --android-skip-build-dependency-validation ) > "$LOG/apk-$app.txt" 2>&1
  rc=$?; tail -3 "$LOG/apk-$app.txt"
  if [ $rc -eq 0 ] && [ -f "$d/build/app/outputs/flutter-apk/app-release.apk" ]; then
    cp "$d/build/app/outputs/flutter-apk/app-release.apk" "$OUT/$app-release.apk"; ls -la "$OUT/$app-release.apk"
  else echo "FAILED $app (rc=$rc)"; fi
  rm -rf "$d/build"   # keep only the copied APK; Gradle scratch is ~1-2 GB per app
done
pkill -f GradleDaemon; pkill -f KotlinCompileDaemon   # don't let 2 GB of daemons idle for hours
echo "=== done $(date +%H:%M:%S) ==="
