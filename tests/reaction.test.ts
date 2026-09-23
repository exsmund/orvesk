import { isCombatActionEnabled } from "../src/game/config/features";
import { initialStartingStats } from "../src/game/progression/creation-rules";
import { beginClassicClash as beginClash } from "./classic-fixture";
import { test } from "node:test";
import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import {
  createGame,
  attackPower,
  nextBattle,
  statTotal,
  canUse,
} from "../src/game/combat/engine";
import {
  beginClash as randomModeClash,
  prepareClash,
  publicClash,
  validateClash,
  resolveClash,
  submitClash,
  distributeDamage,
} from "../src/game/combat/reaction-engine";
import {
  reactionManeuvers,
  itemManeuvers,
} from "../src/game/combat/reaction-rules";
import { possiblePlacements, placementCells } from "../src/game/combat/board";
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
function fixture(player = [p("strike-1")], enemy = [p("rest", 2, 2)]) {
  const base = createGame("Реакция", rng());
  base.enemy.gear = { ...base.player.gear };
  const g = beginClash(base, rng());
  g.enemy.stats = initialStartingStats();
  // Legacy committed fields retain their original uniform figures and have no terrain bonus.
  g.player.tactical = false;
  g.enemy.tactical = false;
  delete g.enemy.archetype;
  delete g.clashPlan!.special;
  Object.assign(g.clashPlan!, {
    preparer: "player",
    reactor: "enemy",
    stage: "preparation",
    playerBudget: 5,
    enemyBudget: 4,
    blocked: [],
    playerPlaced: player,
    enemyPlaced: enemy,
    playerModifiers: {},
    enemyModifiers: {},
  });
  return g;
}
test("reaction roll assigns roles, budgets and ties alternate; reload never rerolls", () => {
  const g = createGame("Роли", rng());
  g.player.stats.reaction = 20;
  const first = beginClash(g, () => 0.5);
  assert.equal(first.clashPlan!.reactor, "player");
  assert.equal(first.clashPlan!.playerBudget, 4);
  assert.equal(first.clashPlan!.enemyBudget, 5);
  assert.deepEqual(
    prepareClash(first, () => {
      throw new Error("reroll");
    }).clashPlan,
    first.clashPlan,
  );
  const tied = fixture();
  tied.player.stats.reaction = tied.enemy.stats.reaction = 1;
  tied.lastReactor = "player";
  delete tied.clashPlan;
  assert.equal(prepareClash(tied, () => 0.5).clashPlan!.reactor, "enemy");
});
test("public preparation hides the AI reaction; player reaction reveals actual committed coordinates", () => {
  const g = fixture();
  assert.equal(publicClash(g).clash!.enemyPlaced, undefined);
  assert.equal("clashPlan" in publicClash(g), false);
  assert.equal("enemyIntent" in publicClash(g), false);
  g.clashPlan!.preparer = "enemy";
  g.clashPlan!.reactor = "player";
  g.clashPlan!.stage = "reaction";
  assert.deepEqual(publicClash(g).clash!.enemyPlaced, g.clashPlan!.enemyPlaced);
});
test("opposing layers can overlap but own overlap, excess budget and invalid tokens are rejected", () => {
  const g = fixture();
  g.clashPlan!.enemyPlaced = [p("strike-1")];
  assert.doesNotThrow(() => validateClash(g, "player", [p("strike-1")], {}));
  for (const placed of [
    [p("strike-1"), p("strike-2")],
    [p("strike-1"), p("strike-1", 1)],
    [p("heavy", 2, 2)],
    [p("unknown")],
    [p("strike-1", NaN)],
  ])
    assert.throws(() => validateClash(g, "player", placed, {}));
  const five = [p("heavy"), p("strike-1", 2), p("rest", 2, 2)];
  assert.doesNotThrow(() => validateClash(g, "player", five, {}));
  g.clashPlan!.playerBudget = 4;
  assert.throws(() => validateClash(g, "player", five, {}), /клеток/);
});
test("two shield cells cover two thirds of the axe and armor is applied once per action", () => {
  const g = fixture([p("heavy")], [p("guard")]);
  g.player.gear.weapon = "axe";
  g.player.stats.strength = 3;
  g.enemy.gear.shield = "buckler";
  const power = attackPower(g.player, { action: "heavy", step: 0 });
  assert.equal(power, 9);
  const done = resolveClash(g, () => 0.9),
    r = done.log[0].clash!;
  assert.equal(r.enemyDamage, 3);
  assert.equal(r.cells[0].enemyDamage, 0);
  assert.equal(r.cells[1].enemyDamage, 0);
  assert.equal(r.cells[4].enemyDamage, 3);
  g.enemy.gear.body = "rags";
  assert.equal(resolveClash(g, () => 0.9).log[0].clash!.enemyDamage, 2);
  g.clashPlan!.enemyPlaced = [p("rest", 2, 2)];
  assert.equal(resolveClash(g, () => 0.9).log[0].clash!.enemyDamage, 8);
});
test("weapon clashes trade half damage; empty attacks are full and defenses are symmetric", () => {
  const g = fixture([p("strike-1")], [p("strike-1")]);
  const r = resolveClash(g, () => 0.9).log[0].clash!;
  assert.equal(r.playerDamage, 0.5);
  assert.equal(r.enemyDamage, 0.5);
  g.clashPlan!.enemyPlaced = [p("strike-1", 1)];
  const full = resolveClash(g, () => 0.9).log[0].clash!;
  assert.equal(full.playerDamage, 1);
  assert.equal(full.enemyDamage, 1);
  g.clashPlan!.playerPlaced = [p("guard")];
  g.clashPlan!.enemyPlaced = [p("strike-1")];
  const blocked = resolveClash(g, () => 0.9).log[0].clash!;
  assert.equal(blocked.playerDamage, 0);
  assert.equal(blocked.cells[0].interaction, "blocked");
});
test("block versus block is inert; pressure on empty is capped at one per shield figure", () => {
  const g = fixture([p("guard")], [p("guard")]);
  assert.equal(resolveClash(g, () => 0.9).log[0].clash!.enemyPoiseLoss, 0);
  g.player.gear.shield = "kite-shield";
  g.clashPlan!.enemyPlaced = [p("rest", 2, 2)];
  const r = resolveClash(g, () => 0.9).log[0].clash!;
  assert.equal(r.enemyPoiseLoss, 1);
  assert.equal(r.enemyDamage, 0);
});
test("simultaneous lethal hits draw and displayed cell losses are capped at remaining HP", () => {
  const g = fixture([p("strike-1")], [p("strike-1", 1)]);
  g.player.hp = g.enemy.hp = 0.3;
  const done = resolveClash(g, () => 0.9);
  assert.equal(done.phase, "draw");
  assert.equal(done.player.hp, 0);
  assert.equal(done.enemy.hp, 0);
  assert.equal(done.reward, null);
  assert.equal(done.log[0].clash!.playerDamage, 0.3);
  assert.equal(done.log[0].clash!.enemyDamage, 0.3);
  assert.equal(done.wins, g.wins);
  assert.doesNotThrow(() => beginClash(nextBattle(done, rng()), rng()));
});
test("ephemeral sword bypasses rocks only for its own attacks, not edges, overlap or cell budget", () => {
  const g = fixture();
  g.player.gear.weapon = "ephemeral-sword";
  g.player.stats.intelligence = 2;
  g.clashPlan!.blocked = [0, 1, 4];
  assert.doesNotThrow(() => validateClash(g, "player", [p("heavy")], {}));
  assert.throws(() => validateClash(g, "player", [p("guard")], {}));
  assert.throws(() => validateClash(g, "player", [p("heavy", 2, 2)], {}));
  assert.throws(() =>
    validateClash(g, "player", [p("heavy"), p("strike-1")], {}),
  );
  g.clashPlan!.playerBudget = 2;
  assert.throws(() => validateClash(g, "player", [p("heavy")], {}));
});
test("ring opens common terrain and amulet shrinks a figure without increasing damage", () => {
  const g = fixture([p("heavy")], [p("strike-1")]);
  g.player.gear.ring = "unlock-ring";
  g.player.gear.amulet = "fold-amulet";
  g.clashPlan!.blocked = [0];
  g.clashPlan!.playerModifiers = { unlocked: 0, compressed: "heavy" };
  assert.doesNotThrow(() =>
    validateClash(g, "enemy", g.clashPlan!.enemyPlaced, {}),
  );
  const done = resolveClash(g, () => 0.9);
  assert.deepEqual(done.player.charmsUsed, { ring: true, amulet: true });
  assert.equal(done.log[0].clash!.enemyDamage, 1);
  assert.throws(() =>
    validateClash(fixture(), "player", [p("heavy")], { compressed: "heavy" }),
  );
});
test("old initiative points migrate to reaction without changing HP, gear or point total", () => {
  const g = fixture();
  const stats = g.player.stats as Partial<typeof g.player.stats> & {
    initiative?: number;
  };
  delete stats.reaction;
  stats.initiative = 7;
  g.player.hp = 3;
  g.version = 3;
  delete g.clashPlan;
  const after = prepareClash(g, rng());
  assert.equal(after.player.stats.reaction, 7);
  assert.equal("initiative" in after.player.stats, false);
  assert.equal(statTotal(after.player), 11);
  assert.equal(after.player.hp, 3);
  assert.deepEqual(after.player.gear, g.player.gear);
});
test("item figures are exact for weapons, shields and passive armor, even when unusable or prone", () => {
  const f = fixture().player;
  f.prone = true;
  assert.equal(
    itemManeuvers(item("dagger"), f).filter((m) => m.action === "attack")
      .length,
    2,
  );
  assert.deepEqual(
    itemManeuvers(item("axe"), f).map((m) => m.shape.length),
    [2, 3],
  );
  assert.equal(
    itemManeuvers(item("kite-shield"), f).find((m) => m.action === "block")!
      .shape.length,
    4,
  );
  assert.ok(
    itemManeuvers(item("ephemeral-sword"), f).every((m) => m.ignoreBlocked),
  );
  assert.deepEqual(itemManeuvers(item("plate"), f), []);
});
test("damage allocation preserves rounded totals and deterministic cell results", () => {
  assert.deepEqual(distributeDamage(1, [1, 1, 1]), [0.4, 0.3, 0.3]);
  assert.deepEqual(distributeDamage(3, [0, 0, 1]), [0, 0, 3]);
  for (let i = 0; i < 100; i++) {
    const shares = distributeDamage(i / 10, [1, 0.5, 0, 1]);
    assert.equal(Math.round(shares.reduce((a, b) => a + b, 0) * 10), i);
    assert.equal(shares[2], 0);
  }
});
test("200 complete seeded grid fights preserve totals, resource bounds and valid AI plans", () => {
  for (let seed = 0; seed < 200; seed++) {
    const random = rng(seed);
    let g = randomModeClash(createGame("Симуляция", random), random);
    for (let round = 0; round < 150 && g.phase === "combat"; round++) {
      const plan = g.clashPlan!,
        tokens = reactionManeuvers(g.player),
        placed: Placement[] = [],
        used: number[] = [];
      const blocked = plan.blocked.filter(
        (n) => n !== plan.enemyModifiers.unlocked,
      );
      for (const m of tokens) {
        if (placed.length === 4) break;
        if (
          !isCombatActionEnabled(m.action) ||
          m.spent ||
          (m.action === "equip" && g.journey?.battleMode !== "expendable") ||
          m.cooldown ||
          (m.choiceGroup &&
            placed.some(
              (p) =>
                tokens.find((t) => t.id === p.id)?.choiceGroup ===
                m.choiceGroup,
            ))
        )
          continue;
        if (used.length + m.shape.length > plan.playerBudget) continue;
        const itemId =
          m.action === "equip"
            ? g.ground.find((id) => canUse(g.player, item(id)))
            : undefined;
        if (m.action === "equip" && !itemId) continue;
        const possible = possiblePlacements(m, blocked, used);
        if (possible.length) {
          placed.push({ ...possible[0], ...(itemId ? { itemId } : {}) });
          used.push(...placementCells(m, possible[0], {}));
        }
      }
      g = submitClash(g, placed, {}, random);
      const r = g.log[0].clash!;
      assert.equal(
        Math.round(r.cells.reduce((n, c) => n + c.enemyDamage, 0) * 10),
        Math.round(r.enemyDamage * 10),
      );
      assert.ok(g.player.hp >= 0 && g.enemy.hp >= 0);
    }
    assert.notEqual(g.phase, "combat", `seed ${seed}`);
  }
});
test("generated terrain, kick and sword assets exist", async () => {
  for (const path of [
    "terrain/grass.png",
    "terrain/rock.png",
    "actions/kick.png",
    "items/ephemeral-sword.png",
  ])
    await access(new URL(`../public/${path}`, import.meta.url));
});
