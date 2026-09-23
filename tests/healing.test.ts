import test from "node:test";
import assert from "node:assert/strict";
import { createGame, maxHp } from "../src/game/combat/engine";
import { beginClash, prepareClash } from "../src/game/combat/reaction-engine";
import { nextJourneyBattle } from "../src/game/journey/journey";
import { useHealingCharge } from "../src/game/progression/healing";
const rng = () => 0.6;
const fresh = () => beginClash(createGame("Лечение", rng), rng);
test("camp heals fully and other routes heal half maximum health with a cap", () => {
  const g = fresh();
  g.phase = "ready";
  g.player.hp = 1;
  g.journey!.offers = ["dagger"];
  assert.equal(
    nextJourneyBattle(g, "camp", undefined, rng).player.hp,
    maxHp(g.player),
  );
  for (const route of ["risk", "forge"])
    assert.equal(
      nextJourneyBattle(g, route, route === "forge" ? "dagger" : undefined, rng)
        .player.hp,
      1 + maxHp(g.player) * 0.5,
    );
  g.player.hp = maxHp(g.player) - 1;
  assert.equal(
    nextJourneyBattle(g, "risk", undefined, rng).player.hp,
    maxHp(g.player),
  );
});
test("one healing charge preserves plans, cooldowns; only a new journey replenishes it", () => {
  let g = fresh();
  g.player.hp = 2;
  g.player.cooldowns = { heavy: 1 };
  const plan = structuredClone(g.clashPlan);
  g = useHealingCharge(g);
  assert.equal(g.player.hp, 8);
  assert.equal(g.journey!.healUsed, true);
  assert.deepEqual(g.clashPlan, plan);
  assert.deepEqual(g.player.cooldowns, { heavy: 1 });
  assert.throws(() => useHealingCharge(g), /использован/);
  g = prepareClash(JSON.parse(JSON.stringify(g)), rng);
  assert.throws(() => useHealingCharge(g));
  g.phase = "ready";
  g = nextJourneyBattle(g, "camp", undefined, rng);
  assert.equal(g.journey!.healUsed, true);
  g.phase = "draw";
  g = nextJourneyBattle(g, undefined, undefined, rng);
  assert.equal(g.journey!.healUsed, true);
  g.phase = "defeat";
  g = nextJourneyBattle(g, undefined, undefined, rng);
  assert.equal(g.journey!.healUsed, false);
  g = beginClash(g, rng);
  assert.throws(() => useHealingCharge(g), /не требуется/);
  g.player.hp = 1;
  g.clashPlan!.playerPlaced = [{ id: "strike-1", x: 0, y: 0, rotation: 0 }];
  assert.throws(() => useHealingCharge(g), /перед размещением/);
});
