import { test } from "node:test";
import assert from "node:assert/strict";
import { item } from "@/game/equipment/catalog";
import {
  createGame,
  generateEnemy,
  canUse,
  statTotal,
  claimReward,
  nextBattle,
} from "@/game/combat/engine";
function rng(seed = 73) {
  return () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
const fixture = () => createGame("Тест", rng());
test("new character: all ones, no gear, full health; initial enemy has same stats", () => {
  const g = createGame("Путник", rng());
  assert.deepEqual(Object.values(g.player.stats), [1, 1, 1, 1]);
  assert.deepEqual(Object.values(g.player.gear), [null, null, null, null]);
  assert.deepEqual(g.enemy.stats, g.player.stats);
  assert.equal(g.player.hp, 30);
});
test("enemy randomization keeps point sum, minimum 1 and wearable equipment", () => {
  const p = fixture().player;
  p.stats = {
    strength: 5,
    agility: 5,
    vitality: 4,
    intelligence: 4,
  };
  p.gear = {
    weapon: "greatsword",
    shield: null,
    body: "plate",
    feet: "greaves",
  };
  const seen = new Set<string>();
  for (let i = 0; i < 200; i++) {
    const e = generateEnemy(p, rng(i));
    seen.add(JSON.stringify(e.stats));
    assert.equal(statTotal(e), statTotal(p));
    assert.ok(!(item(e.gear.weapon).hands === 2 && e.gear.shield));
    for (const value of Object.values(e.stats)) assert.ok(value >= 1);
    for (const id of Object.values(e.gear))
      if (id) assert.ok(canUse(e, item(id)));
  }
  assert.ok(seen.size > 5);
});
test("reward is claimed only once; next battle preserves character and restores health", () => {
  const g = fixture();
  g.phase = "victory";
  g.reward = { kind: "souls", amount: 2 };
  g.player.hp = 3;
  assert.throws(() => nextBattle(g), /награду/);
  const rewarded = claimReward(g, "souls");
  assert.equal(rewarded.player.stats.vitality, 1);
  assert.equal(rewarded.souls, 2);
  assert.throws(() => claimReward(rewarded, "souls"), /недоступна/);
  const next = nextBattle(rewarded, rng());
  assert.equal(next.player.hp, 30);
  assert.equal(next.player.name, g.player.name);
  assert.equal(next.fight, 2);
  assert.equal(statTotal(next.enemy), 4);
  assert.equal(next.souls, 2);
});
test("item reward requires explicit acceptance and does not create inventory", () => {
  const g = fixture();
  g.phase = "victory";
  g.reward = { kind: "item", itemId: "buckler" };
  g.player.gear.weapon = "spear";
  const accepted = claimReward(g, "equip");
  assert.equal(accepted.player.gear.weapon, null);
  assert.equal(accepted.player.gear.shield, "buckler");
  assert.throws(() => claimReward(g, "souls"));
  assert.equal(g.player.gear.weapon, "spear");
  assert.equal(g.phase, "victory");
});
