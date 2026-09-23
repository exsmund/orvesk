import test from "node:test";
import assert from "node:assert/strict";
import { item } from "../src/game/equipment/catalog";
import { createGame } from "../src/game/combat/engine";
import {
  itemManeuvers,
  reactionManeuvers,
  maneuverDamage,
} from "../src/game/combat/reaction-rules";
import { explainDamage } from "../src/game/equipment/damage-explanation";

test("mixed damage shows the owner stats and rounds each heavy component after multiplication", () => {
  const f = createGame("Формулы", () => 0.5).player;
  f.stats.agility = 2;
  f.stats.intelligence = 3;
  const m = itemManeuvers(item("frost-dagger"), f).find(
    (m) => m.action === "heavy",
  )!;
  const parts = explainDamage(f, m);
  assert.deepEqual(
    parts.map((p) => p.formula),
    ["(Ловкость (2)) × 1,5 = 3", "(1 + 0,5 × Интеллект (3)) × 1,5 = 3,75 → 4"],
  );
  assert.deepEqual(
    parts.map((p) => p.value),
    [3, 4],
  );
  assert.equal(
    parts.reduce((n, p) => n + p.value, 0),
    maneuverDamage(f, m),
  );
  assert.equal(
    explainDamage({ ...f, stats: { ...f.stats, intelligence: 8 } }, m)[1]
      .formula,
    "(1 + 0,5 × Интеллект (8)) × 1,5 = 7,5 → 8",
  );
});

test("axe scaling, fist, kick and shield formulas use the action source, not the equipped weapon", () => {
  const f = createGame("Формулы", () => 0.5).player;
  f.stats.strength = 3;
  f.gear.weapon = "ephemeral-sword";
  f.stats.intelligence = 9;
  const axe = itemManeuvers(item("axe"), f).find((m) => m.action === "attack")!;
  assert.equal(
    explainDamage(f, axe)[0].formula,
    "1 + 1,5 × Сила (3) = 5,5 → 6",
  );
  const tokens = reactionManeuvers(f);
  for (const id of ["fist", "kick"])
    assert.equal(
      explainDamage(
        f,
        tokens.find((m) => m.id === id)!,
      )[0].formula,
      "Сила (3) = 3",
    );
  const shield = itemManeuvers(item("buckler"), f);
  assert.equal(
    explainDamage(
      f,
      shield.find((m) => m.action === "shield")!,
    )[0].formula,
    "1 + Сила (3) = 4",
  );
  assert.deepEqual(
    explainDamage(
      f,
      shield.find((m) => m.action === "block")!,
    ),
    [],
  );
  assert.deepEqual(
    explainDamage(
      f,
      tokens.find((m) => m.action === "rest")!,
    ),
    [],
  );
});
