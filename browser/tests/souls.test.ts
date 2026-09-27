import { buildDeck } from "@/game/combat/deck";
import { initialStartingStats } from "@/game/progression/creation-rules";
import test from "node:test";
import assert from "node:assert/strict";
import { createGame, canUse, rollRewards, maxHp } from "@/game/combat/engine";
import {
  beginClash,
  resolveClash,
  prepareClash,
} from "@/game/combat/reaction-engine";
import {
  claimJourneyReward,
  nextJourneyBattle,
  journeyEnemy,
  ensureJourneyEnemies,
} from "@/game/journey/journey";
import {
  level,
  upgradeCost,
  upgradeAttribute,
  journeyEnemyLevel,
} from "@/game/progression/souls";
import { item } from "@/game/equipment/catalog";
const rng = () => 0.5;
function fresh() {
  return beginClash(
    createGame("Осколки", rng, undefined, {
      ...initialStartingStats(),
      agility: 4,
    }),
    rng,
  );
}
function victory() {
  const g = fresh();
  g.phase = "victory";
  g.enemy.hp = 0;
  g.souls = 20;
  g.player.hp = 4;
  g.rewardOptions = rollRewards(g.player, g.enemy, rng);
  g.reward = g.rewardOptions[0];
  return g;
}
test("level starts at one and each attribute upgrade spends the increasing price", () => {
  let g = victory();
  assert.equal(level(g.player), 1);
  assert.equal(upgradeCost(g.player), 3);
  const enemy = structuredClone(g.enemy),
    rewards = structuredClone(g.rewardOptions);
  g = upgradeAttribute(g, "strength", 1, 20);
  assert.equal(g.souls, 17);
  assert.equal(level(g.player), 2);
  assert.equal(upgradeCost(g.player), 4);
  assert.equal(g.player.hp, 4);
  assert.deepEqual(g.enemy, enemy);
  assert.deepEqual(g.rewardOptions, rewards);
  g = upgradeAttribute(g, "agility", 2, 17);
  assert.equal(g.souls, 13);
  assert.equal(level(g.player), 3);
  assert.equal(upgradeCost(g.player), 5);
  assert.equal(prepareClash(JSON.parse(JSON.stringify(g)), rng).souls, 13);
});
test("upgrades reject combat, insufficient souls, invalid stats and stale requests without spending", () => {
  const g = victory(),
    before = structuredClone(g);
  g.phase = "combat";
  assert.throws(() => upgradeAttribute(g, "strength", 1, 20), /вне боя/);
  g.phase = "victory";
  assert.throws(() => upgradeAttribute(g, "strength", 2, 20), /изменилось/);
  assert.throws(() => upgradeAttribute(g, "strength", 1, 19), /изменилось/);
  assert.throws(
    () => upgradeAttribute(g, "invalid" as never, 1, 20),
    /характеристику/,
  );
  assert.deepEqual(g, before);
  g.souls = 2;
  assert.throws(() => upgradeAttribute(g, "strength", 1, 2), /Не хватает/);
  assert.equal(g.souls, 2);
  g.souls = 3;
  const next = upgradeAttribute(g, "strength", 1, 3);
  assert.equal(next.souls, 0);
  assert.throws(() => upgradeAttribute(next, "strength", 1, 3), /изменилось/);
});
test("souls are an exclusive reward based on enemy level, claimed only once", () => {
  const g = victory();
  g.enemy.stats = {
    strength: 8,
    agility: 1,
    vitality: 1,
    intelligence: 1,
  };
  g.rewardOptions = rollRewards(g.player, g.enemy, rng);
  g.reward = g.rewardOptions[0];
  assert.deepEqual(g.reward, { kind: "souls", amount: 6 });
  const next = claimJourneyReward(g, "souls");
  assert.equal(next.souls, 26);
  assert.deepEqual(next.player.stats, g.player.stats);
  assert.equal(next.player.hp, 4);
  assert.equal(next.phase, "ready");
  assert.throws(() => claimJourneyReward(next, "souls"));
  assert.equal(g.souls, 20);
  for (const r of [
    { kind: "item", itemId: "dagger" },
    { kind: "skill", skillId: "dodge" },
  ] as const) {
    const copy = structuredClone(g);
    copy.reward = r;
    copy.rewardOptions = [r];
    const chosen = claimJourneyReward(
      copy,
      r.kind === "item" ? "equip" : "learn",
    );
    assert.equal(chosen.souls, 20);
  }
});
test("reward item becomes wearable after spending souls and keeps its pending selection", () => {
  let g = victory();
  g.rewardOptions = [
    { kind: "souls", amount: 2 },
    { kind: "item", itemId: "axe@3" },
  ];
  g.reward = g.rewardOptions[0];
  assert.throws(() => claimJourneyReward(g, "equip", 1));
  g = upgradeAttribute(g, "strength", 1, 20);
  assert.equal(canUse(g.player, item("axe@3")), false);
  g = upgradeAttribute(g, "strength", 2, 17);
  assert.equal(canUse(g.player, item("axe@3")), true);
  const chosen = claimJourneyReward(g, "equip", 1);
  assert.equal(chosen.player.gear.weapon, "axe@3");
  assert.equal(chosen.souls, 13);
  assert.equal(chosen.player.hp, 4);
});
test("journey snapshots player level and enemies follow -2, -1, -1, 0, +1 with a floor of one", () => {
  const g = createGame("Уровни", rng, undefined, {
    ...initialStartingStats(),
    agility: 4,
  });
  g.player.stats.strength = 5;
  const journey = beginClash(g, rng);
  journey.journey!.expedition = 2;
  delete journey.journey!.enemies;
  ensureJourneyEnemies(journey, rng, false);
  assert.equal(journey.journey!.startLevel, 5);
  assert.deepEqual(
    [1, 2, 3, 4, 5].map((stage) => journeyEnemyLevel(5, stage, 2)),
    [3, 4, 4, 5, 6],
  );
  assert.deepEqual(
    [1, 2, 3, 4, 5].map((stage) => journeyEnemyLevel(1, stage, 2)),
    [1, 1, 1, 1, 2],
  );
  for (let stage = 1; stage <= 5; stage++) {
    journey.journey!.stage = stage;
    const a = journeyEnemy(journey, rng);
    assert.equal(level(a), [3, 4, 4, 5, 6][stage - 1]);
    journey.player.stats.strength += 10;
    const b = journeyEnemy(journey, rng);
    assert.deepEqual(b, a);
    assert.ok(Object.values(b.stats).every((n) => n >= 1));
    for (const id of Object.values(b.gear))
      if (id) assert.ok(canUse(b, item(id)));
  }
  journey.phase = "defeat";
  const next = nextJourneyBattle(journey, undefined, undefined, rng);
  assert.equal(next.journey!.startLevel, journey.journey!.startLevel);
  assert.equal(level(next.enemy), Math.max(1, journey.journey!.startLevel - 2));
});
test("victory earns no automatic currency; defeat loses all souls and draws preserve them", () => {
  for (const result of ["victory", "defeat", "draw", "combat"] as const) {
    const g = fresh();
    g.souls = 23;
    g.journey!.battleMode = "free";
    g.player.battleMode = g.enemy.battleMode = "free";
    for (const f of [g.player, g.enemy]) {
      delete f.creatureId;
      f.gear = { weapon: null, shield: null, body: null, feet: null };
      f.stats.strength = 1;

      f.deck = {
        hand: buildDeck(f)
          .filter((m) => m.id.startsWith("base:fist"))
          .slice(0, 1),
        draw: [],
        discard: [],
        exchanged: false,
      };
    }
    g.player.hp = result === "defeat" || result === "draw" ? 0.1 : 10;
    g.enemy.hp = result === "victory" || result === "draw" ? 0.1 : 10;
    Object.assign(g.clashPlan!, {
      blocked: [],
      special: undefined,
      playerPlaced: [{ id: "base:fist#1", x: 0, y: 0, rotation: 0 }],
      enemyPlaced: [{ id: "base:fist#1", x: 2, y: 2, rotation: 0 }],
    });
    const resolved = resolveClash(g, rng);
    assert.equal(resolved.phase, result);
    assert.equal(resolved.souls, result === "defeat" ? 0 : 23);
    assert.equal(g.souls, 23);
    if (result === "defeat") {
      assert.ok(
        resolved.log[0].events.some((e) => e.includes("Потеряно осколков: 23")),
      );
      assert.equal(
        nextJourneyBattle(resolved, undefined, undefined, rng).souls,
        0,
      );
    }
  }
});
test("upgrades do not change remaining map levels, and the next expedition uses the new level", () => {
  let g = victory();
  g = upgradeAttribute(g, "strength", 1, 20);
  g = claimJourneyReward(g, "souls");
  for (let stage = 2; stage <= 5; stage++) {
    g = nextJourneyBattle(g, "camp", undefined, rng);
    assert.equal(level(g.enemy), stage === 5 ? 1 : 0);
    g.phase = "ready";
  }
  g.journey!.finished = true;
  const restarted = nextJourneyBattle(g, undefined, undefined, rng);
  assert.equal(restarted.journey!.startLevel, 2);
  assert.equal(
    journeyEnemyLevel(
      restarted.journey!.startLevel,
      5,
      restarted.journey!.expedition,
    ),
    3,
  );
});

test("vitality upgrade fully heals to the new maximum and persists without changing stamina", () => {
  const saved = victory();
  saved.player.stamina = 1;
  const before = structuredClone(saved);
  const result = upgradeAttribute(
    saved,
    "vitality",
    level(saved.player),
    saved.souls,
  );
  assert.ok(maxHp(result.player) > maxHp(saved.player));
  assert.equal(result.player.hp, maxHp(result.player));
  assert.equal(result.player.stamina, 1);
  assert.equal(result.souls, saved.souls - upgradeCost(saved.player));
  assert.equal(
    JSON.parse(JSON.stringify(result)).player.hp,
    maxHp(result.player),
  );
  assert.deepEqual(saved, before);
});
