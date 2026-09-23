import test from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/game/combat/engine";
import {
  beginClash,
  publicClash,
  resolveClash,
} from "../src/game/combat/reaction-engine";
import {
  calculateClash,
  previewClashDamage,
} from "../src/game/combat/clash-damage";
import { reactionManeuvers } from "../src/game/combat/reaction-rules";
import { maxPoise } from "../src/game/combat/tactics";
import type { Placement, BoardModifiers, Side } from "../src/game/types";
const p = (id: string, x = 0, y = 0, rotation = 0): Placement => ({
  id,
  x,
  y,
  rotation,
});
function fixture() {
  const g = beginClash(
    createGame("Стойка", () => 0.5),
    () => 0.5,
  );
  for (const f of [g.player, g.enemy]) {
    f.stats = {
      strength: 4,
      agility: 2,
      endurance: 2,
      intelligence: 2,
      reaction: 1,
    };
    f.hp = 100;
    f.poise = 6;
    f.prone = false;
    f.tactical = true;
    f.splitBuckler = true;
    f.gear = { weapon: "hammer", shield: null, body: null, feet: null };
    delete f.archetype;
    f.cooldowns = {};
  }
  g.player.gear.weapon = "dagger";
  g.player.gear.shield = "buckler";
  Object.assign(g.clashPlan!, {
    stage: "reaction",
    preparer: "enemy",
    reactor: "player",
    blocked: [],
    special: undefined,
    playerBudget: 9,
    enemyBudget: 9,
    playerModifiers: {},
    enemyModifiers: {},
  });
  return g;
}
function calc(
  g: ReturnType<typeof fixture>,
  player: Placement[],
  enemy: Placement[],
  playerMod: BoardModifiers = {},
  enemyMod: BoardModifiers = {},
) {
  return calculateClash(
    g,
    { player, enemy },
    { player: playerMod, enemy: enemyMod },
    g.clashPlan!.special,
  );
}
test("hammer poise scales with full, partial, fully blocked and clashing hits", () => {
  const g = fixture(),
    hit = [p("strike-1")];
  assert.equal(calc(g, [], hit).sides.player.poiseLoss, 3);
  assert.equal(calc(g, [p("guard")], hit).sides.player.poiseLoss, 1.5);
  assert.equal(
    calc(g, [p("guard"), p("guard-2", 1)], hit).sides.player.poiseLoss,
    0,
  );
  assert.equal(
    calc(g, [p("strike-1"), p("strike-2", 1)], hit).sides.player.poiseLoss,
    1.5,
  );
  g.player.archetype = "ghost";
  assert.equal(
    calc(g, [p("strike-1"), p("strike-2", 1)], hit).sides.player.poiseLoss,
    2.3,
  );
  g.clashPlan!.special = { index: 0, kind: "surge" };
  assert.equal(
    calc(g, [], hit).sides.player.poiseLoss,
    3,
    "surge does not amplify poise",
  );
});
test("weighted crusher heavy, rotation and compression preserve the passed fraction", () => {
  const g = fixture();
  g.enemy.archetype = "crusher";
  assert.equal(calc(g, [], [p("heavy")]).sides.player.poiseLoss, 5);
  assert.equal(
    calc(g, [p("guard")], [p("heavy")]).sides.player.poiseLoss,
    2,
    "block 60% head",
  );
  assert.equal(
    calc(g, [p("guard", 1)], [p("heavy")]).sides.player.poiseLoss,
    4.3,
    "block light cell",
  );
  // Rotate the T: the original head moves to (1,0).
  assert.equal(
    calc(g, [p("guard", 1)], [p("heavy", 0, 0, 1)]).sides.player.poiseLoss,
    2,
  );
  assert.equal(
    calc(g, [], [p("heavy")], {}, { compressed: "heavy" }).sides.player
      .poiseLoss,
    5,
  );
  assert.equal(
    calc(g, [p("strike-1")], [p("heavy")], {}, { compressed: "heavy" }).sides
      .player.poiseLoss,
    2.5,
  );
  assert.equal(
    calc(g, [p("guard")], [p("heavy")], {}, { compressed: "heavy" }).sides
      .player.poiseLoss,
    0,
  );
});
test("armor that absorbs health damage also prevents poise damage", () => {
  const g = fixture();
  g.enemy.stats.strength = 1;
  g.player.gear.body = "plate";
  g.player.gear.feet = "greaves";
  const result = calc(g, [p("guard")], [p("strike-1")]);
  assert.equal(result.playerDamage, 0);
  assert.equal(result.sides.player.poiseLoss, 0);
});
test("kick and magic scale too; fixed guard pressure remains once per figure", () => {
  const g = fixture();
  assert.equal(calc(g, [p("guard")], [p("kick")]).sides.player.poiseLoss, 1);
  g.enemy.gear.weapon = "ephemeral-sword";
  assert.equal(
    calc(g, [p("strike-1"), p("strike-2", 1)], [p("strike-1")]).sides.player
      .poiseLoss,
    0.5,
  );
  assert.equal(calc(g, [], [p("guard")]).sides.player.poiseLoss, 1);
});
test("standing breaks repeated hammer + kick + guard knockdowns symmetrically without preventing health damage", () => {
  for (const side of ["player", "enemy"] as const) {
    const g = fixture(),
      other: Side = side === "player" ? "enemy" : "player";
    g[side].prone = true;
    g[side].poise = 0;
    g[other].gear = { weapon: "hammer", shield: null, body: null, feet: null };
    const moves = {
      [side]: [p("stand", 2, 2)],
      [other]: [p("strike-1"), p("kick", 0, 1), p("guard", 0, 2)],
    } as Record<Side, Placement[]>;
    for (let round = 0; round < 2; round++) {
      const result = calculateClash(g, moves, { player: {}, enemy: {} }),
        s = result.sides[side];
      assert.equal(s.poiseLoss, 0);
      assert.equal(s.poiseAfter, maxPoise(g[side]));
      assert.equal(s.prone, false);
      assert.ok(s.damage > 0);
      assert.ok(s.reasons.some((r) => r.includes("защита")));
    }
    const exposed = calculateClash(
      g,
      { ...moves, [side]: [] },
      { player: {}, enemy: {} },
    ).sides[side];
    assert.equal(
      exposed.poiseLoss,
      6,
      "being prone without placing stand grants no protection",
    );
    g[side].prone = false;
    g[side].poise = 6;
    const next = calculateClash(
      g,
      { ...moves, [side]: [p("rest", 2, 2)] },
      { player: {}, enemy: {} },
    ).sides[side];
    assert.equal(
      next.poiseLoss,
      6,
      "protection does not linger after recovery",
    );
    assert.equal(next.prone, true);
  }
});
test("standing also prevents the axe and kick combo bonus without claiming that bonus in the log", () => {
  const g = fixture();
  g.player.prone = true;
  g.player.poise = 0;
  g.enemy.gear.weapon = "axe";
  const r = calc(g, [p("stand", 2, 2)], [p("strike-1"), p("kick", 0, 1)]);
  assert.equal(r.sides.player.poiseLoss, 0);
  assert.equal(r.sides.player.poiseAfter, 6);
  assert.ok(r.playerDamage > 0);
  assert.equal(
    r.sides.enemy.combos.filter((c) => c.kind === "pressure").length,
    0,
  );
});
test("fractional poise and protected stand agree between public forecast, server and saved summary", () => {
  for (const standing of [false, true]) {
    const g = fixture();
    g.player.prone = standing;
    g.player.poise = standing ? 0 : 6;
    const a = standing ? [p("stand", 2, 2)] : [p("guard")],
      b = [p("strike-1"), p("kick", 0, 1), p("guard", 0, 2)];
    Object.assign(g.clashPlan!, { playerPlaced: a, enemyPlaced: b });
    const before = structuredClone(g),
      forecast = previewClashDamage(publicClash(g), a)!;
    assert.deepEqual(g, before);
    const actual = resolveClash(g, () => 0.9);
    assert.deepEqual(actual.log[0].clash!.summary, forecast.sides);
    assert.equal(actual.player.poise, forecast.sides.player.poiseAfter);
    if (standing) {
      assert.equal(actual.player.prone, false);
      assert.ok(
        reactionManeuvers(actual.player).some((m) => m.action === "attack"),
      );
    }
  }
});
