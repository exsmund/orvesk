import { initialStartingStats } from "../src/game/progression/creation-rules";
import { beginClassicClash as beginClash } from "./classic-fixture";
import test from "node:test";
import assert from "node:assert/strict";
import {
  createGame,
  claimReward,
  rollRewards,
  maxHp,
} from "../src/game/combat/engine";
import {
  prepareClash,
  publicClash,
  resolveClash,
  validateClash,
  submitClash,
} from "../src/game/combat/reaction-engine";
import { reactionManeuvers } from "../src/game/combat/reaction-rules";
import {
  calculateClash,
  previewClashDamage,
} from "../src/game/combat/clash-damage";
import {
  claimJourneyReward,
  journeyEnemy,
  nextJourneyBattle,
} from "../src/game/journey/journey";
import { SKILLS, knownSkills } from "../src/game/skills/skills";
import { maxPoise } from "../src/game/combat/tactics";
import type { Placement } from "../src/game/types";
const p = (id: string, x = 0, y = 0, rotation = 0): Placement => ({
  id,
  x,
  y,
  rotation,
});
function fixture(a = [p("skill:dodge")], b = [p("kick")]) {
  const g = beginClash(
    createGame("Навыки", () => 0.5),
    () => 0.5,
  );
  for (const f of [g.player, g.enemy]) {
    f.stats = initialStartingStats();
    f.skills = ["dodge", "composure", "bandage"];
    f.gear = { weapon: "dagger", shield: null, body: null, feet: null };
    f.hp = maxHp(f);
    f.poise = 3;
    f.prone = false;
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
    playerPlaced: a,
    enemyPlaced: b,
    playerModifiers: {},
    enemyModifiers: {},
  });
  return g;
}
const calc = (g: ReturnType<typeof fixture>) =>
  calculateClash(
    g,
    { player: g.clashPlan!.playerPlaced, enemy: g.clashPlan!.enemyPlaced },
    { player: {}, enemy: {} },
  );
function reward() {
  const g = fixture();
  g.phase = "victory";
  g.reward = { kind: "skill", skillId: "sidestep" };
  g.rewardOptions = [g.reward];
  return g;
}
test("skills are separate rewards, exclude known skills and preserve the soul option", () => {
  const g = fixture();
  for (const n of [0, 0.3, 0.9]) {
    const rewards = rollRewards(g.player, g.enemy, () => n);
    assert.equal(rewards[0].kind, "souls");
    assert.deepEqual(
      rewards.filter((r) => r.kind === "skill"),
      [{ kind: "skill", skillId: "sidestep" }],
    );
  }
});
test("learning fills a free slot and replacement is explicit at the three-skill limit", () => {
  const g = reward();
  g.player.skills = ["dodge"];
  g.player.hp = 4;
  const learned = claimJourneyReward(g, "learn");
  assert.deepEqual(
    new Set(learned.player.skills),
    new Set(["dodge", "sidestep"]),
  );
  assert.equal(learned.player.hp, 4);
  assert.equal(learned.phase, "ready");
  assert.deepEqual(g.player.skills, ["dodge"]);
  const full = reward();
  assert.throws(() => claimReward(full, "learn"), /трёх/);
  assert.throws(() => claimReward(full, "learn", 0, "missing"), /имеющийся/);
  full.player.cooldowns = { "skill:dodge": 1 };
  const replaced = claimReward(full, "learn", 0, "dodge");
  assert.equal(replaced.player.skills!.length, 3);
  assert.ok(!replaced.player.skills!.includes("dodge"));
  assert.ok(replaced.player.skills!.includes("sidestep"));
  assert.equal(replaced.player.cooldowns?.["skill:dodge"], undefined);
  assert.throws(() => claimReward(replaced, "learn"), /недоступна/);
});
test("skill rewards cannot be claimed as items, forged, duplicated or taken after skipping", () => {
  const g = reward();
  assert.throws(() => claimReward(g, "equip"));
  assert.throws(() => claimReward(g, "learn", 5));
  g.reward = { kind: "skill", skillId: "dodge" };
  g.rewardOptions = [g.reward];
  assert.throws(() => claimReward(g, "learn"), /уже/);
  assert.throws(() => claimReward(g, "souls"));
  assert.equal(g.phase, "victory");
});
test("old saves have no skills; learning persists through reload, defeat and a new journey", () => {
  const g = fixture();
  delete g.player.skills;
  const before = structuredClone(g);
  assert.equal(
    reactionManeuvers(prepareClash(g).player).some((m) => m.skillId),
    false,
  );
  assert.deepEqual(g, before);
  g.player.skills = ["dodge", "sidestep", "composure"];
  g.phase = "defeat";
  const next = beginClash(
    nextJourneyBattle(g, undefined, undefined, () => 0.5),
    () => 0.5,
  );
  assert.deepEqual(next.player.skills, g.player.skills);
  assert.equal(knownSkills(next.enemy).length, 0);
});
test("dodge cancels all attack types, health, poise and frost in its cells", () => {
  for (const weapon of ["axe", "frost-dagger", "staff", "hammer"]) {
    const g = fixture([p("skill:dodge")], [p("strike-1")]);
    g.enemy.gear.weapon = weapon;
    g.enemy.stats.strength = 5;
    g.enemy.stats.intelligence = 5;
    // Staff ray extends beyond the square; use a compressed attack to test full coverage.
    if (weapon === "staff") {
      g.enemy.gear.amulet = "fold-amulet";
      g.clashPlan!.enemyModifiers = { compressed: "strike-1" };
    }
    const result = resolveClash(g, () => 0.9);
    assert.equal(result.log[0].clash!.playerDamage, 0, weapon);
    assert.equal(result.log[0].clash!.playerPoiseLoss, 0, weapon);
    assert.equal(result.player.offBalance, false);
  }
  const kick = resolveClash(fixture(), () => 0);
  assert.equal(kick.log[0].clash!.playerPoiseLoss, 0);
  assert.equal(kick.player.offBalance, false);
});
test("partial evasion protects only covered cells and preview matches resolution", () => {
  const g = fixture([p("skill:dodge")], [p("kick", 1, 1)]);
  const preview = previewClashDamage(
    publicClash(g),
    g.clashPlan!.playerPlaced,
  )!;
  assert.equal(preview.cells[4].playerDamage, 0);
  assert.ok(preview.cells[5].playerDamage > 0);
  assert.equal(preview.sides.player.poiseLoss, 1);
  const done = resolveClash(g, () => 0.9).log[0].clash!;
  assert.deepEqual(done.summary, preview.sides);
  assert.equal(done.cells[4].interaction, "evaded");
});
test("dodge prevents guard pressure, causes no pressure or shield combos itself", () => {
  const g = fixture([p("skill:dodge")], [p("guard")]);
  const c = calc(g);
  assert.equal(c.sides.player.poiseLoss, 0);
  assert.equal(c.sides.enemy.poiseLoss, 0);
  assert.equal(c.sides.player.combos.length, 0);
  g.player.gear.shield = "kite-shield";
  g.clashPlan!.enemyPlaced = [p("strike-1")];
  assert.equal(calc(g).sides.player.poiseRecovered, 0);
});
test("skills obey ownership, rocks, board edges, shared budgets, rotation and prone state", () => {
  const g = fixture();
  assert.doesNotThrow(() => validateClash(g, "player", [p("skill:dodge")], {}));
  assert.throws(() => validateClash(g, "player", [p("skill:sidestep")], {}));
  assert.throws(() => validateClash(g, "player", [p("skill:dodge", 2, 2)], {}));
  g.clashPlan!.blocked = [4];
  assert.throws(() => validateClash(g, "player", [p("skill:dodge")], {}));
  g.clashPlan!.blocked = [];
  g.clashPlan!.playerBudget = 3;
  assert.throws(() => validateClash(g, "player", [p("skill:dodge")], {}));
  g.player.skills = ["sidestep"];
  assert.doesNotThrow(() =>
    validateClash(g, "player", [p("skill:sidestep", 0, 0, 1)], {}),
  );
  g.player.prone = true;
  assert.deepEqual(
    reactionManeuvers(g.player).map((m) => m.id),
    ["stand"],
  );
});
test("skill cooldown survives reload, lasts a complete round and then expires", () => {
  const first = resolveClash(fixture(), () => 0.5);
  assert.equal(first.player.cooldowns?.["skill:dodge"], 1);
  const saved = prepareClash(first, () => {
    throw Error("reroll");
  });
  assert.equal(
    reactionManeuvers(saved.player).find((m) => m.id === "skill:dodge")!
      .cooldown,
    1,
  );
  Object.assign(saved.clashPlan!, {
    blocked: [],
    special: undefined,
    playerPlaced: [p("rest", 2, 2)],
    enemyPlaced: [p("rest")],
  });
  assert.throws(
    () => validateClash(saved, "player", [p("skill:dodge")], {}),
    /восстанавливается/,
  );
  assert.equal(
    resolveClash(saved, () => 0.5).player.cooldowns?.["skill:dodge"],
    undefined,
  );
});
test("composure recovers before damage and caps at max poise", () => {
  const g = fixture([p("skill:composure")], [p("kick")]);
  g.player.poise = 1;
  const s = calc(g).sides.player;
  assert.equal(s.poiseRecovered, 3);
  assert.equal(s.poiseLoss, 2);
  assert.equal(s.poiseAfter, 2);
  g.player.poise = maxPoise(g.player);
  assert.equal(calc(g).sides.player.poiseRecovered, 0);
});
test("bandage heals after damage without exceeding max health or reviving", () => {
  const g = fixture([p("skill:bandage")], [p("strike-1")]);
  g.player.hp = 4;
  const s = calc(g).sides.player;
  assert.equal(s.hpAfter, 4 - s.damage + 2);
  assert.equal(s.healed, 2);
  g.player.hp = 1;
  assert.equal(calc(g).sides.player.hpAfter, 0);
  assert.equal(calc(g).sides.player.healed, undefined);
  g.player.hp = maxHp(g.player);
  g.clashPlan!.enemyPlaced = [p("rest", 2, 2)];
  assert.equal(calc(g).sides.player.hpAfter, maxHp(g.player));
});
test("enemies gain zero to three unique skills by stage, unrelated to player loadout", () => {
  const g = fixture();
  for (let stage = 1; stage <= 5; stage++) {
    g.journey!.stage = stage;
    const e = journeyEnemy(g, () => 0.5);
    assert.equal(knownSkills(e).length, Math.max(0, stage - 2));
    assert.equal(new Set(e.skills).size, e.skills!.length);
  }
  assert.equal(SKILLS.length, 4);
});
test("enemy reaction can choose and resolve a learned defensive skill, without leaking its plan", () => {
  const g = fixture([p("heavy")], [p("rest")]);
  g.enemy.skills = ["dodge"];
  g.enemy.gear.shield = null;
  g.player.gear.weapon = "axe";
  g.player.stats.strength = 10;
  Object.assign(g.clashPlan!, {
    preparer: "player",
    reactor: "enemy",
    stage: "preparation",
    enemyBudget: 4,
  });
  assert.equal(publicClash(g).clash!.enemyPlaced, undefined);
  const done = submitClash(g, [p("heavy")], {}, () => 0.1);
  assert.ok(done.log[0].clash!.enemyPlaced.some((p) => p.id === "skill:dodge"));
  assert.equal(done.log[0].clash!.enemyDamage, 0);
});
