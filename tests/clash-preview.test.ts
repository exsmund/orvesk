import test from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/game/combat/engine";
import {
  beginClash,
  publicClash,
  resolveClash,
} from "../src/game/combat/reaction-engine";
import { previewClashDamage } from "../src/game/combat/clash-damage";
import { reactionManeuvers } from "../src/game/combat/reaction-rules";
import { possiblePlacements, placementCells } from "../src/game/combat/board";
import type { Placement } from "../src/game/types";
const p = (id: string, x = 0, y = 0): Placement => ({ id, x, y, rotation: 0 });
const rng =
  (seed = 1) =>
  () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
function fixture() {
  const g = beginClash(createGame("Прогноз", rng()), rng());
  g.player.gear.weapon = null;
  g.player.gear.shield = null;
  g.player.gear.body = "rags";
  g.enemy.gear = { ...g.player.gear, weapon: "axe", body: null };
  g.enemy.stats.strength = 3;
  // Legacy committed fields retain their original uniform figures and have no terrain bonus.
  g.player.tactical = false;
  g.enemy.tactical = false;
  delete g.enemy.archetype;
  delete g.clashPlan!.special;
  Object.assign(g.clashPlan!, {
    stage: "reaction",
    preparer: "enemy",
    reactor: "player",
    blocked: [],
    enemyPlaced: [p("heavy")],
    enemyModifiers: {},
    playerPlaced: [],
    playerModifiers: {},
    playerBudget: 4,
    enemyBudget: 5,
  });
  return g;
}
test("revealed enemy damage accounts for armor once per figure, block coverage and removing a draft", () => {
  const game = publicClash(fixture()),
    before = structuredClone(game);
  const empty = previewClashDamage(game, [])!;
  assert.equal(empty.playerDamage, 8);
  assert.equal(empty.enemyDamage, 0);
  assert.deepEqual(
    empty.cells.filter((c) => c.playerDamage).map((c) => c.playerDamage),
    [2.7, 2.7, 2.6],
  );
  const guarded = previewClashDamage(game, [p("guard")])!;
  assert.equal(guarded.playerDamage, 2);
  assert.equal(guarded.cells[0].playerDamage, 0);
  assert.equal(guarded.cells[1].playerDamage, 0);
  assert.equal(guarded.cells[4].playerDamage, 2);
  const clash = previewClashDamage(game, [p("strike-1")])!;
  assert.equal(clash.playerDamage, 6.5);
  assert.equal(clash.enemyDamage, 0.5);
  assert.deepEqual(previewClashDamage(game, []), empty);
  assert.deepEqual(game, before);
});
test("preview respects compressed figures, resistances, fire penetration and lethal caps", () => {
  const g = fixture();
  g.player.gear.weapon = "ember-sword";
  g.player.stats.intelligence = 6;
  g.player.gear.amulet = "fold-amulet";
  g.player.gear.ring = "unlock-ring";
  g.enemy.gear.weapon = null;
  g.enemy.gear.body = "ash-mantle";
  g.enemy.hp = 0.7;
  g.player.hp = 0.4;
  g.clashPlan!.blocked = [0];
  g.clashPlan!.playerPlaced = [p("heavy")];
  g.clashPlan!.playerModifiers = { compressed: "heavy", unlocked: 0 };
  g.clashPlan!.enemyPlaced = [p("strike-1")];
  const forecast = previewClashDamage(
    publicClash(g),
    g.clashPlan!.playerPlaced,
    g.clashPlan!.playerModifiers,
  )!;
  const actual = resolveClash(g, () => 0.9).log[0].clash!;
  assert.equal(forecast.enemyDamage, 0.7);
  assert.equal(forecast.playerDamage, 0.4);
  assert.deepEqual(
    forecast.cells,
    actual.cells.map(({ index, playerDamage, enemyDamage }) => ({
      index,
      playerDamage,
      enemyDamage,
    })),
  );
  g.enemy.hp = 30;
  assert.equal(
    previewClashDamage(
      publicClash(g),
      g.clashPlan!.playerPlaced,
      g.clashPlan!.playerModifiers,
    )!.enemyDamage,
    4,
  );
  g.player.gear.weapon = "ephemeral-sword";
  g.player.stats.intelligence = 3;
  g.enemy.gear.body = "robe";
  assert.equal(
    previewClashDamage(
      publicClash(g),
      g.clashPlan!.playerPlaced,
      g.clashPlan!.playerModifiers,
    )!.enemyDamage,
    2.1,
  );
});
test("hidden enemy plans never become a forecast during preparation", () => {
  const g = fixture();
  g.clashPlan!.preparer = "player";
  g.clashPlan!.reactor = "enemy";
  g.clashPlan!.stage = "preparation";
  const game = publicClash(g);
  assert.equal(game.clash!.enemyPlaced, undefined);
  assert.equal(previewClashDamage(game, [p("strike-1")]), null);
  // Even stale accidentally supplied coordinates must not expose a hidden plan.
  game.clash!.enemyPlaced = [p("heavy")];
  assert.equal(previewClashDamage(game, []), null);
});
test("public reaction previews match actual per-cell health loss across seeded battles", () => {
  for (let seed = 1; seed <= 50; seed++) {
    const random = rng(seed),
      base = createGame("Прогноз", random);
    base.player.stats.reaction = 10;
    const g = beginClash(base, random),
      plan = g.clashPlan!,
      placed: Placement[] = [],
      used: number[] = [];
    assert.equal(plan.preparer, "enemy");
    for (const m of reactionManeuvers(g.player)) {
      if (
        m.action === "equip" ||
        placed.length >= 4 ||
        used.length + m.shape.length > plan.playerBudget
      )
        continue;
      const position = possiblePlacements(
        m,
        plan.blocked.filter((n) => n !== plan.enemyModifiers.unlocked),
        used,
      )[0];
      if (position) {
        placed.push(position);
        used.push(...placementCells(m, position, {}));
      }
    }
    const forecast = previewClashDamage(publicClash(g), placed)!;
    plan.playerPlaced = placed;
    const actual = resolveClash(g, random).log[0].clash!;
    assert.deepEqual(
      forecast.cells,
      actual.cells.map(({ index, playerDamage, enemyDamage }) => ({
        index,
        playerDamage,
        enemyDamage,
      })),
      `seed ${seed}`,
    );
    assert.equal(forecast.playerDamage, actual.playerDamage);
    assert.equal(forecast.enemyDamage, actual.enemyDamage);
  }
});
