import configs from "../../../data/journey-maps.json";
import type { Journey, PublicGame } from "@/game/types";
export interface MapPoint {
  id: string;
  x: number;
  y: number;
}
export interface JourneyNode extends MapPoint {
  kind: "fight" | "camp" | "forge";
  stage: number;
  name: string;
}
export interface JourneyMapLayout {
  nodes: JourneyNode[];
  edges: [string, string][];
}
export interface JourneyMapPreset {
  id: string;
  name: string;
  background: string;
  battleBackground: string;
  width: number;
  height: number;
}
export const JOURNEY_MAP_PRESETS = configs as JourneyMapPreset[];
export const journeyMapPreset = (
  j?: Pick<Journey, "mapPreset" | "map">,
): JourneyMapPreset => {
  return (
    JOURNEY_MAP_PRESETS.find((p) => p.id === j?.mapPreset) ??
    JOURNEY_MAP_PRESETS[0]
  );
};
export function chooseJourneyMap(random: () => number, previous?: string) {
  const others = JOURNEY_MAP_PRESETS.filter((p) => p.id !== previous);
  const choices = others.length ? others : JOURNEY_MAP_PRESETS;
  return choices[Math.floor(random() * choices.length)].id;
}

export interface JourneyGraph {
  nodes: MapPoint[];
  edges: [string, string][];
}

/** Geometry belongs to the game generator, independently of the chosen artwork. */
export function generateJourneyGraph(random: () => number): JourneyGraph {
  const nodes: MapPoint[] = [];
  const edges: [string, string][] = [];
  const point = (row: number, side: -1 | 0 | 1) => {
    const id = `node-${nodes.length + 1}`;
    const x =
      side === 0
        ? 46 + random() * 8
        : side < 0
          ? 15 + random() * 7
          : 78 + random() * 7;
    const y =
      92 - row * 10.5 + (row === 0 || row === 8 ? 0 : random() * 3 - 1.5);
    nodes.push({
      id,
      x: Math.round(x * 100) / 100,
      y: Math.round(y * 100) / 100,
    });
    return id;
  };
  let current = point(0, 0);
  for (let branch = 0; branch < 4; branch++) {
    const left = point(branch * 2 + 1, -1);
    const right = point(branch * 2 + 1, 1);
    const next = point(branch * 2 + 2, 0);
    edges.push([current, left], [current, right], [left, next], [right, next]);
    current = next;
  }
  return { nodes, edges };
}

/** Validate the generated graph before placing events. */
export function validateJourneyGraph(geometry: JourneyGraph) {
  const ids = new Set(geometry.nodes.map((n) => n.id));
  const incoming = new Map([...ids].map((id) => [id, 0]));
  const outgoing = new Map([...ids].map((id) => [id, [] as string[]]));
  const fail = () => {
    throw new Error(`Некорректный граф карты`);
  };
  if (ids.size !== geometry.nodes.length || ids.size < 6) fail();
  if (
    geometry.nodes.some(
      (n) =>
        !Number.isFinite(n.x) ||
        !Number.isFinite(n.y) ||
        n.x < 0 ||
        n.x > 100 ||
        n.y < 0 ||
        n.y > 100,
    )
  )
    fail();
  const edges = new Set<string>();
  for (const [from, to] of geometry.edges) {
    const key = JSON.stringify([from, to]);
    if (!ids.has(from) || !ids.has(to) || from === to || edges.has(key)) fail();
    edges.add(key);
    outgoing.get(from)!.push(to);
    incoming.set(to, incoming.get(to)! + 1);
  }
  const starts = [...ids].filter((id) => incoming.get(id) === 0);
  const ends = [...ids].filter((id) => !outgoing.get(id)!.length);
  if (
    starts.length !== 1 ||
    ends.length !== 1 ||
    [...ids].some((id) => incoming.get(id)! > 2 || outgoing.get(id)!.length > 2)
  )
    fail();
  const queue = [...starts],
    order: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    order.push(id);
    for (const next of outgoing.get(id)!) {
      incoming.set(next, incoming.get(next)! - 1);
      if (!incoming.get(next)) queue.push(next);
    }
  }
  if (order.length !== ids.size) fail();
  const length = new Map<string, number>();
  for (const id of [...order].reverse())
    length.set(
      id,
      1 + Math.max(0, ...outgoing.get(id)!.map((n) => length.get(n)!)),
    );
  if (length.get(starts[0])! < 5) fail();
  return { start: starts[0], end: ends[0], order, outgoing, length };
}
const eventName = (kind: JourneyNode["kind"], stage: number) =>
  kind === "fight"
    ? stage === 5
      ? "Босс"
      : `Противник ${stage}`
    : kind === "camp"
      ? "Костёр"
      : "Кузница";

/** Resolve paths through unused points to the next event, without inventing trails. */
export function collapseJourneyPoints(
  geometry: JourneyGraph,
  events: Map<string, JourneyNode>,
): JourneyMapLayout {
  const outgoing = new Map(
    geometry.nodes.map((n) => [
      n.id,
      geometry.edges.filter(([a]) => a === n.id).map(([, b]) => b),
    ]),
  );
  const edges: [string, string][] = [];
  for (const [point, event] of events) {
    const seen = new Set<string>();
    const walk = (id: string) => {
      if (seen.has(id)) return;
      seen.add(id);
      const target = events.get(id);
      if (target) edges.push([event.id, target.id]);
      else for (const next of outgoing.get(id)!) walk(next);
    };
    for (const next of outgoing.get(point)!) walk(next);
  }
  return {
    nodes: [...events.values()],
    edges,
  };
}

/** Four encounters each offer a camp, optionally an alternative forge, then the boss. */
export function generateJourneyMap(random: () => number): JourneyMapLayout {
  let seed = Math.floor(random() * 4294967296) >>> 0;
  const roll = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const geometry = generateJourneyGraph(roll);
  const graph = validateJourneyGraph(geometry);
  const nodes: JourneyNode[] = [];
  const edges: [string, string][] = [];
  const add = (
    point: string,
    id: string,
    kind: JourneyNode["kind"],
    stage: number,
  ) => {
    nodes.push({
      ...geometry.nodes.find((n) => n.id === point)!,
      id,
      kind,
      stage,
      name: eventName(kind, stage),
    });
  };
  const branches = [0, 1, 2, 3];
  for (let i = branches.length - 1; i > 0; i--) {
    const j = Math.floor(roll() * (i + 1));
    [branches[i], branches[j]] = [branches[j], branches[i]];
  }
  const forgeBranches = new Set(branches.slice(0, Math.floor(roll() * 3)));
  let current = graph.start;
  add(current, "fight-1", "fight", 1);
  for (let branch = 0; branch < 4; branch++) {
    const sides = graph.outgoing.get(current)!;
    const campSide = Math.floor(roll() * sides.length);
    const camp = sides[campSide];
    const forge = sides[1 - campSide];
    const next = graph.outgoing.get(camp)![0];
    const stage = branch + 1;
    add(camp, `camp-${stage}`, "camp", stage);
    edges.push(
      [`fight-${stage}`, `camp-${stage}`],
      [`camp-${stage}`, `fight-${stage + 1}`],
    );
    if (forgeBranches.has(branch)) {
      add(forge, `forge-${stage}`, "forge", stage);
      edges.push(
        [`fight-${stage}`, `forge-${stage}`],
        [`forge-${stage}`, `fight-${stage + 1}`],
      );
    }
    add(next, `fight-${stage + 1}`, "fight", stage + 1);
    current = next;
  }
  return { nodes, edges };
}

/** Missing layouts use a stable fallback seed. */
export const journeyMapLayout = (j?: Pick<Journey, "mapPreset" | "map">) =>
  j?.map ?? generateJourneyMap(() => 0.5);
export function ensureJourneyMap(j: Journey) {
  j.map ??= journeyMapLayout(j);
}
export const journeyPath = (j: Journey) =>
  j.path?.length ? j.path : [`fight-${j.stage}`];
export const currentJourneyNode = (j: Journey) => journeyPath(j).at(-1)!;
export const journeyNode = (
  id: string,
  j?: Pick<Journey, "mapPreset" | "map">,
) => journeyMapLayout(j).nodes.find((node) => node.id === id);
export function availableJourneyNodes(
  game: Pick<PublicGame, "phase" | "journey">,
): string[] {
  const j = game.journey;
  if (!j) return [];
  if (game.phase === "combat" || game.phase === "draw")
    return [currentJourneyNode(j)];
  if (game.phase === "defeat") return [currentJourneyNode(j)];
  if (game.phase !== "ready" || j.finished) return [];
  const current = currentJourneyNode(j),
    node = journeyNode(current, j);
  if (
    j.awaitingFirstBattle &&
    current === "fight-1" &&
    j.stage === 1 &&
    j.cleared === 0
  )
    return [current];
  if (
    !node ||
    (node.kind === "fight" && j.cleared < node.stage) ||
    (node.kind === "forge" && !j.forgeResolved)
  )
    return [];
  return journeyMapLayout(j)
    .edges.filter(
      ([from, to]) => from === current && !journeyPath(j).includes(to),
    )
    .map(([, to]) => to);
}
