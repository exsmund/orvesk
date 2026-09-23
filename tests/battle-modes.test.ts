import { FEATURE_FLAGS } from "../src/game/config/features";
import { test } from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/game/combat/engine";
import {
  beginClash,
  finishClashActions,
  prepareClash,
  resolveClash,
  submitClash,
  publicClash,
  validateClash,
} from "../src/game/combat/reaction-engine";
import { nextJourneyBattle } from "../src/game/journey/journey";
import { chooseBattleMode, figureKey } from "../src/game/combat/battle-modes";
import { reactionManeuvers, isStrike } from "../src/game/combat/reaction-rules";
import { possiblePlacements } from "../src/game/combat/board";
import type { BattleMode, Game, Placement } from "../src/game/types";
const modes: BattleMode[] = ["limited", "free", "expendable"];
const random = () => 0.5;
const p = (id: string, x = 0, y = 0): Placement => ({ id, x, y, rotation: 0 });
function fixture(mode: BattleMode): Game {
  const g = createGame("Режимы", random);
  g.journey = {
    battleMode: mode,
    startLevel: 1,
    expedition: 1,
    stage: 1,
    cleared: 0,
  };
  for (const f of [g.player, g.enemy]) {
    f.gear = { weapon: "dagger", shield: "buckler", body: null, feet: null };
    f.hp = 100;
    f.poise = 8;
    f.stats.strength = 3;
    f.stats.agility = 3;
    delete f.archetype;
  }
  const ready = beginClash(g, random);
  Object.assign(ready.clashPlan!, {
    blocked: [],
    special: undefined,
    preparer: "player",
    reactor: "enemy",
    stage: "preparation",
    playerPlaced: [],
    enemyPlaced: [],
    playerModifiers: {},
    enemyModifiers: {},
  });
  return ready;
}
function round(g: Game, player: Placement[], enemy: Placement[]) {
  Object.assign(g.clashPlan!, {
    blocked: [],
    special: undefined,
    playerPlaced: player,
    enemyPlaced: enemy,
    playerModifiers: {},
    enemyModifiers: {},
  });
  return resolveClash(g, random);
}
test("new journeys randomly choose all three modes; a restart chooses one of the other two", () => {
  assert.deepEqual(
    [0, 0.4, 0.9].map((n) => chooseBattleMode(() => n)),
    modes,
  );
  for (const mode of modes) {
    for (const n of [0, 0.9])
      assert.notEqual(
        chooseBattleMode(() => n, mode),
        mode,
      );
    const n = (modes.indexOf(mode) + 0.1) / 3;
    const fresh = beginClash(createGame("Новый", random), () => n);
    assert.equal(fresh.journey!.battleMode, mode);
    assert.equal(fresh.player.battleMode, mode);
    assert.equal(fresh.enemy.battleMode, mode);
  }
});
test("mode persists through reload, five stages and a draw; defeat keeps the mode and champion starts a new one", () => {
  for (const mode of modes) {
    let g = fixture(mode);
    assert.deepEqual(
      prepareClash(JSON.parse(JSON.stringify(g)), () => {
        throw Error("reroll");
      }),
      JSON.parse(JSON.stringify(g)),
    );
    for (let stage = 2; stage <= 5; stage++) {
      g.phase = "ready";
      g = beginClash(nextJourneyBattle(g, "camp", undefined, random), random);
      assert.equal(g.journey!.battleMode, mode);
      assert.equal(g.journey!.stage, stage);
    }
    g.phase = "draw";
    const retry = beginClash(
      nextJourneyBattle(g, undefined, undefined, random),
      random,
    );
    assert.equal(retry.journey!.stage, 5);
    assert.equal(retry.journey!.battleMode, mode);
    for (const phase of ["defeat", "ready"] as const) {
      const done = structuredClone(g);
      done.phase = phase;
      done.journey!.finished = phase === "ready";
      const next = beginClash(
        nextJourneyBattle(done, undefined, undefined, random),
        random,
      );
      if (phase === "defeat") assert.equal(next.journey!.battleMode, mode);
      else assert.notEqual(next.journey!.battleMode, mode);
      assert.equal(next.journey!.stage, 1);
      assert.equal(next.player.battleMode, next.journey!.battleMode);
      assert.equal(next.enemy.battleMode, next.journey!.battleMode);
    }
  }
});
test("legacy save keeps its committed board and adopts the limited mode without rerolling", () => {
  const g = fixture("limited");
  delete g.journey!.battleMode;
  delete g.player.battleMode;
  delete g.enemy.battleMode;
  delete g.clashPlan!.battleMode;
  const before = structuredClone(g.clashPlan),
    after = prepareClash(g, () => {
      throw Error("reroll");
    });
  assert.equal(after.journey!.battleMode, "limited");
  assert.deepEqual(after.clashPlan, before);
  assert.equal(after.player.hp, g.player.hp);
});
test("five one-cell figures are legal in limited mode if they fit the cell budget, symmetrically", () => {
  const g = fixture("limited"),
    placed = [
      p("strike-1"),
      p("strike-2", 1),
      p("guard", 2),
      p("guard-2", 0, 1),
      p("rest", 1, 1),
    ];
  g.clashPlan!.playerBudget = g.clashPlan!.enemyBudget = 5;
  for (const side of ["player", "enemy"] as const)
    assert.doesNotThrow(() => validateClash(g, side, placed, {}));
  g.clashPlan!.playerBudget = 4;
  assert.throws(() => validateClash(g, "player", placed, {}), /клеток/);
});
test("unlimited modes fit seven figures over nine cells and ignore cell budget for both sides", () => {
  const previous = FEATURE_FLAGS.combatEquipmentSwap;
  FEATURE_FLAGS.combatEquipmentSwap = true;
  try {
    const placed = [
      p("strike-1"),
      p("strike-2", 1),
      p("guard", 2),
      p("guard-2", 0, 1),
      p("rest", 1, 1),
      p("kick", 0, 2),
      { ...p("equip", 2, 1), rotation: 1, itemId: "club" },
    ];
    for (const mode of ["free", "expendable"] as const) {
      const g = fixture(mode);
      g.ground = ["club"];
      g.clashPlan!.playerBudget = g.clashPlan!.enemyBudget = 1;
      for (const side of ["player", "enemy"] as const) {
        assert.doesNotThrow(() => validateClash(g, side, placed, {}));
        assert.throws(() =>
          validateClash(g, side, [p("strike-1"), p("strike-1", 1)], {}),
        );
        assert.throws(() => validateClash(g, side, [p("heavy", 2, 2)], {}));
      }
      g.clashPlan!.blocked = [0];
      assert.throws(() => validateClash(g, "player", placed, {}));
    }
  } finally {
    FEATURE_FLAGS.combatEquipmentSwap = previous;
  }
});
test("unlimited modes ignore off-balance and elite budgets, retaining all other combat rules", () => {
  for (const mode of modes) {
    let g = fixture(mode);
    g.enemy.elite = true;
    g.player.offBalance = true;
    delete g.clashPlan;
    g = prepareClash(g, random);
    const plan = g.clashPlan!;
    if (mode === "limited") {
      assert.equal(plan.playerBudget, plan.preparer === "player" ? 4 : 3);
      assert.equal(plan.enemyBudget, plan.preparer === "enemy" ? 6 : 5);
    } else {
      assert.equal(plan.playerBudget, 9);
      assert.equal(plan.enemyBudget, 9);
      assert.equal(g.player.offBalance, false);
    }
  }
});
test("reuse works in limited and free modes, and existing strong-action cooldowns remain", () => {
  for (const mode of ["limited", "free"] as const) {
    let g = round(fixture(mode), [p("heavy")], [p("strike-1", 2, 2)]);
    assert.equal(g.player.spentFigures?.length, 0);
    assert.equal(g.player.cooldowns?.heavy, 1);
    g = round(g, [p("strike-1")], [p("strike-1", 2, 2)]);
    assert.equal(
      reactionManeuvers(g.player).find((m) => m.id === "heavy")!.cooldown,
      0,
    );
    assert.doesNotThrow(() => round(g, [p("strike-1")], [p("strike-1", 2, 2)]));
  }
});
test("expendable figures, shields and skills are consumed symmetrically only on resolution", () => {
  let g = fixture("expendable");
  g.player.skills = g.enemy.skills = ["dodge"];
  const placed = [p("strike-1"), p("guard", 2, 0), p("skill:dodge", 0, 1)];
  validateClash(g, "player", placed, {});
  assert.deepEqual(g.player.spentFigures, []);
  const initial = structuredClone(g);
  g = round(g, placed, placed);
  assert.deepEqual(initial.player.spentFigures, []);
  for (const side of ["player", "enemy"] as const) {
    assert.equal(g[side].spentFigures!.length, 3);
    const moves = reactionManeuvers(g[side]);
    for (const id of ["strike-1", "guard", "skill:dodge"])
      assert.equal(moves.find((m) => m.id === id)!.spent, true);
    assert.equal(moves.find((m) => m.id === "strike-2")!.spent, false);
    assert.throws(
      () => validateClash(g, side, [p("strike-1")], {}),
      /уже использована/,
    );
  }
  const reloaded = prepareClash(JSON.parse(JSON.stringify(g)), () => {
    throw Error("reroll");
  });
  assert.deepEqual(reloaded.player.spentFigures, g.player.spentFigures);
});
test("new opponent refreshes all spent figures and keeps the journey mode", () => {
  let g = round(fixture("expendable"), [p("strike-1")], [p("strike-1")]);
  g.phase = "ready";
  g = beginClash(nextJourneyBattle(g, "camp", undefined, random), random);
  assert.equal(g.journey!.battleMode, "expendable");
  assert.deepEqual(g.player.spentFigures, []);
  assert.deepEqual(g.enemy.spentFigures, []);
});
test("equipment source identities prevent re-equipping a spent weapon from refreshing it", () => {
  const g = round(fixture("expendable"), [p("strike-1")], [p("strike-1")]);
  g.player.gear.weapon = "club";
  assert.equal(
    reactionManeuvers(g.player).find((m) => m.id === "strike-1")!.spent,
    false,
  );
  g.player.gear.weapon = "dagger";
  assert.equal(
    reactionManeuvers(g.player).find((m) => m.id === "strike-1")!.spent,
    true,
  );
});
test("passing preserves figures and standing is repeatable but cannot be skipped", () => {
  let g = fixture("expendable");
  g = round(g, [], []);
  assert.equal(g.phase, "combat");
  assert.deepEqual(g.player.spentFigures, []);
  assert.equal(g.log[0].playerAction, "Пропуск");
  for (let i = 0; i < 2; i++) {
    g.player.prone = true;
    assert.throws(() => validateClash(g, "player", [], {}));
    g = round(g, [p("stand")], []);
    assert.equal(g.player.prone, false);
    assert.deepEqual(g.player.spentFigures, []);
  }
  assert.throws(() => validateClash(fixture("free"), "player", [], {}));
});
test("exhausted attacks end in a draw, unless an unused pickup can grant an attack", () => {
  const previous = FEATURE_FLAGS.combatEquipmentSwap;
  FEATURE_FLAGS.combatEquipmentSwap = true;
  try {
    for (const pickup of [false, true]) {
      let g = fixture("expendable");
      g.ground = pickup ? ["club"] : [];
      for (const side of ["player", "enemy"] as const)
        g[side].spentFigures = reactionManeuvers(g[side])
          .filter(isStrike)
          .map(figureKey);
      g = round(g, [], []);
      assert.equal(g.phase, pickup ? "combat" : "draw");
      if (!pickup) {
        assert.equal(g.reward, null);
        const retry = beginClash(
          nextJourneyBattle(g, undefined, undefined, random),
          random,
        );
        assert.equal(retry.journey!.stage, 1);
        assert.equal(retry.journey!.battleMode, "expendable");
        assert.deepEqual(retry.player.spentFigures, []);
      }
    }
  } finally {
    FEATURE_FLAGS.combatEquipmentSwap = previous;
  }
});
test("a lethal final figure still grants victory and journey rewards rather than an exhaustion draw", () => {
  const g = fixture("expendable");
  g.ground = [];
  g.enemy.hp = 0.1;
  for (const side of ["player", "enemy"] as const)
    g[side].spentFigures = reactionManeuvers(g[side])
      .filter((m) => isStrike(m) && (side === "enemy" || m.id !== "strike-1"))
      .map(figureKey);
  const done = round(g, [p("strike-1")], []);
  assert.equal(done.phase, "victory");
  assert.ok(done.rewardOptions?.length);
  assert.equal(done.journey!.cleared, 1);
});
test("AI can fill more than four figures and never repeats spent figures in subsequent rounds", () => {
  let g = fixture("expendable");
  g.ground = [];
  for (let i = 0; i < 10 && g.phase === "combat"; i++) {
    const before = structuredClone(g.enemy);
    const placedPlayer = g.player.prone
      ? [
          possiblePlacements(
            reactionManeuvers(g.player)[0],
            g.clashPlan!.blocked.filter(
              (n) => n !== g.clashPlan!.enemyModifiers.unlocked,
            ),
          )[0],
        ]
      : [];
    g = submitClash(g, placedPlayer, {}, random);
    const placed = g.log[0].clash!.enemyPlaced,
      tokens = reactionManeuvers(before);
    if (i === 0) assert.ok(placed.length > 4);
    for (const move of placed) {
      const token = tokens.find((m) => m.id === move.id)!;
      assert.ok(!token.spent);
      if (token.action !== "stand")
        assert.ok(g.enemy.spentFigures!.includes(figureKey(token)));
    }
    if (!placed.length) break;
  }
  assert.ok(
    reactionManeuvers(g.enemy)
      .filter(isStrike)
      .every((m) => m.spent),
  );
});
test("modes do not reveal AI reactions and snapshot the mode in the combat replay", () => {
  for (const mode of modes) {
    const g = fixture(mode);
    assert.equal(publicClash(g).clash!.enemyPlaced, undefined);
    assert.equal(publicClash(g).journey!.battleMode, mode);
    const done = round(g, [p("strike-1")], [p("strike-1")]);
    assert.equal(done.log[0].clash!.battleMode, mode);
  }
});

function exhaust(g: Game) {
  g.ground = [];
  for (const side of ["player", "enemy"] as const)
    g[side].spentFigures = reactionManeuvers({ ...g[side], prone: false }).map(
      figureKey,
    );
  return g;
}
test("exhaustion compares absolute health, awards victory once and advances the journey", () => {
  const g = exhaust(fixture("expendable"));
  g.player.stats.endurance = 30;
  g.player.hp = 20;
  g.enemy.hp = 15;
  const done = prepareClash(g, random);
  assert.equal(done.phase, "victory");
  assert.equal(done.wins, g.wins + 1);
  assert.ok(done.rewardOptions?.length);
  assert.equal(done.journey!.cleared, 1);
  assert.equal(done.clashPlan, undefined);
  const again = prepareClash(done, random);
  assert.equal(again.wins, done.wins);
  assert.deepEqual(again.rewardOptions, done.rewardOptions);
});
test("exhaustion defeat loses unspent souls, equal health draws", () => {
  for (const hp of [12, 15]) {
    const g = exhaust(fixture("expendable"));
    g.player.hp = hp;
    g.enemy.hp = 15;
    g.souls = 9;
    const done = prepareClash(g, random);
    assert.equal(done.phase, hp === 15 ? "draw" : "defeat");
    assert.equal(done.souls, hp === 15 ? 9 : 0);
    assert.equal(done.reward, null);
  }
});
test("remaining healing prevents premature health comparison", () => {
  const g = exhaust(fixture("expendable"));
  g.player.skills = ["bandage"];
  g.player.hp = 1;
  g.enemy.hp = 2;
  assert.equal(prepareClash(g, random).phase, "combat");
  const done = round(g, [p("skill:bandage")], []);
  assert.equal(done.phase, "victory");
});
test("ending actions lets the enemy finish and produces a terminal result without more input", () => {
  const g = fixture("expendable");
  g.ground = [];
  g.player.hp = 100;
  g.enemy.hp = 5;
  const done = finishClashActions(g, random);
  assert.notEqual(done.phase, "combat");
  assert.equal(done.player.actionsFinished, true);
  assert.ok(done.player.hp < g.player.hp);
  assert.ok(done.log.length > 0);
  assert.throws(() => finishClashActions(fixture("limited"), random));
});
test("new battle resets voluntary completion", () => {
  const g = fixture("expendable");
  g.player.actionsFinished = g.enemy.actionsFinished = true;
  const fresh = beginClash(g, random);
  assert.equal(fresh.phase, "combat");
  assert.equal(fresh.player.actionsFinished, false);
  assert.equal(fresh.enemy.actionsFinished, false);
});
