import { encounterIdentity } from "../src/game/characters/portraits";
import { journeyEnemy } from "../src/game/journey/journey";
import { test } from "node:test";
import assert from "node:assert/strict";
import { createGame, maxHp } from "../src/game/combat/engine";
import { beginClash, prepareClash } from "../src/game/combat/reaction-engine";
import {
  createJourney,
  chooseJourneyStep,
  visitJourneyNode,
  resolveJourneyForge,
} from "../src/game/journey/journey";
import {
  JOURNEY_NODES,
  JOURNEY_EDGES,
  availableJourneyNodes,
  currentJourneyNode,
} from "../src/game/journey/journey-map";
import type { Game } from "../src/game/types";
const random = () => 0.5;
function ready(stage = 1): Game {
  const g = beginClash(createGame("Карта", random), random);
  g.journey!.stage = stage;
  g.journey!.cleared = stage;
  g.journey!.path = [`fight-${stage}`];
  g.journey!.battleMode = "free";
  g.phase = "ready";
  g.player.hp = 1;
  g.journey!.offers = ["dagger", "rags"];
  g.journey!.healUsed = true;
  return g;
}
function visit(g: Game, to: string) {
  return chooseJourneyStep(
    g,
    { nodeId: to, fromNode: currentJourneyNode(g.journey!) },
    random,
  );
}
function win(g: Game) {
  g.phase = "ready";
  g.journey!.cleared = g.journey!.stage;
  return g;
}
test("graph matches all requested forks and every node can reach the champion", () => {
  assert.equal(JOURNEY_NODES.length, 11);
  assert.equal(JOURNEY_EDGES.length, 14);
  assert.deepEqual(availableJourneyNodes(ready()), ["fight-2", "forge-1"]);
  assert.deepEqual(availableJourneyNodes(ready(2)), ["camp-2", "forge-2"]);
  assert.deepEqual(availableJourneyNodes(ready(3)), ["camp-3", "forge-3"]);
  assert.deepEqual(availableJourneyNodes(ready(4)), ["camp-4", "fight-5"]);
  function reaches(id: string): boolean {
    return (
      id === "fight-5" ||
      JOURNEY_EDGES.filter(([a]) => a === id).some(([, b]) => reaches(b))
    );
  }
  assert.ok(JOURNEY_NODES.every((n) => reaches(n.id)));
});
test("direct travel starts the next opponent without healing, changing mode or consuming the healing charge", () => {
  const g = ready(),
    next = beginClash(visit(g, "fight-2"), random);
  assert.equal(next.phase, "combat");
  assert.equal(next.journey!.stage, 2);
  assert.equal(next.fight, g.fight + 1);
  assert.equal(next.player.hp, 1);
  assert.equal(next.journey!.battleMode, "free");
  assert.equal(next.journey!.healUsed, true);
  assert.equal(next.enemy.elite, false);
  assert.deepEqual(next.journey!.path, ["fight-1", "fight-2"]);
  assert.equal(next.journey!.route, undefined);
  assert.ok(next.clashPlan);
});
test("camp is a separate saved stop; healing occurs once and next battle does not heal again", () => {
  const g = ready(2),
    camp = visit(g, "camp-2");
  assert.equal(camp.phase, "ready");
  assert.equal(camp.fight, g.fight);
  assert.equal(camp.player.hp, maxHp(camp.player));
  assert.equal(camp.journey!.stage, 2);
  assert.deepEqual(availableJourneyNodes(camp), ["fight-3"]);
  assert.deepEqual(camp.enemy, g.enemy);
  const reloaded = prepareClash(JSON.parse(JSON.stringify(camp)), () => {
    throw Error("random");
  });
  assert.equal(reloaded.player.hp, camp.player.hp);
  assert.throws(() => visit(reloaded, "camp-2"));
  assert.throws(() => visitJourneyNode(reloaded, "camp-2", "fight-2", random));
  camp.player.hp = 2;
  const next = visit(camp, "fight-3");
  assert.equal(next.player.hp, 2);
  assert.deepEqual(next.journey!.path, ["fight-2", "camp-2", "fight-3"]);
  assert.equal(g.player.hp, 1);
});
test("forge arrival heals half, waits for equipment choice, and persists without replaying the heal", () => {
  const g = ready(),
    forge = visit(g, "forge-1");
  assert.equal(forge.phase, "ready");
  assert.equal(forge.player.hp, 1 + maxHp(g.player) / 2);
  assert.equal(forge.fight, g.fight);
  assert.deepEqual(availableJourneyNodes(forge), []);
  assert.throws(() => visit(forge, "fight-2"));
  const reloaded = prepareClash(JSON.parse(JSON.stringify(forge)), () => {
    throw Error("random");
  });
  assert.equal(reloaded.player.hp, forge.player.hp);
  const chosen = chooseJourneyStep(
    reloaded,
    { forge: true, fromNode: "forge-1", itemId: "dagger" },
    random,
  );
  assert.equal(chosen.player.gear.weapon, "dagger");
  assert.equal(chosen.player.hp, forge.player.hp);
  assert.equal(chosen.journey!.forgeResolved, true);
  assert.deepEqual(availableJourneyNodes(chosen), ["fight-2"]);
  assert.throws(() => resolveJourneyForge(chosen, "forge-1", "rags"));
  const next = beginClash(visit(chosen, "fight-2"), random);
  assert.equal(next.player.hp, forge.player.hp);
  assert.equal(next.player.gear.weapon, "dagger");
  assert.deepEqual(next.journey!.path, ["fight-1", "forge-1", "fight-2"]);
});
test("forge validates offers, requirements and source node and supports skipping with zero offers", () => {
  const g = visit(ready(), "forge-1");
  assert.throws(() => resolveJourneyForge(g, "forge-1", "greatsword"));
  assert.throws(() => resolveJourneyForge(g, "forge-2", "dagger"));
  g.journey!.offers = ["greatsword"];
  assert.throws(() => resolveJourneyForge(g, "forge-1", "greatsword"));
  g.journey!.offers = [];
  const skipped = chooseJourneyStep(g, { forge: true, fromNode: "forge-1" });
  assert.deepEqual(skipped.player.gear, g.player.gear);
  assert.equal(skipped.journey!.forgeResolved, true);
  assert.equal(visit(skipped, "fight-2").phase, "combat");
});
test("combat, unclaimed rewards, jumping ahead, backward travel and stale clicks are rejected", () => {
  const g = ready();
  for (const phase of ["combat", "victory", "defeat", "draw"] as const) {
    const other = structuredClone(g);
    other.phase = phase;
    assert.deepEqual(
      availableJourneyNodes(other),
      phase === "victory" ? [] : ["fight-1"],
    );
    assert.throws(() => visit(other, "fight-2"));
  }
  for (const id of ["fight-1", "fight-3", "fight-5", "camp-2", "missing"])
    assert.throws(() => visit(g, id));
  assert.throws(() => visitJourneyNode(g, "fight-2", "forge-1", random));
  assert.throws(() => chooseJourneyStep(g, {}));
  assert.throws(() => chooseJourneyStep(g, { nodeId: 2, fromNode: "fight-1" }));
  g.journey!.cleared = 0;
  assert.deepEqual(availableJourneyNodes(g), []);
});
test("all branches can be followed to the champion and restart resets only the route and mode", () => {
  for (const firstForge of [false, true])
    for (const middleForge of [false, true])
      for (const lastCamp of [false, true]) {
        let g = ready();
        if (firstForge) {
          g = visit(g, "forge-1");
          g = resolveJourneyForge(g, "forge-1");
        }
        g = win(beginClash(visit(g, "fight-2"), random));
        for (const stage of [2, 3]) {
          const stop = `${middleForge ? "forge" : "camp"}-${stage}`;
          g = visit(g, stop);
          if (middleForge) g = resolveJourneyForge(g, stop);
          g = win(beginClash(visit(g, `fight-${stage + 1}`), random));
        }
        if (lastCamp) g = visit(g, "camp-4");
        g = beginClash(visit(g, "fight-5"), random);
        assert.equal(g.journey!.stage, 5);
        assert.equal(g.enemy.elite, true);
        g = win(g);
        g.journey!.finished = true;
        assert.deepEqual(availableJourneyNodes(g), []);
        const next = beginClash(chooseJourneyStep(g, {}, random), random);
        assert.deepEqual(next.journey!.path, ["fight-1"]);
        assert.notEqual(next.journey!.battleMode, g.journey!.battleMode);
        assert.equal(next.journey!.expedition, g.journey!.expedition + 1);
      }
});
test("draw preserves path and mode; defeat starts over; legacy maps start at the current opponent", () => {
  const g = ready(3);
  g.journey!.path = ["fight-1", "forge-1", "fight-2", "camp-2", "fight-3"];
  g.phase = "draw";
  const retry = beginClash(chooseJourneyStep(g, {}, random), random);
  assert.deepEqual(retry.journey!.path, g.journey!.path);
  assert.equal(retry.journey!.battleMode, g.journey!.battleMode);
  assert.equal(retry.journey!.stage, 3);
  g.phase = "defeat";
  const next = beginClash(chooseJourneyStep(g, {}, random), random);
  assert.deepEqual(next.journey!.path, ["fight-1"]);
  delete g.journey!.path;
  g.phase = "ready";
  const migrated = prepareClash(g, () => {
    throw Error("random");
  });
  assert.deepEqual(migrated.journey!.path, ["fight-3"]);
  assert.equal(migrated.player.hp, g.player.hp);
  assert.deepEqual(availableJourneyNodes(migrated), ["camp-3", "forge-3"]);
});

test("new hero waits on the map across reloads and starts only the first encounter", () => {
  const saved = prepareClash(createJourney("Новый герой", random), random);
  const restored = prepareClash(JSON.parse(JSON.stringify(saved)), random);
  assert.equal(restored.phase, "ready");
  assert.equal(restored.clashPlan, undefined);
  assert.deepEqual(availableJourneyNodes(restored), ["fight-1"]);
  assert.throws(() => visit(restored, "fight-2"));
  assert.throws(() => visit(restored, "forge-1"));
  const started = beginClash(visit(restored, "fight-1"), random);
  assert.equal(started.phase, "combat");
  assert.equal(started.fight, 1);
  assert.equal(started.journey!.stage, 1);
  assert.equal(started.journey!.battleMode, restored.journey!.battleMode);
  assert.ok(started.clashPlan);
  assert.throws(() => visit(started, "fight-1"));
  assert.equal(saved.phase, "ready");
});

// Every configured branch must remain playable by the same authoritative rules.
import {
  JOURNEY_MAP_PRESETS,
  journeyMapPreset,
} from "../src/game/journey/journey-map";
test("all presets have valid coordinates, unique nodes and complete playable branches", () => {
  assert.equal(
    new Set(JOURNEY_MAP_PRESETS.map((p) => p.id)).size,
    JOURNEY_MAP_PRESETS.length,
  );
  for (const preset of JOURNEY_MAP_PRESETS) {
    assert.equal(
      new Set(preset.nodes.map((n) => n.id)).size,
      preset.nodes.length,
    );
    assert.deepEqual(
      preset.nodes
        .filter((n) => n.kind === "fight")
        .map((n) => n.stage)
        .sort(),
      [1, 2, 3, 4, 5],
    );
    for (const n of preset.nodes) {
      assert.ok(n.x >= 10 && n.x <= 90);
      assert.ok(n.y >= 5 && n.y <= 95);
    }
    for (const [from, to] of preset.edges) {
      assert.ok(preset.nodes.some((n) => n.id === from));
      assert.ok(preset.nodes.some((n) => n.id === to));
    }
    const visited = new Set<string>();
    function walk(game: Game) {
      const id = currentJourneyNode(game.journey!);
      visited.add(id);
      if (id === "fight-5") return;
      const choices = availableJourneyNodes(game);
      assert.ok(choices.length, `${preset.id}: dead end at ${id}`);
      for (const next of choices) {
        let g = visit(game, next);
        assert.equal(journeyMapPreset(g.journey).id, preset.id);
        if (g.phase === "combat") g = win(g);
        if (next.startsWith("forge")) g = resolveJourneyForge(g, next);
        assert.ok(
          g.journey!.path!.length <= preset.nodes.length,
          "acyclic paths",
        );
        walk(g);
      }
    }
    const g = ready();
    g.journey!.mapPreset = preset.id;
    walk(g);
    assert.equal(visited.size, preset.nodes.length);
  }
});
test("preset survives reload and a new journey chooses a different map", () => {
  for (const [i, preset] of JOURNEY_MAP_PRESETS.entries()) {
    const g = createJourney(
      "Карты",
      () => (i + 0.1) / JOURNEY_MAP_PRESETS.length,
    );
    assert.equal(g.journey!.mapPreset, preset.id);
    assert.equal(
      journeyMapPreset(JSON.parse(JSON.stringify(g)).journey).id,
      preset.id,
    );
    g.phase = "defeat";
    const restarted = chooseJourneyStep(g, {}, () => 0.5);
    assert.equal(restarted.journey!.mapPreset, preset.id);
  }
});

test("current combat node is resumable without accepting a travel that resets the fight", () => {
  const g = ready(3);
  g.phase = "combat";
  g.journey!.cleared = 2;
  const before = structuredClone(g);
  assert.deepEqual(availableJourneyNodes(g), ["fight-3"]);
  assert.throws(() => visit(g, "fight-3"));
  assert.deepEqual(g, before);
});
test("draw can be retried through its current map node", () => {
  const g = ready(3);
  g.phase = "draw";
  g.journey!.cleared = 2;
  const retry = visit(g, "fight-3");
  assert.equal(retry.phase, "combat");
  assert.equal(retry.journey!.stage, 3);
  assert.deepEqual(retry.journey!.path, g.journey!.path);
});
test("defeat reload resets route and first node restarts the same map and mode", () => {
  const old = ready(4);
  old.phase = "defeat";
  old.player.hp = 0;
  old.journey!.path = ["fight-1", "fight-2", "fight-3", "fight-4"];
  const g = prepareClash(old, random);
  assert.deepEqual(g.journey!.path, ["fight-1"]);
  assert.equal(g.journey!.stage, 1);
  assert.equal(g.journey!.cleared, 0);
  assert.deepEqual(availableJourneyNodes(g), ["fight-1"]);
  const retry = beginClash(visit(g, "fight-1"), random);
  assert.equal(retry.phase, "combat");
  assert.equal(retry.player.hp, maxHp(retry.player));
  assert.equal(retry.journey!.mapPreset, old.journey!.mapPreset);
  assert.equal(retry.journey!.battleMode, old.journey!.battleMode);
  assert.equal(retry.journey!.expedition, old.journey!.expedition);
  assert.equal(retry.journey!.startLevel, old.journey!.startLevel);
});

test("map encounter identity matches generated opponent regardless of combat rolls", () => {
  const g = ready();
  for (let stage = 1; stage <= 5; stage++) {
    g.journey!.stage = stage;
    const preview = encounterIdentity(g.player, g.journey!.expedition, stage);
    for (const roll of [0.1, 0.8]) {
      const enemy = journeyEnemy(g, () => roll);
      assert.equal(enemy.name, preview.name);
      assert.equal(enemy.archetype, preview.archetype);
    }
  }
});
