import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createGame,
  resolveTurn,
  claimReward,
  rollRewards,
  chooseEnemy,
  generateEnemy,
  maxHp,
  canUse,
  statTotal,
} from "../src/game/combat/engine";
import {
  normalizeGame,
  publicGame,
  stamina,
  maxStamina,
  maxPoise,
  requirementGap,
  tellFor,
  actionCost,
} from "../src/game/combat/tactics";
import { item } from "../src/game/equipment/catalog";
import type { Choice, Game } from "../src/game/types";
const rolls = (a: number, b: number) => {
  const values = [(a - 0.5) / 20, (b - 0.5) / 20];
  return () => values.shift() ?? 0.5;
};
const rng = (seed: number) => () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
};
function fixture(enemy: Choice = { action: "rest", step: 0 }): Game {
  const g = createGame("Тактик", rng(4));
  g.enemy.gear = { ...g.player.gear };
  g.distance = 60;
  g.enemyIntent = enemy;
  return g;
}
test("heavy attacks spend stamina and cannot be repeated indefinitely; rest restores it", () => {
  let g = fixture();
  g = resolveTurn(g, { action: "heavy", step: 0 }, rolls(10, 10));
  assert.equal(stamina(g.player), 4);
  g.enemyIntent = { action: "rest", step: 0 };
  g = resolveTurn(g, { action: "heavy", step: 0 }, rolls(10, 10));
  assert.equal(stamina(g.player), 2);
  assert.throws(
    () => resolveTurn(g, { action: "heavy", step: 0 }),
    /Не хватает сил/,
  );
  g.enemyIntent = { action: "rest", step: 0 };
  g = resolveTurn(g, { action: "rest", step: 0 }, rolls(10, 10));
  assert.equal(stamina(g.player), 5);
});
test("heavy exposure lasts through the following turn and a miss extends it", () => {
  let g = fixture();
  g.distance = 300;
  g = resolveTurn(g, { action: "heavy", step: 0 }, rolls(10, 10));
  assert.equal(g.player.exposed, 3);
  for (const expected of [2, 1, 0]) {
    g.enemyIntent = { action: "rest", step: 0 };
    g = resolveTurn(g, { action: "rest", step: 0 }, rolls(10, 10));
    assert.equal(g.player.exposed, expected);
  }
  g = fixture({ action: "attack", step: 0 });
  const hit = resolveTurn(g, { action: "heavy", step: 0 }, rolls(10, 10));
  assert.equal(hit.player.hp, 10.7);
  assert.equal(hit.player.exposed, 2);
});
test("heavy pressures a block but is easier to parry; natural critical rule remains", () => {
  const block = resolveTurn(
    fixture({ action: "block", step: 0 }),
    { action: "heavy", step: 0 },
    rolls(11, 14),
  );
  assert.ok(block.enemy.hp < 12);
  assert.equal(block.enemy.poise, 3);
  const parry = resolveTurn(
    fixture({ action: "parry", step: 0 }),
    { action: "heavy", step: 0 },
    rolls(14, 10),
  );
  assert.equal(parry.enemy.hp, 12);
  assert.ok(parry.player.hp < 12);
  const crit = resolveTurn(
    fixture({ action: "parry", step: 0 }),
    { action: "heavy", step: 0 },
    rolls(20, 19),
  );
  assert.equal(crit.enemy.hp, 10);
});
test("kick interrupts an unexecuted heavy and accumulated poise loss causes next-turn recovery", () => {
  const g = fixture({ action: "heavy", step: 0 });
  g.enemy.poise = 3;
  const result = resolveTurn(g, { action: "kick", step: 0 }, rolls(10, 10));
  assert.equal(result.player.hp, 12);
  assert.equal(result.enemy.prone, true);
  assert.equal(result.enemy.poise, 0);
  result.enemyIntent = { action: "heavy", step: 1 };
  const stood = resolveTurn(
    result,
    { action: "attack", step: 0 },
    rolls(10, 10),
  );
  assert.equal(stood.player.hp, 12);
  assert.equal(stood.enemy.prone, false);
  assert.equal(stood.enemy.poise, maxPoise(stood.enemy));
  assert.equal(stood.distance, 60);
});
test("an enemy kick cannot retroactively cancel the player attack that already happened", () => {
  const g = fixture({ action: "kick", step: 0 });
  const result = resolveTurn(g, { action: "heavy", step: 0 }, rolls(10, 10));
  assert.equal(result.enemy.hp, 10);
  assert.ok(!result.log[0].events.some((s) => s.includes("сорвана")));
});
test("shield strike creates distance before the surviving enemy responds", () => {
  const g = fixture({ action: "attack", step: 0 });
  g.player.gear.shield = "buckler";
  const result = resolveTurn(g, { action: "shield", step: 0 }, rolls(10, 10));
  assert.equal(result.distance, 100);
  assert.equal(result.player.hp, 12);
  assert.equal(result.enemy.hp, 10);
});
test("agility changes parry odds and endurance expands both resources and health", () => {
  const g = fixture({ action: "attack", step: 0 });
  g.player.stats.agility = 9;
  const result = resolveTurn(g, { action: "parry", step: 0 }, rolls(8, 11));
  assert.equal(result.player.hp, 12);
  assert.equal(result.enemy.hp, 11);
  const player = fixture().player;
  const base = maxHp(player);
  player.stats.endurance = 5;
  assert.equal(maxStamina(player), 8);
  assert.equal(maxPoise(player), 8);
  assert.ok(maxHp(player) > base + 16);
});
test("intelligence scales frost exhaustion, magic poise damage and wind displacement", () => {
  const frost = fixture();
  frost.player.gear.weapon = "frost-dagger";
  frost.player.stats.intelligence = 8;
  frost.enemyIntent = { action: "block", step: 0 };
  const iced = resolveTurn(frost, { action: "attack", step: 0 }, rolls(20, 1));
  assert.equal(iced.enemy.stamina, 4);
  const magic = fixture();
  magic.player.gear.weapon = "staff";
  magic.player.stats.intelligence = 4;
  const broken = resolveTurn(
    magic,
    { action: "attack", step: 0 },
    rolls(10, 10),
  );
  assert.equal(broken.enemy.poise, 5); // 6 - 1 - 2 + 2 rest
  const wind = fixture({ action: "attack", step: 0 });
  wind.player.gear.weapon = "wind-sickle";
  wind.player.stats.intelligence = 4;
  assert.equal(
    resolveTurn(wind, { action: "attack", step: 0 }, rolls(10, 10)).distance,
    87,
  );
});
test("fire penetration depends on intelligence and ignores only flat protection", () => {
  const g = fixture({ action: "block", step: 0 });
  g.player.gear.weapon = "ember-sword";
  g.player.stats.intelligence = 6;
  g.enemy.gear.body = "ash-mantle";
  const result = resolveTurn(g, { action: "attack", step: 0 }, rolls(20, 1));
  assert.equal(result.enemy.hp, 7);
});
test("public preparation derives from committed intent without serializing its exact action", () => {
  const g = fixture({ action: "heavy", step: 0 });
  const visible = publicGame(g);
  assert.equal(visible.enemyTell, "windup");
  assert.ok(!("enemyIntent" in visible));
  assert.equal(tellFor({ action: "kick", step: 0 }, g.enemy), "windup");
  assert.equal(tellFor({ action: "parry", step: 0 }, g.enemy), "guard");
  assert.equal(publicGame(g).enemyTell, visible.enemyTell);
});
test("AI adapts to completed heavy attacks; styles generate valid specialized opponents", () => {
  const g = fixture();
  g.log = [1, 2].map((round) => ({
    round,
    playerDie: 10,
    enemyDie: 10,
    playerAction: "Сильная атака",
    enemyAction: "Блок",
    playerMove: "heavy",
    events: [],
  }));
  assert.equal(chooseEnemy(g, () => 0.5).action, "parry");
  g.player.stats = {
    strength: 6,
    agility: 6,
    endurance: 6,
    intelligence: 6,
    reaction: 1,
  };
  g.player.gear.weapon = "greatsword";
  const totals = { berserker: 0, duelist: 0, warden: 0 };
  for (const style of ["berserker", "duelist", "warden"] as const)
    for (let n = 0; n < 100; n++) {
      const enemy = generateEnemy(g.player, rng(n), style);
      assert.equal(statTotal(enemy), 25);
      for (const id of Object.values(enemy.gear))
        if (id) assert.ok(canUse(enemy, item(id)));
      totals[style] +=
        enemy.stats[
          style === "berserker"
            ? "strength"
            : style === "duelist"
              ? "agility"
              : "endurance"
        ];
    }
  assert.ok(
    totals.berserker > 700 && totals.duelist > 500 && totals.warden > 500,
  );
});
test("three reward options are exclusive; near-requirement items remain unwearable", () => {
  const g = fixture();
  g.phase = "victory";
  g.rewardOptions = [
    { kind: "souls", amount: 2 },
    { kind: "item", itemId: "dagger" },
    { kind: "item", itemId: "shortsword" },
  ];
  g.reward = g.rewardOptions[0];
  assert.throws(() => claimReward(g, "equip", 2), /характеристик/i);
  assert.throws(() => claimReward(g, "souls", 99), /Выберите награду/);
  assert.throws(() => claimReward(g, "souls", 0.5), /Выберите награду/);
  const won = claimReward(g, "equip", 1);
  assert.equal(won.player.gear.weapon, "dagger");
  assert.equal(won.rewardOptions, undefined);
  assert.throws(() => claimReward(won, "souls", 0), /недоступна/);
  for (let n = 0; n < 100; n++) {
    const options = rollRewards(g.player, g.enemy, rng(n));
    assert.equal(options[0].kind, "souls");
    assert.ok(options.length >= 2);
    const ids = options.flatMap((r) => (r.kind === "item" ? [r.itemId] : []));
    assert.equal(new Set(ids).size, ids.length);
    for (const id of ids) assert.ok(requirementGap(g.player, item(id)) <= 1);
  }
});
test("legacy saves keep HP, equipment, portrait and single pending reward without mutating input", () => {
  const old = fixture({ action: "heavy", step: 0 });
  old.version = 1;
  old.player.hp = 3;
  old.phase = "victory";
  old.reward = { kind: "item", itemId: "robe" };
  for (const f of [old.player, old.enemy]) {
    delete f.stamina;
    delete f.poise;
    delete f.exposed;
    delete f.style;
  }
  const snapshot = JSON.stringify(old);
  const migrated = normalizeGame(old);
  assert.equal(migrated.version, 2);
  assert.equal(migrated.player.hp, 3);
  assert.equal(stamina(migrated.player), 6);
  assert.deepEqual(migrated.player.gear, old.player.gear);
  assert.equal(migrated.player.portraitId, old.player.portraitId);
  assert.equal(JSON.stringify(old), snapshot);
  assert.equal(claimReward(old, "equip").player.gear.body, "robe");
});
test("resource validation and frozen intent survive save/reload and exhausted AI recovers", () => {
  const g = fixture();
  g.player.stamina = 1;
  assert.equal(actionCost(g.player, { action: "attack", step: 1 }), 2);
  assert.throws(
    () => resolveTurn(g, { action: "attack", step: 1 }),
    /Не хватает сил/,
  );
  g.enemy.stamina = 0;
  g.enemyIntent = { action: "heavy", step: 0 };
  assert.equal(normalizeGame(g).enemyIntent.action, "rest");
  const active = fixture({ action: "parry", step: 0 });
  assert.deepEqual(
    normalizeGame(JSON.parse(JSON.stringify(active))).enemyIntent,
    active.enemyIntent,
  );
});
