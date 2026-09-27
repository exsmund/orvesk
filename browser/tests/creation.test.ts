import { allFigures } from "@/game/combat/deck";
import { maneuverDamage } from "@/game/combat/reaction-rules";
import test from "node:test";
import assert from "node:assert/strict";
import {
  initialStartingStats,
  balancedStartingStats,
  validateStartingStats,
} from "@/game/progression/creation-rules";
import { createGame, canUse, maxHp } from "@/game/combat/engine";
import { beginClash, prepareClash } from "@/game/combat/reaction-engine";
import { level, upgradeCost, upgradeAttribute } from "@/game/progression/souls";
import { maxStamina } from "@/game/combat/tactics";
import { STAT_KEYS } from "@/game/types";
import { item } from "@/game/equipment/catalog";
test("creation accepts exactly seven whole points with a minimum of one, and copies input", () => {
  const stats = balancedStartingStats(),
    copy = validateStartingStats(stats);
  assert.deepEqual(copy, stats);
  assert.notEqual(copy, stats);
  for (const key of STAT_KEYS)
    assert.deepEqual(
      validateStartingStats({ ...initialStartingStats(), [key]: 4 }),
      { ...initialStartingStats(), [key]: 4 },
    );
  for (const invalid of [
    undefined,
    null,
    [],
    {},
    initialStartingStats(),
    { ...stats, strength: 0 },
    { ...stats, strength: 3 },
    { ...stats, strength: -1, agility: 3 },
    { ...stats, strength: 0.5, agility: 1.5 },
    { ...stats, strength: "2" },
    { ...stats, strength: NaN },
    { ...stats, strength: Infinity },
    { ...stats, extra: 0 },
  ])
    assert.throws(() => validateStartingStats(invalid));
});
test("balanced and extreme allocations survive battle setup and reload as level one with no unspent souls", () => {
  for (const stats of [
    balancedStartingStats(),
    ...STAT_KEYS.map((key) => ({ ...initialStartingStats(), [key]: 4 })),
  ]) {
    const g = beginClash(
      createGame("Новичок", () => 0.5, undefined, validateStartingStats(stats)),
      () => 0.5,
    );
    assert.deepEqual(g.player.stats, stats);
    assert.equal(level(g.player), 1);
    assert.equal(g.souls, 0);
    assert.equal(g.player.hp, maxHp(g.player));
    assert.ok(g.player.hp > 0);
    assert.ok(maxStamina() > 0);
    assert.ok(Object.values(g.player.gear).every((value) => value == null));
    assert.equal(level(g.enemy), 0);
    assert.equal(
      Object.values(g.enemy.stats).reduce((a, b) => a + b),
      4,
    );
    assert.deepEqual(
      prepareClash(JSON.parse(JSON.stringify(g)), () => 0.5).player.stats,
      stats,
    );
  }
});
test("minimum stats keep fist damage and item requirements", () => {
  const f = createGame("Ловкач", () => 0.5, undefined, {
    ...initialStartingStats(),
    agility: 4,
  }).player;
  assert.equal(canUse(f, item("dagger")), true);
  assert.equal(canUse(f, item("axe@3")), false);
  assert.equal(
    maneuverDamage(
      f,
      allFigures(f).find((m) => m.id === "base:fist")!,
    ),
    3,
  );
});
test("normal upgrade prices start after the initial three souls are allocated", () => {
  let g = createGame("Развитие", () => 0.5, undefined, balancedStartingStats());
  g.phase = "ready";
  g.souls = 7;
  assert.equal(upgradeCost(g.player), 3);
  g = upgradeAttribute(g, "strength", 1, 7);
  assert.equal(level(g.player), 2);
  assert.equal(g.souls, 4);
  assert.equal(upgradeCost(g.player), 4);
  g = upgradeAttribute(g, "agility", 2, 4);
  assert.equal(level(g.player), 3);
  assert.equal(g.souls, 0);
});
