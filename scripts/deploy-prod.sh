#!/usr/bin/env bash
# Deploy Cloud Functions to prod WITHOUT the quota storm, then make sure every service is publicly invokable.
# Why: 62 exports = 62 Cloud Run services. A single `firebase deploy --only functions` bursts past the
# Cloud Functions write quota; the CLI retries the updates but silently drops the allUsers-invoker step
# on some services, which then answer Cloud Run's HTML 403 to the apps.
#   scripts/deploy-prod.sh                # all groups
#   scripts/deploy-prod.sh table cart     # only these groups
set -uo pipefail
cd "$(dirname "$0")/../backend/src-plattr"
PROJECT=rms-app-dd875
FN_GROUPS=("$@"); [ ${#FN_GROUPS[@]} -eq 0 ] && FN_GROUPS=(table server customer cart menu dev offers admin order helloWorld)
(cd functions && npx jest --coverage=false 2>&1 | tail -1) || { echo "jest failed — not deploying"; exit 1; }
for g in "${FN_GROUPS[@]}"; do
  echo "=== deploying functions:$g ==="
  firebase deploy --only "functions:$g" --project "$PROJECT" --force 2>&1 | grep -E "✔|Error|failed" | grep -v "build images"
done
echo "=== ensuring allUsers invoker on every function (idempotent) ==="
gcloud functions list --v2 --project "$PROJECT" --format='value(name)' | while read -r f; do
  gcloud functions add-invoker-policy-binding "$f" --region us-central1 --project "$PROJECT" --member=allUsers --quiet >/dev/null 2>&1 || echo "invoker FAILED: $f"
done
echo "=== inventory ==="; firebase functions:list --project "$PROJECT" 2>/dev/null | awk -F'│' 'NF>5{r=$7;gsub(/ /,"",r);if(r!="Runtime")c[r]++}END{for(k in c)print k,c[k]}'
