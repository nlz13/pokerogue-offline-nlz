#!/usr/bin/env node
/**
 * Patch: fix-epic-variant-filter.js
 *
 * Fixes EPIC (red/level 3) shiny variants being silently downgraded to STANDARD
 * (yellow/level 1) due to a dependency on variantData being fully loaded.
 *
 * ROOT CAUSE:
 *   egg.ts has two places where hasVariants() is called to check if a species
 *   has shiny variant sprite data. Both calls depend on the global `variantData`
 *   object being populated from `_masterlist.json` (loaded asynchronously).
 *
 *   1) rollSpecies() filters the species pool to only hasVariants() species when
 *      variantTier is RARE or EPIC. If variantData is empty at that moment, ALL
 *      species fail the check, the pool becomes empty, randSeedInt(0) returns 0,
 *      species is undefined, and the egg falls back to the legacy path (no
 *      variantTier saved). At hatch time the variant is re-rolled from scratch.
 *
 *   2) generateEggProperties() resets _variantTier to STANDARD if the species
 *      doesn't pass hasVariants(). If variantData is empty when an egg is loaded
 *      from save data (via toEgg()), a saved EPIC variant becomes STANDARD.
 *
 *   On iOS WKWebView, the fetch for _masterlist.json may not have resolved yet
 *   when eggs are being created or loaded, making this race condition more likely.
 *
 * FIX:
 *   - Disable the hasVariants() filter in rollSpecies() — the unfiltered pool
 *     still contains hundreds of valid species. The 2 species without variant
 *     data (out of 972) will simply display with default coloring if rolled.
 *   - Disable the hasVariants() reset in generateEggProperties() — the saved
 *     variantTier from the gacha pull is authoritative and must not be overridden.
 *
 * Targets: pokerogue-src/src/data/egg.ts
 */

const fs = require("fs");
const path = require("path");

const TARGET = path.join("pokerogue-src", "src", "data", "egg.ts");

if (!fs.existsSync(TARGET)) {
  console.error("ERROR: Could not find target file: " + TARGET);
  process.exit(1);
}

let src = fs.readFileSync(TARGET, "utf8").replace(/\r\n/g, "\n");

if (src.includes("fix-epic-variant-filter")) {
  console.log("Epic variant filter patch already applied, skipping.");
  process.exit(0);
}

let patched = false;

// ── Fix 1: Remove the hasVariants() species pool filter in rollSpecies() ──────
// When variantTier is RARE or EPIC, the pool is filtered to species that have
// variant data. If variantData isn't loaded yet, this produces an empty pool.
const FILTER_ORIGINAL = `    // If egg variant is set to RARE or EPIC, filter species pool to only include ones with variants.
    if (this.variantTier && (this.variantTier === VariantTier.RARE || this.variantTier === VariantTier.EPIC)) {
      speciesPool = speciesPool.filter(s => getPokemonSpecies(s).hasVariants());
    }`;

const FILTER_PATCHED = `    // If egg variant is set to RARE or EPIC, filter species pool to only include ones with variants.
    // fix-epic-variant-filter: disabled — hasVariants() depends on async variantData; if empty,
    // pool becomes empty → randSeedInt(0) → undefined species → legacy path → variant lost.
    // if (this.variantTier && (this.variantTier === VariantTier.RARE || this.variantTier === VariantTier.EPIC)) {
    //   speciesPool = speciesPool.filter(s => getPokemonSpecies(s).hasVariants());
    // }`;

if (src.includes(FILTER_ORIGINAL)) {
  src = src.replace(FILTER_ORIGINAL, FILTER_PATCHED);
  patched = true;
  console.log("Fix 1 applied: removed hasVariants() species pool filter from rollSpecies().");
} else {
  console.warn("WARNING: Fix 1 — could not find rollSpecies() hasVariants() filter. Upstream may have changed.");
}

// ── Fix 2: Remove the hasVariants() variantTier reset in generateEggProperties() ─
// After rolling species, if hasVariants() returns false (because variantData is
// empty), _variantTier is reset to STANDARD — wiping a saved EPIC/RARE variant.
const RESET_ORIGINAL = `      // If species has no variant, set variantTier to common. This needs to
      // be done because species with no variants get filtered at rollSpecies but if the
      // species is set via options or the legendary gacha pokemon gets choosen the check never happens
      if (this._species && !getPokemonSpecies(this._species).hasVariants()) {
        this._variantTier = VariantTier.STANDARD;
      }`;

const RESET_PATCHED = `      // If species has no variant, set variantTier to common. This needs to
      // be done because species with no variants get filtered at rollSpecies but if the
      // species is set via options or the legendary gacha pokemon gets choosen the check never happens
      // fix-epic-variant-filter: disabled — hasVariants() depends on async variantData; if empty,
      // ALL species fail the check and saved EPIC/RARE variants get reset to STANDARD.
      // if (this._species && !getPokemonSpecies(this._species).hasVariants()) {
      //   this._variantTier = VariantTier.STANDARD;
      // }`;

if (src.includes(RESET_ORIGINAL)) {
  src = src.replace(RESET_ORIGINAL, RESET_PATCHED);
  patched = true;
  console.log("Fix 2 applied: removed hasVariants() variantTier reset from generateEggProperties().");
} else {
  console.warn("WARNING: Fix 2 — could not find generateEggProperties() hasVariants() reset. Upstream may have changed.");
}

if (!patched) {
  console.warn("WARNING: No changes made — upstream egg.ts may have already been updated or both strings changed.");
  console.warn("Manual review of egg.ts may be needed.");
  process.exit(0); // non-fatal — don't break the build
}

fs.writeFileSync(TARGET, src, "utf8");
console.log("Epic variant filter fix applied to " + TARGET);
