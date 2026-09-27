import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { ITEMS, item } from "@/game/equipment/catalog";
import { createGame, wear, claimReward } from "@/game/combat/engine";
import { ITEM_IMAGES, equipmentSlot } from "@/game/equipment/item-art";

test("all equipment including jewelry has distinct square PNG artwork", async () => {
  const illustrated = ITEMS;
  assert.deepEqual(
    Object.keys(ITEM_IMAGES).sort(),
    illustrated.map((i) => i.id).sort(),
  );
  assert.equal(new Set(Object.values(ITEM_IMAGES)).size, illustrated.length);
  for (const item of illustrated) {
    assert.ok(ITEM_IMAGES[item.id].startsWith("/items/"));
    const png = await readFile(
      new URL(`../../public${ITEM_IMAGES[item.id]}`, import.meta.url),
    );
    assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.equal(png.readUInt32BE(16), png.readUInt32BE(20));
    assert.ok(png.readUInt32BE(16) >= 1024);
  }
});

test("equipment cells follow a two-handed weapon and its replacement with a shield", () => {
  const game = createGame("Осмотр", () => 0.5);
  Object.assign(game.player.stats, {
    strength: 4,
    agility: 4,
    vitality: 4,
    intelligence: 4,
  });
  assert.equal(equipmentSlot(game.player, "weapon").equipment?.id, "fist");
  assert.equal(equipmentSlot(game.player, "body").equipment, null);
  wear(game.player, item("greatsword"));
  assert.equal(
    equipmentSlot(game.player, "weapon").equipment?.id,
    "greatsword",
  );
  assert.equal(equipmentSlot(game.player, "shield").blocked, true);
  assert.equal(equipmentSlot(game.player, "shield").equipment, null);
  wear(game.player, item("buckler"));
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
