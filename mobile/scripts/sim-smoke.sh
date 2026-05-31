#!/usr/bin/env bash
#
# sim-smoke.sh — fast iOS-simulator smoke check for LexiTap.
#
# Proves two things WITHOUT eyeballing the UI or relaying screenshots:
#   1. the app launches on the booted simulator, and
#   2. the bundled read-only content DB (words.db) actually got copied into
#      the app's container AND has real rows — i.e. the C0 gate
#      ("ATTACH on a populated DB, not a silently-empty one").
#
# This is the repeatable inner loop. The SLOW step (the native build) is paid
# once via `npm run ios`; thereafter this runs in seconds and JS changes
# hot-reload over Metro.
#
# Usage:
#   npm run smoke                  # against the booted sim + installed app
#   WORDS_MIN=40 npm run smoke     # raise the row-count floor
#   bash scripts/sim-smoke.sh com.lexitap.app
#
# Prereqs:
#   - a dev build installed on a booted simulator (run `npm run ios` once), and
#   - for a DEBUG build, Metro running (the app loads JS from it; if Metro is
#     down the app can't run its DB-install code and this fails with
#     "content DB not found" — which is itself the right signal).
#     A RELEASE simulator build embeds the JS and needs no Metro.
#
set -uo pipefail

BUNDLE_ID="${1:-com.lexitap.app}"
SIM="${SIM:-booted}"
WORDS_MIN="${WORDS_MIN:-1}"          # fail if the words table has fewer rows
SETTLE_SECONDS="${SETTLE_SECONDS:-6}" # time for cold-start DB install + render
OUT_DIR="${TMPDIR:-/tmp}/lexitap-smoke"
SHOT="$OUT_DIR/screen.png"
mkdir -p "$OUT_DIR"

fail() { echo "❌ SMOKE FAIL: $*" >&2; exit 1; }
ok()   { echo "✅ $*"; }

# 1. A simulator must be booted.
xcrun simctl list devices booted 2>/dev/null | grep -qi "booted" \
  || fail "no simulator booted — run \`npm run ios\` first"
ok "simulator booted"

# 2. The app must be installed. get_app_container also gives us the data dir.
APP_DATA="$(xcrun simctl get_app_container "$SIM" "$BUNDLE_ID" data 2>/dev/null)" \
  || fail "$BUNDLE_ID not installed on the booted sim — run \`npm run ios\` first"
ok "app installed: $BUNDLE_ID"

# 3. Cold-relaunch so the version-gated content-DB copy path actually runs.
xcrun simctl terminate "$SIM" "$BUNDLE_ID" >/dev/null 2>&1 || true
xcrun simctl launch "$SIM" "$BUNDLE_ID" >/dev/null 2>&1 \
  || fail "could not launch $BUNDLE_ID"
ok "launched — settling ${SETTLE_SECONDS}s for content-DB install + first render"
sleep "$SETTLE_SECONDS"

# 4. THE C0 ASSERTION — words.db present in the container AND populated.
#    expo-sqlite resolves DB names under <Documents>/SQLite, which is where
#    contentDb.ts copies the bundled file before ATTACH.
DB="$APP_DATA/Documents/SQLite/words.db"
[ -f "$DB" ] \
  || fail "content DB missing at <container>/Documents/SQLite/words.db — copy-on-launch did NOT run (app crashed early, or DEBUG build with Metro down?)"
COUNT="$(sqlite3 "$DB" 'SELECT count(*) FROM words;' 2>/dev/null)" \
  || fail "words.db exists but \`SELECT count(*) FROM words\` failed — schema/ATTACH broken"
case "$COUNT" in ''|*[!0-9]*) fail "unexpected count output: '$COUNT'";; esac
[ "$COUNT" -ge "$WORDS_MIN" ] \
  || fail "words.db loaded but has $COUNT rows (< WORDS_MIN=$WORDS_MIN) — empty/near-empty-DB regression"
ok "content DB present + populated: $COUNT words"

# 5. Capture a screenshot for the record (best-effort).
xcrun simctl io "$SIM" screenshot "$SHOT" >/dev/null 2>&1 \
  && ok "screenshot: $SHOT" \
  || echo "   (screenshot skipped)"

echo
echo "✅ SMOKE PASS — app launched; words.db delivered on-device ($COUNT rows ≥ $WORDS_MIN)."
