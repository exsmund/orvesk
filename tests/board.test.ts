import { test } from "node:test";
import assert from "node:assert/strict";
import {
  beginBattle,
  prepareRound,
  publicBoard,
  reveal,
  resolveSequence,
  validatePlacements,
} from "../src/game/combat/board-engine";
import {
  boardFor,
  cells,
  hasFreeHand,
  maneuvers,
  placementCells,
  possiblePlacements,
} from "../src/game/combat/board";
import {
  createGame,
  generateEnemy,
  statTotal,
  canUse,
  claimReward,
  nextBattle,
} from "../src/game/combat/engine";
import { item } from "../src/game/equipment/catalog";
import type { Placement } from "../src/game/types";
const rng =
  (seed = 1) =>
  () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
const p = (id: string, x = 0, y = 0, rotation = 0): Placement => ({
  id,
  x,
  y,
  rotation,
});
function game() {
  const base = createGame("Поле", rng());
  base.enemy.gear = { ...base.player.gear };
  const g = beginBattle(base, rng());
  g.roundPlan!.blocked = [];
  g.roundPlan!.enemyBlocked = [];
  g.distance = 70;
  return g;
}
function queued(
  player: string[],
  enemy: string[],
  first: "player" | "enemy" = "player",
) {
  const g = game();
  g.roundPlan!.stage = "ordering";
  g.roundPlan!.playerPlaced = player.map((id, i) =>
    p(id, i % 3, Math.floor(i / 3)),
  );
  g.roundPlan!.enemyPlaced = enemy.map((id, i) =>
    p(id, i % 3, Math.floor(i / 3)),
  );
  g.roundPlan!.enemyOrder = enemy;
  g.player.stats.reaction = first === "player" ? 20 : 1;
  g.enemy.stats.reaction = first === "enemy" ? 20 : 1;
  return g;
}
test("all weapon families expose unique finite tokens, rotated shapes, dagger pair and large shield", () => {
  const g = game();
  g.player.gear.weapon = "dagger";
  assert.equal(
    maneuvers(g.player).filter(
      (m) => m.action === "attack" && m.weaponId === "dagger",
    ).length,
    2,
  );
  g.player.gear.weapon = "axe";
  assert.equal(
    maneuvers(g.player).find((m) => m.id === "strike-1")!.shape.length,
    2,
  );
  assert.equal(
    maneuvers(g.player).find((m) => m.id === "heavy")!.shape.length,
    3,
  );
  g.player.gear.shield = "kite-shield";
  assert.equal(
    maneuvers(g.player).find((m) => m.id === "guard")!.shape.length,
    4,
  );
  assert.deepEqual(
    cells(
      [
        [0, 0],
        [1, 0],
      ],
      1,
    ),
    [
      [0, 0],
      [0, 1],
    ],
  );
});
test("500 random fields preserve at least one weapon attack and multiple one-cell alternatives", () => {
  for (const weapon of ["fist", "dagger", "axe", "spear", "greatsword"])
    for (let i = 0; i < 100; i++) {
      const g = game();
      g.player.gear.weapon = weapon;
      const blocked = boardFor(g.player, rng(i));
      assert.ok(blocked.length <= 3);
      assert.ok(possiblePlacements(maneuvers(g.player)[0], blocked).length);
      assert.ok(9 - blocked.length >= 6);
    }
});
test("placement rejects overlap, duplicate IDs, outside cells, bad rotations, empty and oversized plans", () => {
  const g = game();
  for (const bad of [
    [],
    [p("strike-1"), p("strike-2")],
    [p("strike-1"), p("strike-1", 1)],
    [p("heavy", 2, 2)],
    [p("strike-1", 0, 0, 9)],
    [p("unknown")],
    [p("strike-1", NaN)],
  ])
    assert.throws(() => validatePlacements(g, bad, {}));
  assert.throws(() =>
    validatePlacements(
      g,
      Array.from({ length: 5 }, () => p("rest")),
      {},
    ),
  );
  g.roundPlan!.blocked = [0];
  assert.throws(() => validatePlacements(g, [p("strike-1")], {}));
  assert.doesNotThrow(() =>
    validatePlacements(g, [p("strike-1", 1), p("rest", 2)], {}),
  );
});
test("ring and amulet validate possession, charges and placement; charges spend only on resolve", () => {
  const g = game();
  g.roundPlan!.blocked = [0];
  assert.throws(() =>
    reveal(g, [p("heavy")], { unlocked: 0, compressed: "heavy" }, rng()),
  );
  g.player.gear.ring = "unlock-ring";
  g.player.gear.amulet = "fold-amulet";
  const shown = reveal(
    g,
    [p("heavy")],
    { unlocked: 0, compressed: "heavy" },
    rng(),
  );
  assert.deepEqual(shown.player.charmsUsed, { ring: false, amulet: false });
  assert.throws(() => reveal(shown, [p("rest")], {}, rng()));
  const after = resolveSequence(shown, ["heavy"], rng());
  assert.deepEqual(after.player.charmsUsed, { ring: true, amulet: true });
  if (after.phase === "combat")
    assert.throws(() =>
      reveal(after, [p("rest")], { compressed: "rest" }, rng()),
    );
  after.phase = "defeat";
  const next = beginBattle(nextBattle(after, rng()), rng());
  assert.deepEqual(next.player.charmsUsed, { ring: false, amulet: false });
});
test("hidden plans never reach public projection; reveal discloses only canonical unordered actions", () => {
  const g = game();
  const before = publicBoard(g);
  assert.equal(before.planning!.enemyActions, undefined);
  assert.equal("enemyIntent" in before, false);
  assert.equal("roundPlan" in before, false);
  assert.equal("enemyTell" in before, false);
  const shown = reveal(g, [p("rest"), p("strike-1", 1)], {}, rng());
  const view = publicBoard(shown);
  assert.ok(view.planning!.enemyActions!.length);
  assert.equal("enemyOrder" in view.planning!, false);
  assert.equal("enemyBlocked" in view.planning!, false);
  const reloaded = prepareRound(JSON.parse(JSON.stringify(shown)), () => {
    throw new Error("must not reroll");
  });
  assert.deepEqual(reloaded.roundPlan, shown.roundPlan);
});
test("AI ordering cannot learn player placement order or positions", () => {
  const g = game();
  const a = reveal(g, [p("strike-1"), p("rest", 1)], {}, rng(8));
  const b = reveal(g, [p("rest", 2, 2), p("strike-1", 1, 1)], {}, rng(8));
  assert.deepEqual(a.roundPlan!.enemyOrder, b.roundPlan!.enemyOrder);
});
test("order must be a permutation; repeated reveal and resolve are rejected", () => {
  const shown = reveal(game(), [p("strike-1"), p("rest", 1)], {}, rng());
  for (const order of [[], ["rest", "rest"], ["rest", "heavy"]])
    assert.throws(() => resolveSequence(shown, order, rng()));
  const done = resolveSequence(shown, ["rest", "strike-1"], rng());
  assert.throws(() => resolveSequence(done, ["rest", "strike-1"], rng()));
  assert.equal(done.round, shown.round + 1);
});
test("reaction determines first action, ties alternate, and remaining actions continue", () => {
  const g = queued(["strike-1", "strike-2"], ["strike-1"], "enemy");
  const next = resolveSequence(g, ["strike-1", "strike-2"], () => 0.5);
  const hits = next.log[0].events.filter((e) => e.includes("→"));
  assert.ok(hits[0].startsWith(g.enemy.name));
  assert.ok(hits[1].startsWith(g.player.name));
  assert.ok(hits[2].startsWith(g.player.name));
  const tie = queued(["rest"], ["rest"]);
  tie.player.stats.reaction = tie.enemy.stats.reaction = 1;
  tie.lastFirst = "player";
  assert.equal(resolveSequence(tie, ["rest"], () => 0.5).lastFirst, "enemy");
});
test("movement happens in order and range is checked at the instant of attack", () => {
  const g = queued(["advance", "strike-1"], ["rest"]);
  g.distance = 120;
  const good = resolveSequence(g, ["advance", "strike-1"], () => 0.5),
    bad = resolveSequence(g, ["strike-1", "advance"], () => 0.5);
  assert.equal(good.enemy.hp, 11);
  assert.equal(bad.enemy.hp, 12);
  assert.ok(bad.log[0].events.some((e) => e.includes("не достаёт")));
});
test("block only activates when executed; buckler protects once, large shield twice", () => {
  const g = queued(["guard"], ["strike-1", "strike-2"]);
  g.player.gear.shield = "buckler";
  const one = resolveSequence(g, ["guard"], () => 0.5);
  assert.equal(one.player.hp, 11);
  g.player.gear.shield = "kite-shield";
  const two = resolveSequence(g, ["guard"], () => 0.5);
  assert.equal(two.player.hp, 12);
  g.enemy.stats.reaction = 30;
  assert.equal(resolveSequence(g, ["guard"], () => 0.5).player.hp, 11);
});
test("parry expires at next own action; riposte is immediate and cannot recurse", () => {
  const g = queued(["parry", "rest"], ["rest", "strike-1"]);
  const missed = resolveSequence(g, ["parry", "rest"], () => 0.5);
  assert.equal(missed.player.hp, 11);
  const h = queued(["parry"], ["strike-1"]);
  const hit = resolveSequence(h, ["parry"], () => 0.5);
  assert.equal(hit.player.hp, 12);
  assert.equal(hit.enemy.hp, 11);
});
test("kick cancels only an immediately upcoming heavy, never a later action", () => {
  const g = queued(["kick"], ["heavy"]);
  const stopped = resolveSequence(g, ["kick"], () => 0.5);
  assert.equal(stopped.player.hp, 12);
  assert.ok(stopped.log[0].events.some((e) => e.includes("сорван")));
  const h = queued(["kick"], ["rest", "heavy"]);
  const later = resolveSequence(h, ["kick"], () => 0.5);
  assert.ok(later.player.hp < 12);
});
test("knockdown consumes next queued action; terminal knockout stops all further hits", () => {
  const g = queued(["kick"], ["strike-1", "strike-2"]);
  g.enemy.poise = 3;
  const result = resolveSequence(g, ["kick"], () => 0.5);
  assert.equal(result.player.hp, 11);
  assert.ok(result.log[0].events.some((e) => e.includes("поднимается")));
  const lethal = queued(["strike-1", "strike-2"], ["strike-1"]);
  lethal.enemy.hp = 1;
  const won = resolveSequence(lethal, ["strike-1", "strike-2"], () => 0.5);
  assert.equal(won.phase, "victory");
  assert.equal(won.player.hp, 12);
  assert.equal(won.log[0].events.filter((e) => e.includes("→")).length, 1);
});
test("pickup obeys requirements and two-hand conflicts; old weapon actions are frozen until next round", () => {
  const g = queued(["equip", "strike-1"], ["rest"]);
  g.ground = ["dagger"];
  g.roundPlan!.playerPlaced[0].itemId = "dagger";
  const result = resolveSequence(g, ["equip", "strike-1"], () => 0.5);
  assert.equal(result.player.gear.weapon, "dagger");
  assert.equal(result.enemy.hp, 11);
  const bad = game();
  assert.throws(() =>
    reveal(bad, [{ ...p("equip"), itemId: "greatsword" }], {}, rng()),
  );
});
test("migration preserves old health, portrait, pending reward and equipment, grants reaction 1", () => {
  const old = createGame("Старый", rng());
  const before = structuredClone(old);
  delete (old.player.stats as Partial<typeof old.player.stats>).reaction;
  delete (old.enemy.stats as Partial<typeof old.enemy.stats>).reaction;
  old.player.hp = 3;
  old.phase = "victory";
  old.reward = { kind: "souls", amount: 2 };
  const migrated = prepareRound(old, rng());
  assert.equal(migrated.player.hp, 3);
  assert.equal(migrated.player.stats.reaction, 1);
  assert.equal(migrated.player.portraitId, before.player.portraitId);
  assert.equal(migrated.roundPlan, undefined);
  assert.deepEqual(migrated.reward, old.reward);
  const awarded = claimReward(migrated, "souls");
  assert.equal(awarded.player.stats.reaction, 1);
  assert.equal(awarded.souls, 2);
});
test("enemy maintains total of all five stats and independently wearable gear", () => {
  const g = game();
  g.player.stats.reaction = 8;
  g.player.gear.ring = "unlock-ring";
  for (let n = 0; n < 100; n++) {
    const f = generateEnemy(g.player, rng(n));
    assert.equal(statTotal(f), statTotal(g.player));
    for (const id of Object.values(f.gear))
      if (id) assert.ok(canUse(f, item(id)));
  }
});
test("seeded complete games keep valid plans, bounds and exclusive rewards", () => {
  let completed = 0;
  for (let seed = 1; seed <= 100; seed++) {
    const random = rng(seed);
    let g = beginBattle(createGame("Симуляция", random), random);
    for (let round = 0; round < 100 && g.phase === "combat"; round++) {
      const tokens = maneuvers(g.player),
        placed: Placement[] = [],
        used: number[] = [];
      const sorted = [...tokens].sort((a, b) => {
        const rank = (m: typeof a) =>
          m.action === "advance" && g.distance > 80
            ? 0
            : m.action === "attack"
              ? 1
              : m.action === "heavy"
                ? 2
                : m.action === "rest"
                  ? 3
                  : 10;
        return rank(a) - rank(b);
      });
      for (const m of sorted) {
        if (placed.length === 4) break;
        if (m.action === "equip" || m.action === "retreat") continue;
        const possible = possiblePlacements(m, g.roundPlan!.blocked, used);
        if (possible.length) {
          const p = possible[0];
          placed.push(p);
          used.push(...placementCells(m, p, {}));
        }
      }
      g = reveal(g, placed, {}, random);
      g = resolveSequence(
        g,
        placed.map((p) => p.id),
        random,
      );
      assert.ok(g.player.hp >= 0 && g.enemy.hp >= 0);
      assert.ok(g.distance >= 40 && g.distance <= 350);
    }
    if (g.phase !== "combat") completed++;
    if (g.phase === "victory") {
      const ready = claimReward(g, "souls");
      assert.equal(ready.phase, "ready");
      assert.throws(() => claimReward(ready, "souls"));
    }
  }
  assert.equal(completed, 100);
});

test("discarded weapon and shield cannot be used later in the same queue", () => {
  const g = queued(["equip", "strike-1"], ["rest"]);
  g.player.gear.weapon = "dagger";
  g.ground = ["club"];
  g.roundPlan!.playerPlaced[0].itemId = "club";
  const changed = resolveSequence(g, ["equip", "strike-1"], () => 0.5);
  assert.equal(changed.enemy.hp, 12);
  assert.ok(
    changed.log[0].events.some((e) => e.includes("оружие уже сменено")),
  );
  const h = queued(["equip", "shield"], ["rest"]);
  h.player.gear.shield = "buckler";
  h.player.stats.strength = 3;
  h.player.stats.endurance = 2;
  h.ground = ["greatsword"];
  h.roundPlan!.playerPlaced[0].itemId = "greatsword";
  const dropped = resolveSequence(h, ["equip", "shield"], () => 0.5);
  assert.equal(dropped.player.gear.shield, null);
  assert.equal(dropped.enemy.hp, 12);
  assert.ok(
    dropped.log[0].events.some((e) => e.includes("предмет уже сменён")),
  );
});

test("fist attacks require a free hand, including shield-only and two-handed loadouts", () => {
  const g = game();
  for (const [weapon, shield, free] of [
    ["fist", null, true],
    ["fist", "buckler", true],
    ["dagger", null, true],
    ["dagger", "buckler", false],
    ["greatsword", null, false],
  ] as const) {
    g.player.gear.weapon = weapon;
    g.player.gear.shield = shield;
    assert.equal(hasFreeHand(g.player), free);
    assert.equal(
      maneuvers(g.player).some(
        (m) => m.action === "attack" && m.weaponId === "fist",
      ),
      free,
    );
  }
  g.player.gear.weapon = "dagger";
  g.player.gear.shield = "buckler";
  assert.throws(() => validatePlacements(g, [p("fist")], {}));
});
test("picking up a two-handed weapon cancels a queued fist attack", () => {
  const g = queued(["equip", "strike-1"], ["rest"]);
  g.player.stats.strength = 3;
  g.player.stats.endurance = 2;
  g.ground = ["greatsword"];
  g.roundPlan!.playerPlaced[0].itemId = "greatsword";
  const done = resolveSequence(g, ["equip", "strike-1"], () => 0.5);
  assert.equal(done.player.gear.weapon, "greatsword");
  assert.equal(done.enemy.hp, 12);
  assert.ok(done.log[0].events.some((e) => e.includes("обе руки заняты")));
});
test("saved plans with a now-forbidden fist reopen planning without losing the character", () => {
  const g = queued(["fist"], ["rest"]);
  g.player.gear.weapon = "dagger";
  g.player.gear.shield = "buckler";
  g.player.hp = 7;
  const updated = prepareRound(g, rng());
  assert.equal(updated.roundPlan!.stage, "placement");
  assert.deepEqual(updated.roundPlan!.playerPlaced, []);
  assert.equal(updated.player.hp, 7);
  assert.deepEqual(updated.player.gear, g.player.gear);
  assert.deepEqual(
    prepareRound(updated, () => {
      throw new Error("unexpected reroll");
    }).roundPlan,
    updated.roundPlan,
  );
});
