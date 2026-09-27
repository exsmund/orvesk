import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createGame,
  maxHp,
  canUse,
  wear,
  generateEnemy,
  rollRewards,
} from "@/game/combat/engine";
import {
  item,
  itemAtLevel,
  ITEMS,
  rollItemLevel,
} from "@/game/equipment/catalog";
import { buildDeck, startDeck, spendCards, fillHand } from "@/game/combat/deck";
import { allFigures } from "@/game/combat/deck";
import {
  figureCellDamage,
  figureCellParts,
  mitigate,
} from "@/game/combat/figure-power";
import {
  calculateClash,
  clashResultCells,
  placementCost,
  preparationDamage,
  previewClashDamage,
} from "@/game/combat/clash-damage";
import {
  beginClash,
  prepareClash,
  publicClash,
  submitClash,
  validateClash,
  exchangeCard,
} from "@/game/combat/reaction-engine";
import { createJourney, journeyVictory } from "@/game/journey/journey";
import { CREATURES } from "@/game/creatures/catalog";
import { itemManeuvers } from "@/game/combat/reaction-rules";
import { maxStamina, normalizeGame } from "@/game/combat/tactics";
import { upgradeAttribute, level } from "@/game/progression/souls";
import type { Fighter, Maneuver, Placement, Game } from "@/game/types";
const rng =
  (seed = 17) =>
  () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
const fighter = () => createGame("Тест", rng()).player;
const position = (m: Maneuver, x = 0, y = 0): Placement => ({
  id: m.id,
  x,
  y,
  rotation: 0,
});
function move(
  id: string,
  kind: "attack" | "block" | "dodge" | "parry" = "attack",
  shape: Maneuver["shape"] = [[0, 0]],
): Maneuver {
  return {
    id,
    name: id,
    description: "test",
    shape,
    blocks: kind === "block",
    category: kind === "attack" ? "attack" : "defense",
    healthDamage: { base: 3, stats: [], types: { blunt: 1 } },
    staminaCost: kind === "block" ? 0 : 2,
    blockCost: kind === "block" ? 1 : 0,
    evades: kind === "dodge" || kind === "parry",
    counter: kind === "parry",
    staminaDamagePerCell: kind === "attack" ? 1 : 0,
  };
}
function hand(f: Fighter, cards: Maneuver[]) {
  f.deck = { hand: cards, draw: [], discard: [], exchanged: false };
  f.stamina = 8;
  return f;
}
function battle(first: "player" | "enemy" = "enemy") {
  let g = createJourney("Тест", rng());
  g.phase = "combat";
  g = beginClash(g, rng());
  g.clashPlan!.blocked = [];
  g.clashPlan!.preparer = first;
  g.clashPlan!.reactor = first === "player" ? "enemy" : "player";
  g.lastReactor = g.clashPlan!.reactor;
  g.clashPlan!.stage = first === "player" ? "preparation" : "reaction";
  g.clashPlan!.enemyPlaced = [];
  return g;
}
test("new turns have no rocks in either battle mode, including formerly rock-producing rolls", () => {
  for (const mode of ["free", "expendable"] as const)
    for (const roll of [0, 0.25, 0.49, 0.75]) {
      const saved = createJourney("Без камней", rng());
      saved.phase = "combat";
      saved.journey!.battleMode = mode;
      const first = beginClash(saved, () => roll);
      assert.deepEqual(first.clashPlan!.blocked, []);
      delete first.clashPlan;
      const next = prepareClash(first, () => roll);
      assert.deepEqual(next.clashPlan!.blocked, []);
    }
});

test("loading removes current rocks and unlock markers without changing hands, plans or past results", () => {
  const revealed = submitClash(battle("player"), [], {}, rng());
  const resolved = submitClash(revealed, [], {}, rng());
  resolved.log[0].clash!.blocked = [4];
  for (const stage of ["preparation", "reaction", "reveal"] as const) {
    const saved = JSON.parse(JSON.stringify(resolved)) as Game;
    const attack = move("own", "attack", [
      [0, 0],
      [1, 0],
    ]);
    hand(saved.player, [attack]);
    hand(saved.enemy, [move("opponent")]);
    const plan = saved.clashPlan!;
    plan.stage = stage;
    plan.preparer = stage === "reaction" ? "enemy" : "player";
    plan.reactor = stage === "reaction" ? "player" : "enemy";
    plan.blocked = [4];
    plan.playerPlaced = [position(attack)];
    plan.enemyPlaced = [];
    plan.playerModifiers = { unlocked: 4, compressed: attack.id };
    plan.enemyModifiers = { unlocked: 4 };
    plan.committedPlayerModifiers = { ...plan.playerModifiers };
    saved.player.gear.amulet = "fold-amulet";
    saved.player.charmsUsed = { ring: true, amulet: true };
    const original = structuredClone(saved);

    const next = prepareClash(JSON.parse(JSON.stringify(saved)), rng());
    assert.deepEqual(next.clashPlan, {
      ...plan,
      blocked: [],
      playerModifiers: { compressed: attack.id },
      enemyModifiers: {},
      committedPlayerModifiers: { compressed: attack.id },
    });
    assert.deepEqual(next.player, saved.player);
    assert.deepEqual(next.enemy, saved.enemy);
    assert.deepEqual(next.log, saved.log);
    assert.doesNotThrow(() =>
      validateClash(
        next,
        "player",
        plan.playerPlaced,
        next.clashPlan!.playerModifiers,
      ),
    );
    assert.deepEqual(prepareClash(next, rng()), next);
    assert.deepEqual(saved, original);
  }
});

test("only vitality increases health, stamina is fixed, vitality upgrade heals completely", () => {
  const f = fighter();
  assert.equal(maxHp(f), 30);
  for (const stat of ["strength", "agility", "intelligence"] as const) {
    f.stats[stat] = 12;
    assert.equal(maxHp(f), 30);
  }
  f.stats.vitality = 5;
  assert.equal(maxHp(f), 110);
  assert.equal(maxStamina(), 8);
  const g = createJourney("Тест", rng());
  g.souls = 99;
  g.player.hp = 1;
  const next = upgradeAttribute(g, "vitality", level(g.player), 99);
  assert.equal(next.player.hp, maxHp(next.player));
});
test("physical and hybrid weapons have equal damage for equal invested points, every figure and level", () => {
  for (const [magic, physical, stat] of [
    ["frost-dagger", "dagger", "agility"],
    ["ember-sword", "shortsword", "strength"],
    ["wind-sickle", "elven-moon-sickle", "agility"],
  ] as const) {
    for (let n = 1; n <= 30; n++) {
      const a = fighter(),
        b = fighter();
      a.stats[stat] = a.stats.intelligence = n;
      b.stats[stat] = 2 * n - 1;
      const aa = itemManeuvers(itemAtLevel(item(magic), n)),
        bb = itemManeuvers(itemAtLevel(item(physical), 2 * n - 1));
      assert.equal(aa.length, bb.length);
      aa.forEach((m, i) => {
        assert.deepEqual(m.shape, bb[i].shape);
        assert.equal(m.staminaCost, bb[i].staminaCost);
        assert.equal(m.copies, bb[i].copies);
        assert.equal(figureCellDamage(a, m), figureCellDamage(b, bb[i]));
        assert.ok(
          figureCellParts(a, m).every((p) => Number.isInteger(p.value)),
        );
      });
    }
  }
});
test("control growth retains five full two-cell hits; armor 0,2,5 uses one coefficient", () => {
  for (let n = 1; n <= 30; n++) {
    const f = fighter();
    f.stats.vitality = f.stats.strength = n;
    const m = itemManeuvers(itemAtLevel(item("axe"), n))[0];
    assert.equal(maxHp(f) / (figureCellDamage(f, m) * m.shape.length), 5);
  }
  assert.deepEqual(
    [0, 2, 5].map((a) => mitigate(6, a)),
    [6, 5, 4],
  );
});
test("all required stats are AND at weapon level; leveled references retain art and template restrictions", () => {
  const f = fighter(),
    knife = itemAtLevel(item("frost-dagger"), 3);
  f.stats.agility = 3;
  assert.equal(canUse(f, knife), false);
  f.stats.intelligence = 3;
  assert.equal(canUse(f, knife), true);
  wear(f, knife);
  assert.equal(item(f.gear.weapon).level, 3);
  assert.deepEqual(knife.requirements, { agility: 3, intelligence: 3 });
  assert.equal(rollItemLevel(item("dagger"), 8, () => 0.5).level, 9);
  assert.equal(rollItemLevel(item("frost-dagger"), 8, () => 0.5).level, 5);
});
test("base actions are replaced by occupied slots; every shoe supplies a kick", () => {
  const f = fighter();
  assert.deepEqual(
    allFigures(f).map((m) => m.templateId ?? m.id),
    ["base:fist", "base:fist-heavy", "base:guard", "base:kick"],
  );
  f.gear.weapon = "dagger";
  assert.ok(!allFigures(f).some((m) => m.id === "base:fist"));
  assert.ok(allFigures(f).some((m) => m.id === "base:guard"));
  f.gear.shield = "buckler";
  assert.ok(!allFigures(f).some((m) => m.id === "base:guard"));
  f.gear.shield = null;
  f.gear.weapon = "greatsword";
  assert.ok(!allFigures(f).some((m) => m.id === "base:guard"));
  for (const shoe of ITEMS.filter((i) => i.slot === "feet")) {
    f.gear.feet = shoe.id;
    assert.ok(!allFigures(f).some((m) => m.id === "base:kick"));
    assert.ok(
      allFigures(f).some(
        (m) => m.equipmentId === shoe.id && m.category === "attack" && m.art,
      ),
    );
  }
});
test("passive multipliers select config category, independent duplicate IDs, no deck cap", () => {
  const f = fighter(),
    base = buildDeck(f);
  f.skills = ["attack-training", "defense-training"];
  const cards = buildDeck(f);
  assert.equal(cards.length, base.length * 2);
  assert.equal(new Set(cards.map((m) => m.id)).size, cards.length);
  assert.ok(cards.every((m) => !m.skillId));
  f.skills = ["parry", "dodge", "attack-training"];
  assert.equal(buildDeck(f).filter((m) => m.skillId === "parry").length, 1);
});
test("refill only replaces used cards; free reshuffles and single chance never does", () => {
  for (const mode of ["free", "expendable"] as const) {
    const f = fighter();
    f.battleMode = mode;
    startDeck(f, rng());
    const retained = f.deck!.hand.slice(1).map((m) => m.id),
      used = f.deck!.hand[0].id;
    spendCards(f, [used], rng());
    assert.equal(f.deck!.hand.length, 4);
    for (const id of retained) assert.ok(f.deck!.hand.some((m) => m.id === id));
    f.deck!.draw = [];
    f.deck!.hand = [];
    fillHand(f, rng());
    assert.equal(f.deck!.hand.length, mode === "free" ? 1 : 0);
  }
});
test("block cost is paid first; negative draft rejected, stamina damage never breaks paid blocks", () => {
  const a = move("attack", "attack", [
      [0, 0],
      [1, 0],
    ]),
    b = move("block", "block", [
      [0, 0],
      [1, 0],
    ]);
  a.staminaDamagePerCell = 8;
  const g = battle();
  hand(g.player, [b]);
  hand(g.enemy, [a]);
  g.player.stamina = 1;
  g.clashPlan!.enemyPlaced = [position(a)];
  const calc = calculateClash(
    g,
    { player: [position(b)], enemy: [position(a)] },
    { player: {}, enemy: {} },
  );
  assert.equal(calc.sides.player.available, -1);
  assert.equal(calc.playerDamage, 0);
  assert.throws(
    () => validateClash(g, "player", [position(b)], {}),
    /выносливости/,
  );
  g.player.stamina = 2;
  assert.doesNotThrow(() => validateClash(g, "player", [position(b)], {}));
  assert.equal(
    calculateClash(
      g,
      { player: [position(b)], enemy: [position(a)] },
      { player: {}, enemy: {} },
    ).sides.player.staminaLoss,
    0,
  );
});
test("blind first guard reserves worst case; reactive guard pays only contacted cells", () => {
  const f = hand(fighter(), [
    move("b", "block", [
      [0, 0],
      [1, 0],
    ]),
  ]);
  const p = [position(f.deck!.hand[0])];
  assert.equal(placementCost(f, p, {}).total, 2);
  assert.equal(placementCost(f, p, {}, Array(9).fill(undefined)).total, 0);
});
test("dodge avoids both damage types; parry counter only triggers on an attack", () => {
  const a = hand(fighter(), [move("a")]),
    d = hand(fighter(), [move("d", "dodge")]);
  const calc = calculateClash(
    { player: a, enemy: d },
    { player: [position(a.deck!.hand[0])], enemy: [position(d.deck!.hand[0])] },
    { player: {}, enemy: {} },
  );
  assert.equal(calc.enemyDamage, 0);
  assert.equal(calc.sides.enemy.staminaLoss, 0);
  d.deck!.hand = [move("p", "parry")];
  const p = position(d.deck!.hand[0]);
  assert.equal(
    calculateClash(
      { player: a, enemy: d },
      { player: [], enemy: [p] },
      { player: {}, enemy: {} },
    ).playerDamage,
    0,
  );
  assert.equal(
    calculateClash(
      { player: a, enemy: d },
      { player: [position(a.deck!.hand[0])], enemy: [p] },
      { player: {}, enemy: {} },
    ).playerDamage,
    3,
  );
});
test("preview and resolution share armor, capped health and one final rounding", () => {
  const g = battle();
  const a = move("a", "attack", [
    [0, 0],
    [1, 0],
    [2, 0],
  ]);
  hand(g.enemy, [a]);
  hand(g.player, []);
  g.player.stamina = 2;
  g.player.gear.body = "chainmail";
  g.clashPlan!.enemyPlaced = [position(a)];
  const preview = previewClashDamage(publicClash(g), [], {})!;
  const next = submitClash(g, [], {}, rng());
  assert.equal(next.log[0].clash!.playerDamage, preview.playerDamage);
  assert.equal(next.player.hp, preview.sides.player.hpAfter);
  assert.equal(next.player.stamina, 8);
  const saved = next.log[0].clash!;
  assert.deepEqual(
    saved.cells.map((c) => c.playerStaminaDamage),
    preview.cells.map((c) => c.playerStaminaDamage),
  );
  assert.deepEqual(
    preview.cells.slice(0, 3).map((c) => c.playerStaminaDamage),
    [0.7, 0.7, 0.6],
  );
  assert.equal(saved.playerStaminaLoss, 2);
  const older = JSON.parse(JSON.stringify(saved)) as typeof saved;
  for (const c of older.cells) {
    delete c.playerStaminaDamage;
    delete c.enemyStaminaDamage;
  }
  assert.deepEqual(
    clashResultCells(older),
    JSON.parse(JSON.stringify(saved.cells)),
  );
  assert.equal(older.cells[0].playerStaminaDamage, undefined);
});
test("cell stamina losses follow clashes, blocks, dodges and direct hits on both sides", () => {
  const a = move("own"),
    b = move("guard", "block"),
    d = move("evade", "dodge"),
    e = move("enemy", "attack", [
      [0, 0],
      [1, 0],
      [2, 0],
      [0, 1],
    ]);
  e.staminaDamagePerCell = 2;
  const calc = calculateClash(
    { player: hand(fighter(), [a, b, d]), enemy: hand(fighter(), [e]) },
    {
      player: [position(a), position(b, 1), position(d, 2)],
      enemy: [position(e)],
    },
    { player: {}, enemy: {} },
  );
  assert.deepEqual(
    calc.cells.map((c) => c.playerStaminaDamage),
    [1, 0, 0, 2, 0, 0, 0, 0, 0],
  );
  assert.deepEqual(
    calc.cells.map((c) => c.enemyStaminaDamage),
    [0.5, 0, 0, 0, 0, 0, 0, 0, 0],
  );
  assert.equal(calc.sides.player.blockCost, 1);
  assert.equal(calc.sides.player.available, 3);
  assert.equal(calc.sides.player.staminaLoss, 3);
  assert.equal(calc.sides.enemy.staminaLoss, 0.5);
});
test("compression concentrates stamina damage and caps cell losses at the remaining resource", () => {
  const a = move("compressed", "attack", [
    [0, 0],
    [1, 0],
    [2, 0],
  ]);
  a.staminaDamagePerCell = 2;
  const player = hand(fighter(), []),
    enemy = hand(fighter(), [a]);
  for (const remaining of [8, 2, 0]) {
    player.stamina = remaining;
    const calc = calculateClash(
      { player, enemy },
      { player: [], enemy: [position(a)] },
      { player: {}, enemy: { compressed: a.id } },
    );
    assert.equal(calc.cells[0].playerStaminaDamage, Math.min(remaining, 6));
    assert.ok(calc.cells.slice(1).every((c) => c.playerStaminaDamage === 0));
    assert.equal(
      calc.cells[0].playerStaminaDamage,
      calc.sides.player.staminaLoss,
    );
  }
});
test("blind preparation shows both potential damage types without revealing the enemy", () => {
  const g = battle("player");
  const a = move("own", "attack", [
    [0, 0],
    [1, 0],
    [2, 0],
  ]);
  hand(g.player, [a]);
  const visible = publicClash(g);
  assert.equal(previewClashDamage(visible, [position(a)]), null);
  const normal = preparationDamage(visible.player, [position(a)]);
  assert.deepEqual(normal.potential.slice(0, 3), [3, 3, 3]);
  assert.deepEqual(normal.stamina.slice(0, 3), [1, 1, 1]);
  const compressed = preparationDamage(visible.player, [position(a)], {
    compressed: a.id,
  });
  assert.equal(compressed.potential[0], 9);
  assert.equal(compressed.stamina[0], 3);
});
test("first commitment reveals a persisted response without resolving, cannot edit it, initiative alternates", () => {
  const g = battle("player");
  g.player.stamina = 2;
  const before = publicClash(g);
  assert.equal(before.clash!.enemyPlaced, undefined);
  assert.equal(before.enemy.deck!.hand.length, 0);
  assert.ok(before.player.deck!.draw.every((m) => Object.keys(m).length === 1));
  const revealed = submitClash(g, [], {}, rng());
  assert.equal(revealed.round, g.round);
  assert.equal(revealed.clashPlan!.stage, "reveal");
  assert.deepEqual(
    prepareClash(revealed, () => {
      throw Error("reroll");
    }),
    revealed,
  );
  assert.ok(publicClash(revealed).clash!.enemyPlaced);
  const next = submitClash(
    revealed,
    [{ id: "forged", x: 0, y: 0, rotation: 0 }],
    {},
    rng(),
  );
  assert.deepEqual(next.log[0].clash!.playerPlaced, []);
  assert.equal(next.player.stamina, 8);
  assert.equal(next.clashPlan?.preparer, "enemy");
});
test("exchange costs one, is once per round, cannot exchange in reveal or empty one-shot deck", () => {
  const g = battle();
  const old = g.player.deck!.hand[0].id;
  const updated = exchangeCard(g, old, rng());
  assert.equal(updated.player.stamina, 7);
  assert.ok(updated.player.deck!.discard.some((m) => m.id === old));
  assert.throws(() => exchangeCard(updated, updated.player.deck!.hand[0].id));
  const empty = structuredClone(g);
  empty.player.battleMode = "expendable";
  empty.player.deck!.draw = [];
  assert.throws(() => exchangeCard(empty, old));
});
test("all species produce legal affordable plans and survive serialized reload in both modes", () => {
  for (const mode of ["free", "expendable"] as const)
    for (const c of CREATURES.filter((c) => c.encounter.combat)) {
      let g = battle();
      g.journey!.battleMode = mode;
      g.enemy = generateEnemy(g.player, rng(), undefined, c.id);
      g = beginClash(g, rng());
      for (let turn = 0; turn < 3 && g.phase === "combat"; turn++) {
        if (g.clashPlan!.preparer === "enemy")
          assert.doesNotThrow(
            () =>
              validateClash(
                g,
                "enemy",
                g.clashPlan!.enemyPlaced,
                g.clashPlan!.enemyModifiers,
              ),
            c.id,
          );
        const stable = JSON.parse(JSON.stringify(g));
        assert.deepEqual(
          prepareClash(stable, () => {
            throw Error("reroll");
          }),
          stable,
        );
        g = submitClash(g, [], {}, rng());
      }
    }
});
test("defeat preserves final HP, board and lost souls on reload; old saves rejected", () => {
  const g = battle();
  g.souls = 12;
  g.player.hp = 1;
  const a = move("a");
  hand(g.enemy, [a]);
  hand(g.player, [move("p")]);
  g.clashPlan!.enemyPlaced = [position(a)];
  const dead = submitClash(g, [], {}, rng());
  assert.equal(dead.phase, "defeat");
  assert.equal(dead.player.hp, 0);
  assert.equal(dead.souls, 0);
  assert.equal(dead.journey!.lostSouls!.amount, 12);
  assert.deepEqual(
    JSON.parse(JSON.stringify(prepareClash(dead))),
    JSON.parse(JSON.stringify(dead)),
  );
  assert.throws(() => normalizeGame({ ...g, version: 4 } as unknown as Game));
});
test("loot is stable and can replace a template with a higher level", () => {
  const g = battle();
  g.player.gear.weapon = "dagger";
  g.enemy.stats.strength = 10;
  const results = new Set<string>();
  for (let n = 0; n < 100; n++)
    for (const r of rollRewards(g.player, g.enemy, rng(n)))
      if (r.kind === "item") results.add(r.itemId);
  assert.ok([...results].some((id) => id.startsWith("dagger@")));
  journeyVictory(g, rng());
  const offers = structuredClone(g.journey!.offers);
  assert.deepEqual(prepareClash(g).journey!.offers, offers);
});

test("stamina damage skips exactly the next regeneration; resting still receives damage and then refills", () => {
  const g = battle();
  const a = move("strike"),
    p = move("own");
  a.staminaDamagePerCell = 3;
  hand(g.player, [p]);
  hand(g.enemy, [a]);
  g.player.stamina = 3;
  g.clashPlan!.enemyPlaced = [position(a, 2, 2)];
  const next = submitClash(g, [position(p)], {}, rng());
  assert.equal(next.player.stamina, 0);
  assert.equal(next.player.exhausted, true);
  assert.equal(next.player.hp, g.player.hp - 3);
  const revealed = submitClash(next, [], {}, rng());
  assert.equal(revealed.clashPlan!.stage, "reveal");
  const rested = submitClash(revealed, [], {}, rng());
  assert.equal(rested.player.stamina, 8);
  assert.equal(rested.player.exhausted, false);
  const lethal = structuredClone(g);
  lethal.player.hp = 1;
  const dead = submitClash(lethal, [], {}, rng());
  assert.equal(dead.phase, "defeat");
  assert.equal(dead.player.stamina, 0, "rest cannot refill a dead fighter");
});

test("one-shot combat compares absolute HP when only counters, guards or full-health healing remain", () => {
  for (const [playerHp, enemyHp, phase] of [
    [10, 9, "victory"],
    [9, 10, "defeat"],
    [10, 10, "draw"],
  ] as const) {
    const g = battle();
    g.journey!.battleMode = "expendable";
    hand(g.player, [move("parry", "parry")]);
    hand(g.enemy, [move("guard", "block")]);
    g.player.hp = playerHp;
    g.enemy.hp = enemyHp;
    delete g.clashPlan;
    assert.equal(prepareClash(g, rng()).phase, phase);
  }
  const g = battle();
  g.journey!.battleMode = "expendable";
  const heal = { ...move("heal", "dodge"), healing: 2 };
  hand(g.player, [heal]);
  hand(g.enemy, []);
  g.player.hp = maxHp(g.player);
  g.enemy.hp = maxHp(g.enemy);
  delete g.clashPlan;
  assert.notEqual(prepareClash(g, rng()).phase, "combat");
  g.player.hp -= 2;
  assert.equal(prepareClash(g, rng()).phase, "combat");
});

test("data defines integer per-cell damage, complete deck categories and legal copy counts", () => {
  const f = fighter();
  for (const c of [undefined, ...CREATURES.filter((c) => c.encounter.combat)]) {
    f.creatureId = c?.id;
    for (const m of allFigures(f)) {
      assert.ok(["attack", "defense", "support"].includes(m.category!), m.id);
      assert.ok(Number.isInteger(m.copies) && m.copies! > 0, m.id);
      assert.ok(Number.isInteger(m.healthDamage?.base ?? 0), m.id);
      assert.ok(Number.isFinite(m.sourceLevel ?? 1), m.id);
    }
  }
  for (const equipment of ITEMS.filter((i) => !i.charmEffect))
    for (const m of equipment.figures) {
      assert.ok(
        ["attack", "defense", "support"].includes(m.category!),
        `${equipment.id}:${m.id}`,
      );
      assert.ok(
        Number.isInteger(m.copies) && m.copies! > 0,
        `${equipment.id}:${m.id}`,
      );
      assert.ok(Number.isInteger(m.healthDamage?.base ?? 0), m.id);
    }
});

test("passive armor has no misleading item levels; every attack item requirement matches its damage profile", () => {
  assert.equal(itemAtLevel(item("plate"), 30).level, 1);
  assert.equal(itemAtLevel(item("unlock-ring"), 30).level, 1);
  for (const equipment of ITEMS.filter(
    (i) => i.kind === "weapon" && !i.unarmed,
  )) {
    for (const m of equipment.figures.filter((m) => m.category === "attack")) {
      assert.deepEqual(
        [...m.healthDamage!.stats].sort(),
        Object.keys(equipment.requirements).sort(),
        equipment.id,
      );
    }
  }
});

test("pure magical weapons use the same damage budget and cost as physical equivalents", () => {
  for (const [magical, physical] of [
    ["staff", "greatsword"],
    ["ephemeral-sword", "shortsword"],
  ]) {
    for (let n = 1; n <= 30; n++) {
      const a = fighter(),
        b = fighter();
      a.stats.intelligence = n;
      b.stats.strength = n;
      const aa = itemManeuvers(itemAtLevel(item(magical), n));
      const bb = itemManeuvers(itemAtLevel(item(physical), n));
      aa.forEach((m, index) => {
        assert.equal(m.shape.length, bb[index].shape.length);
        assert.equal(m.staminaCost, bb[index].staminaCost);
        assert.equal(figureCellDamage(a, m), figureCellDamage(b, bb[index]));
      });
    }
  }
});
