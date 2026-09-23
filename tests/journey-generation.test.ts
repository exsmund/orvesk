import { test } from "node:test";
import assert from "node:assert/strict";
import {
  JOURNEY_MAP_PRESETS,
  journeyMapPreset,
  journeyMapLayout,
  generateJourneyMap,
  validateJourneyGraph,
  generateJourneyGraph,
  collapseJourneyPoints,
  currentJourneyNode,
  availableJourneyNodes,
  journeyNode,
} from "../src/game/journey/journey-map";
import {
  createJourney,
  visitJourneyNode,
  resolveJourneyForge,
  chooseJourneyStep,
} from "../src/game/journey/journey";
import { prepareClash } from "../src/game/combat/reaction-engine";
import type { Game } from "../src/game/types";

function rng(seed: number) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
test("generator creates a connected binary DAG with one start and finish", () => {
  for (let seed = 0; seed < 150; seed++) {
    const preset = generateJourneyGraph(rng(seed));
    const graph = validateJourneyGraph(preset);
    assert.equal(graph.order.length, preset.nodes.length);
    for (const point of preset.nodes)
      assert.deepEqual(Object.keys(point).sort(), ["id", "x", "y"]);
  }
  const bad = generateJourneyGraph(rng(42));
  bad.edges.push([bad.nodes.at(-1)!.id, bad.nodes[0].id]);
  assert.throws(() => validateJourneyGraph(bad));
  const disconnected = generateJourneyGraph(rng(42));
  disconnected.nodes.push({ id: "island", x: 10, y: 10 });
  assert.throws(() => validateJourneyGraph(disconnected));
});

test("generated events vary independently from each preset and preserve counts and ordered enemies", () => {
  for (let batch = 0; batch < 3; batch++) {
    const snapshots = new Set<string>();
    const campCounts = new Set<number>(),
      forgeCounts = new Set<number>();
    for (let seed = 0; seed < 150; seed++) {
      const layout = generateJourneyMap(rng(seed + batch * 150));
      snapshots.add(JSON.stringify(layout));
      const camps = layout.nodes.filter((n) => n.kind === "camp").length;
      const forges = layout.nodes.filter((n) => n.kind === "forge").length;
      campCounts.add(camps);
      forgeCounts.add(forges);
      assert.ok(camps >= 1 && camps <= 4);
      assert.ok(forges >= 0 && forges <= 2);
      assert.deepEqual(
        layout.nodes.filter((n) => n.kind === "fight").map((n) => n.stage),
        [1, 2, 3, 4, 5],
      );
      const starts = layout.nodes.filter(
        (n) => !layout.edges.some(([, to]) => to === n.id),
      );
      const ends = layout.nodes.filter(
        (n) => !layout.edges.some(([from]) => from === n.id),
      );
      assert.deepEqual(
        starts.map((n) => n.id),
        ["fight-1"],
      );
      assert.deepEqual(
        ends.map((n) => n.id),
        ["fight-5"],
      );
      assert.equal(ends[0].name, "Босс");
      const reaches = (from: string, target: string): boolean =>
        from === target ||
        layout.edges
          .filter(([a]) => a === from)
          .some(([, b]) => reaches(b, target));
      for (let stage = 1; stage < 5; stage++)
        assert.ok(reaches(`fight-${stage}`, `fight-${stage + 1}`));
      for (const node of layout.nodes) {
        assert.ok(node.x >= 15 && node.x <= 85);
        assert.ok(node.y >= 8 && node.y <= 92);
        assert.ok(reaches("fight-1", node.id));
        assert.ok(reaches(node.id, "fight-5"));
        const outgoing = layout.edges.filter(([from]) => from === node.id);
        assert.ok(outgoing.length <= 2);
        assert.ok(
          outgoing.filter(
            ([, to]) => layout.nodes.find((n) => n.id === to)!.kind === "fight",
          ).length <= 1,
        );
      }
    }
    assert.ok(snapshots.size > 50);
    assert.deepEqual([...campCounts].sort(), [1, 2, 3, 4]);
    assert.deepEqual([...forgeCounts].sort(), [0, 1, 2]);
  }
});

test("unused points connect directly to the next event and duplicate paths collapse to one edge", () => {
  const preset = {
    ...JOURNEY_MAP_PRESETS[0],
    nodes: ["a", "b", "c", "d"].map((id) => ({ id, x: 50, y: 50 })),
    edges: [
      ["a", "b"],
      ["a", "c"],
      ["b", "d"],
      ["c", "d"],
    ] as [string, string][],
  };
  const layout = collapseJourneyPoints(
    preset,
    new Map([
      [
        "a",
        {
          ...preset.nodes[0],
          kind: "fight" as const,
          stage: 1,
          name: "Первый",
        },
      ],
      [
        "d",
        { ...preset.nodes[3], kind: "fight" as const, stage: 5, name: "Босс" },
      ],
    ]),
  );
  assert.deepEqual(layout.edges, [["a", "d"]]);
});

test("every generated branch is playable, including skipped opponents; reload and defeat keep the map", () => {
  let skipped = false;
  for (let seed = 1; seed <= 35; seed++) {
    const roll = rng(seed);
    const g = createJourney("Путник", roll);
    const snapshot = JSON.stringify(g.journey!.map);
    const loaded = prepareClash(JSON.parse(JSON.stringify(g)), roll);
    assert.equal(JSON.stringify(loaded.journey!.map), snapshot);
    function walk(game: Game) {
      const current = currentJourneyNode(game.journey!);
      if (current === "fight-5") return;
      const choices = availableJourneyNodes(game);
      assert.ok(choices.length);
      for (const id of choices) {
        const next = visitJourneyNode(game, id, current, roll);
        const node = journeyNode(id, next.journey)!;
        let ready = next;
        if (next.phase === "combat") {
          const template = next.journey!.enemies![id];
          assert.deepEqual(next.enemy.stats, template.stats);
          assert.deepEqual(next.enemy.gear, template.gear);
          assert.equal(next.enemy.name, template.name);
          assert.equal(next.journey!.stage, node.stage);
          if (node.stage > game.journey!.stage + 1) skipped = true;
          next.phase = "ready";
          next.journey!.cleared = node.stage;
        } else if (node.kind === "forge") ready = resolveJourneyForge(next, id);
        walk(ready);
      }
    }
    walk(loaded);
    loaded.phase = "defeat";
    const retry = chooseJourneyStep(loaded, {}, roll);
    assert.equal(JSON.stringify(retry.journey!.map), snapshot);
    assert.deepEqual(retry.journey!.enemies, loaded.journey!.enemies);
    retry.phase = "ready";
    retry.journey!.finished = true;
    const fresh = chooseJourneyStep(retry, {}, roll);
    assert.notEqual(fresh.journey!.mapPreset, retry.journey!.mapPreset);
    assert.notEqual(JSON.stringify(fresh.journey!.map), snapshot);
  }
  assert.ok(skipped, "some routes must permit bypassing an opponent");
});

test("art presets contain no graph and generated geometry varies with the seed", () => {
  for (const preset of JOURNEY_MAP_PRESETS) {
    assert.deepEqual(Object.keys(preset).sort(), [
      "background",
      "battleBackground",
      "height",
      "id",
      "name",
      "width",
    ]);
  }
  const positions = new Set<string>();
  for (let seed = 0; seed < 100; seed++) {
    const graph = generateJourneyGraph(rng(seed));
    assert.equal(graph.nodes.length, 13);
    assert.equal(graph.edges.length, 16);
    validateJourneyGraph(graph);
    positions.add(JSON.stringify(graph.nodes));
    const map = generateJourneyMap(rng(seed));
    assert.deepEqual(map, generateJourneyMap(rng(seed)));
    for (const [from, to] of map.edges) {
      assert.ok(
        map.nodes.find((n) => n.id === from)!.y >
          map.nodes.find((n) => n.id === to)!.y,
      );
    }
  }
  assert.equal(positions.size, 100);
});

test("changing the art preset does not change saved geometry", () => {
  const map = generateJourneyMap(rng(42));
  for (const preset of JOURNEY_MAP_PRESETS) {
    const journey = { mapPreset: preset.id, map };
    assert.equal(journeyMapLayout(journey), map);
    assert.equal(journeyMapPreset(journey).background, preset.background);
  }
});
