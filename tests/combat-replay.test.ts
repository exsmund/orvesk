import { test } from "node:test";
import assert from "node:assert/strict";
import {
  beginBattle,
  resolveSequence,
  publicBoard,
} from "../src/game/combat/board-engine";
import { createGame } from "../src/game/combat/engine";
import type { Side } from "../src/game/types";
function queued(player: string[], enemy: string[], first: Side = "player") {
  const base = createGame("Разбор", () => 0.5);
  base.enemy.gear = { ...base.player.gear };
  const g = beginBattle(base, () => 0.5);
  g.distance = 70;
  g.roundPlan!.stage = "ordering";
  g.roundPlan!.playerPlaced = player.map((id, i) => ({
    id,
    x: i % 3,
    y: Math.floor(i / 3),
    rotation: 0,
  }));
  g.roundPlan!.enemyPlaced = enemy.map((id, i) => ({
    id,
    x: i % 3,
    y: Math.floor(i / 3),
    rotation: 0,
  }));
  g.roundPlan!.enemyOrder = enemy;
  g[first].stats.reaction = 30;
  return g;
}
test("replay records reaction and only defense active at the instant of each action", () => {
  const g = queued(["strike-1"], ["guard"]);
  g.player.gear.weapon = "axe";
  g.enemy.gear.shield = "buckler";
  const before = resolveSequence(g, ["strike-1"], () => 0.5).log[0].replay!;
  assert.equal(before.first, "player");
  assert.equal(before.playerInitiative, 30);
  assert.equal(before.steps[0].itemId, "axe");
  assert.equal(before.steps[0].defense, undefined);
  g.enemy.stats.reaction = 60;
  const after = resolveSequence(g, ["strike-1"], () => 0.5).log[0].replay!;
  assert.equal(after.first, "enemy");
  assert.equal(after.steps[0].action, "block");
  assert.equal(after.steps[1].defense?.itemId, "buckler");
  assert.equal(after.steps[1].damage, 0);
  assert.equal(after.steps[1].result, "Полный блок");
  assert.deepEqual(after.steps[1].dice, { attack: 11, defense: 11 });
});
test("spent shields disappear from subsequent steps", () => {
  const g = queued(["strike-1", "strike-2"], ["guard"], "enemy");
  g.enemy.gear.shield = "buckler";
  const steps = resolveSequence(g, ["strike-1", "strike-2"], () => 0.5).log[0]
    .replay!.steps;
  assert.equal(steps[1].defense?.hits, 1);
  assert.equal(steps[1].damage, 0);
  assert.equal(steps[2].defense, undefined);
  assert.equal(steps[2].damage, 1);
});
test("parry and immediate riposte are separate chronological rows with independent health snapshots", () => {
  const g = queued(["parry"], ["strike-1"]);
  const trace = resolveSequence(g, ["parry"], () => 0.5).log[0].replay!;
  assert.equal(trace.steps.length, 3);
  assert.equal(trace.steps[1].result, "Парировано");
  assert.equal(trace.steps[1].damage, 0);
  assert.equal(trace.steps[1].after.enemy.hp, 12);
  assert.equal(trace.steps[2].name, "Рипост");
  assert.equal(trace.steps[2].actor, "player");
  assert.equal(trace.steps[2].counter, true);
  assert.equal(trace.steps[2].damage, 1);
  assert.equal(trace.steps[2].after.enemy.hp, 11);
  assert.ok(!trace.steps[1].events.some((e) => e.includes("→")));
  assert.ok(trace.steps[2].events.some((e) => e.includes("→")));
});
test("damage shown is actual health lost, capped on lethal attacks; no posthumous rows", () => {
  const g = queued(["heavy", "strike-1"], ["strike-1"]);
  g.enemy.hp = 0.5;
  g.player.stats.strength = 30;
  const result = resolveSequence(g, ["heavy", "strike-1"], () => 0.5),
    trace = result.log[0].replay!;
  assert.equal(result.phase, "victory");
  assert.equal(trace.steps.length, 1);
  assert.equal(trace.steps[0].damage, 0.5);
  assert.equal(trace.steps[0].after.enemy.hp, 0);
  assert.equal(trace.initial.enemy.hp, 0.5);
  assert.equal(g.enemy.hp, 0.5);
});
test("movement, misses, interruptions and standing are recorded even without damage", () => {
  const g = queued(["strike-1", "advance"], ["rest"]);
  g.distance = 120;
  const trace = resolveSequence(g, ["strike-1", "advance"], () => 0.5).log[0]
    .replay!;
  assert.equal(trace.steps[0].result, "Не достаёт");
  assert.equal(trace.steps[0].damage, 0);
  assert.equal(trace.steps[0].dice, undefined);
  assert.ok(trace.steps[2].after.distance < 120);
  assert.equal(trace.steps[2].damage, undefined);
  const h = queued(["kick"], ["heavy"]);
  const interrupted = resolveSequence(h, ["kick"], () => 0.5).log[0].replay!
    .steps;
  assert.equal(interrupted[1].result, "Действие сорвано");
  h.enemy.poise = 3;
  const knocked = resolveSequence(h, ["kick"], () => 0.5).log[0].replay!.steps;
  assert.equal(knocked[1].action, "stand");
  assert.equal(knocked[1].itemId, undefined);
  assert.equal(knocked[1].after.enemy.prone, false);
});
test("equipment snapshots and resolved replay survive JSON and public projection", () => {
  const g = queued(["equip", "strike-1"], ["rest"]);
  g.ground = ["dagger"];
  g.roundPlan!.playerPlaced[0].itemId = "dagger";
  const result = resolveSequence(g, ["equip", "strike-1"], () => 0.5),
    trace = result.log[0].replay!;
  assert.equal(trace.steps[0].itemId, "dagger");
  assert.equal(trace.initial.player.gear.weapon, null);
  assert.equal(trace.steps[0].after.player.gear.weapon, "dagger");
  assert.equal(trace.steps.at(-1)!.itemId, "fist");
  const visible = publicBoard(JSON.parse(JSON.stringify(result)));
  assert.deepEqual(visible.log[0].replay, JSON.parse(JSON.stringify(trace)));
  assert.equal("roundPlan" in visible, false);
});
test("trace losses reconcile with every state transition across varied dice and defenses", () => {
  for (let seed = 1; seed <= 100; seed++) {
    let n = seed;
    const random = () => {
      n = (Math.imul(n, 1664525) + 1013904223) >>> 0;
      return n / 4294967296;
    };
    const g = queued(
      ["guard", "heavy", "strike-1"],
      ["parry", "heavy", "strike-1"],
      seed % 2 ? "player" : "enemy",
    );
    g.player.gear.shield = "buckler";
    const result = resolveSequence(g, ["guard", "heavy", "strike-1"], random),
      trace = result.log[0].replay!;
    let before = trace.initial;
    for (const step of trace.steps) {
      const target = step.actor === "player" ? "enemy" : "player";
      assert.equal(
        Math.round((before[target].hp - step.after[target].hp) * 10) / 10,
        step.damage ?? 0,
      );
      assert.equal(before[step.actor].hp, step.after[step.actor].hp);
      before = step.after;
    }
    assert.equal(before.player.hp, result.player.hp);
    assert.equal(before.enemy.hp, result.enemy.hp);
  }
});

test("armor absorption and partial blocks report health lost rather than raw weapon power", () => {
  const g = queued(["strike-1"], ["rest"]);
  g.enemy.gear.body = "plate";
  const armor = resolveSequence(g, ["strike-1"], () => 0.5).log[0].replay!
    .steps[0];
  assert.equal(armor.damage, 0);
  assert.equal(armor.result, "Поглощено бронёй");
  const h = queued(["strike-1"], ["guard"], "enemy");
  h.player.gear.weapon = "axe";
  h.player.stats.strength = 3;
  h.enemy.gear.shield = "buckler";
  const dice = [0.5, 0.5, 0.9, 0.1];
  const done = resolveSequence(h, ["strike-1"], () => dice.shift() ?? 0.5);
  const hit = done.log[0].replay!.steps[1];
  assert.equal(hit.result, "Частичный блок");
  assert.equal(hit.defense?.itemId, "buckler");
  assert.ok(hit.damage! > 0);
  assert.equal(hit.damage, h.enemy.hp - done.enemy.hp);
});
test("riposte preserves the visual record of an active block that it bypasses", () => {
  const g = queued(["parry"], ["guard", "strike-1"], "enemy");
  g.enemy.gear.shield = "buckler";
  const reply = resolveSequence(
    g,
    ["parry"],
    () => 0.5,
  ).log[0].replay!.steps.at(-1)!;
  assert.equal(reply.counter, true);
  assert.equal(reply.defense?.itemId, "buckler");
  assert.equal(reply.defense?.bypassed, true);
  assert.equal(reply.damage, 1);
});
