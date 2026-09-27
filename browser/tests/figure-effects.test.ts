import assert from "node:assert/strict";
import { test } from "node:test";
import { existsSync } from "node:fs";
import baseFigures from "../../data/base-figures.json";
import { ITEMS } from "@/game/equipment/catalog";
import { SKILLS } from "@/game/skills/skills";
import { CREATURES } from "@/game/creatures/catalog";
import { allFigures } from "@/game/combat/deck";
import { calculateClash } from "@/game/combat/clash-damage";
import { cellInteraction } from "@/game/combat/cell-interaction";
import { isGuard } from "@/game/combat/reaction-rules";
import { normalizeGame } from "@/game/combat/tactics";
import { beginClash } from "@/game/combat/reaction-engine";
import { createJourney } from "@/game/journey/journey";
import type { Maneuver } from "@/game/types";

test("all configured figures use explicit effects; natural actions and shoes own their art", () => {
  const figures = [
    ...baseFigures,
    ...ITEMS.flatMap((item) => item.figures),
    ...CREATURES.flatMap((creature) => creature.figures),
    ...SKILLS.flatMap((skill) => (skill.figure ? [skill.figure] : [])),
  ];
  for (const m of figures) {
    assert.equal("action" in m, false, m.id);
    if ((m.blockCost ?? 0) > 0) assert.equal(m.blocks, true, m.id);
    if (m.art) assert.ok(existsSync(`../public${m.art}`), m.art);
  }
  for (const m of [
    ...baseFigures,
    ...ITEMS.filter((item) => item.slot === "feet").flatMap(
      (item) => item.figures,
    ),
  ])
    assert.ok(m.art, m.id);
});

test("blocking uses the explicit effect, not a defense label, name or cost", () => {
  const g = createJourney("Эффекты", () => 0.5);
  const attack = allFigures(g.player).find((m) => m.id === "base:fist")!;
  const baseGuard = allFigures(g.player).find((m) => m.id === "base:guard")!;
  attack.staminaDamagePerCell = 3;
  const defender = { ...baseGuard, id: "unrelated", name: "Иной приём" };
  const at = (m: Maneuver) => ({ id: m.id, x: 0, y: 0, rotation: 0 });
  g.enemy.deck = { draw: [], hand: [attack], discard: [], exchanged: false };
  g.player.deck = { draw: [], hand: [defender], discard: [], exchanged: false };
  const calc = () =>
    calculateClash(
      g,
      { player: [at(defender)], enemy: [at(attack)] },
      { player: {}, enemy: {} },
    );
  assert.equal(calc().playerDamage, 0);
  assert.equal(calc().sides.player.staminaLoss, 0);
  assert.equal(calc().sides.player.blockCost, 1);
  assert.equal(cellInteraction(attack, defender), "blocked");

  defender.blocks = false;
  assert.equal(isGuard(defender), false);
  assert.equal(calc().playerDamage, 3);
  assert.equal(calc().sides.player.staminaLoss, 3);
  assert.equal(cellInteraction(attack, defender), "attack");
});

test("old figure snapshots migrate without resetting hands, committed moves or result history", () => {
  const saved = beginClash(
    createJourney("Сохранение", () => 0.5),
    () => 0.5,
  );
  const figures = allFigures(saved.player);
  const fist = figures.find((m) => m.id === "base:fist")!;
  const guard = figures.find((m) => m.id === "base:guard")!;
  const kick = figures.find((m) => m.id === "base:kick")!;
  function legacy(m: Maneuver, action: string) {
    const copy = { ...structuredClone(m), action };
    delete copy.blocks;
    delete copy.art;
    return copy;
  }
  const cards = [
    legacy(fist, "attack"),
    legacy(guard, "block"),
    legacy(kick, "kick"),
  ];
  for (const f of [
    saved.player,
    saved.enemy,
    ...Object.values(saved.journey!.enemies!),
  ])
    f.deck = {
      hand: [cards[0]],
      draw: [cards[1]],
      discard: [cards[2]],
      exchanged: true,
    };
  saved.log = [
    {
      round: 1,
      playerAction: "Блок",
      enemyAction: "Удар",
      events: [],
      clash: {
        preparer: "player",
        reactor: "enemy",
        blocked: [],
        playerPlaced: [],
        enemyPlaced: [],
        playerModifiers: {},
        enemyModifiers: {},
        playerDamage: 0,
        enemyDamage: 0,
        playerStaminaLoss: 0,
        enemyStaminaLoss: 0,
        cells: [
          {
            index: 0,
            player: cards[1],
            enemy: cards[2],
            playerDamage: 0,
            enemyDamage: 0,
            interaction: "blocked",
          },
        ],
      },
    },
  ];
  const before = structuredClone(saved);
  const next = normalizeGame(saved);
  const current = [
    next.player,
    next.enemy,
    ...Object.values(next.journey!.enemies!),
  ];
  for (const f of current) {
    assert.equal(f.deck!.exchanged, true);
    assert.deepEqual(
      f.deck!.hand.map((m) => m.id),
      [fist.id],
    );
    assert.deepEqual(
      f.deck!.draw.map((m) => m.id),
      [guard.id],
    );
    assert.deepEqual(
      f.deck!.discard.map((m) => m.id),
      [kick.id],
    );
    assert.equal(isGuard(f.deck!.draw[0]), true);
    assert.equal(f.deck!.draw[0].art, guard.art);
    assert.equal(f.deck!.discard[0].art, kick.art);
    for (const m of [...f.deck!.hand, ...f.deck!.draw, ...f.deck!.discard])
      assert.equal("action" in m, false);
  }
  const cell = next.log[0].clash!.cells[0];
  assert.equal(isGuard(cell.player), true);
  assert.equal(cell.enemy!.art, kick.art);
  assert.equal("action" in cell.player!, false);
  assert.equal("action" in cell.enemy!, false);
  assert.deepEqual(next.clashPlan, before.clashPlan);
  assert.deepEqual(next.journey!.map, before.journey!.map);
  assert.deepEqual(normalizeGame(next), next);
  assert.deepEqual(saved, before);
});
