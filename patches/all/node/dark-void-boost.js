#!/usr/bin/env node
/**
 * Patch: dark-void-boost.js
 *
 * Boosts Dark Void for offline fun:
 *   1. Sets priority to 7 (acts before almost everything)
 *   2. Injects a ReduceToOneHpAttr class BEFORE initMoves() (not inside the
 *      .push() call — class declarations inside function args are invalid TS)
 *      and chains .attr(ReduceToOneHpAttr) on Dark Void so targets drop to 1 HP.
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

if (src.includes("dark-void-boost")) {
  console.log("Dark Void boost already present, skipping.");
  process.exit(0);
}

// ── Patch 1: inject ReduceToOneHpAttr class BEFORE initMoves() ───────────────
// The move definitions live inside initMoves() -> (allMoves as Move[]).push(...)
// Class declarations cannot appear inside an expression, so we inject before
// the function itself where it's valid module-level TypeScript.

const FUNC_ANCHOR = `export function initMoves() {`;

if (!src.includes(FUNC_ANCHOR)) {
  console.error("ERROR: Could not find initMoves() declaration in move.ts.");
  process.exit(1);
}

const NEW_CLASS =
`// dark-void-boost: reduces all affected targets to 1 HP
class ReduceToOneHpAttr extends MoveEffectAttr {
  constructor() {
    super(false);
  }
  override apply(_user: Pokemon, target: Pokemon, _move: Move, _args: any[]): boolean {
    if (target.hp > 1) {
      target.hp = 1;
    }
    return true;
  }
}

`;

src = src.replace(FUNC_ANCHOR, NEW_CLASS + FUNC_ANCHOR);

// ── Patch 2: set priority to 7 and add ReduceToOneHpAttr to Dark Void ────────

const DARK_VOID_OLD = `    new StatusMove(MoveId.DARK_VOID, PokemonType.DARK, 80, 10, -1, 0, 4) // Accuracy from Generations 4-6
      .attr(StatusEffectAttr, StatusEffect.SLEEP)
      .target(MoveTarget.ALL_NEAR_ENEMIES)
      .reflectable()`;

const DARK_VOID_NEW = `    new StatusMove(MoveId.DARK_VOID, PokemonType.DARK, 80, 10, -1, 7, 4) // dark-void-boost: priority 7, reduces HP to 1
      .attr(StatusEffectAttr, StatusEffect.SLEEP)
      .attr(ReduceToOneHpAttr)
      .target(MoveTarget.ALL_NEAR_ENEMIES)
      .reflectable()`;

if (!src.includes(DARK_VOID_OLD)) {
  console.error("ERROR: Could not find original Dark Void definition to patch.");
  process.exit(1);
}

src = src.replace(DARK_VOID_OLD, DARK_VOID_NEW);

fs.writeFileSync(TARGET, src, "utf8");
console.log("Patched Dark Void (priority 7, HP to 1) in " + TARGET);
console.log("Dark Void boost applied successfully.");
