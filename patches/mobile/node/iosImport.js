#!/usr/bin/env node
/**
 * Patch: iosImport.js
 *
 * Fixes save-data import on iOS (PKR #7222).
 *
 * Problem:
 *   iOS WKWebView blocks auto-triggering a hidden <input type="file">. The game
 *   calls saveFile.click() on a hidden element, which is silently ignored on iOS.
 *
 * Fix:
 *   1. Add isIOS() helper to touch-controls.ts
 *   2. Import isIOS into game-data.ts
 *   3. On iOS: show a visible overlay + "Select File" button that triggers the
 *      input on user tap (allowed by WKWebView's user-gesture rule).
 *   4. On non-iOS: keep the existing hidden-input + auto-click behaviour.
 *   5. Append the file input to document.body for iOS compatibility.
 *
 * Replaces iosImport.patch (git diff format) which broke when upstream changed
 * surrounding context lines. This script uses string/regex matching only.
 *
 * Targets:
 *   pokerogue-src/src/touch-controls.ts
 *   pokerogue-src/src/system/game-data.ts
 */

const fs   = require("fs");
const path = require("path");

const TOUCH_TARGET     = path.join("pokerogue-src", "src", "touch-controls.ts");
const GAME_DATA_TARGET = path.join("pokerogue-src", "src", "system", "game-data.ts");

for (const f of [TOUCH_TARGET, GAME_DATA_TARGET]) {
  if (!fs.existsSync(f)) {
    console.error("ERROR: Could not find: " + f);
    process.exit(1);
  }
}

const gdRaw = fs.readFileSync(GAME_DATA_TARGET, "utf8");
if (gdRaw.includes("iosImport-patch")) {
  console.log("iosImport patch already applied, skipping.");
  process.exit(0);
}

// Step 1 -- Add isIOS() to touch-controls.ts
let touchSrc = fs.readFileSync(TOUCH_TARGET, "utf8").replace(/\r\n/g, "\n");

if (touchSrc.includes("export function isIOS")) {
  console.log("Step 1 skipped: isIOS() already present in touch-controls.ts");
} else {
  const IS_IOS_FN = `
/**
 * Detect if the current device is running iOS (iPhone, iPad, or iPod).
 * iPad on iOS 13+ reports itself as MacIntel with touch support, so we
 * check navigator.maxTouchPoints in addition to the UA string.
 * @returns true if the device is running iOS
 */
export function isIOS(): boolean {
  const ua = navigator.userAgent || navigator.vendor || (window as any)["opera"];
  const uaCheck   = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
  const iPadCheck = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return uaCheck || iPadCheck;
}
`;
  touchSrc = touchSrc.trimEnd() + "\n" + IS_IOS_FN;
  fs.writeFileSync(TOUCH_TARGET, touchSrc, "utf8");
  console.log("Step 1 applied: added isIOS() to touch-controls.ts");
}

// Steps 2-4 -- Patch game-data.ts
let src = fs.readFileSync(GAME_DATA_TARGET, "utf8").replace(/\r\n/g, "\n");
let patched = false;

// Step 2: Add isIOS import
const TOUCH_IMPORT_RE = /^(import \{[^}]*\} from "#app\/touch-controls";)/m;

if (!src.includes("isIOS")) {
  if (TOUCH_IMPORT_RE.test(src)) {
    src = src.replace(TOUCH_IMPORT_RE, (match) => match.replace(/\}/, ", isIOS }"));
    console.log("Step 2 applied: added isIOS to existing touch-controls import");
  } else {
    const OVERRIDES_IMPORT = /^(import Overrides from "#app\/overrides";)/m;
    if (OVERRIDES_IMPORT.test(src)) {
      src = src.replace(OVERRIDES_IMPORT, '$1\nimport { isIOS } from "#app/touch-controls";');
      console.log("Step 2 applied: inserted isIOS import after Overrides import");
    } else {
      console.warn("WARNING: Step 2 -- could not find a suitable import anchor in game-data.ts.");
    }
  }
  patched = true;
} else {
  console.log("Step 2 skipped: isIOS already referenced in game-data.ts");
}

// Step 3: Replace hidden-input section with iOS-conditional UI
const DISPLAY_NONE_RE = /([\t ]*)saveFile\.style\.display = "none";\n([\t ]*)saveFile\.addEventListener\("change", e => \{/;

if (DISPLAY_NONE_RE.test(src)) {
  src = src.replace(DISPLAY_NONE_RE, (_, ind, ind2) => [
    `${ind}// iosImport-patch: iOS WKWebView blocks auto-click on hidden inputs.`,
    `${ind}// Show a visible overlay button on iOS; keep the hidden path on other platforms.`,
    `${ind}if (isIOS()) {`,
    `${ind}  const uploadButton = document.createElement("button");`,
    `${ind}  uploadButton.id = "iosUploadButton";`,
    `${ind}  uploadButton.textContent = "Select File to Import";`,
    `${ind}  uploadButton.style.cssText = [`,
    `${ind}    "position:fixed", "top:50%", "left:50%",`,
    `${ind}    "transform:translate(-50%,-50%)",`,
    `${ind}    "padding:15px 30px", "font-size:18px",`,
    `${ind}    "font-family:Arial,sans-serif",`,
    `${ind}    "background-color:#4CAF50", "color:#fff",`,
    `${ind}    "border:none", "border-radius:8px",`,
    `${ind}    "cursor:pointer", "z-index:10000",`,
    `${ind}    "box-shadow:0 4px 6px rgba(0,0,0,0.3)",`,
    `${ind}  ].join(";");`,
    `${ind}  const overlay = document.createElement("div");`,
    `${ind}  overlay.id = "iosUploadOverlay";`,
    `${ind}  overlay.style.cssText = [`,
    `${ind}    "position:fixed", "top:0", "left:0",`,
    `${ind}    "width:100%", "height:100%",`,
    `${ind}    "background-color:rgba(0,0,0,0.7)", "z-index:9999",`,
    `${ind}  ].join(";");`,
    `${ind}  saveFile.style.display = "none";`,
    `${ind}  uploadButton.onclick = () => { saveFile.click(); };`,
    `${ind}  overlay.onclick = () => { overlay.remove(); uploadButton.remove(); saveFile.remove(); };`,
    `${ind}  document.body.appendChild(overlay);`,
    `${ind}  document.body.appendChild(uploadButton);`,
    `${ind}} else {`,
    `${ind}  saveFile.style.display = "none";`,
    `${ind}}`,
    `${ind2}saveFile.addEventListener("change", e => {`,
    `${ind2}  // iosImport-patch: clean up iOS overlay if present`,
    `${ind2}  const _iosOverlay = document.getElementById("iosUploadOverlay");`,
    `${ind2}  const _iosButton  = document.getElementById("iosUploadButton");`,
    `${ind2}  if (_iosOverlay) { _iosOverlay.remove(); }`,
    `${ind2}  if (_iosButton)  { _iosButton.remove(); }`,
  ].join("\n"));
  patched = true;
  console.log("Step 3 applied: iOS import overlay added around file input section");
} else {
  console.warn("WARNING: Step 3 -- could not find saveFile display/addEventListener pattern. Skipping (non-fatal).");
}

// Step 4: Wrap standalone saveFile.click() and append to body
const CLICK_RE = /(\}\);)\n([\t ]*)saveFile\.click\(\);/;

if (CLICK_RE.test(src)) {
  src = src.replace(CLICK_RE, (_, listenerClose, ind) => [
    listenerClose,
    `${ind}// iosImport-patch: only auto-click on non-iOS; append input for WKWebView`,
    `${ind}if (!isIOS()) {`,
    `${ind}  saveFile.click();`,
    `${ind}}`,
    `${ind}document.body.appendChild(saveFile);`,
  ].join("\n"));
  patched = true;
  console.log("Step 4 applied: wrapped saveFile.click() with isIOS() check and added body append");
} else {
  console.warn("WARNING: Step 4 -- could not find standalone saveFile.click() pattern. Skipping (non-fatal).");
}

if (patched) {
  fs.writeFileSync(GAME_DATA_TARGET, src, "utf8");
  console.log("iosImport patch applied to " + GAME_DATA_TARGET);
} else {
  console.log("No changes written to game-data.ts (all steps skipped or already patched).");
}
