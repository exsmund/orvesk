import { test } from "node:test";
import assert from "node:assert/strict";
import { ITEMS, item } from "../src/game/equipment/catalog";
import {
  createGame,
  resolveTurn,
  generateEnemy,
  canUse,
  statTotal,
  claimReward,
  nextBattle,
  maxHp,
  displaced,
  reaches,
  damageParts,
} from "../src/game/combat/engine";
import { actionCost, stamina } from "../src/game/combat/tactics";
import { type Choice, type Game } from "../src/game/types";

function rng(seed = 73) {
  return () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
function fixture(enemy: Choice = { action: "block", step: 0 }): Game {
  const g = createGame("Тест", rng());
  g.enemy.gear = { ...g.player.gear };
  g.distance = 60;
  g.enemyIntent = enemy;
  return g;
}
function rolls(player: number, enemy: number, rest = 0.5) {
  const values = [(player - 0.5) / 20, (enemy - 0.5) / 20];
  return () => (values.length ? values.shift()! : rest);
}

test("new character: all ones, no gear, full health; initial enemy has same stats", () => {
  const g = createGame("Путник", rng());
  assert.deepEqual(Object.values(g.player.stats), [1, 1, 1, 1, 1]);
  assert.deepEqual(Object.values(g.player.gear), [null, null, null, null]);
  assert.deepEqual(g.enemy.stats, g.player.stats);
  assert.equal(g.player.hp, 12);
});
test("enemy randomization keeps point sum, minimum 1 and wearable equipment", () => {
  const p = fixture().player;
  p.stats = {
    strength: 5,
    agility: 5,
    endurance: 4,
    intelligence: 4,
    reaction: 1,
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
test("distance preview includes only player step and attacks use combined movement", () => {
  const g = fixture({ action: "attack", step: -1 });
  g.distance = 120;
  assert.equal(reaches(g, { action: "attack", step: 0 }), false);
  assert.equal(reaches(g, { action: "attack", step: 1 }), true);
  const after = resolveTurn(g, { action: "attack", step: 1 }, rolls(10, 5));
  assert.equal(after.distance, 120);
  assert.equal(after.enemy.hp, 12);
  assert.equal(after.player.hp, 12);
});
test("critical 20 penetrates shield but not armor", () => {
  const g = fixture();
  g.player.stats.strength = 5;
  g.enemy.gear.shield = "kite-shield";
  g.enemy.gear.body = "plate";
  assert.equal(
    resolveTurn(g, { action: "attack", step: 0 }, rolls(20, 19)).enemy.hp,
    9,
  );
});
test("higher attack die subtracts shield and armor; ties and lower rolls block all", () => {
  const g = fixture();
  g.player.stats.strength = 5;
  g.enemy.gear.shield = "kite-shield";
  g.enemy.gear.body = "plate";
  assert.equal(
    resolveTurn(g, { action: "attack", step: 0 }, rolls(15, 10)).enemy.hp,
    11,
  );
  for (const [a, d] of [
    [10, 15],
    [10, 10],
    [20, 20],
  ])
    assert.equal(
      resolveTurn(g, { action: "attack", step: 0 }, rolls(a, d)).enemy.hp,
      12,
    );
});
test("robe reduces magic by 30 percent after flat armor; HP allows decimals", () => {
  const g = fixture({ action: "attack", step: 0 });
  g.player.stats.intelligence = 2;
  g.player.gear.weapon = "staff";
  g.enemy.gear.body = "robe";
  const result = resolveTurn(g, { action: "attack", step: 0 }, rolls(10, 5));
  assert.equal(result.enemy.hp, 9.2);
});
test("parry causes an immediate riposte and heavy attack has a rounded multiplier", () => {
  const g = fixture({ action: "parry", step: 0 });
  const result = resolveTurn(g, { action: "heavy", step: 0 }, rolls(4, 14));
  assert.equal(result.player.hp, 10.7);
  assert.equal(result.enemy.hp, 12);
  assert.equal(damageParts(g.player, { action: "heavy", step: 0 })[0].value, 2);
  assert.equal(
    resolveTurn(g, { action: "attack", step: 0 }, rolls(20, 19)).enemy.hp,
    11,
  );
});
test("riposte cannot reach beyond weapon range; kicks bypass parry", () => {
  const g = fixture({ action: "parry", step: 0 });
  g.player.gear.weapon = "dagger";
  g.distance = 90;
  const parry = resolveTurn(g, { action: "attack", step: 0 }, rolls(3, 15));
  assert.equal(parry.player.hp, 12);
  assert.equal(parry.enemy.hp, 12);
  assert.equal(
    resolveTurn(g, { action: "kick", step: 0 }, rolls(3, 15)).enemy.hp,
    11,
  );
});
test("player acts first: lethal damage cancels enemy attack", () => {
  const g = fixture({ action: "heavy", step: 0 });
  g.enemy.hp = 1;
  g.player.hp = 1;
  const result = resolveTurn(g, { action: "attack", step: 0 }, rolls(1, 20));
  assert.equal(result.phase, "victory");
  assert.equal(result.player.hp, 1);
  assert.ok(result.reward);
  assert.equal(g.enemy.hp, 1, "engine does not mutate original state");
});
test("knockdown consumes only next turn, prevents defense, and standing clears it", () => {
  const g = fixture({ action: "attack", step: 0 });
  g.enemy.poise = 3;
  const result = resolveTurn(g, { action: "kick", step: 0 }, rolls(10, 10, 0));
  assert.equal(result.enemy.prone, true);
  assert.equal(result.player.hp, 11, "enemy still acts this turn");
  result.enemyIntent = { action: "block", step: 1 };
  const standing = resolveTurn(
    result,
    { action: "attack", step: 0 },
    rolls(2, 20),
  );
  assert.equal(standing.enemy.prone, false);
  assert.equal(standing.enemy.hp, 10);
  assert.equal(standing.player.hp, 11);
  assert.equal(standing.distance, result.distance);
});
test("iron boots raise off balance chance, and it suppresses one turn of movement", () => {
  const g = fixture({ action: "parry", step: 0 });
  function kick(withBoots: boolean) {
    const copy = structuredClone(g);
    if (withBoots) copy.player.gear.feet = "iron-boots";
    const values = [0.5, 0.5, 0.07];
    return resolveTurn(
      copy,
      { action: "kick", step: 0 },
      () => values.shift() ?? 0.5,
    );
  }
  assert.equal(kick(false).enemy.offBalance, false);
  const after = kick(true);
  assert.equal(after.enemy.offBalance, true);
  after.enemyIntent = { action: "attack", step: -1 };
  const moved = resolveTurn(after, { action: "block", step: 0 }, rolls(10, 10));
  assert.equal(moved.distance, after.distance);
  assert.equal(moved.enemy.offBalance, false);
});
test("two-handed weapon and shield are exclusive, swapped gear drops on ground", () => {
  const g = fixture({ action: "parry", step: 0 });
  g.player.stats.strength = 3;
  g.player.stats.endurance = 2;
  g.player.gear.weapon = "greatsword";
  g.ground = ["buckler"];
  assert.equal(displaced(g.player, item("buckler"))[0].id, "greatsword");
  const withShield = resolveTurn(
    g,
    { action: "equip", step: 0, itemId: "buckler" },
    rolls(10, 5),
  );
  assert.equal(withShield.player.gear.weapon, null);
  assert.equal(withShield.player.gear.shield, "buckler");
  assert.deepEqual(withShield.ground, ["greatsword"]);
  withShield.enemyIntent = { action: "parry", step: 0 };
  const withSword = resolveTurn(
    withShield,
    { action: "equip", step: 0, itemId: "greatsword" },
    rolls(10, 5),
  );
  assert.equal(withSword.player.gear.shield, null);
  assert.equal(withSword.player.gear.weapon, "greatsword");
  assert.deepEqual(withSword.ground, ["buckler"]);
});
test("requirements, missing shield and missing item are enforced", () => {
  const g = fixture();
  g.ground = ["greatsword"];
  assert.throws(
    () => resolveTurn(g, { action: "equip", itemId: "greatsword", step: 0 }),
    /характеристик/,
  );
  assert.throws(() => resolveTurn(g, { action: "shield", step: 0 }), /щит/);
  assert.throws(
    () => resolveTurn(g, { action: "equip", itemId: "dagger", step: 0 }),
    /больше нет/,
  );
});
test("shield strike and fists remain available with equipped weapon", () => {
  const g = fixture({ action: "attack", step: 0 });
  g.player.gear.shield = "buckler";
  g.player.gear.weapon = "dagger";
  assert.equal(
    resolveTurn(g, { action: "shield", step: 0 }, rolls(2, 19)).enemy.hp,
    10,
  );
  assert.equal(
    resolveTurn(g, { action: "attack", step: 0, useFist: true }, rolls(2, 19))
      .enemy.hp,
    11,
  );
});
test("reward is claimed only once; next battle preserves character and restores health", () => {
  const g = fixture();
  g.phase = "victory";
  g.reward = { kind: "souls", amount: 2 };
  g.player.hp = 3;
  assert.throws(() => nextBattle(g), /награду/);
  const rewarded = claimReward(g, "souls");
  assert.equal(rewarded.player.stats.endurance, 1);
  assert.equal(rewarded.souls, 2);
  assert.throws(() => claimReward(rewarded, "souls"), /недоступна/);
  const next = nextBattle(rewarded, rng());
  assert.equal(next.player.hp, 12);
  assert.equal(next.player.name, g.player.name);
  assert.equal(next.fight, 2);
  assert.equal(statTotal(next.enemy), 5);
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
test("defeat restores same fighter without reward, completed games reject turns", () => {
  const g = fixture({ action: "heavy", step: 0 });
  g.player.hp = 1;
  const dead = resolveTurn(g, { action: "attack", step: 0 }, rolls(2, 10));
  assert.equal(dead.phase, "defeat");
  assert.equal(dead.reward, null);
  assert.throws(
    () => resolveTurn(dead, { action: "attack", step: 0 }),
    /завершён/,
  );
  const next = nextBattle(dead, rng());
  assert.equal(next.player.hp, maxHp(next.player));
  assert.deepEqual(next.player.stats, g.player.stats);
});
test("catalog IDs unique; all damage types covered; representative 80/95 cm ranges", () => {
  assert.equal(new Set(ITEMS.map((i) => i.id)).size, ITEMS.length);
  assert.equal(item("fist").range, 80);
  assert.equal(item("dagger").range, 95);
  assert.equal(
    new Set(ITEMS.flatMap((i) => i.damage?.map((d) => d.type) ?? [])).size,
    7,
  );
});
test("100 seeded campaigns complete with valid rewards and no equipment violations", () => {
  for (let seed = 0; seed < 100; seed++) {
    const random = rng(seed);
    let g = createGame("Путник", random);
    for (let fight = 0; fight < 5; fight++) {
      let turns = 0;
      while (g.phase === "combat" && turns++ < 400) {
        const best = g.ground.find(
          (id) => canUse(g.player, item(id)) && item(id).kind === "weapon",
        );
        let choice: Choice =
          !g.player.gear.weapon && best
            ? { action: "equip", itemId: best, step: 0 }
            : g.distance > (item(g.player.gear.weapon).range ?? 80)
              ? { action: "attack", step: 1 }
              : { action: "heavy", step: 0 };
        if (actionCost(g.player, choice) > stamina(g.player))
          choice = { action: "rest", step: 0 };
        g = resolveTurn(g, choice, random);
        assert.ok(g.distance >= 40 && g.distance <= 350);
        for (const f of [g.player, g.enemy]) {
          assert.ok(f.hp >= 0);
          assert.ok(!(item(f.gear.weapon).hands === 2 && f.gear.shield));
        }
      }
      assert.notEqual(g.phase, "combat", `seed ${seed}: battle must finish`);
      if (g.phase === "victory") {
        if (g.reward?.kind === "souls") g = claimReward(g, "souls");
        else if (g.reward?.kind === "item") {
          assert.ok(canUse(g.player, item(g.reward.itemId)));
          g = claimReward(g, "equip");
        } else
          g = claimReward(g, "learn", 0, g.player.skills?.[0] ?? undefined, 0);
      }
      g = nextBattle(g, random);
    }
  }
});
