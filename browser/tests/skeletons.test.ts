import { test } from "node:test";
import assert from "node:assert/strict";
import { createGame, generateEnemy, generateEnemyGear, canUse } from "@/game/combat/engine";
import { creature, sampleCreature } from "@/game/creatures/catalog";
import { item } from "@/game/equipment/catalog";
import { buildDeck, startDeck, spendCards } from "@/game/combat/deck";
const rng = (seed: number) => () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);

test("both skeletons have wearable weapons at every supported encounter level", () => {
  for (const level of [1, 2, 5, 12]) for (let seed = 1; seed <= 50; seed++) {
    const hero = createGame("Проверка", rng(seed)).player;
    hero.stats = { strength: level + 3, agility: 1, vitality: 1, intelligence: 1 };
    for (const id of ["skeleton", "skeleton-archer"]) {
      const enemy = generateEnemy(hero, rng(seed), undefined, id);
      assert.ok(enemy.gear.weapon, `${id}, level ${level}`);
      const weapon = item(enemy.gear.weapon!);
      assert.ok(canUse(enemy, weapon));
      assert.ok(creature(id)!.equipment.allowedItems!.includes(weapon.templateId ?? weapon.id));
      if (id === "skeleton-archer") {
        assert.equal(weapon.templateId, "hunting-bow");
        assert.equal(enemy.gear.shield, null);
      } else assert.equal(weapon.hands, 1);
      for (const slot of ["body", "feet", "ring", "amulet"] as const) assert.equal(enemy.gear[slot], null);
      assert.ok(buildDeck(enemy).some(card => card.category === "attack"));
    }
  }
});
test("skeleton shield is a single configurable random roll and respects the budget", () => {
  const hero = createGame("Проверка", rng(9)).player;
  const enemy = generateEnemy(hero, rng(12), undefined, "skeleton");
  enemy.stats = {strength: 6, agility: 6, vitality: 6, intelligence: 6};
  assert.ok(generateEnemyGear(enemy, () => 0).shield);
  assert.equal(generateEnemyGear(enemy, () => 0.999).shield, null);
  let shields = 0;
  for (let seed=1; seed<=200; seed++) if (generateEnemyGear(enemy,rng(seed)).shield) shields++;
  assert.ok(shields > 0 && shields < 200);
  enemy.stats = {strength: 1, agility: 1, vitality: 1, intelligence: 1};
  assert.equal(generateEnemyGear(enemy, () => 0).shield, null);
});
test("archer shots recycle in free mode without an ammunition limit", () => {
  const hero = createGame("Проверка", rng(1)).player;
  hero.stats = { strength: 4, agility: 1, vitality: 1, intelligence: 1 };
  const enemy = generateEnemy(hero, rng(2), undefined, "skeleton-archer");
  enemy.battleMode="free";
  startDeck(enemy,rng(3));
  let shots=0;
  for(let turn=0;turn<50;turn++) {
    shots+=enemy.deck!.hand.filter(c=>c.category==="attack").length;
    spendCards(enemy,enemy.deck!.hand.map(c=>c.id),rng(turn+1));
  }
  assert.ok(shots>50);
  assert.equal(item(enemy.gear.weapon!).templateId,"hunting-bow");
});
test("skeletons do not enter the unarmed first-map pool", () => {
  for(const id of ["skeleton","skeleton-archer"]) assert.equal(creature(id)!.encounter.minExpedition,2);
  for(let seed=1;seed<=200;seed++) assert.ok(!sampleCreature(1,rng(seed),"introductory").id.startsWith("skeleton"));
});
