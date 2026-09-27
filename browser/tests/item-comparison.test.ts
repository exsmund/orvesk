import { test } from "node:test";
import assert from "node:assert/strict";
import { item } from "@/game/equipment/catalog";
import { compareItem } from "@/game/equipment/item-comparison";
import { createGame } from "@/game/combat/engine";

test("unarmed comparison uses the fist, while empty armor slots contribute no protection", () => {
  const player = createGame("Осмотр", () => 0.5).player;
  const dagger = compareItem(item("dagger"), player);
  assert.equal(dagger.current?.id, "fist");
  assert.ok(!dagger.rows.some((r) => r.key.startsWith("damage")));
  const armor = compareItem(item("robe"), player);
  assert.equal(armor.current, null);
  assert.equal(armor.rows.find((r) => r.key === "defense-magic")?.candidate, 4);
});

test("comparison retains lost defenses and percentage changes rather than hiding them", () => {
  const player = createGame("Защита", () => 0.5).player;
  player.gear.body = "ash-mantle";
  const result = compareItem(item("robe"), player);
  assert.deepEqual(
    result.rows
      .filter((r) => r.key === "defense-wind")
      .map((r) => [r.current, r.candidate, r.unit]),
    [[2, 0, undefined]],
  );
  assert.deepEqual(
    result.rows
      .filter((r) => r.key === "defense-fire")
      .map((r) => [r.current, r.candidate]),
    [[2, 0]],
  );
  assert.deepEqual(
    result.rows
      .filter((r) => r.key === "defense-magic")
      .map((r) => [r.current, r.candidate]),
    [[4, 4]],
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
  const sword = compareItem(item("greatsword@3"), player);
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
    [],
  );
});
