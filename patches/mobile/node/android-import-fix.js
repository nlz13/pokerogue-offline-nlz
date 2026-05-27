#!/usr/bin/env node
/**
 * Patch: android-import-overlay.js
 *
 * Extends the iOS import overlay to also show on Android.
 * The upstream overlay is gated on isIos(); Android falls through to
 * saveFile.click() directly which doesn't work reliably on Android.
 *
 * Adds a local isNative() helper (Capacitor.isNativePlatform()) and replaces
 * the two isIos() checks so the overlay appears on both platforms.
 *
 * NOTE: upstream uses isIos() with lowercase 's' — this script matches that.
 *
 * Targets: pokerogue-src/src/system/game-data.ts
 */

const fs = require("fs");
const path = require("path");

const TARGET = path.join("pokerogue-src", "src", "system", "game-data.ts");

if (!fs.existsSync(TARGET)) {
  console.error(`ERROR: Could not find target file: ${TARGET}`);
  process.exit(1);
}

let src = fs.readFileSync(TARGET, "utf8");

if (src.includes("android-import-overlay")) {
  console.log("Android import overlay already present, skipping.");
  process.exit(0);
}

// Add isNative helper after the isIos import (upstream uses lowercase 's')
const IMPORT_OLD = `import { isIos } from "#app/touch-controls";`;
const IMPORT_NEW = `import { isIos } from "#app/touch-controls";
// android-import-overlay: show upload overlay on all Capacitor platforms
const isNative = () => !!(window as any).Capacitor?.isNativePlatform?.();`;

if (!src.includes(IMPORT_OLD)) {
  console.error("ERROR: Could not find isIos import in game-data.ts.");
  process.exit(1);
}
src = src.replace(IMPORT_OLD, IMPORT_NEW);

// Replace the isIos() condition that gates the overlay
const CONDITION_OLD = `// iOS requires user interaction with a visible element to trigger file input
    if (isIos()) {`;
const CONDITION_NEW = `// iOS and Android require user interaction with a visible element to trigger file input
    if (isNative()) {`;

if (!src.includes(CONDITION_OLD)) {
  console.error("ERROR: Could not find isIos() overlay condition in game-data.ts.");
  process.exit(1);
}
src = src.replace(CONDITION_OLD, CONDITION_NEW);

// Replace the auto-click guard
const CLICK_OLD = `if (!isIos()) {
      saveFile.click();
    }`;
const CLICK_NEW = `if (!isNative()) {
      saveFile.click();
    }`;

if (!src.includes(CLICK_OLD)) {
  console.error("ERROR: Could not find auto-click guard in game-data.ts.");
  process.exit(1);
}
src = src.replace(CLICK_OLD, CLICK_NEW);

fs.writeFileSync(TARGET, src, "utf8");
console.log(`Patched import overlay in ${TARGET}`);
console.log("Android import overlay applied successfully.");
