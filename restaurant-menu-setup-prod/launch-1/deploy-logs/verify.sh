#!/bin/bash
B=https://us-central1-rms-app-dd875.cloudfunctions.net
hr(){ echo; echo "================ $1 ================"; }

hr "1. dev-listRestaurants (expect 403)"
curl -sS -o /tmp/b1 -w 'HTTP %{http_code}\n' -X POST "$B/dev-listRestaurants" \
  -H 'Content-Type: application/json' -d '{"data":{}}'; cat /tmp/b1; echo

hr "2a. table-validateTableAndLocation — missing userLocation (expect invalid-argument)"
curl -sS -o /tmp/b2 -w 'HTTP %{http_code}\n' -X POST "$B/table-validateTableAndLocation" \
  -H 'Content-Type: application/json' \
  -d '{"data":{"restaurantId":"res_does_not_exist","tableId":"tbl_x"}}'; cat /tmp/b2; echo

hr "2b. table-validateTableAndLocation — full payload, bogus ids (expect not-found)"
curl -sS -o /tmp/b3 -w 'HTTP %{http_code}\n' -X POST "$B/table-validateTableAndLocation" \
  -H 'Content-Type: application/json' \
  -d '{"data":{"restaurantId":"res_does_not_exist","tableId":"tbl_x","userLocation":{"latitude":12.97,"longitude":77.59}}}'; cat /tmp/b3; echo

hr "3a. server-serverLogin OPTIONS preflight (Origin: plattrpro.web.app)"
curl -sS -i -X OPTIONS "$B/server-serverLogin" \
  -H 'Origin: https://plattrpro.web.app' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: content-type' 2>&1 | head -20

hr "3b. server-serverLogin POST bogus login + Origin"
curl -sS -D /tmp/h4 -o /tmp/b4 -w 'HTTP %{http_code}\n' -X POST "$B/server-serverLogin" \
  -H 'Content-Type: application/json' -H 'Origin: https://plattrpro.web.app' \
  -d '{"data":{"restaurantId":"res_does_not_exist","username":"nobody","password":"wrong"}}'
grep -i 'access-control\|^vary' /tmp/h4; cat /tmp/b4; echo

hr "3c. server-serverLogin POST with DISALLOWED Origin (expect NO ACAO)"
curl -sS -D /tmp/h5 -o /dev/null -w 'HTTP %{http_code}\n' -X POST "$B/server-serverLogin" \
  -H 'Content-Type: application/json' -H 'Origin: https://evil.example.com' \
  -d '{"data":{"restaurantId":"x","username":"n","password":"w"}}'
grep -i 'access-control\|^vary' /tmp/h5 || echo '(no ACAO header - correct)'

hr "3d. server-serverLogin POST with NO Origin (APK/curl path)"
curl -sS -o /tmp/b6 -w 'HTTP %{http_code}\n' -X POST "$B/server-serverLogin" \
  -H 'Content-Type: application/json' \
  -d '{"data":{"restaurantId":"res_does_not_exist","username":"nobody","password":"wrong"}}'; cat /tmp/b6; echo

hr "4. helloWorld (expect 200)"
curl -sS -o /tmp/b7 -w 'HTTP %{http_code}\n' "$B/helloWorld"; cat /tmp/b7; echo
