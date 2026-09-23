import test from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/game/combat/engine";
import { item } from "../src/game/equipment/catalog";
import {
  itemManeuvers,
  maneuverPoiseDamage,
} from "../src/game/combat/reaction-rules";
import { beginClash, resolveClash } from "../src/game/combat/reaction-engine";

test("item stance totals match combat for weapon types and owner bonuses", () => {
  for (const weapon of [
    "dagger",
    "hammer",
    "staff",
    "ephemeral-sword",
    "frost-dagger",
  ])
    for (const archetype of [undefined, "crusher"] as const)
      for (const action of ["attack", "heavy"]) {
        const g = beginClash(
          createGame("Эффекты", () => 0.5),
          () => 0.5,
        );
        g.player.gear = { weapon, shield: null, body: null, feet: null };
        g.player.archetype = archetype;
        g.player.stats.strength = 4;
        g.enemy.gear = { weapon: null, shield: null, body: null, feet: null };
        g.enemy.archetype = undefined;
        g.enemy.hp = 100;
        g.enemy.poise = 100;
        const m = itemManeuvers(item(weapon), g.player).find(
          (m) => m.action === action,
        )!;
        Object.assign(g.clashPlan!, {
          blocked: [],
          special: undefined,
          playerBudget: 9,
          enemyBudget: 9,
          playerModifiers: {},
          enemyModifiers: {},
          playerPlaced: [{ id: m.id, x: 0, y: 0, rotation: 0 }],
          enemyPlaced: [{ id: "rest", x: 2, y: 2, rotation: 0 }],
        });
        const result = resolveClash(g, () => 0.5).log[0].clash!;
        assert.equal(
          maneuverPoiseDamage(g.player, m),
          result.enemyPoiseLoss,
          `${weapon}/${action}/${archetype}`,
        );
      }
});
test("candidate figures use their own damage type rather than the equipped weapon", () => {
  const f = createGame("Эффекты", () => 0.5).player;
  f.tactical = true;
  f.gear.weapon = "staff";
  const dagger = itemManeuvers(item("dagger"), f);
  assert.equal(
    maneuverPoiseDamage(
      f,
      dagger.find((m) => m.action === "attack")!,
    ),
    0,
  );
  assert.equal(
    maneuverPoiseDamage(
      f,
      dagger.find((m) => m.action === "heavy")!,
    ),
    1,
  );
  f.gear.weapon = "dagger";
  f.archetype = "crusher";
  const staff = itemManeuvers(item("staff"), f);
  assert.equal(
    maneuverPoiseDamage(
      f,
      staff.find((m) => m.action === "heavy")!,
    ),
    3,
  );
  const shield = itemManeuvers(item("buckler"), f);
  for (const m of shield) assert.equal(maneuverPoiseDamage(f, m), 1);
});
