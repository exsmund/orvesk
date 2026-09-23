import { test } from "node:test";
import assert from "node:assert/strict";
import { createGame, resolveTurn, nextBattle } from "../src/game/combat/engine";
import { turnFeedback, formatDamage } from "../src/game/combat/battle-feedback";

test("feedback uses actual health loss after armor, including fractional damage and lethal hits", () => {
  const before = createGame("Боец", () => 0.5);
  before.player.hp = 4.2;
  before.enemy.hp = 1;
  const after = structuredClone(before);
  after.round++;
  after.player.hp = 3.9;
  after.enemy.hp = 0;
  after.phase = "victory";
  after.log.unshift({
    round: before.round,
    playerDie: 20,
    enemyDie: 3,
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

test("blocked or out-of-range turns have no damage popups", () => {
  const before = createGame("Боец", () => 0.5);
  before.distance = 350;
  before.enemyIntent = { action: "attack", step: 0 };
  const after = resolveTurn(before, { action: "attack", step: 0 }, () => 0.5);
  assert.deepEqual(turnFeedback(before, after), {
    id: "1:1",
    player: 0,
    enemy: 0,
  });
});

test("loading a save, healing and starting another fight cannot replay old damage", () => {
  const before = createGame("Боец", () => 0.5);
  const after = resolveTurn(before, { action: "attack", step: 1 }, () => 0.5);
  assert.equal(turnFeedback(after, after), null);
  after.phase = "defeat";
  const next = nextBattle(after, () => 0.5);
  assert.equal(turnFeedback(after, next), null);
  const healed = structuredClone(after);
  healed.player.hp = 12;
  assert.equal(turnFeedback(after, healed), null);
});
