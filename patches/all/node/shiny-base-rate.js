#!/usr/bin/env node
/**
 * Patch: shiny-base-rate.js
 *
 * Sets the base wild encounter shiny chance to 1/256.
 *
 * How the math works:
 *   BASE_SHINY_CHANCE is defined as X/65536.
 *   Default: 64/65536  → ~1/1024
 *   New:    256/65536  → exactly 1/256
 *
 * Targets: pokerogue-src/src/data/balance/rates.ts
 */

const fs = require("fs");
const path = require("path");

const TARGET = path.join("pokerogue-src", "src", "data", "balance", "rates.ts");

if (!fs.existsSync(TARGET)) {
  console.error(`ERROR: Could not find target file: ${TARGET}`);
  process.exit(1);
}

let src = fs.readFileSync(TARGET, "utf8").replace(/\r\n/g, "\n");

if (src.includes("shiny-base-rate")) {
  console.log("Shiny base rate patch already applied, skipping.");
  process.exit(0);
}

const ORIGINAL = `/** \`64/65536 -> 1/1024\` */
export const BASE_SHINY_CHANCE = 64;`;

const REPLACEMENT = `/** \`256/65536 -> 1/256\` — shiny-base-rate: boosted from default 1/1024 */
export const BASE_SHINY_CHANCE = 256;`;

if (!src.includes(ORIGINAL)) {
  console.error("ERROR: Could not find BASE_SHINY_CHANCE definition to patch.");
  console.error("The upstream source may have changed. Check rates.ts manually.");
  process.exit(1);
}

src = src.replace(ORIGINAL, REPLACEMENT);

fs.writeFileSync(TARGET, src, "utf8");
console.log(`Patched BASE_SHINY_CHANCE to 256 (1/256) in ${TARGET}`);
