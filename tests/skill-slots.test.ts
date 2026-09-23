import test from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/game/combat/engine";
import { beginClash, prepareClash } from "../src/game/combat/reaction-engine";
import { claimJourneyReward } from "../src/game/journey/journey";
import { knownSkills, learnSkill } from "../src/game/skills/skills";
const rng = () => 0.5;
function victory() {
  const g = beginClash(createGame("Ячейки", rng), rng);
  g.phase = "victory";
  g.reward = { kind: "souls", amount: 2 };
  g.rewardOptions = [
    g.reward,
    { kind: "item", itemId: "axe" },
    { kind: "skill", skillId: "dodge" },
  ];
  return g;
}
test("learning in an empty third slot preserves its position through serialization and future rewards", () => {
  const g = victory();
  delete g.player.skills;
  const learned = claimJourneyReward(g, "learn", 2, undefined, 2);
  assert.deepEqual(learned.player.skills, [null, null, "dodge"]);
  assert.equal(knownSkills(learned.player).length, 1);
  const restored = prepareClash(JSON.parse(JSON.stringify(learned)), rng);
  assert.deepEqual(restored.player.skills, [null, null, "dodge"]);
  learnSkill(restored.player, "bandage", undefined, 0);
  assert.deepEqual(restored.player.skills, ["bandage", null, "dodge"]);
});
test("explicit skill slots reject stale or invalid replacements and clear removed skill cooldown", () => {
  const g = victory();
  g.player.skills = ["sidestep", "composure", "bandage"];
  g.player.cooldowns = { "skill:composure": 1, "skill:bandage": 1 };
  assert.throws(() => claimJourneyReward(g, "learn", 2, undefined, 1));
  assert.throws(() => claimJourneyReward(g, "learn", 2, "sidestep", 1));
  for (const slot of [-1, 3, 1.5])
    assert.throws(() => claimJourneyReward(g, "learn", 2, undefined, slot));
  const next = claimJourneyReward(g, "learn", 2, "composure", 1);
  assert.deepEqual(next.player.skills, ["sidestep", "dodge", "bandage"]);
  assert.equal(next.player.cooldowns?.["skill:composure"], undefined);
  assert.equal(next.player.cooldowns?.["skill:bandage"], 1);
  assert.deepEqual(g.player.skills, ["sidestep", "composure", "bandage"]);
});
