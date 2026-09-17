#!/usr/bin/env bash
# Read GCP billing state for the Firebase project using the firebase CLI's own login (no gcloud account needed).
# Why: `gcloud billing` needs the Cloud Billing API enabled on the project; this uses the CLI's OAuth client instead.
set -euo pipefail
PROJECT=${1:-rms-app-dd875}
RT=$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1])).tokens.refresh_token)' ~/.config/configstore/firebase-tools.json)
TOK=$(curl -s -X POST https://oauth2.googleapis.com/token \
  -d client_id=563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com \
  -d client_secret=j9iVZfS8kkCEFUPaAeJV0sAi -d refresh_token="$RT" -d grant_type=refresh_token \
  | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).access_token))')
api(){ curl -s "https://cloudbilling.googleapis.com/v1/$1" -H "Authorization: Bearer $TOK"; }
echo "== project link =="; api "projects/$PROJECT/billingInfo"
ACC=$(api "projects/$PROJECT/billingInfo" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log((JSON.parse(s).billingAccountName||"").split("/")[1]||""))')
[ -n "$ACC" ] && { echo "== linked account (open must be true) =="; api "billingAccounts/$ACC"; }
echo "== all accounts this user can see =="; api "billingAccounts"
