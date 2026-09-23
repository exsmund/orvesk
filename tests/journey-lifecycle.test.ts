import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createJourney,
  nextJourneyBattle,
  journeyVictory,
  claimJourneyReward,
} from "../src/game/journey/journey";
import { beginClash, prepareClash } from "../src/game/combat/reaction-engine";
import { maxHp } from "../src/game/combat/engine";
import { maxPoise } from "../src/game/combat/tactics";
import { level, journeyEnemyLevel } from "../src/game/progression/souls";
const random = () => 0.43;
function exhausted(stage: number, souls: number, victory = false) {
  const g = beginClash(createJourney("Возвращение", random), random);
  g.phase = "combat";
  g.journey!.stage = stage;
  g.journey!.path = Array.from({ length: stage }, (_, i) => `fight-${i + 1}`);
  g.journey!.cleared = stage - 1;
  g.journey!.battleMode = "expendable";
  g.enemy = structuredClone(g.journey!.enemies![`fight-${stage}`]);
  g.player.actionsFinished = g.enemy.actionsFinished = true;
  g.player.hp = victory ? 10 : 1;
  g.enemy.hp = victory ? 1 : 10;
  g.souls = souls;
  return g;
}
test("all five opponents are fixed at map creation and unchanged by upgrades or retries", () => {
  const g = createJourney("Карта", random);
  const roster = structuredClone(g.journey!.enemies!);
  assert.equal(Object.keys(roster).length, 5);
  for (let stage = 1; stage <= 5; stage++)
    assert.equal(
      level(roster[`fight-${stage}`]),
      journeyEnemyLevel(g.journey!.startLevel, stage),
    );
  g.journey!.stage = 3;
  g.journey!.path = ["fight-1", "fight-2", "fight-3"];
  g.phase = "draw";
  g.player.stats.strength += 5;
  g.player.hp = g.enemy.hp = 0;
  g.player.poise = 0;
  const retry = beginClash(
    nextJourneyBattle(g, undefined, undefined, () => 0.91),
    random,
  );
  assert.deepEqual(retry.journey!.enemies, roster);
  assert.deepEqual(retry.enemy.stats, roster["fight-3"].stats);
  assert.deepEqual(retry.enemy.gear, roster["fight-3"].gear);
  for (const f of [retry.player, retry.enemy]) {
    assert.equal(f.hp, maxHp(f));
    assert.equal(f.poise, maxPoise(f));
  }
  assert.deepEqual(
    prepareClash(JSON.parse(JSON.stringify(retry)), random).journey!.enemies,
    JSON.parse(JSON.stringify(roster)),
  );
});
test("defeat restores hero and resets map but keeps roster, stats, gear and skills", () => {
  const before = exhausted(4, 17);
  const g = prepareClash(before, random);
  assert.equal(g.phase, "defeat");
  assert.equal(g.souls, 0);
  assert.deepEqual(g.journey!.lostSouls, { nodeId: "fight-4", amount: 17 });
  assert.deepEqual(g.journey!.path, ["fight-1"]);
  assert.equal(g.journey!.cleared, 0);
  assert.equal(g.player.hp, maxHp(g.player));
  assert.equal(g.player.poise, maxPoise(g.player));
  for (const key of ["stats", "gear", "skills"] as const)
    assert.deepEqual(g.player[key], before.player[key]);
  assert.deepEqual(g.journey!.enemies, before.journey!.enemies);
  assert.deepEqual(
    prepareClash(g, random).journey!.lostSouls,
    g.journey!.lostSouls,
  );
});
test("new defeat replaces prior cache even with zero souls", () => {
  const g = exhausted(2, 0);
  g.journey!.lostSouls = { nodeId: "fight-4", amount: 17 };
  const lost = prepareClash(g, random);
  assert.deepEqual(lost.journey!.lostSouls, { nodeId: "fight-2", amount: 0 });
});
test("victory recovers cache immediately once and regular reward is still available", () => {
  const g = exhausted(3, 2, true);
  g.journey!.lostSouls = { nodeId: "fight-3", amount: 17 };
  const won = prepareClash(g, random);
  assert.equal(won.phase, "victory");
  assert.equal(won.souls, 19);
  assert.equal(won.journey!.lostSouls, undefined);
  assert.equal(prepareClash(won, random).souls, 19);
  const reward = won.rewardOptions!.find((r) => r.kind === "souls")!;
  assert.equal(reward.kind, "souls");
  const claimed = claimJourneyReward(won, "souls");
  assert.equal(
    claimed.souls,
    19 + (reward.kind === "souls" ? reward.amount : 0),
  );
  assert.throws(() => claimJourneyReward(claimed, "souls"));
});
test("boss reward automatically opens a different map and mode, awaiting first encounter", () => {
  const g = exhausted(5, 4, true);
  const won = prepareClash(g, random);
  assert.equal(won.journey!.finished, true);
  assert.equal(won.journey!.expedition, 1);
  const next = claimJourneyReward(
    won,
    "souls",
    0,
    undefined,
    undefined,
    random,
  );
  assert.equal(next.phase, "ready");
  assert.equal(next.journey!.awaitingFirstBattle, true);
  assert.equal(next.journey!.expedition, 2);
  assert.notEqual(next.journey!.mapPreset, won.journey!.mapPreset);
  assert.notEqual(next.journey!.battleMode, won.journey!.battleMode);
  assert.equal(next.clashPlan, undefined);
  assert.equal(Object.keys(next.journey!.enemies!).length, 5);
});
test("victory over other enemies leaves the cache in place", () => {
  const g = exhausted(1, 0, true);
  g.journey!.lostSouls = { nodeId: "fight-4", amount: 17 };
  journeyVictory(g, random);
  assert.equal(g.souls, 0);
  assert.equal(g.journey!.lostSouls.amount, 17);
});
