import { test } from "node:test";
import assert from "node:assert/strict";
import { item } from "../src/game/equipment/catalog";
import { compareItem } from "../src/game/equipment/item-comparison";
import { createGame, attackPower } from "../src/game/combat/engine";

test("unarmed comparison uses the fist, while empty armor slots contribute no protection", () => {
  const player = createGame("Осмотр", () => 0.5).player;
  const dagger = compareItem(item("dagger"), player);
  assert.equal(dagger.current?.id, "fist");
  assert.deepEqual(
    dagger.rows
      .filter((r) => r.key.startsWith("damage"))
      .map((r) => [r.key, r.current, r.candidate]),
    [
      ["damage", 1, 2],
      ["damage-pierce", 0, 2],
      ["damage-blunt", 1, 0],
    ],
  );
  const armor = compareItem(item("robe"), player);
  assert.equal(armor.current, null);
  assert.equal(armor.rows.find((r) => r.key === "resist-magic")?.candidate, 30);
});

test("mixed damage rounds each component exactly as combat does on the player stats", () => {
  const player = createGame("Расчёт", () => 0.5).player;
  player.stats.agility = 3;
  player.stats.intelligence = 3;
  const comparison = compareItem(item("frost-dagger"), player);
  const armed = structuredClone(player);
  armed.gear.weapon = "frost-dagger";
  assert.equal(
    comparison.rows.find((r) => r.key === "damage")?.candidate,
    attackPower(armed, { action: "attack", step: 0 }),
  );
  assert.equal(
    comparison.rows.find((r) => r.key === "damage-frost")?.candidate,
    3,
  );
});

test("comparison retains lost defenses and percentage changes rather than hiding them", () => {
  const player = createGame("Защита", () => 0.5).player;
  player.gear.body = "ash-mantle";
  const result = compareItem(item("robe"), player);
  assert.deepEqual(
    result.rows
      .filter((r) => r.key === "resist-wind")
      .map((r) => [r.current, r.candidate, r.unit]),
    [[20, 0, "%"]],
  );
  assert.deepEqual(
    result.rows
      .filter((r) => r.key === "defense-fire")
      .map((r) => [r.current, r.candidate]),
    [[2, 0]],
  );
  assert.deepEqual(
    result.rows
      .filter((r) => r.key === "resist-magic")
      .map((r) => [r.current, r.candidate]),
    [[30, 30]],
  );
});

test("hand conflicts account for every displaced item without comparing different slots", () => {
  const player = createGame("Руки", () => 0.5).player;
  player.gear.weapon = "dagger";
  player.gear.shield = "buckler";
  const sword = compareItem(item("greatsword"), player);
  assert.equal(sword.current?.id, "dagger");
  assert.deepEqual(
    sword.removed.map((i) => i.id),
    ["dagger", "buckler"],
  );
  assert.deepEqual(
    sword.conflicts.map((i) => i.id),
    ["buckler"],
  );
  player.gear.weapon = "greatsword";
  player.gear.shield = null;
  const shield = compareItem(item("buckler"), player);
  assert.equal(shield.current, null);
  assert.deepEqual(
    shield.conflicts.map((i) => i.id),
    ["greatsword"],
  );
});

test("unusable items remain inspectable and comparison never changes equipment", () => {
  const player = createGame("Требования", () => 0.5).player,
    original = structuredClone(player);
  const sword = compareItem(item("greatsword"), player);
  assert.equal(sword.usable, false);
  assert.equal(
    sword.rows.find((r) => r.key === "require-strength")?.candidate,
    3,
  );
  assert.equal(
    sword.rows.find((r) => r.key === "require-strength")?.lowerIsBetter,
    true,
  );
  assert.deepEqual(player, original);
  player.gear.feet = "iron-boots";
  const boots = compareItem(item("wanderer-boots"), player);
  assert.deepEqual(
    boots.rows
      .filter((r) => r.key === "kick")
      .map((r) => [r.current, r.candidate]),
    [[5, 0]],
  );
});
