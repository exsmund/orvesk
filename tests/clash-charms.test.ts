import { test } from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/game/combat/engine";
import {
  beginClash,
  applyClashCharm,
  publicClash,
  submitClash,
  validateClash,
} from "../src/game/combat/reaction-engine";
function fixture() {
  const g = beginClash(
    createGame("Герой", () => 0.5),
    () => 0.5,
  );
  g.player.gear.ring = "unlock-ring";
  g.player.gear.amulet = "fold-amulet";
  g.player.gear.weapon = "dagger";
  g.clashPlan!.blocked = [0];
  g.clashPlan!.playerBudget = 9;
  g.clashPlan!.enemyModifiers = {};
  g.clashPlan!.preparer = "player";
  g.clashPlan!.reactor = "enemy";
  return g;
}
test("ring commits immediately, survives serialization and cannot be used twice", () => {
  const original = fixture();
  const g = applyClashCharm(original, "ring", 0);
  assert.equal(original.player.charmsUsed?.ring, false);
  assert.equal(g.player.charmsUsed?.ring, true);
  assert.equal(
    publicClash(JSON.parse(JSON.stringify(g))).clash?.committedPlayerModifiers
      ?.unlocked,
    0,
  );
  assert.throws(() => applyClashCharm(g, "ring", 0));
  assert.throws(() => applyClashCharm(original, "ring", 1));
});
test("amulet commits a multi-cell figure even before it is placed", () => {
  const g = applyClashCharm(fixture(), "amulet", "heavy");
  assert.equal(g.player.charmsUsed?.amulet, true);
  assert.equal(g.clashPlan!.committedPlayerModifiers?.compressed, "heavy");
  assert.throws(() => applyClashCharm(g, "amulet", "kick"));
  assert.throws(() => applyClashCharm(fixture(), "amulet", "strike-1"));
  assert.throws(() => applyClashCharm(fixture(), "amulet", "unknown"));
});
test("submitting a turn cannot remove committed charm effects", () => {
  const g = applyClashCharm(
    applyClashCharm(fixture(), "ring", 0),
    "amulet",
    "heavy",
  );
  const placed = [{ id: "heavy", x: 0, y: 0, rotation: 0 }];
  assert.doesNotThrow(() =>
    validateClash(g, "player", placed, g.clashPlan!.playerModifiers),
  );
  const done = submitClash(g, placed, {}, () => 0.5);
  assert.deepEqual(done.log[0].clash!.playerModifiers, {
    unlocked: 0,
    compressed: "heavy",
  });
});
test("unavailable charms and finished combat cannot mutate state", () => {
  const g = fixture();
  g.player.gear.ring = null;
  assert.throws(() => applyClashCharm(g, "ring", 0));
  g.phase = "defeat";
  assert.throws(() => applyClashCharm(g, "amulet", "heavy"));
});
