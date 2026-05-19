#!/usr/bin/env node
/**
 * Patch: money-multiplier.js
 *
 * Multiplies all wave money rewards by 5×.
 *
 * Strategy:
 *   Wraps the return value of getWaveMoneyAmount() in battle-scene.ts so that
 *   the 5× multiplier is applied after the base formula and the floor-rounding.
 *   This means all money sources that call getWaveMoneyAmount() are boosted,
 *   including trainer battles and wild encounters.
 *
 * Targets: pokerogue-src/src/battle-scene.ts
 */

const fs = require("fs");
const path = require("path");

const TARGET = path.join("pokerogue-src", "src", "battle-scene.ts");

if (!fs.existsSync(TARGET)) {
  console.error(`ERROR: Could not find target file: ${TARGET}`);
  process.exit(1);
}

let src = fs.readFileSync(TARGET, "utf8").replace(/\r\n/g, "\n");

if (src.includes("money-multiplier")) {
  console.log("Money multiplier patch already applied, skipping.");
  process.exit(0);
}

const ORIGINAL = `  getWaveMoneyAmount(moneyMultiplier: number): number {
    const waveIndex = this.currentBattle.waveIndex;
    const waveSetIndex = Math.ceil(waveIndex / 10) - 1;
    const moneyValue =
      Math.pow((waveSetIndex + 1 + (0.75 + (((waveIndex - 1) % 10) + 1) / 10)) * 100, 1 + 0.005 * waveSetIndex)
      * moneyMultiplier;
    return Math.floor(moneyValue / 10) * 10;
  }`;

const REPLACEMENT = `  getWaveMoneyAmount(moneyMultiplier: number): number {
    const waveIndex = this.currentBattle.waveIndex;
    const waveSetIndex = Math.ceil(waveIndex / 10) - 1;
    const moneyValue =
      Math.pow((waveSetIndex + 1 + (0.75 + (((waveIndex - 1) % 10) + 1) / 10)) * 100, 1 + 0.005 * waveSetIndex)
      * moneyMultiplier;
    // money-multiplier: 5× boost for offline play
    return Math.floor(moneyValue / 10) * 10 * 5;
  }`;

if (!src.includes(ORIGINAL)) {
  console.error("ERROR: Could not find getWaveMoneyAmount function body to patch.");
  console.error("The upstream source may have changed. Check battle-scene.ts manually.");
  process.exit(1);
}

src = src.replace(ORIGINAL, REPLACEMENT);

fs.writeFileSync(TARGET, src, "utf8");
console.log(`Patched getWaveMoneyAmount with 5× multiplier in ${TARGET}`);
