import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { ITEMS } from "../src/game/equipment/catalog";
import {
  createGame,
  resolveTurn,
  claimReward,
} from "../src/game/combat/engine";
import { ITEM_IMAGES, equipmentSlot } from "../src/game/equipment/item-art";

test("weapons and clothing retain their original square PNGs; jewelry uses vector artwork", async () => {
  const illustrated = ITEMS.filter((i) => i.kind !== "jewelry");
  assert.deepEqual(
    Object.keys(ITEM_IMAGES).sort(),
    illustrated.map((i) => i.id).sort(),
  );
  assert.equal(new Set(Object.values(ITEM_IMAGES)).size, illustrated.length);
  for (const item of illustrated) {
    assert.equal(ITEM_IMAGES[item.id], `/items/${item.id}.png`);
    const png = await readFile(
      new URL(`../public${ITEM_IMAGES[item.id]}`, import.meta.url),
    );
    assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.equal(png.readUInt32BE(16), png.readUInt32BE(20));
    assert.ok(png.readUInt32BE(16) >= 1024);
  }
});

test("equipment cells follow a two-handed weapon and its replacement with a shield", () => {
  let game = createGame("Осмотр", () => 0.5);
  Object.assign(game.player.stats, {
    strength: 4,
    agility: 4,
    endurance: 4,
    intelligence: 4,
    reaction: 1,
  });
  game.ground = ["greatsword", "buckler"];
  game.enemyIntent = { action: "block", step: 0 };
  assert.equal(equipmentSlot(game.player, "weapon").equipment?.id, "fist");
  assert.equal(equipmentSlot(game.player, "body").equipment, null);
  game = resolveTurn(
    game,
    { action: "equip", step: 0, itemId: "greatsword" },
    () => 0.5,
  );
  assert.equal(
    equipmentSlot(game.player, "weapon").equipment?.id,
    "greatsword",
  );
  assert.equal(equipmentSlot(game.player, "shield").blocked, true);
  assert.equal(equipmentSlot(game.player, "shield").equipment, null);
  game.enemyIntent = { action: "block", step: 0 };
  game = resolveTurn(
    game,
    { action: "equip", step: 0, itemId: "buckler" },
    () => 0.5,
  );
  assert.equal(equipmentSlot(game.player, "weapon").unarmed, true);
  assert.equal(equipmentSlot(game.player, "shield").equipment?.id, "buckler");
  assert.equal(equipmentSlot(game.player, "shield").blocked, false);
});

test("wearable reward images occupy only the corresponding body and feet cells", () => {
  let game = createGame("Одежда", () => 0.5);
  for (const itemId of ["robe", "iron-boots"]) {
    game.phase = "victory";
    game.reward = { kind: "item", itemId };
    game = claimReward(game, "equip");
  }
  assert.equal(equipmentSlot(game.player, "body").equipment?.id, "robe");
  assert.equal(equipmentSlot(game.player, "feet").equipment?.id, "iron-boots");
  assert.equal(equipmentSlot(game.player, "shield").equipment, null);
  assert.equal(equipmentSlot(game.player, "weapon").unarmed, true);
});
