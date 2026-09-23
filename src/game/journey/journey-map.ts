import configs from "../../../data/journey-maps.json";
import type { Journey, PublicGame } from "../types";
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

function generateCandidate(
  geometry: JourneyGraph,
  random: () => number,
): JourneyMapLayout {
  const graph = validateJourneyGraph(geometry);
  const pick = <T>(items: T[]) => items[Math.floor(random() * items.length)];
  const shuffle = <T>(items: T[]) => {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  };
  // All opponents belong to one directed path, including its two endpoints.
  const path = [graph.start];
  while (path.at(-1) !== graph.end) {
    const choices = graph.outgoing
      .get(path.at(-1)!)!
      .filter((id) => path.length + graph.length.get(id)! >= 5);
    path.push(pick(choices));
  }
  const middle = new Set(shuffle(path.slice(1, -1)).slice(0, 3));
  const fights = path.filter(
    (id) => id === graph.start || id === graph.end || middle.has(id),
  );
  const events = new Map<string, JourneyNode>();
  const add = (
    point: string,
    id: string,
    kind: JourneyNode["kind"],
    stage: number,
  ) => {
    events.set(point, {
      ...geometry.nodes.find((n) => n.id === point)!,
      id,
      kind,
      stage,
      name: eventName(kind, stage),
    });
  };
  fights.forEach((point, i) => add(point, `fight-${i + 1}`, "fight", i + 1));
  const free = shuffle(
    geometry.nodes.map((n) => n.id).filter((id) => !events.has(id)),
  );
  // Choose event counts that fit the generated points.
  const counts: [number, number][] = [];
  for (let forge = 0; forge <= 2; forge++)
    for (let camp = 1; camp <= 4; camp++)
      if (forge + camp <= free.length) counts.push([forge, camp]);
  const [forges, camps] = pick(counts);
  const kinds: JourneyNode["kind"][] = [
    ...Array<"forge">(forges).fill("forge"),
    ...Array<"camp">(camps).fill("camp"),
  ];
  kinds.forEach((kind, i) => add(free[i], `${kind}-${i + 1}`, kind, 0));
  return collapseJourneyPoints(geometry, events);
}

/** Keep randomness bounded and reproducible, including for constant test RNGs. */
export function generateJourneyMap(random: () => number): JourneyMapLayout {
  let seed = Math.floor(random() * 4294967296) >>> 0;
  const roll = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const graph = generateJourneyGraph(roll);
  for (let attempt = 0; attempt < 500; attempt++) {
    const layout = generateCandidate(graph, roll);
    const fights = new Set(
      layout.nodes.filter((n) => n.kind === "fight").map((n) => n.id),
    );
    if (
      layout.nodes.every((n) => {
        const next = layout.edges.filter(([from]) => from === n.id);
        return (
          next.length <= 2 &&
          next.filter(([, to]) => fights.has(to)).length <= 1
        );
      })
    )
      return layout;
  }
  throw new Error(
    "Невозможно разместить события на карте без выбора между противниками.",
  );
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
  if (game.phase === "defeat") return ["fight-1"];
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
