#!/bin/bash
set -e
# apply-patches.sh -- pre-build patches
#
# Usage:
#   ./apply-patches.sh            # all platforms (default)
#   ./apply-patches.sh mobile     # all + mobile (iOS + Android)
#   ./apply-patches.sh android    # all + mobile + android
#
# NOTE: The source is now cloned from nlz13/pokerogue (fork, beta branch).
# Many patches are already baked into that fork's source files — running them
# again would fail because their anchors no longer match. Only patches that
# target files too large for the GitHub API (battle-scene.ts) or that need
# CI-time information remain active.

PLATFORM="${1:-all}"

source "$(dirname "$0")/patch-lib.sh"

# -- All platforms -------------------------------------------------------------

# Pending upstream PRs (remove once merged upstream)
#apply_patch "7230.patch"         all   # PKR 7230
#apply_patch "noLearnMove.patch"  all   # PKR 7077
#apply_patch "randomizer.patch"   all   # PKR 7269

# Offline client modifications — BAKED INTO nlz13/pokerogue fork
#apply_patch "fix-daily-seed.js"       all   # baked into title-phase.ts
#apply_patch "inject-unlock-all.js"    all
#apply_patch "cheated-banner.js"       all
#apply_patch "offline-banner.js"       all   # baked into title-ui-handler.ts
#apply_patch "update-title-labels.js"  all   # baked into title-ui-handler.ts
#apply_patch "randomizer_locales.js"   all
#apply_patch "add-import-data-from-url.js"  all

# apply_patch "seeded-classic-run.js"   all   # Disable seeded classic

# nlz custom tweaks — BAKED INTO nlz13/pokerogue fork
#apply_patch "pokeball-catch-rates.js"  all   # baked into pokeball.ts
#apply_patch "shiny-base-rate.js"       all   # baked into rates.ts (BASE_SHINY_CHANCE=256)
#apply_patch "shiny-variant-rates.js"   all   # kept at upstream defaults (SHINY_VARIANT_CHANCE=4, SHINY_EPIC_CHANCE=1)
#apply_patch "fix-epic-variant-filter.js" all  # baked into egg.ts
#apply_patch "shiny-egg-rates.js"       all   # baked into rates.ts (GACHA_SHINY_UP_SHINY_RATE=25)

# NOT YET BAKED — battle-scene.ts is too large to push via GitHub API
apply_patch "money-multiplier.js"      all

# -- Mobile (iOS + Android) ---------------------------------------------------
if [[ "$PLATFORM" == "mobile" || "$PLATFORM" == "android" ]]; then

  # iosImport: upstream already has the iOS file picker overlay natively — skip
  #apply_patch "iosImport.js"  mobile
  # noZoom: upstream index.html already has maximum-scale=1.0 — idempotency guard fires, but harmless
  apply_patch "noZoom.js"     mobile

  # Targeted Patches
  apply_patch "android-import-fix.js"        mobile
  apply_patch "export-fix.js"                mobile
  apply_patch "background-audio-pause.js"    mobile
#  apply_patch "fix-capacitor-input-focus.js" mobile
fi

# -- Android only -------------------------------------------------------------
if [[ "$PLATFORM" == "android" ]]; then

  apply_patch "fix-android-image-paths.js"  android

fi

echo "All patches applied successfully (platform: $PLATFORM)."
