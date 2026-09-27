import { test } from "node:test";
import assert from "node:assert/strict";
import { createGame, nextBattle } from "@/game/combat/engine";
import { resolveClash } from "@/game/combat/reaction-engine";
import { beginClassicClash as beginClash } from "./classic-fixture";
import { turnFeedback, formatDamage } from "@/game/combat/battle-feedback";

test("feedback uses actual health loss after armor, including fractional damage and lethal hits", () => {
  const before = beginClash(
    createGame("Боец", () => 0.5),
    () => 0.5,
  );
  before.player.hp = 4.2;
  before.enemy.hp = 1;
  const after = structuredClone(before);
  after.round++;
  after.player.hp = 3.9;
  after.enemy.hp = 0;
  after.phase = "victory";
  after.log.unshift({
    round: before.round,

    playerAction: "Удар",
    enemyAction: "Удар",
    events: ["Враг получил 12 урона."],
  });
  assert.deepEqual(turnFeedback(before, after), {
    id: "1:1",
    player: 0.3,
    enemy: 1,
  });
  assert.equal(formatDamage(0.3), "0,3");
});

test("turns without damage have no damage popups", () => {
  const before = beginClash(
    createGame("Боец", () => 0.5),
    () => 0.5,
  );
  before.clashPlan!.playerPlaced = [];
  before.clashPlan!.enemyPlaced = [];
  before.clashPlan!.blocked = [];
  const after = resolveClash(before, () => 0.5);
  assert.deepEqual(turnFeedback(before, after), {
    id: "1:1",
    player: 0,
    enemy: 0,
  });
});

test("loading a save, healing and starting another fight cannot replay old damage", () => {
  const before = beginClash(
    createGame("Боец", () => 0.5),
    () => 0.5,
  );
  before.clashPlan!.playerPlaced = [];
  before.clashPlan!.enemyPlaced = [];
  before.clashPlan!.blocked = [];
  const after = resolveClash(before, () => 0.5);
  assert.equal(turnFeedback(after, after), null);
  after.phase = "defeat";
  const next = nextBattle(after, () => 0.5);
  assert.equal(turnFeedback(after, next), null);
  const healed = structuredClone(after);
  healed.player.hp = 12;
  assert.equal(turnFeedback(after, healed), null);
});
