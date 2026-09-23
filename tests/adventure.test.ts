import { initialStartingStats } from "../src/game/progression/creation-rules";
import { journeyEnemyLevel } from "../src/game/progression/souls";
import { beginClassicClash as beginClash } from "./classic-fixture";
import { test } from "node:test";
import assert from "node:assert/strict";
import { createGame, maxHp, statTotal } from "../src/game/combat/engine";
import {
  prepareClash,
  publicClash,
  resolveClash,
  validateClash,
} from "../src/game/combat/reaction-engine";
import {
  attackDamage,
  previewClashDamage,
} from "../src/game/combat/clash-damage";
import {
  reactionManeuvers,
  maneuverDamage,
} from "../src/game/combat/reaction-rules";
import { placementCells } from "../src/game/combat/board";
import {
  claimJourneyReward,
  nextJourneyBattle,
  journeyVictory,
} from "../src/game/journey/journey";

import type { Game, Placement } from "../src/game/types";
const random = () => 0.72;
const p = (id: string, x = 0, y = 0, rotation = 0): Placement => ({
  id,
  x,
  y,
  rotation,
});
function fixture() {
  const g = beginClash(createGame("Новые правила", random), random);
  for (const f of [g.player, g.enemy]) {
    f.gear = { weapon: null, shield: null, body: null, feet: null };
    f.hp = 100;
    delete f.archetype;
    f.poise = 6;
    f.tactical = true;
  }
  Object.assign(g.clashPlan!, {
    blocked: [],
    special: undefined,
    playerBudget: 5,
    enemyBudget: 5,
    playerPlaced: [p("strike-1")],
    enemyPlaced: [p("rest", 2, 2)],
    preparer: "player",
    reactor: "enemy",
    stage: "preparation",
  });
  return g;
}
function fixedNext(
  g: Game,
  player = [p("rest", 2, 2)],
  enemy = [p("strike-1")],
) {
  Object.assign(g.clashPlan!, {
    blocked: [],
    special: undefined,
    playerPlaced: player,
    enemyPlaced: enemy,
    playerModifiers: {},
    enemyModifiers: {},
  });
  return g;
}
test("continuous frost hits cannot refresh the penalty and leave a full recovery round", () => {
  let g = fixture();
  g.enemy.gear.weapon = "frost-dagger";
  g.enemy.stats.intelligence = 2;
  g = resolveClash(fixedNext(g), random);
  assert.equal(g.player.offBalance, true);
  assert.equal(g.player.chilled, true);
  g = resolveClash(fixedNext(g), random);
  assert.equal(g.player.offBalance, false);
  assert.equal(g.player.frostImmune, true);
  assert.equal(
    g.clashPlan!.playerBudget,
    g.clashPlan!.preparer === "player" ? 5 : 4,
  );
  const hp = g.player.hp;
  g = resolveClash(fixedNext(g), random);
  assert.equal(g.player.offBalance, false);
  assert.equal(g.player.frostImmune, false);
  assert.ok(g.player.hp < hp);
  g = resolveClash(fixedNext(g), random);
  assert.equal(g.player.offBalance, true);
});
test("strong actions recover for one full round and cannot be resubmitted or reset by reload", () => {
  let g = fixture();
  g.clashPlan!.playerPlaced = [p("heavy")];
  g = resolveClash(g, random);
  assert.equal(g.player.cooldowns?.heavy, 1);
  assert.equal(prepareClash(g, random).player.cooldowns?.heavy, 1);
  assert.throws(
    () => validateClash(g, "player", [p("heavy")], {}),
    /восстанавливается/,
  );
  g = resolveClash(fixedNext(g, [p("strike-1")], [p("rest", 2, 2)]), random);
  assert.equal(g.player.cooldowns?.heavy, undefined);
  g.player.gear.shield = "buckler";
  fixedNext(g, [p("fortify")], [p("rest", 2, 2)]);
  g = resolveClash(g, random);
  assert.equal(g.player.cooldowns?.fortify, 1);
  assert.equal(
    reactionManeuvers(g.player).find((m) => m.id === "guard")!.cooldown,
    0,
  );
});
test("axe and spear concentrate damage in their marked cells and rotation preserves the tip", () => {
  const g = fixture();
  g.player.gear.weapon = "axe";
  g.player.stats.strength = 3;
  let m = reactionManeuvers(g.player).find((m) => m.id === "heavy")!;
  assert.deepEqual(m.cellWeights, [0.6, 0.2, 0.2]);
  const positions = placementCells(m, p("heavy", 0, 0, 1), {}),
    hit = attackDamage(g.player, g.enemy, m, positions, Array(9));
  assert.deepEqual(hit.shares, [5.4, 1.8, 1.8]);
  const guard = reactionManeuvers(g.enemy).find((m) => m.id === "guard")!,
    opposing = Array(9);
  opposing[positions[0]] = guard;
  assert.equal(
    attackDamage(g.player, g.enemy, m, positions, opposing).damage,
    3.6,
  );
  g.player.gear.weapon = "spear";
  m = reactionManeuvers(g.player)[0];
  assert.deepEqual(m.cellWeights, [0.2, 0.2, 0.6]);
  assert.deepEqual(placementCells(m, p("strike-1", 0, 0, 1), {}), [0, 3, 6]);
});
test("hammer trades health damage for poise; staff offers exclusive beam or corner patterns", () => {
  const g = fixture();
  g.player.gear.weapon = "hammer";
  g.player.stats.strength = 4;
  const hammer = reactionManeuvers(g.player)[0];
  assert.equal(maneuverDamage(g.player, hammer), 6);
  assert.equal(resolveClash(g, random).log[0].clash!.enemyPoiseLoss, 3);
  g.player.gear.weapon = "staff";
  g.player.stats.intelligence = 2;
  const spells = reactionManeuvers(g.player).filter(
    (m) => m.choiceGroup === "spell",
  );
  assert.equal(spells.length, 2);
  assert.notDeepEqual(spells[0].shape, spells[1].shape);
  g.clashPlan!.playerBudget = 9;
  assert.throws(
    () => validateClash(g, "player", [p("strike-1"), p("spell-arc", 0, 1)], {}),
    /рисунок/,
  );
});
test("special cells honor blocks, armor, adjacency and restore stance", () => {
  const g = fixture();
  g.player.gear.weapon = "axe";
  g.player.stats.strength = 3;
  g.enemy.gear.body = "rags";
  const m = reactionManeuvers(g.player)[0],
    indices = placementCells(m, p("strike-1"), {});
  const ordinary = attackDamage(g.player, g.enemy, m, indices, Array(9));
  assert.ok(
    attackDamage(g.player, g.enemy, m, indices, Array(9), {
      index: 0,
      kind: "pierce",
    }).damage > ordinary.damage,
  );
  assert.equal(
    attackDamage(g.player, g.enemy, m, indices, Array(9), {
      index: 8,
      kind: "surge",
    }).damage,
    ordinary.damage,
  );
  assert.equal(
    attackDamage(g.player, g.enemy, m, indices, Array(9), {
      index: 0,
      kind: "surge",
    }).damage,
    6.5,
  );
  g.player.poise = 1;
  g.clashPlan!.playerPlaced = [p("guard")];
  g.clashPlan!.special = { index: 0, kind: "rally" };
  assert.equal(resolveClash(g, random).player.poise, 3);
});
test("all enemy traits have mechanical effects without changing stat totals", () => {
  const g = fixture();
  g.enemy.stats = initialStartingStats();
  g.enemy.archetype = "warden";
  g.enemy.poise = 1;
  g.clashPlan!.enemyPlaced = [p("guard", 0, 1)];
  assert.equal(resolveClash(g, random).enemy.poise, 2);
  g.enemy.archetype = "duelist";
  g.enemy.gear.weapon = "club";
  const moves = reactionManeuvers(g.enemy);
  assert.equal(
    moves.filter((m) => m.action === "attack" && m.weaponId === "club").length,
    2,
  );
  assert.equal(moves[0].shape.length, 1);
  g.enemy.archetype = "ghost";
  g.clashPlan!.blocked = [0];
  assert.doesNotThrow(() => validateClash(g, "enemy", [p("strike-1")], {}));
  const punch = reactionManeuvers(g.player)[0];
  assert.equal(
    attackDamage(g.player, g.enemy, punch, [0], [punch]).damage,
    0.8,
  );
  g.enemy.archetype = "crusher";
  const heavy = reactionManeuvers(g.enemy).find((m) => m.id === "heavy")!;
  assert.equal(heavy.cellWeights![0], 0.6);
  assert.equal(statTotal(g.player), statTotal(g.enemy));
});
test("reaction forecasts exactly match resolution with every special cell and weighted weapons", () => {
  for (const kind of ["pierce", "rally", "surge"] as const)
    for (const weapon of [
      "axe",
      "spear",
      "hammer",
      "staff",
      "ephemeral-sword",
    ]) {
      const g = fixture();
      g.player.gear.weapon = weapon;
      g.player.stats.strength = 4;
      g.enemy.archetype = "ghost";
      g.enemy.gear.body = "rags";
      Object.assign(g.clashPlan!, {
        preparer: "enemy",
        reactor: "player",
        stage: "reaction",
        special: { index: 0, kind },
        playerPlaced: [p("strike-1")],
        enemyPlaced: [p("strike-1")],
        enemyModifiers: {},
        playerModifiers: {},
      });
      const forecast = previewClashDamage(
          publicClash(g),
          g.clashPlan!.playerPlaced,
        )!,
        actual = resolveClash(g, random).log[0].clash!;
      assert.deepEqual(
        forecast.cells,
        actual.cells.map(({ index, playerDamage, enemyDamage }) => ({
          index,
          playerDamage,
          enemyDamage,
        })),
        `${kind}/${weapon}`,
      );
    }
});
test("legacy committed plans stay intact and acquire new rules only next round", () => {
  const g = fixture();
  delete g.player.tactical;
  delete g.enemy.tactical;
  delete g.journey;
  const plan = structuredClone(g.clashPlan);
  const after = prepareClash(g, () => {
    throw Error("no rerolls");
  });
  assert.deepEqual(after.clashPlan, plan);
  assert.equal(after.player.tactical, undefined);
  assert.equal(after.player.hp, g.player.hp);
  assert.equal(resolveClash(after, random).player.tactical, true);
});
test("journey preserves wounds, validates forge offers, advances five fights and restarts after champion", () => {
  let g = fixture();
  g.player.hp = 2;
  g.phase = "victory";
  g.reward = { kind: "souls", amount: 2 };
  g.rewardOptions = [g.reward];
  journeyVictory(g, random);
  g = claimJourneyReward(g, "souls");
  assert.equal(g.player.hp, 2);
  assert.throws(
    () => nextJourneyBattle(g, undefined, undefined, random),
    /путь/,
  );
  assert.throws(
    () => nextJourneyBattle(g, "forge", "greatsword", random),
    /кузницы/,
  );
  const camp = nextJourneyBattle(g, "camp", undefined, random),
    risk = nextJourneyBattle(g, "risk", undefined, random);
  assert.ok(camp.player.hp > risk.player.hp);
  assert.equal(camp.journey!.stage, 2);
  assert.equal(risk.enemy.elite, true);
  const elite = beginClash(risk, random);
  assert.equal(
    elite.clashPlan!.enemyBudget,
    elite.clashPlan!.preparer === "enemy" ? 6 : 5,
  );
  for (let stage = 2; stage <= 5; stage++) {
    g = nextJourneyBattle(g, "camp", undefined, random);
    assert.equal(g.journey!.stage, stage);
    assert.equal(
      statTotal(g.enemy),
      journeyEnemyLevel(g.journey!.startLevel, stage) + 7,
    );
    g.phase = "victory";
    g.reward = { kind: "souls", amount: 2 };
    g.rewardOptions = [g.reward];
    journeyVictory(g, random);
    g = claimJourneyReward(g, "souls");
  }
  assert.equal(g.journey!.finished, true);
  g = nextJourneyBattle(g, undefined, undefined, random);
  assert.equal(g.journey!.stage, 1);
  assert.equal(g.journey!.expedition, 2);
  assert.equal(g.player.hp, maxHp(g.player));
});
test("forge swaps in a wearable offered item and defeat restarts without deleting equipment", () => {
  const g = fixture();
  g.phase = "ready";
  g.player.hp = 2;
  g.player.gear.weapon = "club";
  g.journey!.offers = ["dagger"];
  const next = nextJourneyBattle(g, "forge", "dagger", random);
  assert.equal(next.player.gear.weapon, "dagger");
  assert.equal(next.journey!.stage, 2);
  next.phase = "defeat";
  next.player.hp = 0;
  const restart = nextJourneyBattle(next, undefined, undefined, random);
  assert.equal(restart.player.gear.weapon, "dagger");
  assert.equal(restart.journey!.stage, 1);
  assert.equal(restart.player.hp, maxHp(restart.player));
});

test("elite reward adds a distinct item even when its first candidate was already offered", () => {
  const g = fixture();
  g.enemy.elite = true;
  g.rewardOptions = [{ kind: "item", itemId: "dagger" }];
  journeyVictory(g, () => 0);
  assert.equal(g.rewardOptions.length, 2);
  assert.notDeepEqual(g.rewardOptions[0], g.rewardOptions[1]);
});
