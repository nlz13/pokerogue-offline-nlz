#!/usr/bin/env node
/**
 * Patch: pokeball-catch-rates.js
 *
 * Increases the catch multiplier for every Poké Ball type by roughly 2–3×.
 *
 * New multipliers:
 *   Poké Ball  : 1   → 2
 *   Great Ball : 1.5 → 3
 *   Ultra Ball : 2   → 5
 *   Rogue Ball : 3   → 8
 *   Master Ball: -1  → -1 (guaranteed — unchanged)
 *   Luxury Ball: 1   → 2
 *
 * Targets: pokerogue-src/src/data/pokeball.ts
 */

const fs = require("fs");
const path = require("path");

const TARGET = path.join("pokerogue-src", "src", "data", "pokeball.ts");

if (!fs.existsSync(TARGET)) {
  console.error(`ERROR: Could not find target file: ${TARGET}`);
  process.exit(1);
}

let src = fs.readFileSync(TARGET, "utf8").replace(/\r\n/g, "\n");

if (src.includes("pokeball-catch-rates")) {
  console.log("Catch rate patch already applied, skipping.");
  process.exit(0);
}

const ORIGINAL = `export function getPokeballCatchMultiplier(type: PokeballType): number {
  switch (type) {
    case PokeballType.POKEBALL:
      return 1;
    case PokeballType.GREAT_BALL:
      return 1.5;
    case PokeballType.ULTRA_BALL:
      return 2;
    case PokeballType.ROGUE_BALL:
      return 3;
    case PokeballType.MASTER_BALL:
      return -1;
    case PokeballType.LUXURY_BALL:
      return 1;
  }
}`;

const REPLACEMENT = `export function getPokeballCatchMultiplier(type: PokeballType): number {
  // pokeball-catch-rates: multipliers boosted ~2–3× for offline fun
  switch (type) {
    case PokeballType.POKEBALL:
      return 2;
    case PokeballType.GREAT_BALL:
      return 3;
    case PokeballType.ULTRA_BALL:
      return 5;
    case PokeballType.ROGUE_BALL:
      return 8;
    case PokeballType.MASTER_BALL:
      return -1; // guaranteed — unchanged
    case PokeballType.LUXURY_BALL:
      return 2;
  }
}`;

if (!src.includes(ORIGINAL)) {
  console.error("ERROR: Could not find the getPokeballCatchMultiplier function body to patch.");
  console.error("The upstream source may have changed. Check pokeball.ts manually.");
  process.exit(1);
}

src = src.replace(ORIGINAL, REPLACEMENT);

fs.writeFileSync(TARGET, src, "utf8");
console.log(`Patched catch multipliers in ${TARGET}`);
