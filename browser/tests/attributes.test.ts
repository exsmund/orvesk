import assert from "node:assert/strict";
import { test } from "node:test";
import { allFigures, startDeck } from "@/game/combat/deck";
import { figureCellDamage } from "@/game/combat/figure-power";
import { normalizeGame } from "@/game/combat/tactics";
import { beginClash, prepareClash } from "@/game/combat/reaction-engine";
import { createJourney } from "@/game/journey/journey";
import {
  balancedStartingStats,
  validateStartingStats,
} from "@/game/progression/creation-rules";
import { level, upgradeAttribute, upgradeCost } from "@/game/progression/souls";
import { STAT_KEYS } from "@/game/types";

const random = () => 0.5;

test("four attributes keep the starting budget, level and upgrade price", () => {
  assert.deepEqual(STAT_KEYS, [
    "strength",
    "agility",
    "vitality",
    "intelligence",
  ]);
  const g = createJourney(
    "Четыре характеристики",
    random,
    undefined,
    balancedStartingStats(),
  );
  assert.equal(level(g.player), 1);
  assert.equal(upgradeCost(g.player), 3);
  assert.equal(
    Object.values(g.player.stats).reduce((sum, n) => sum + n, 0),
    7,
  );
  assert.throws(() =>
    validateStartingStats({ ...g.player.stats, reaction: 1 }),
  );
  g.souls = 3;
  assert.throws(
    () => upgradeAttribute(g, "reaction" as never, 1, 3),
    /характеристику/,
  );
});

test("parry damage scales with agility and no other attribute", () => {
  const f = createJourney("Парирование", random).player;
  f.skills = ["parry"];
  const parry = allFigures(f).find((m) => m.skillId === "parry")!;
  assert.deepEqual(parry.healthDamage?.stats, ["agility"]);
  assert.equal(figureCellDamage(f, parry), 2);
  f.stats.agility = 4;
  assert.equal(figureCellDamage(f, parry), 5);
  f.stats.strength = f.stats.intelligence = f.stats.vitality = 20;
  assert.equal(figureCellDamage(f, parry), 5);
});

test("saved reaction points move to agility once without rerolling the battle or map", () => {
  const saved = beginClash(
    createJourney("Сохранение", random, undefined, balancedStartingStats()),
    random,
  );
  const fighters = [
    saved.player,
    saved.enemy,
    ...Object.values(saved.journey!.enemies!),
  ];
  for (const f of fighters) {
    Object.assign(f.stats, { reaction: 3 });
    f.skills = ["parry"];
    startDeck(f, random);
    for (const m of [...f.deck!.draw, ...f.deck!.hand, ...f.deck!.discard])
      if (m.skillId === "parry")
        Object.assign(m.healthDamage!, { stats: ["reaction"] });
  }
  const before = structuredClone(saved);
  const normalized = prepareClash(saved, () => {
    throw new Error("Must not reroll");
  });
  const updated = [
    normalized.player,
    normalized.enemy,
    ...Object.values(normalized.journey!.enemies!),
  ];
  for (const [index, f] of updated.entries()) {
    const old = fighters[index];
    assert.equal("reaction" in f.stats, false);
    assert.equal(f.stats.agility, old.stats.agility + 2);
    assert.equal(
      level(f),
      Math.max(0, Object.values(old.stats).reduce((sum, n) => sum + n, 0) - 7),
    );
    assert.equal(f.hp, old.hp);
    for (const pile of ["draw", "hand", "discard"] as const) {
      assert.deepEqual(
        f.deck![pile].map((m) => m.id),
        old.deck![pile].map((m) => m.id),
      );
      for (const m of f.deck![pile])
        if (m.skillId === "parry")
          assert.deepEqual(m.healthDamage?.stats, ["agility"]);
    }
  }
  assert.deepEqual(normalized.clashPlan, before.clashPlan);
  assert.deepEqual(normalized.journey!.map, before.journey!.map);
  assert.equal(normalized.journey!.startLevel, before.journey!.startLevel);
  assert.deepEqual(normalizeGame(normalized), normalized);
  assert.deepEqual(saved, before);
});
