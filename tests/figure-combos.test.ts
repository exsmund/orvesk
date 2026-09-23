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
  preparationDamage,
} from "../src/game/combat/clash-damage";
import { comboCandidates, groupCombos } from "../src/game/combat/figure-combos";
import type { Placement } from "../src/game/types";
const p = (id: string, x = 0, y = 0, rotation = 0): Placement => ({
  id,
  x,
  y,
  rotation,
});
function fixture(weapon = "dagger") {
  const g = beginClash(
    createGame("Комбинации", () => 0.5),
    () => 0.5,
  );
  for (const f of [g.player, g.enemy]) {
    f.stats = {
      strength: 3,
      agility: 3,
      endurance: 3,
      intelligence: 3,
      reaction: 3,
    };
    f.hp = 30;
    f.poise = 5;
    f.prone = false;
    f.tactical = true;
    f.splitBuckler = true;
    f.gear = { weapon, shield: "buckler", body: null, feet: null };
    delete f.archetype;
  }
  Object.assign(g.clashPlan!, {
    stage: "reaction",
    preparer: "enemy",
    reactor: "player",
    blocked: [],
    special: undefined,
    playerBudget: 5,
    enemyBudget: 5,
    playerModifiers: {},
    enemyModifiers: {},
  });
  return g;
}
function calc(
  g: ReturnType<typeof fixture>,
  player: Placement[],
  enemy: Placement[],
) {
  return calculateClash(
    g,
    { player, enemy },
    {
      player: g.clashPlan!.playerModifiers,
      enemy: g.clashPlan!.enemyModifiers,
    },
    g.clashPlan!.special,
  );
}
test("counter uses side adjacency and a shield that actually blocks; diagonal, hands and empty guards do not trigger", () => {
  const g = fixture();
  const a = [p("strike-1", 1), p("guard")],
    enemy = [p("strike-1")];
  const r = calc(g, a, enemy);
  assert.equal(r.enemyDamage, 5);
  assert.equal(r.playerDamage, 0);
  assert.equal(r.sides.player.blocked, 4);
  assert.equal(r.sides.player.combos[0].damageBonus, 1);
  assert.equal(
    calc(g, [p("strike-1", 1, 1), p("guard")], enemy).sides.player.combos
      .length,
    0,
  );
  assert.equal(calc(g, a, [p("rest", 2, 2)]).sides.player.combos.length, 0);
  g.player.gear.shield = null;
  assert.equal(
    calc(g, [p("guard"), p("strike-1", 2)], enemy).sides.player.combos.length,
    0,
  );
});
test("two buckler guards boost both dagger hits independently of placement order", () => {
  const g = fixture(),
    a = [p("strike-2", 1, 1), p("guard-2", 0, 1), p("strike-1", 1), p("guard")],
    b = [p("strike-1"), p("strike-2", 0, 1)];
  const r = calc(g, a, b),
    reordered = calc(g, [...a].reverse(), [...b].reverse());
  assert.equal(r.enemyDamage, 10);
  assert.equal(r.sides.player.combos.length, 2);
  assert.deepEqual(r.sides.player.combos.map((c) => c.actionIds[0]).sort(), [
    "strike-1",
    "strike-2",
  ]);
  assert.deepEqual(r.cells, reordered.cells);
});
test("counter damage passes through normal clash reduction and armor, and is not a true-damage hit", () => {
  const g = fixture(),
    a = [p("guard"), p("strike-1", 1)],
    b = [p("strike-1"), p("strike-2", 1)];
  assert.equal(calc(g, a, b).attacks.player["strike-1"].damage, 2.5);
  g.enemy.gear.body = "leather";
  assert.equal(calc(g, a, b).attacks.player["strike-1"].damage, 1.5);
  g.enemy.hp = 0.2;
  assert.equal(calc(g, a, b).enemyDamage, 0.2);
});
test("axe plus kick adds poise damage once only if both figures deal health damage", () => {
  const g = fixture("axe");
  g.enemy.gear.weapon = "dagger";
  const a = [p("strike-1"), p("kick", 0, 1)];
  let r = calc(g, a, [p("rest", 2, 2)]);
  assert.equal(r.sides.enemy.poiseLoss, 3);
  assert.equal(r.sides.player.combos[0].kind, "pressure");
  r = calc(g, a, [p("guard", 0, 1), p("guard-2", 1, 1)]);
  assert.equal(r.sides.enemy.poiseLoss, 0);
  assert.equal(r.sides.player.combos.length, 0);
});
test("sword support requires a successful attack and blocked enemy strike; recovery is capped before damage", () => {
  const g = fixture("shortsword");
  g.enemy.gear.weapon = "dagger";
  g.player.poise = 6;
  const a = [p("strike-1", 1), p("guard")],
    b = [p("strike-1"), p("kick", 0, 1)];
  const r = calc(g, a, b);
  assert.equal(r.sides.player.poiseRecovered, 1);
  assert.equal(r.sides.player.poiseLoss, 2);
  assert.equal(r.sides.player.poiseAfter, 5);
  g.player.poise = 7;
  assert.equal(calc(g, a, b).sides.player.poiseRecovered, 0);
  assert.equal(calc(g, a, [p("rest", 2, 2)]).sides.player.combos.length, 0);
});
test("compressed rotated figures use their actual cells and terrain recovery matches final state", () => {
  const g = fixture("shortsword");
  g.player.gear.amulet = "fold-amulet";
  g.clashPlan!.playerModifiers = { compressed: "heavy" };
  g.clashPlan!.special = { index: 0, kind: "rally" };
  g.player.poise = 1;
  g.enemy.gear.weapon = "dagger";
  const a = [p("heavy", 1, 0, 3), p("guard")],
    b = [p("strike-1")];
  const r = calc(g, a, b);
  assert.equal(r.sides.player.combos[0].kind, "support");
  assert.equal(r.sides.player.poiseRecovered, 3);
  g.clashPlan!.playerPlaced = a;
  g.clashPlan!.enemyPlaced = b;
  const before = structuredClone(g),
    forecast = previewClashDamage(
      publicClash(g),
      a,
      g.clashPlan!.playerModifiers,
    )!;
  assert.deepEqual(g, before);
  const actual = resolveClash(g, () => 0.9);
  assert.deepEqual(actual.log[0].clash!.summary, forecast.sides);
  assert.equal(actual.player.poise, forecast.sides.player.poiseAfter);
});
test("poise preview includes pressure, rest, stand, warden, caps and knockdown", () => {
  const g = fixture();
  g.enemy.poise = 1;
  let r = calc(g, [p("guard"), p("guard-2", 2)], [p("rest", 2, 2)]);
  assert.equal(r.sides.enemy.poiseRecovered, 2);
  assert.equal(r.sides.enemy.poiseAfter, 1);
  r = calc(g, [p("guard"), p("guard-2", 2)], [p("strike-1", 2, 2)]);
  assert.equal(r.sides.enemy.poiseAfter, 0);
  assert.equal(r.sides.enemy.prone, true);
  g.enemy.prone = true;
  g.enemy.poise = 0;
  r = calc(g, [p("guard")], [p("stand", 2, 2)]);
  assert.equal(r.sides.enemy.poiseAfter, 7);
  assert.equal(r.sides.enemy.poiseLoss, 0);
  assert.equal(r.sides.enemy.prone, false);
  g.player.archetype = "warden";
  g.player.poise = 3;
  r = calc(g, [p("guard")], [p("stand", 2, 2)]);
  assert.equal(r.sides.player.poiseRecovered, 1);
});
test("enemy combos are symmetric and forecasts do not reveal hidden plans", () => {
  const g = fixture(),
    a = [p("strike-1")],
    b = [p("guard"), p("strike-1", 1)];
  const r = calc(g, a, b);
  assert.equal(r.playerDamage, 5);
  assert.equal(r.sides.enemy.combos[0].kind, "counter");
  g.clashPlan!.playerPlaced = a;
  g.clashPlan!.enemyPlaced = b;
  const actual = resolveClash(g, () => 0.9).log[0].clash!;
  assert.deepEqual(actual.summary, r.sides);
  g.clashPlan!.stage = "preparation";
  g.clashPlan!.preparer = "player";
  g.clashPlan!.reactor = "enemy";
  assert.equal(previewClashDamage(publicClash(g), a), null);
  assert.equal(
    comboCandidates(g.player, [p("guard"), p("strike-1", 1)], {}).length,
    1,
  );
});

test("one shield links to all adjacent dagger strikes; additional shields do not stack", () => {
  const g = fixture(),
    a = [p("strike-1"), p("guard", 1), p("strike-2", 2)],
    b = [p("strike-1", 1)];
  const r = calc(g, a, b);
  assert.equal(r.enemyDamage, 10);
  assert.equal(r.sides.player.combos.length, 2);
  assert.equal(groupCombos(comboCandidates(g.player, a, {})).length, 2);
  g.clashPlan!.playerPlaced = a;
  g.clashPlan!.enemyPlaced = b;
  const forecast = previewClashDamage(publicClash(g), a)!;
  const actual = resolveClash(g, () => 0.9).log[0].clash!;
  assert.equal(actual.enemyDamage, 10);
  assert.deepEqual(actual.summary, forecast.sides);
  const multiple = [p("guard", 1), p("strike-1", 1, 1), p("guard-2", 0, 1)];
  const result = calc(g, multiple, [p("strike-1", 1), p("strike-2", 0, 1)]);
  assert.equal(result.enemyDamage, 5);
  assert.equal(result.sides.player.combos.length, 1);
  assert.equal(result.sides.player.combos[0].links.length, 2);
});
test("frost dagger and heavy dagger attacks get one physical bonus, retaining frost damage", () => {
  for (const weapon of ["dagger", "frost-dagger"]) {
    const g = fixture(weapon),
      a = [p("heavy"), p("guard", 2, 1)];
    const r = calc(g, a, [p("strike-1", 2, 1)]),
      plain = calc(g, [p("heavy")], [p("strike-1", 2, 1)]);
    assert.equal(r.enemyDamage, plain.enemyDamage + 1);
    assert.equal(r.sides.player.combos.length, 1);
    const before = plain.attacks.player.heavy.parts,
      after = r.attacks.player.heavy.parts;
    assert.equal(after[0].value, before[0].value + 1);
    assert.deepEqual(after.slice(1), before.slice(1));
  }
});
test("preparation shows damage per cell and conditional bonus for both attacks without reading enemy plans", () => {
  const g = fixture(),
    a = [p("strike-1"), p("guard", 1), p("strike-2", 2)];
  const preview = preparationDamage(g.player, a);
  assert.deepEqual(preview.potential.slice(0, 3), [4, 0, 4]);
  assert.deepEqual(preview.conditional.slice(0, 3), [1, 0, 1]);
  const heavy = preparationDamage(g.player, [p("heavy"), p("guard", 2, 1)]);
  assert.equal(
    heavy.potential.reduce((a, b) => a + b, 0),
    6,
  );
  assert.equal(
    Math.round(heavy.conditional.reduce((a, b) => a + b, 0) * 10) / 10,
    1,
  );
  const mod = { compressed: "heavy" },
    compressed = preparationDamage(g.player, [p("heavy"), p("guard", 1)], mod, {
      index: 0,
      kind: "surge",
    });
  assert.equal(compressed.potential[0], 7.5);
  assert.equal(compressed.conditional[0], 1.3);
});
