#!/usr/bin/env node
/**
 * Patch: shiny-variant-rates.js
 *
 * Changes the shiny tier distribution for ALL shinies (eggs + wild).
 *
 * The game rolls randSeedInt(10) (0-9) and checks two thresholds:
 *   if (rand >= SHINY_VARIANT_CHANCE) -> yellow (level 1)
 *   if (rand >= SHINY_EPIC_CHANCE)    -> blue   (level 2)
 *   else                              -> red    (level 3)
 *
 * Default upstream values (4, 1):
 *   Yellow: 60%  Blue: 30%  Red: 10%
 *
 * New values (5, 2):
 *   Yellow: 50%  Blue: 30%  Red: 20%
 *
 * Targets: pokerogue-src/src/data/balance/rates.ts
 */

const fs = require("fs");
const path = require("path");

const TARGET = path.join("pokerogue-src", "src", "data", "balance", "rates.ts");

if (!fs.existsSync(TARGET)) {
  console.error("ERROR: Could not find target file: " + TARGET);
  process.exit(1);
}

let src = fs.readFileSync(TARGET, "utf8").replace(/\r\n/g, "\n");

if (src.includes("shiny-variant-rates")) {
  console.log("Shiny variant rates patch already applied, skipping.");
  process.exit(0);
}

const ORIGINAL_VARIANT = "export const SHINY_VARIANT_CHANCE = 4;";
const ORIGINAL_EPIC    = "export const SHINY_EPIC_CHANCE = 1;";

if (!src.includes(ORIGINAL_VARIANT) || !src.includes(ORIGINAL_EPIC)) {
  console.error("ERROR: Could not find SHINY_VARIANT_CHANCE or SHINY_EPIC_CHANCE to patch.");
  console.error("The upstream source may have changed. Check rates.ts manually.");
  process.exit(1);
}

// SHINY_VARIANT_CHANCE: threshold above which you get yellow.
// 5 -> yellow = rand 5-9 = 5/10 = 50% (was 60%)
src = src.replace(
  ORIGINAL_VARIANT,
  "export const SHINY_VARIANT_CHANCE = 5; // shiny-variant-rates: yellow 50% (was 60%)"
);

// SHINY_EPIC_CHANCE: threshold above which you get blue, below which you get red.
// 2 -> blue = rand 2-4 = 3/10 = 30% (unchanged), red = rand 0-1 = 2/10 = 20% (was 10%)
src = src.replace(
  ORIGINAL_EPIC,
  "export const SHINY_EPIC_CHANCE = 2; // shiny-variant-rates: red 20% (was 10%)"
);

fs.writeFileSync(TARGET, src, "utf8");
console.log("Patched shiny variant distribution: 50% yellow / 30% blue / 20% red in " + TARGET);
