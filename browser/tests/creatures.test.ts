import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CREATURES } from "@/game/creatures/catalog";
import { createGame, generateEnemy, canUse, wear } from "@/game/combat/engine";
import { ITEMS, item } from "@/game/equipment/catalog";
import { DAMAGE_TYPES } from "@/game/combat/damage-types";
import { portrait } from "@/game/characters/portraits";
const rng =
  (seed = 17) =>
  () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };

test("bestiary owns valid figures, left-facing portraits and complete image assets", () => {
  assert.equal(CREATURES.length, 41);
  assert.equal(CREATURES.filter((c) => c.source.section === "11").length, 10);
  assert.equal(new Set(CREATURES.map((c) => c.id)).size, CREATURES.length);
  for (const c of CREATURES) {
    const variants = [
      c.figures,
      ...Object.values(c.variants ?? {}).map((v) => v.figures),
    ];
    assert.ok(c.description.trim().length > 0, c.id);
    assert.equal(portrait(`creature:${c.id}`).facing, "left");
    for (const path of new Set([
      c.portrait.src,
      ...variants.flat().map((m) => m.art!),
    ])) {
      const png = readFileSync(`../public${path}`);
      assert.equal(png.toString("ascii", 1, 4), "PNG", path);
      assert.ok(png.readUInt32BE(16) > 0);
    }
    for (const figures of variants) {
      assert.equal(new Set(figures.map((m) => m.id)).size, figures.length);
      for (const m of figures) {
        assert.ok(m.name && m.art, m.id);
        assert.ok(m.shape!.length >= 1 && m.shape!.length <= 9, m.id);
        assert.equal(
          new Set(m.shape!.map((p) => p.join(","))).size,
          m.shape!.length,
        );
        for (const [x, y] of m.shape!)
          assert.ok(x >= 0 && x < 3 && y >= 0 && y < 3, m.id);
        for (const type of Object.keys(m.healthDamage?.types ?? {}))
          assert.ok(type in DAMAGE_TYPES, m.id);
      }
    }
  }
});
test("equipment restrictions apply to generation and explicit wear", () => {
  const hero = createGame("Тест", rng()).player;
  hero.stats = {
    strength: 12,
    agility: 12,
    vitality: 12,
    intelligence: 12,
  };
  for (const c of CREATURES.filter((c) => c.encounter.combat)) {
    const f = generateEnemy(hero, rng(), undefined, c.id);
    for (const id of Object.values(f.gear).filter(Boolean)) {
      const gear = item(id);
      assert.ok(c.equipment.slots.includes(gear.slot), `${c.id}: ${id}`);
      assert.ok(canUse(f, gear));
    }
    f.stats = { ...hero.stats };
    for (const gear of ITEMS.filter((i) => !i.unarmed)) {
      const allowed =
        c.equipment.slots.includes(gear.slot) &&
        (!c.equipment.allowedItems ||
          c.equipment.allowedItems.includes(gear.id));
      assert.equal(canUse(f, gear), allowed, `${c.id}: ${gear.id}`);
      if (!allowed) assert.throws(() => wear(f, gear));
    }
  }
});
