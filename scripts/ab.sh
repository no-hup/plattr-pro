#!/usr/bin/env bash
# ab — the agent browser. One vocabulary for driving the four Flutter web apps
# headlessly. See FRONTEND_AGENT_TESTING.md.
#
#   ab preflight [app]              refuse to start if the machine can't afford it
#   ab open <app> [hash-route]      headless page, semantics on, snapshot
#   ab seed-consumer <slug> [n]     skip the OTP: fake an active table session
#   ab login <server|kitchen|admin> <slug>
#   ab click <identifier>           stable selector, no snapshot refs
#   ab fill <identifier> <text>     clicks first (unfocused Flutter fields no-op)
#   ab snap [depth]                 snapshot -i
#   ab stop                         kill the daemon. ALWAYS end with this.

set -uo pipefail
B="${BROWSE_BIN:-$HOME/.claude/skills/gstack/browse/dist/browse}"
export BROWSE_IDLE_TIMEOUT="${BROWSE_IDLE_TIMEOUT:-300000}"   # 5 min; read at daemon start
unset BROWSE_EXTENSIONS_DIR

FN=http://127.0.0.1:5002/rms-app-dd875/us-central1
die() { echo "ab: $*" >&2; exit 1; }

port_of() { case "$1" in
  consumer) echo 5051 ;; server) echo 5050 ;; kitchen) echo 5052 ;; admin) echo 5053 ;;
  *) die "unknown app '$1' (consumer|server|kitchen|admin)" ;; esac; }

# MockData7 slugs → restaurant id
rid_of() { case "$1" in
  meg) echo res_meghana ;; pb) echo res_pizzabakery ;; tr) echo res_truffles ;;
  salt) echo res_salt ;; cw) echo res_chowman ;;
  *) die "unknown slug '$1' (meg|pb|tr|salt|cw)" ;; esac; }

free_gb() { vm_stat | awk '/Pages free/{f=$3} /Pages inactive/{i=$3} END {printf "%.1f", (f+i)*16384/1073741824}'; }
# Sum RSS of the user's real Chrome (main process + helpers). Playwright's
# Chromium lives under .../ms-playwright/chromium*, so it is never counted here.
chrome_gb() {
  local pids
  pids=$(pgrep -f "Google Chrome" 2>/dev/null | tr '\n' ' ')
  [ -z "$pids" ] && { echo "0.0"; return; }
  # shellcheck disable=SC2086
  ps -o rss= -p ${pids// /,} 2>/dev/null | awk '{s+=$1} END {printf "%.1f", s/1048576}'
}

preflight() {
  local app="${1:-consumer}" port fail=0
  port=$(port_of "$app")
  local free chrome
  free=$(free_gb); chrome=$(chrome_gb); [ -z "$chrome" ] && chrome=0.0
  echo "free+inactive: ${free} GB   personal Chrome: ${chrome} GB"

  curl -sf -m 5 -o /dev/null -X POST "$FN/dev-listRestaurants" \
    -H 'Content-Type: application/json' -d '{"data":{}}' \
    || { echo "  ✗ functions emulator not answering on :5002"; fail=1; }
  curl -sf -m 5 -o /dev/null "http://127.0.0.1:$port/" \
    || { echo "  ✗ $app app not answering on :$port (run backend/flutter-app-logs/run_app.sh $app)"; fail=1; }
  awk -v f="$free" 'BEGIN{exit !(f<2.0)}' \
    && { echo "  ✗ only ${free} GB free — close something before driving a browser"; fail=1; }
  awk -v c="$chrome" 'BEGIN{exit !(c>4.0)}' \
    && { echo "  ✗ personal Chrome is holding ${chrome} GB — close it first"; fail=1; }
  "$B" status 2>/dev/null | grep -qi "headed" \
    && { echo "  ✗ a HEADED gstack daemon is running (no idle exit) — ab stop first"; fail=1; }

  [ "$fail" = 0 ] && echo "  ✓ ok" || exit 1
}

# Poll in-page rather than `$B wait`: Flutter's flt-* elements are zero-opacity,
# so Playwright never calls them visible and `wait` always times out.
poll() { # poll <js-expr-returning-truthy> [seconds]
  # Time-budgeted, not iteration-budgeted: a cold DDC dev build can take 20 s to
  # first paint, and a fixed try-count silently gives up on a slow first load.
  local deadline=$(( $(date +%s) + ${2:-40} ))
  while [ "$(date +%s)" -lt "$deadline" ]; do
    [ "$("$B" js "($1) ? 1 : 0" 2>/dev/null | tail -1)" = "1" ] && return 0
  done
  return 1
}

semantics_on() {
  poll 'document.querySelector("flt-semantics-placeholder")||document.querySelector("flt-semantics-host")' \
    || die "app never booted (no semantics placeholder) — is it still compiling?"
  "$B" js 'var p=document.querySelector("flt-semantics-placeholder"); if(p)p.click(); 1' >/dev/null
  poll 'document.querySelectorAll("flt-semantics[role],flt-semantics[aria-label],flt-semantics[flt-semantics-identifier]").length' \
    || die "semantics tree never populated"
}

open_app() { # open_app <app> [hash-route]
  local app="$1" route="${2:-}" port
  port=$(port_of "$app")
  [ "$app" = consumer ] && "$B" viewport 430x900 >/dev/null
  "$B" goto "http://127.0.0.1:$port/?agent=1${route:+#$route}" >/dev/null || die "goto failed"
  semantics_on
}

sel() { printf '[flt-semantics-identifier="%s"]' "$1"; }
# A Semantics() wrapper puts the real <input> one node below the identifier, so
# `fill` on the wrapper errors "Element is not an <input>". Target the field.
inp() { printf '[flt-semantics-identifier="%s"] input, [flt-semantics-identifier="%s"] textarea, input[flt-semantics-identifier="%s"]' "$1" "$1" "$1"; }

case "${1:-}" in
  preflight) shift; preflight "${1:-consumer}" ;;

  open) shift; [ $# -ge 1 ] || die "usage: ab open <app> [hash-route]"
        open_app "$1" "${2:-}"; "$B" url; "$B" snapshot -i -d 6 ;;

  seed-consumer) shift
        slug="${1:-meg}"; n="${2:-1}"; rid=$(rid_of "$slug"); tid="tbl_${slug}_${n}"
        "$B" viewport 430x900 >/dev/null
        "$B" goto "http://127.0.0.1:5051/?agent=1" >/dev/null || die "consumer not up"
        # No sessionExpiresAt: the loader skips the expiry check when it is absent
        # (session_storage_service.dart). phoneNumber MUST be the session's
        # primaryUserId or the backend refuses to resume.
        "$B" js "sessionStorage.setItem('restaurant_session_state', JSON.stringify({sessionId:'ses_${slug}_active',restaurantId:'$rid',tableId:'$tid',userName:'Customer One',phoneNumber:'9876543210',isAuthenticated:true,isPrimaryCustomer:true})); 1" >/dev/null
        "$B" js "location.hash='#/r/$rid/t/$tid'; 1" >/dev/null
        semantics_on
        "$B" url; "$B" snapshot -i -d 6 ;;

  login) shift; [ $# -ge 2 ] || die "usage: ab login <server|kitchen|admin> <slug>"
        app="$1"; slug="$2"; rid=$(rid_of "$slug")
        open_app "$app"
        for f in "login-restaurant:$rid" "login-username:$app@$slug.test" "login-password:1234"; do
          id="${f%%:*}"; val="${f#*:}"
          "$B" click "$(sel "$id")" >/dev/null || die "no field $id (login form not up?)"
          "$B" fill  "$(inp "$id")" "$val" >/dev/null || die "could not fill $id"
        done
        "$B" click "$(sel login-submit)" >/dev/null || die "no login-submit"
        # Any identifier that is not a login field means we are past the form.
        poll "document.querySelector('[flt-semantics-identifier]:not([flt-semantics-identifier^=login-])')" \
          || echo "ab: submitted but still on the login form — check \$B console" >&2
        "$B" url; "$B" snapshot -i -d 6 ;;

  click) shift; [ $# -ge 1 ] || die "usage: ab click <identifier>"
        "$B" click "$(sel "$1")" ;;

  fill)  shift; [ $# -ge 2 ] || die "usage: ab fill <identifier> <text>"
        "$B" click "$(sel "$1")" >/dev/null && "$B" fill "$(inp "$1")" "$2" ;;

  snap)  shift; "$B" snapshot -i -d "${1:-6}" ;;
  ids)   "$B" js 'Array.from(document.querySelectorAll("[flt-semantics-identifier]")).map(e=>e.getAttribute("flt-semantics-identifier")).join("\n")' ;;
  stop)  "$B" stop ;;
  *) sed -n '2,13p' "$0" | sed 's/^# \{0,1\}//'; exit 1 ;;
esac
