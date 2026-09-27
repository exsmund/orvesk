import { test } from "node:test";
import assert from "node:assert/strict";
import { CREATURES, creatureFigures } from "@/game/creatures/catalog";
import {
  createJourney,
  journeyEnemy,
  chooseJourneyStep,
} from "@/game/journey/journey";
import {
  beginClash,
  prepareClash,
  submitClash,
} from "@/game/combat/reaction-engine";
import { allFigures, buildDeck } from "@/game/combat/deck";
import { figureCellDamage } from "@/game/combat/figure-power";
import { maxHp } from "@/game/combat/engine";
import {
  seededRandom,
  simulateFirstMapBattle,
} from "./helpers/first-map-balance";

const species = CREATURES.filter(
  (c) => c.encounter.combat && c.encounter.minExpedition <= 1,
);

test("all four first-map encounters use unarmed-friendly creature figures; boss and later maps do not", () => {
  const encountered = new Set<string>();
  for (let seed = 1; seed <= 40; seed++) {
    const random = seededRandom(seed);
    const g = createJourney("Начало", random);
    for (let stage = 1; stage <= 4; stage++) {
      const f = g.journey!.enemies![`fight-${stage}`];
      encountered.add(f.creatureId!);
      assert.equal(f.creatureVariant, "introductory");
      assert.ok(Object.values(f.stats).every((v) => v === 1));
      assert.ok(Object.values(f.gear).every((id) => id === null));
      assert.equal(maxHp(f), 30);
      const deck = buildDeck(f);
      assert.equal(deck.length, 4);
      for (const m of deck) {
        assert.equal(m.staminaDamagePerCell, 0);
        if (m.category === "attack") {
          assert.equal(figureCellDamage(f, m), 1);
          assert.ok(m.shape.length <= 2);
          assert.equal(m.staminaCost, 3);
        } else assert.equal(m.shape.length, 1);
      }
    }
    const boss = g.journey!.enemies!["fight-5"];
    assert.equal(boss.creatureVariant, undefined);
    assert.ok(allFigures(boss).some((m) => figureCellDamage(boss, m) >= 3));
    g.journey!.expedition = 2;
    const later = journeyEnemy(g, random);
    assert.equal(later.creatureVariant, undefined);
    assert.ok(allFigures(later).some((m) => figureCellDamage(later, m) >= 3));
  }
  assert.deepEqual([...encountered].sort(), species.map((c) => c.id).sort());
});

test("saved maps receive the new profile without rerolling enemies or resetting an active battle", () => {
  const random = seededRandom(43);
  let g = createJourney("Сохранение", random);
  for (const f of [g.enemy, ...Object.values(g.journey!.enemies!)])
    delete f.creatureVariant;
  const loaded = prepareClash(g, random);
  assert.equal(loaded.enemy.creatureVariant, "introductory");
  assert.deepEqual(loaded.journey!.map, g.journey!.map);
  for (let stage = 1; stage <= 4; stage++) {
    const before = g.journey!.enemies![`fight-${stage}`];
    assert.deepEqual(loaded.journey!.enemies![`fight-${stage}`], {
      ...before,
      creatureVariant: "introductory",
    });
  }
  assert.deepEqual(
    loaded.journey!.enemies!["fight-5"],
    g.journey!.enemies!["fight-5"],
  );

  // Start an original-profile battle on another map, then emulate an existing first-map save.
  g.journey!.expedition = 2;
  g.phase = "combat";
  g = beginClash(g, random);
  g.journey!.expedition = 1;
  const preserved = structuredClone(g);
  const active = prepareClash(g, random);
  assert.deepEqual(active.enemy, preserved.enemy);
  assert.deepEqual(active.player, preserved.player);
  assert.deepEqual(active.clashPlan, preserved.clashPlan);
  assert.deepEqual(active.log, preserved.log);
  assert.deepEqual(g, preserved);

  const revealed = submitClash(active, [], {}, random);
  const reloaded = prepareClash(JSON.parse(JSON.stringify(revealed)), random);
  assert.deepEqual(reloaded.enemy, revealed.enemy);
  assert.deepEqual(reloaded.clashPlan, revealed.clashPlan);
  assert.deepEqual(reloaded.log, revealed.log);
  reloaded.phase = "defeat";
  const restarted = chooseJourneyStep(reloaded, { restart: true }, random);
  assert.equal(restarted.enemy.creatureVariant, "introductory");
  assert.equal(restarted.enemy.deck, undefined);
});

test("creature variants keep standard definitions intact and reject unknown profiles", () => {
  for (const c of species) {
    assert.equal(creatureFigures({ creatureId: c.id }), c.figures);
    assert.equal(
      creatureFigures({ creatureId: c.id, creatureVariant: "introductory" }),
      c.variants!.introductory.figures,
    );
    assert.throws(() =>
      creatureFigures({ creatureId: c.id, creatureVariant: "missing" }),
    );
  }
});

test("strength-one, 30-HP hero wins every ordinary encounter without gear, skills or upgrades", () => {
  const first = new Set<string>();
  for (const c of species)
    for (let stage = 1; stage <= 4; stage++)
      for (const seed of [1, 2]) {
        const result = simulateFirstMapBattle({
          creatureId: c.id,
          stage,
          seed: stage * 1000 + seed,
        });
        first.add(result.first);
        assert.equal(
          result.outcome,
          "victory",
          `${c.id}, stage ${stage}, seed ${seed}: ${JSON.stringify(result)}`,
        );
        assert.ok(result.hp > 0);
        assert.ok(result.rounds < 25);
      }
  assert.deepEqual([...first].sort(), ["enemy", "player"]);
});
