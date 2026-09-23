import test from "node:test";
import assert from "node:assert/strict";
import { ITEMS, item } from "../src/game/equipment/catalog";
import { createGame, attackPower } from "../src/game/combat/engine";
import {
  itemManeuvers,
  maneuverDamage,
  reactionManeuvers,
  isStrike,
} from "../src/game/combat/reaction-rules";
import { compareItem } from "../src/game/equipment/item-comparison";

test("opponent comparison uses its stats only on candidate and leaves current player damage intact", () => {
  const { player, enemy } = createGame("Осмотр", () => 0.5);
  player.stats.agility = 2;
  enemy.stats.agility = 8;
  player.gear.weapon = "dagger";
  enemy.gear.weapon = "dagger";
  const own = compareItem(item("dagger"), player),
    foe = compareItem(item("dagger"), player, enemy);
  assert.deepEqual(
    own.rows.find((r) => r.key === "damage"),
    { key: "damage", label: "Урон обычной атаки", current: 3, candidate: 3 },
  );
  assert.equal(foe.rows.find((r) => r.key === "damage")?.current, 3);
  assert.equal(foe.rows.find((r) => r.key === "damage")?.candidate, 9);
  assert.equal(
    itemManeuvers(item("dagger"), enemy).filter((m) => m.action === "attack")
      .length,
    2,
  );
  assert.equal(
    maneuverDamage(
      enemy,
      itemManeuvers(item("dagger"), enemy).find((m) => m.action === "heavy")!,
    ),
    14,
  );
});
test("every weapon and shield figure matches combat component rounding on varied owners without mutating gear", () => {
  for (const equipment of ITEMS.filter((i) =>
    ["weapon", "shield"].includes(i.kind),
  ))
    for (const level of [1, 3, 8]) {
      const f = createGame("Фигуры", () => 0.5).player;
      f.stats = {
        strength: level,
        agility: level + 1,
        endurance: level,
        intelligence: level + 2,
        reaction: 1,
      };
      const before = structuredClone(f);
      for (const m of itemManeuvers(equipment, f)) {
        const armed = {
          ...f,
          gear: { ...f.gear, weapon: m.weaponId ?? f.gear.weapon },
        };
        assert.equal(
          maneuverDamage(f, m),
          isStrike(m)
            ? attackPower(armed, { action: m.action as "attack", step: 0 })
            : 0,
          `${equipment.id}/${m.id}/${level}`,
        );
      }
      assert.deepEqual(f, before);
    }
});
test("fist, kick, shield and non-attacks use the correct source, not the held weapon damage", () => {
  const f = createGame("Приёмы", () => 0.5).player;
  f.gear.weapon = "ephemeral-sword";
  f.stats.intelligence = 9;
  f.stats.strength = 3;
  const tokens = reactionManeuvers(f);
  assert.equal(
    maneuverDamage(
      f,
      tokens.find((m) => m.id === "strike-1")!,
    ),
    10,
  );
  assert.equal(
    maneuverDamage(
      f,
      tokens.find((m) => m.id === "fist")!,
    ),
    3,
  );
  assert.equal(
    maneuverDamage(
      f,
      tokens.find((m) => m.id === "kick")!,
    ),
    3,
  );
  assert.equal(
    maneuverDamage(
      f,
      tokens.find((m) => m.id === "rest")!,
    ),
    0,
  );
  assert.equal(
    maneuverDamage(
      f,
      itemManeuvers(item("buckler"), f).find((m) => m.action === "shield")!,
    ),
    4,
  );
  assert.equal(
    maneuverDamage(
      f,
      itemManeuvers(item("buckler"), f).find((m) => m.action === "block")!,
    ),
    0,
  );
});
test("reward previews default back to player stats even when fighter is prone or cannot equip the item yet", () => {
  const { player, enemy } = createGame("Награда", () => 0.5);
  enemy.stats.intelligence = 8;
  player.prone = true;
  assert.equal(
    compareItem(item("ephemeral-sword"), player, enemy).rows.find(
      (r) => r.key === "damage",
    )?.candidate,
    9,
  );
  assert.equal(
    compareItem(item("ephemeral-sword"), player).rows.find(
      (r) => r.key === "damage",
    )?.candidate,
    2,
  );
  const heavy = itemManeuvers(item("ephemeral-sword"), player).find(
    (m) => m.action === "heavy",
  )!;
  assert.equal(maneuverDamage(player, heavy), 3);
  assert.equal(compareItem(item("ephemeral-sword"), player).usable, false);
});
