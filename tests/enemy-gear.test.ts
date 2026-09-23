import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createGame,
  generateEnemy,
  generateEnemyGear,
  canUse,
  statTotal,
  nextBattle,
} from "../src/game/combat/engine";
import { beginBattle, prepareRound } from "../src/game/combat/board-engine";
import { item } from "../src/game/equipment/catalog";
import type { Stats } from "../src/game/types";
const rng = (seed: number) => () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
};
test("enemy stats and loadout do not depend on player equipment", () => {
  const bare = createGame("Игрок", rng(1)).player;
  bare.stats = {
    strength: 5,
    agility: 5,
    endurance: 5,
    intelligence: 5,
    reaction: 2,
  };
  const geared = structuredClone(bare);
  geared.gear = {
    weapon: "greatsword",
    shield: null,
    body: "plate",
    feet: "greaves",
    ring: "unlock-ring",
    amulet: "fold-amulet",
  };
  const before = structuredClone(geared);
  for (let seed = 0; seed < 100; seed++)
    assert.deepEqual(
      generateEnemy(bare, rng(seed)),
      generateEnemy(geared, rng(seed)),
    );
  assert.deepEqual(geared, before);
});
test("scaled independent loadouts respect slots, requirements, tiers and two hands across 1200 enemies", () => {
  const player = createGame("Игрок", rng(1)).player,
    sets = new Set<string>(),
    weapons = new Set<string>();
  for (let level = 0; level < 12; level++)
    for (let seed = 0; seed < 100; seed++) {
      player.stats = {
        strength: level + 1,
        agility: level + 1,
        endurance: level + 1,
        intelligence: level + 1,
        reaction: level + 1,
      };
      const enemy = generateEnemy(player, rng(seed + level * 100)),
        growth = statTotal(enemy) - 5;
      assert.equal(statTotal(enemy), statTotal(player));
      let cost = 0;
      for (const [slot, id] of Object.entries(enemy.gear))
        if (id) {
          const gear = item(id);
          assert.equal(gear.slot, slot);
          assert.ok(canUse(enemy, gear));
          assert.ok(gear.tier <= growth);
          cost += gear.tier + 1;
        }
      assert.ok(cost <= Math.min(12, 1 + growth));
      assert.ok(!(item(enemy.gear.weapon).hands === 2 && enemy.gear.shield));
      if (level === 0) {
        assert.equal(cost, 1);
        assert.ok(["dagger", "club"].includes(enemy.gear.weapon!));
      }
      sets.add(JSON.stringify(enemy.gear));
      weapons.add(enemy.gear.weapon!);
    }
  assert.ok(sets.size > 30);
  assert.ok(weapons.size >= 8);
});
test("weapon selection follows the generated fighter damage stats", () => {
  const fighter = createGame("Сборка", rng(2)).player;
  const builds: [Stats, string][] = [
    [
      { strength: 1, agility: 1, endurance: 1, intelligence: 12, reaction: 1 },
      "intelligence",
    ],
    [
      { strength: 1, agility: 12, endurance: 1, intelligence: 1, reaction: 1 },
      "agility",
    ],
    [
      { strength: 12, agility: 1, endurance: 2, intelligence: 1, reaction: 1 },
      "strength",
    ],
  ];
  for (const [stats, scaling] of builds)
    for (let seed = 0; seed < 100; seed++) {
      const gear = generateEnemyGear({ ...fighter, stats }, rng(seed));
      assert.ok(
        item(gear.weapon).damage!.some((part) => part.stat === scaling),
      );
    }
});
test("saved opponents stay unchanged on reload; next fight generates independent equipment", () => {
  const g = beginBattle(createGame("Сохранение", rng(5)), rng(6));
  const saved = JSON.parse(JSON.stringify(g));
  assert.deepEqual(
    prepareRound(saved, () => {
      throw new Error("must not reroll");
    }).enemy,
    g.enemy,
  );
  g.phase = "defeat";
  const next = beginBattle(nextBattle(g, rng(9)), rng(10));
  assert.deepEqual(next.player.gear, g.player.gear);
  assert.notDeepEqual(next.enemy.gear, next.player.gear);
  assert.equal(statTotal(next.enemy), statTotal(next.player));
});
