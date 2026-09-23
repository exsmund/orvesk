import test from "node:test";
import assert from "node:assert/strict";
import {
  FEATURE_FLAGS,
  isCombatActionEnabled,
} from "../src/game/config/features";
import { createGame } from "../src/game/combat/engine";
import {
  beginClash,
  prepareClash,
  validateClash,
} from "../src/game/combat/reaction-engine";
import { reactionManeuvers, isStrike } from "../src/game/combat/reaction-rules";
import { figureKey } from "../src/game/combat/battle-modes";

const random = () => 0.5;
function fixture() {
  const g = beginClash(createGame("Флаг", random), random);
  g.clashPlan!.blocked = [];
  g.ground = ["club"];
  return g;
}
test("equipment swap is disabled by default and server rejects it for either fighter", () => {
  assert.equal(FEATURE_FLAGS.combatEquipmentSwap, false);
  assert.equal(isCombatActionEnabled("equip"), false);
  assert.equal(isCombatActionEnabled("attack"), true);
  const g = fixture();
  for (const side of ["player", "enemy"] as const) {
    assert.ok(
      reactionManeuvers(g[side]).some((m) => m.action === "equip"),
      "definition retained for replays and re-enabling",
    );
    assert.throws(
      () =>
        validateClash(
          g,
          side,
          [{ id: "equip", x: 0, y: 0, rotation: 0, itemId: "club" }],
          {},
        ),
      /временно отключена/,
    );
  }
});
test("restoring an old pickup keeps the fight playable without changing equipment or input save", () => {
  const g = fixture();
  g.clashPlan!.enemyPlaced = [
    { id: "equip", x: 0, y: 0, rotation: 0, itemId: "club" },
  ];
  g.clashPlan!.enemyModifiers = { compressed: "equip" };
  const snapshot = structuredClone(g),
    restored = prepareClash(g, random);
  assert.deepEqual(g, snapshot);
  assert.ok(restored.clashPlan!.enemyPlaced.every((p) => p.id !== "equip"));
  assert.equal(restored.clashPlan!.enemyModifiers.compressed, undefined);
  assert.deepEqual(restored.enemy.gear, g.enemy.gear);
  assert.deepEqual(restored.ground, g.ground);
});
test("disabled pickup cannot keep exhausted single-chance battles running", () => {
  const g = fixture();
  g.journey!.battleMode = "expendable";
  for (const side of ["player", "enemy"] as const) {
    g[side].hp = 10;
    g[side].spentFigures = reactionManeuvers(g[side])
      .filter(isStrike)
      .map(figureKey);
  }
  assert.equal(prepareClash(g, random).phase, "draw");
});
test("enabling the flag restores the same validated pickup action", () => {
  const previous = FEATURE_FLAGS.combatEquipmentSwap;
  try {
    FEATURE_FLAGS.combatEquipmentSwap = true;
    assert.equal(isCombatActionEnabled("equip"), true);
    const g = fixture();
    g.clashPlan!.playerBudget = 9;
    assert.doesNotThrow(() =>
      validateClash(
        g,
        "player",
        [{ id: "equip", x: 0, y: 0, rotation: 0, itemId: "club" }],
        {},
      ),
    );
  } finally {
    FEATURE_FLAGS.combatEquipmentSwap = previous;
  }
});
