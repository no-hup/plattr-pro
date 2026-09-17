#!/usr/bin/env bash
# List (and with --yes, delete) regenerable build scratch. Dry run by default.
#   bash scripts/reclaim-disk.sh          # just list what it would remove
#   bash scripts/reclaim-disk.sh --yes    # actually remove it
#
# Deliberately does NOT touch ~/.gradle, ~/.pub-cache or anything under
# ~/Desktop — those are the user's call.
set -uo pipefail
cd "$(dirname "$0")/.."
GO=0; [[ "${1:-}" == "--yes" ]] && GO=1

echo "Disk before: $(df -g /System/Volumes/Data | awk 'NR==2{print $4}') GB free"
echo

TARGETS=()
while IFS= read -r d; do TARGETS+=("$d"); done < <(
  find frontend -type d \( -name build -o -name .dart_tool \) -not -path '*/node_modules/*' -prune 2>/dev/null
)
for f in backend/src-plattr/firebase-debug.log backend/src-plattr/firestore-debug.log \
         "$HOME/Library/Developer/Xcode/DerivedData"; do
  [[ -e "$f" ]] && TARGETS+=("$f")
done

for t in "${TARGETS[@]}"; do
  printf '%8s  %s\n' "$(du -sh "$t" 2>/dev/null | cut -f1)" "$t"
  (( GO )) && rm -rf "$t"
done

echo
echo "── brew (run 'brew cleanup -s --prune=all' yourself to apply) ──"
brew cleanup -s --prune=all --dry-run 2>/dev/null | tail -5
(( GO )) && { echo "── npm cache ──"; npm cache verify; }

echo
if (( GO )); then
  echo "Deleted. Disk now: $(df -g /System/Volumes/Data | awk 'NR==2{print $4}') GB free"
else
  echo "DRY RUN — nothing deleted. Re-run with --yes."
fi
