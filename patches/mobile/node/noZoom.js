#!/usr/bin/env node
/**
 * Patch: noZoom.js
 *
 * Adds viewport flags to prevent double-tap zooming on mobile.
 *
 * Replaces noZoom.patch (git diff format, PKR #7223) which broke when upstream
 * changed the surrounding content of index.html. This node script uses simple
 * string matching and is immune to context-line shifts.
 *
 * Change:
 *   content="width=device-width, initial-scale=1.0, viewport-fit=cover"
 *   -> adds ", maximum-scale=1.0, user-scalable=no"
 *
 * Targets: pokerogue-src/index.html
 */

const fs = require("fs");
const path = require("path");

const TARGET = path.join("pokerogue-src", "index.html");

if (!fs.existsSync(TARGET)) {
  console.error("ERROR: Could not find target file: " + TARGET);
  process.exit(1);
}

let src = fs.readFileSync(TARGET, "utf8");

// Idempotency check
if (src.includes("maximum-scale=1.0") || src.includes("user-scalable=no")) {
  console.log("noZoom patch already applied, skipping.");
  process.exit(0);
}

// Match the viewport meta tag -- flexible about surrounding attributes
const VIEWPORT_RE = /(<meta\s+name="viewport"\s+content=")([^"]*)(")/ ;
const match = src.match(VIEWPORT_RE);

if (!match) {
  console.warn('WARNING: Could not find viewport <meta name="viewport"> tag in index.html.');
  console.warn("Upstream may have restructured the file. Skipping (non-fatal).");
  process.exit(0);
}

const [full, prefix, content, suffix] = match;

if (content.includes("maximum-scale")) {
  console.log("noZoom patch already present in content, skipping.");
  process.exit(0);
}

const patched = src.replace(
  full,
  prefix + content + ", maximum-scale=1.0, user-scalable=no" + suffix
);

if (patched === src) {
  console.error("ERROR: Replacement produced no change.");
  process.exit(1);
}

fs.writeFileSync(TARGET, patched, "utf8");
console.log("noZoom patch applied to " + TARGET);
