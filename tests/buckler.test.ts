import test from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/game/combat/engine";
import { item } from "../src/game/equipment/catalog";
import {
  beginClash,
  prepareClash,
  resolveClash,
  validateClash,
  publicClash,
} from "../src/game/combat/reaction-engine";
import {
  itemManeuvers,
  reactionManeuvers,
  usedCells,
} from "../src/game/combat/reaction-rules";
import { previewClashDamage } from "../src/game/combat/clash-damage";
const p = (id: string, x = 0, y = 0) => ({ id, x, y, rotation: 0 });
function fixture() {
  const g = beginClash(
    createGame("Баклер", () => 0.5),
    () => 0.5,
  );
  g.player.gear.shield = "buckler";
  g.enemy.gear.weapon = "dagger";
  Object.assign(g.clashPlan!, {
    stage: "reaction",
    preparer: "enemy",
    reactor: "player",
    blocked: [1, 3, 4, 5, 7],
    special: undefined,
    playerBudget: 4,
    enemyBudget: 5,
    playerPlaced: [p("guard"), p("guard-2", 2, 2)],
    enemyPlaced: [p("strike-1"), p("strike-2", 2, 2)],
    playerModifiers: {},
    enemyModifiers: {},
  });
  return g;
}
test("buckler lists two independent one-cell guards in combat and its item card", () => {
  const g = fixture();
  for (const moves of [
    reactionManeuvers(g.player),
    itemManeuvers(item("buckler"), g.player),
  ]) {
    const guards = moves.filter(
      (m) => m.action === "block" && m.id !== "fortify",
    );
    assert.deepEqual(
      guards.map((m) => m.id),
      ["guard", "guard-2"],
    );
    for (const m of guards) {
      assert.deepEqual(m.shape, [[0, 0]]);
      assert.equal(m.shieldId, "buckler");
    }
    assert.deepEqual(moves.find((m) => m.id === "fortify")!.shape, [
      [0, 0],
      [1, 0],
    ]);
  }
  g.player.gear.shield = "kite-shield";
  assert.equal(
    reactionManeuvers(g.player).some((m) => m.id === "guard-2"),
    false,
  );
  assert.equal(
    reactionManeuvers(g.player).find((m) => m.id === "guard")!.shape.length,
    2,
  );
});
test("separated buckler guards fit isolated cells and both block matching attacks", () => {
  const g = fixture(),
    placed = g.clashPlan!.playerPlaced;
  assert.doesNotThrow(() => validateClash(g, "player", placed, {}));
  assert.equal(usedCells(g.player, placed, {}), 2);
  assert.throws(() =>
    validateClash(g, "player", [p("guard"), p("guard", 2, 2)], {}),
  );
  assert.equal(previewClashDamage(publicClash(g), placed)!.playerDamage, 0);
  const result = resolveClash(g, () => 0.5).log[0].clash!;
  assert.equal(result.playerDamage, 0);
  assert.equal(result.enemyPoiseLoss, 0);
  g.clashPlan!.enemyPlaced = [p("rest", 2)];
  assert.equal(resolveClash(g, () => 0.5).log[0].clash!.enemyPoiseLoss, 2);
});
test("legacy committed fields keep their two-cell guard, then upgrade both fighters next round", () => {
  const g = fixture();
  delete g.player.splitBuckler;
  delete g.enemy.splitBuckler;
  Object.assign(g.clashPlan!, {
    blocked: [],
    playerPlaced: [p("guard")],
    enemyPlaced: [p("rest", 2, 2)],
  });
  const before = structuredClone(g.clashPlan),
    migrated = prepareClash(g, () => {
      throw Error("reroll");
    });
  assert.deepEqual(migrated.clashPlan, before);
  assert.equal(
    reactionManeuvers(migrated.player).find((m) => m.id === "guard")!.shape
      .length,
    2,
  );
  const next = resolveClash(migrated, () => 0.5);
  assert.equal(next.player.splitBuckler, true);
  assert.equal(next.enemy.splitBuckler, true);
  assert.equal(
    reactionManeuvers(next.player).find((m) => m.id === "guard")!.shape.length,
    1,
  );
});

test("buckler fortify fits a two-cell corridor in either orientation and blocks both attacks", () => {
  for (const rotation of [0, 1]) {
    const g = fixture(),
      placed = [{ ...p("fortify"), rotation }],
      second = rotation === 0 ? 1 : 3;
    Object.assign(g.clashPlan!, {
      blocked: Array.from({ length: 9 }, (_, i) => i).filter(
        (i) => i !== 0 && i !== second,
      ),
      playerBudget: 2,
      playerPlaced: placed,
      enemyPlaced: [
        p("strike-1"),
        p("strike-2", rotation === 0 ? 1 : 0, rotation === 0 ? 0 : 1),
      ],
    });
    assert.doesNotThrow(() => validateClash(g, "player", placed, {}));
    assert.equal(usedCells(g.player, placed, {}), 2);
    assert.equal(previewClashDamage(publicClash(g), placed)!.playerDamage, 0);
    const next = resolveClash(g, () => 0.5);
    assert.equal(next.log[0].clash!.playerDamage, 0);
    assert.equal(next.player.cooldowns?.fortify, 1);
  }
});
test("other shields retain a square four-cell fortify", () => {
  const g = fixture();
  for (const shield of ["kite-shield", "mirror-shield"]) {
    g.player.gear.shield = shield;
    for (const moves of [
      reactionManeuvers(g.player),
      itemManeuvers(item(shield), g.player),
    ]) {
      assert.deepEqual(moves.find((m) => m.id === "fortify")!.shape, [
        [0, 0],
        [1, 0],
        [0, 1],
        [1, 1],
      ]);
    }
  }
});
