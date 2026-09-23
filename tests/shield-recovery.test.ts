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
import { maxPoise } from "../src/game/combat/tactics";
import type { Placement, BoardModifiers } from "../src/game/types";
const p = (id: string, x = 0, y = 0, rotation = 0): Placement => ({
  id,
  x,
  y,
  rotation,
});
function fixture() {
  const g = beginClash(
    createGame("Щит", () => 0.5),
    () => 0.5,
  );
  for (const f of [g.player, g.enemy]) {
    f.stats = {
      strength: 3,
      agility: 3,
      endurance: 2,
      intelligence: 3,
      reaction: 1,
    };
    f.hp = 50;
    f.poise = 2;
    f.prone = false;
    f.tactical = true;
    f.splitBuckler = true;
    f.cooldowns = {};
    f.gear = {
      weapon: "dagger",
      shield: "kite-shield",
      body: null,
      feet: null,
    };
    delete f.archetype;
  }
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
test("one guard covering two separate attacks restores two poise, not once per round", () => {
  const g = fixture(),
    r = calc(g, [p("guard")], [p("strike-1"), p("strike-2", 1)]);
  assert.equal(r.sides.player.poiseRecovered, 2);
  assert.equal(r.sides.player.poiseAfter, 4);
  assert.equal(r.playerDamage, 0);
  assert.equal(
    r.sides.player.reasons.filter((r) => r.includes("полностью перекрыта"))
      .length,
    2,
  );
});
test("fortify can restore three poise, including a fully blocked kick", () => {
  const r = calc(
    fixture(),
    [p("fortify")],
    [p("strike-1"), p("strike-2", 1), p("kick", 0, 1)],
  );
  assert.equal(r.sides.player.poiseRecovered, 3);
  assert.equal(r.sides.player.poiseAfter, 5);
});
test("a single multi-cell attack covered by multiple guards rewards once", () => {
  const g = fixture();
  g.enemy.gear.weapon = "spear";
  g.enemy.gear.shield = null;
  const a = [p("guard"), p("fortify", 0, 1)],
    b = [p("strike-1", 0, 0, 1)];
  assert.equal(calc(g, a, b).sides.player.poiseRecovered, 1);
  const forward = calc(g, a, b),
    reversed = calc(g, [...a].reverse(), b);
  for (const r of [forward, reversed])
    for (const side of ["player", "enemy"] as const)
      r.sides[side].reasons.sort();
  assert.deepEqual(reversed, forward);
});
test("partial coverage, armor absorption, empty guards and enemy utilities do not trigger recovery", () => {
  const g = fixture();
  g.enemy.gear.weapon = "club";
  g.enemy.stats.strength = 1;
  g.player.gear.body = "plate";
  let r = calc(g, [p("guard")], [p("strike-1", 1)]);
  assert.equal(r.playerDamage, 0);
  assert.equal(r.sides.player.poiseRecovered, 0, "armor is not a shield block");
  for (const b of [[], [p("rest")], [p("guard")]])
    assert.equal(calc(g, [p("guard")], b).sides.player.poiseRecovered, 0);
  g.enemy.gear.weapon = "ephemeral-sword";
  g.player.gear.body = null;
  r = calc(g, [p("guard"), p("strike-1", 2)], [p("strike-1", 1)]);
  assert.equal(
    r.sides.player.poiseRecovered,
    0,
    "a clash cannot finish a full block",
  );
});
test("rotated and compressed attacks and guards use their actual occupied cells", () => {
  const g = fixture();
  assert.equal(
    calc(g, [p("guard", 0, 0, 1)], [p("kick", 0, 0, 1)]).sides.player
      .poiseRecovered,
    1,
  );
  assert.equal(
    calc(g, [p("guard")], [p("heavy")], {}, { compressed: "heavy" }).sides
      .player.poiseRecovered,
    1,
  );
  assert.equal(
    calc(
      g,
      [p("guard")],
      [p("heavy")],
      { compressed: "guard" },
      { compressed: "heavy" },
    ).sides.player.poiseRecovered,
    1,
  );
  assert.equal(
    calc(g, [p("guard")], [p("kick")], { compressed: "guard" }).sides.player
      .poiseRecovered,
    0,
  );
  assert.equal(
    calc(g, [p("guard")], [p("shield")]).sides.player.poiseRecovered,
    1,
  );
});
test("buckler, mirror shield and bare-handed blocks do not get the kite shield property", () => {
  for (const shield of ["buckler", "mirror-shield", null]) {
    const g = fixture();
    g.player.gear.shield = shield;
    const a =
      shield === "buckler" ? [p("guard"), p("guard-2", 1)] : [p("guard")];
    assert.equal(
      calc(g, a, [p("strike-1"), p("strike-2", 1)]).sides.player.poiseRecovered,
      0,
    );
  }
});
test("recovery is capped before incoming poise loss, and combines with terrain and sword support", () => {
  const g = fixture(),
    a = [p("guard")],
    b = [p("strike-1"), p("strike-2", 1), p("kick", 0, 2)];
  g.player.poise = maxPoise(g.player);
  let r = calc(g, a, b);
  assert.equal(r.sides.player.poiseRecovered, 0);
  assert.equal(r.sides.player.poiseAfter, 4);
  g.player.poise = 1;
  r = calc(g, a, b);
  assert.equal(r.sides.player.poiseRecovered, 2);
  assert.equal(r.sides.player.poiseAfter, 1);
  g.player.gear.weapon = "shortsword";
  g.clashPlan!.special = { index: 0, kind: "rally" };
  r = calc(
    g,
    [p("guard"), p("strike-1", 0, 1)],
    [p("strike-1"), p("strike-2", 1)],
  );
  assert.equal(r.sides.player.poiseRecovered, 5);
  assert.equal(r.sides.player.poiseAfter, 6);
});
test("enemy recovery is symmetric and forecast, resolution and serialized history agree", () => {
  const g = fixture(),
    a = [p("guard")],
    b = [p("strike-1"), p("strike-2", 1)];
  assert.equal(calc(g, b, a).sides.enemy.poiseRecovered, 2);
  Object.assign(g.clashPlan!, { playerPlaced: a, enemyPlaced: b });
  const before = structuredClone(g),
    forecast = previewClashDamage(publicClash(g), a)!;
  assert.deepEqual(g, before);
  const actual = resolveClash(g, () => 0.9),
    record = JSON.parse(JSON.stringify(actual.log[0]));
  assert.equal(actual.player.poise, 4);
  assert.deepEqual(record.clash.summary, forecast.sides);
  assert.equal(
    record.events.filter((e: string) =>
      e.includes("Щит сумеречного стража: полностью перекрыта"),
    ).length,
    2,
  );
});
