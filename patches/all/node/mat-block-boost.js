#!/usr/bin/env node
/**
 * Patch: mat-block-boost.js
 *
 * Boosts Mat Block for offline fun:
 *   1. Sets priority to 7 (acts before almost everything)
 *   2. Removes the FirstMoveCondition so it works on any turn, not just turn 1
 *
 * Original: new StatusMove(MoveId.MAT_BLOCK, ..., 0, 6)
 *           .condition(new FirstMoveCondition(), 3)
 *
 * Targets: pokerogue-src/src/data/moves/move.ts
 */

const fs = require("fs");
const path = require("path");

const TARGET = path.join("pokerogue-src", "src", "data", "moves", "move.ts");

if (!fs.existsSync(TARGET)) {
  console.error(`ERROR: Could not find target file: ${TARGET}`);
  process.exit(1);
}

let src = fs.readFileSync(TARGET, "utf8");

if (src.includes("mat-block-boost")) {
  console.log("Mat Block boost already present, skipping.");
  process.exit(0);
}

const OLD = `    new StatusMove(MoveId.MAT_BLOCK, PokemonType.FIGHTING, -1, 10, -1, 0, 6)
      .target(MoveTarget.USER_SIDE)
      .attr(AddArenaTagAttr, ArenaTagType.MAT_BLOCK, 1, true, true)
      .condition(new FirstMoveCondition(), 3)
      .condition(failIfLastCondition, 3)`;

const NEW = `    new StatusMove(MoveId.MAT_BLOCK, PokemonType.FIGHTING, -1, 10, -1, 7, 6) // mat-block-boost: priority 7, any turn
      .target(MoveTarget.USER_SIDE)
      .attr(AddArenaTagAttr, ArenaTagType.MAT_BLOCK, 1, true, true)
      .condition(failIfLastCondition, 3)`;

if (!src.includes(OLD)) {
  console.error("ERROR: Could not find Mat Block definition to patch.");
  console.error("The upstream may have changed. Check move.ts manually.");
  process.exit(1);
}

src = src.replace(OLD, NEW);

fs.writeFileSync(TARGET, src, "utf8");
console.log("Patched Mat Block (priority 7, any turn) in " + TARGET);
console.log("Mat Block boost applied successfully.");
