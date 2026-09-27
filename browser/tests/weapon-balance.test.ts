import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ITEMS,
  item,
  itemAtLevel,
  WEAPON_WEIGHTS,
} from "@/game/equipment/catalog";
import { createGame, canUse } from "@/game/combat/engine";
import { allFigures, buildDeck } from "@/game/combat/deck";
import { itemManeuvers } from "@/game/combat/reaction-rules";
import { figureCellDamage, figureCellParts } from "@/game/combat/figure-power";
import { possiblePlacements, placementCells } from "@/game/combat/board";
import type { Maneuver, Stat } from "@/game/types";

const weapons = ITEMS.filter((i) => i.kind === "weapon" && !i.unarmed);
const branches = ["strength", "agility", "intelligence"] as const;

test("weapon choice is equal by stat, rarity and grip; every lore weapon is included", () => {
  assert.equal(weapons.length, 42);
  for (const stat of branches) {
    const pure = weapons.filter(
      (w) => Object.keys(w.requirements).length === 1 && stat in w.requirements,
    );
    assert.equal(pure.length, 11, stat);
    assert.deepEqual(
      [0, 1, 2, 3].map((tier) => pure.filter((w) => w.tier === tier).length),
      [2, 3, 4, 2],
      stat,
    );
    assert.equal(pure.filter((w) => w.hands === 1).length, 7, stat);
    assert.equal(
      weapons.filter((w) => stat in w.requirements).length,
      17,
      stat,
    );
  }
  for (const pair of [
    ["strength", "agility"],
    ["strength", "intelligence"],
    ["agility", "intelligence"],
  ]) {
    const hybrid = weapons.filter((w) =>
      pair.every((stat) => stat in w.requirements),
    );
    assert.equal(hybrid.length, 3, pair.join("+"));
    assert.equal(hybrid.filter((w) => w.hands === 1).length, 2);
    assert.ok(hybrid.every((w) => w.tier === 2));
  }
  const lore = weapons.filter((w) => w.lore);
  assert.equal(lore.length, 20);
  assert.equal(new Set(lore.map((w) => w.lore!.section)).size, 20);
});

test("weight changes figure size and cost, but not integer cell damage or stat growth", () => {
  for (const weapon of weapons) {
    assert.ok(weapon.weightClass, weapon.id);
    const weight = WEAPON_WEIGHTS[weapon.weightClass];
    const stats = Object.keys(weapon.requirements) as Stat[];
    assert.ok(stats.every((s) => s !== "vitality"));
    for (let n = 1; n <= 30; n++) {
      const budget = 2 * (n - 1);
      const level = 1 + budget / stats.length;
      const f = createGame("Баланс", () => 0.5).player;
      for (const stat of stats) f.stats[stat] = level;
      const equipment = itemAtLevel(weapon, level);
      assert.ok(canUse(f, equipment), weapon.id);
      const figures = itemManeuvers(equipment);
      const expected = 3 + 2 * budget;
      let deckDamage = 0;
      let deckCost = 0;
      let deckStaminaDamage = 0;
      assert.equal(new Set(figures.map((m) => m.id)).size, figures.length);
      figures.forEach((m) => {
        assert.equal(figureCellDamage(f, m), expected, `${weapon.id}@${level}`);
        assert.ok(
          figureCellParts(f, m).every((p) => Number.isInteger(p.value)),
        );
        assert.deepEqual([...m.healthDamage!.stats].sort(), [...stats].sort());
        assert.ok(
          m.shape.length >= weight.cells.min &&
            m.shape.length <= weight.cells.max,
          `${weapon.id}:${m.id}`,
        );
        assert.ok(Number.isInteger(m.copies) && m.copies! > 0);
        assert.ok(
          Number.isInteger(m.staminaCost) &&
            m.staminaCost! >= weight.staminaCost.min &&
            m.staminaCost! <= weight.staminaCost.max,
          `${weapon.id}:${m.id}`,
        );
        deckDamage += figureCellDamage(f, m) * m.shape.length * m.copies!;
        deckCost += m.staminaCost! * m.copies!;
        deckStaminaDamage +=
          (m.staminaDamagePerCell ?? 0) * m.shape.length * m.copies!;
        assert.ok(possiblePlacements(m, []).length > 0, m.id);
        assert.equal(
          new Set(m.shape.map((p) => p.join(","))).size,
          m.shape.length,
        );
      });
      assert.equal(
        deckDamage,
        (weapon.weightClass === "heavy" ? 14 : 12) * expected,
        weapon.id,
      );
      if (weapon.weightClass === "light") {
        assert.equal(deckCost, 12, weapon.id);
        assert.equal(deckStaminaDamage, 0, weapon.id);
      } else if (weapon.weightClass === "medium") {
        assert.equal(deckCost, 14, weapon.id);
        assert.equal(deckStaminaDamage, 6, weapon.id);
      } else {
        assert.ok(deckCost >= 18 && deckCost <= 20, weapon.id);
        assert.ok(
          deckStaminaDamage >= 14 && deckStaminaDamage <= 22,
          weapon.id,
        );
      }
      assert.equal(equipment.weightClass, weapon.weightClass);
    }
  }
});

// Compare geometry, not orientation: rotating or mirroring a shape does not make a new weapon family.
function canonical(shape: Maneuver["shape"]) {
  const variants: string[] = [];
  for (const flip of [-1, 1])
    for (let rotation = 0; rotation < 4; rotation++) {
      const points = shape.map(([a, b]) => {
        let x = a * flip,
          y = b;
        for (let r = 0; r < rotation; r++) [x, y] = [-y, x];
        return [x, y];
      });
      const minX = Math.min(...points.map(([x]) => x)),
        minY = Math.min(...points.map(([, y]) => y));
      variants.push(
        points
          .map(([x, y]) => `${x - minX},${y - minY}`)
          .sort()
          .join(";"),
      );
    }
  return variants.sort()[0];
}

test("only logically related weapons share the same set of action geometries", () => {
  const families = new Map<string, string>();
  for (const weapon of weapons) {
    assert.ok(weapon.family, weapon.id);
    const shapeSet = weapon.figures
      .map((m) => {
        assert.ok(m.shape, `${weapon.id}:${m.id}`);
        return canonical(m.shape);
      })
      .sort()
      .join(" / ");
    const family = families.get(shapeSet);
    if (family) assert.equal(weapon.family, family, weapon.id);
    else families.set(shapeSet, weapon.family);
  }
});

test("every stat offers compact attacks, broad attacks and multiple loadout sizes", () => {
  for (const stat of branches) {
    const pure = weapons.filter(
      (w) => Object.keys(w.requirements).length === 1 && stat in w.requirements,
    );
    assert.deepEqual(
      [...new Set(pure.map((w) => w.weightClass))].sort(),
      ["heavy", "light", "medium"],
      stat,
    );
    const shapes = new Set(
      pure.flatMap((w) => itemManeuvers(w).map((m) => m.shape.length)),
    );
    assert.deepEqual([...shapes].sort(), [1, 2, 3, 4], stat);
    const sizes = new Set(pure.map((w) => w.figures.length));
    assert.deepEqual([...sizes].sort(), [2, 3], stat);
    const cards = new Set(
      pure.map((w) => w.figures.reduce((n, m) => n + m.copies!, 0)),
    );
    assert.ok(cards.size >= 3, stat);
  }
});

test("dagger keeps independent single cards and uses affordable double attacks", () => {
  const f = createGame("Кинжал", () => 0.5).player;
  f.gear.weapon = "dagger";
  const cards = buildDeck(f).filter((m) => m.weaponId === "dagger");
  const singles = cards.filter((m) => m.shape.length === 1);
  assert.equal(singles.length, 6);
  assert.equal(new Set(singles.map((m) => m.id)).size, 6);
  assert.ok(singles.every((m) => m.staminaCost === 1));
  const remaining = cards.filter((m) => m.shape.length !== 1);
  assert.equal(remaining.length, 3);
  assert.ok(
    remaining.every((m) => m.shape.length === 2 && m.staminaCost === 2),
  );
});

test("weight is independent of grip and magical family variants preserve the same loadout", () => {
  assert.equal(item("hunting-bow").hands, 2);
  assert.equal(item("hunting-bow").weightClass, "light");
  assert.equal(item("spear").weightClass, "medium");
  assert.equal(item("hammer").weightClass, "heavy");
  for (const [a, b] of [
    ["frost-dagger", "dagger"],
    ["ember-sword", "shortsword"],
    ["wind-sickle", "elven-moon-sickle"],
    ["tailwind-spear", "spear"],
    ["glassfurnace-hammer", "hammer"],
    ["ephemeral-sword", "shortsword"],
  ]) {
    assert.equal(item(a).weightClass, item(b).weightClass);
    const profile = (id: string) =>
      itemManeuvers(item(id)).map((m) => ({
        shape: m.shape,
        copies: m.copies,
        cost: m.staminaCost,
        staminaDamage: m.staminaDamagePerCell,
      }));
    assert.deepEqual(profile(a), profile(b), a);
  }
});

test("two affordable heavy attacks can coexist on an empty board", () => {
  for (const weapon of weapons.filter((w) => w.weightClass === "heavy")) {
    const figures = itemManeuvers(weapon).filter((m) => m.staminaCost === 4);
    const pairs = figures.flatMap((a, i) =>
      figures
        .slice(i)
        .filter((b) => a !== b || (a.copies ?? 1) >= 2)
        .map((b) => [a, b] as const),
    );
    assert.ok(
      pairs.some(([a, b]) =>
        possiblePlacements(a, []).some(
          (p) => possiblePlacements(b, [], placementCells(a, p, {})).length > 0,
        ),
      ),
      weapon.id,
    );
  }
});

test("unarmed strong attack is in the deck and inspection, and disappears when a weapon is equipped", () => {
  const f = createGame("Кулак", () => 0.5).player;
  const attack = allFigures(f).find((m) => m.id === "base:fist-heavy")!;
  assert.ok(attack);
  assert.equal(attack.shape.length, 2);
  assert.equal(attack.staminaCost, 3);
  assert.equal(attack.staminaDamagePerCell, 1);
  assert.equal(
    buildDeck(f).filter((m) => m.templateId === attack.id).length,
    2,
  );
  const preview = item("fist").figures.find((m) => m.id === "fist-heavy")!;
  for (const key of [
    "shape",
    "copies",
    "staminaCost",
    "staminaDamagePerCell",
    "healthDamage",
  ] as const)
    assert.deepEqual(preview[key], attack[key]);
  for (const weapon of ["dagger", "greatsword"]) {
    f.gear.weapon = weapon;
    assert.ok(!allFigures(f).some((m) => m.id.startsWith("base:fist")));
  }
});
