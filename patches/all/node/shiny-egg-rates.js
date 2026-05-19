#!/usr/bin/env node
/**
 * Patch: shiny-egg-rates.js
 *
 * Sets GACHA_SHINY_UP_SHINY_RATE to 32 (1/32 chance).
 * Default was 64 (1/64). This doubles shiny odds for Shiny Up gacha eggs.
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

if (src.includes("shiny-egg-rates")) {
  console.log("Shiny egg rate patch already applied, skipping.");
  process.exit(0);
}

const ORIGINAL = "export const GACHA_SHINY_UP_SHINY_RATE = 64;";
const REPLACEMENT = "export const GACHA_SHINY_UP_SHINY_RATE = 32; // shiny-egg-rates: 1/32 (was 1/64)";

if (!src.includes(ORIGINAL)) {
  console.error("ERROR: Could not find GACHA_SHINY_UP_SHINY_RATE to patch. Check rates.ts manually.");
  process.exit(1);
}

src = src.replace(ORIGINAL, REPLACEMENT);

fs.writeFileSync(TARGET, src, "utf8");
console.log("Patched GACHA_SHINY_UP_SHINY_RATE to 32 (1/32) in " + TARGET);
