import test from "node:test";
import assert from "node:assert/strict";
import { item } from "@/game/equipment/catalog";
import { createGame } from "@/game/combat/engine";
import { itemManeuvers, maneuverDamage } from "@/game/combat/reaction-rules";
import { explainDamage } from "@/game/equipment/damage-explanation";
import { figureEffects } from "@/features/combat/FigureCard/model";
import { skill, skillManeuver } from "@/game/skills/skills";
import { ITEMS, itemAtLevel } from "@/game/equipment/catalog";
test("formula describes a shared per-cell budget and its integer damage-type shares", () => {
  const f = createGame("Формулы", () => 0.5).player;
  f.stats.agility = 2;
  f.stats.intelligence = 3;
  const m = itemManeuvers(item("frost-dagger@2"))[1],
    parts = explainDamage(f, m);
  assert.equal(
    parts.reduce((sum, p) => sum + p.value, 0) * m.shape.length,
    maneuverDamage(f, m),
  );
  assert.ok(
    parts.every(
      (p) =>
        p.formula.includes("Ловкость 2") &&
        p.formula.includes("Интеллект 3") &&
        p.formula.endsWith(`${p.value}×${m.shape.length}`),
    ),
  );
  assert.deepEqual(explainDamage(f, itemManeuvers(item("buckler"))[0]), []);
});

const stats = { strength: 1, agility: 1, vitality: 1, intelligence: 1 };
test("figure card contains just the requested compact effect lines", () => {
  const m = itemManeuvers(item("spear"))[2];
  assert.deepEqual(figureEffects(m, stats), [
    "Колющий урон: 3 + (Ловкость 1 − 1) = 3×3",
    "Урон выносливости: 1×3",
    "Цена: 4 выносливости",
    "В колоде: 2",
  ]);
  assert.deepEqual(
    figureEffects(
      { ...m, healthDamage: undefined, staminaDamagePerCell: 0 },
      stats,
    ),
    ["Цена: 4 выносливости", "В колоде: 2"],
  );
});

test("formula includes item level in the base and displays integer type shares", () => {
  const fighter = { stats: { ...stats, agility: 2, intelligence: 4 } };
  assert.equal(
    explainDamage(fighter, itemManeuvers(item("dagger@3"))[1])[0].formula,
    "5 + (Ловкость 2 − 1) = 6×2",
  );
  const mixed = explainDamage(
    fighter,
    itemManeuvers(item("frost-dagger@2"))[1],
  );
  assert.equal(mixed.length, 2);
  assert.ok(mixed.some((part) => part.formula.includes("⌈")));
  assert.ok(mixed.some((part) => part.formula.includes("⌊")));
});

test("defense, healing and counter effects keep their actual units and conditions", () => {
  const block = figureEffects(itemManeuvers(item("buckler"))[0], stats);
  assert.ok(block.includes("Блок: весь входящий урон"));
  assert.ok(block.includes("Цена: 1 выносливости за заблокированную клетку"));
  assert.ok(!block.some((line) => line.startsWith("Урон")));
  const healing = figureEffects(skillManeuver(skill("bandage")!), stats);
  assert.ok(healing.includes("Восстановление здоровья: 2 за фигуру"));
  assert.ok(!healing.some((line) => line.includes("×3")));
  const parry = figureEffects(skillManeuver(skill("parry")!), stats);
  assert.ok(
    parry.includes("Колющий урон при контратаке: 2 + (Ловкость 1 − 1) = 2×1"),
  );
  assert.ok(parry.includes("Уклонение: весь входящий урон"));
});

test("displayed damage matches combat for every weapon and level, excluding zero shares", () => {
  for (const level of [1, 2, 5]) {
    const f = createGame("Формулы", () => 0.5).player;
    f.stats = {
      ...stats,
      strength: level,
      agility: level,
      intelligence: level,
    };
    for (const equipment of ITEMS.filter((i) => i.kind === "weapon")) {
      for (const m of itemManeuvers(itemAtLevel(equipment, level))) {
        const parts = explainDamage(f, m);
        assert.ok(parts.every((part) => part.value > 0));
        assert.equal(
          parts.reduce((sum, part) => sum + part.value, 0) * m.shape.length,
          maneuverDamage(f, m),
          `${equipment.id}@${level}: ${m.name}`,
        );
      }
    }
  }
});
