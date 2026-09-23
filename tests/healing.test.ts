import { maxPoise } from "../src/game/combat/tactics";
import test from "node:test";
import assert from "node:assert/strict";
import { createGame, maxHp } from "../src/game/combat/engine";
import { beginClash } from "../src/game/combat/reaction-engine";
import { nextJourneyBattle } from "../src/game/journey/journey";
const rng = () => 0.6;
const fresh = () => beginClash(createGame("Лечение", rng), rng);
test("camp restores both resources, forge restores neither, risk heals half health", () => {
  const g = fresh();
  g.phase = "ready";
  g.player.hp = 1;
  g.player.poise = 1;
  g.journey!.offers = ["dagger"];
  assert.equal(
    nextJourneyBattle(g, "camp", undefined, rng).player.hp,
    maxHp(g.player),
  );
  for (const route of ["risk", "forge"])
    assert.equal(
      nextJourneyBattle(g, route, route === "forge" ? "dagger" : undefined, rng)
        .player.hp,
      route === "forge" ? 1 : 1 + maxHp(g.player) * 0.5,
    );
  assert.equal(nextJourneyBattle(g, "forge", "dagger", rng).player.poise, 1);
  assert.equal(
    nextJourneyBattle(g, "camp", undefined, rng).player.poise,
    maxPoise(g.player),
  );
  g.player.hp = maxHp(g.player) - 1;
  assert.equal(
    nextJourneyBattle(g, "risk", undefined, rng).player.hp,
    maxHp(g.player),
  );
});
