import configs from "../../../data/journey-maps.json";
import type { Journey, PublicGame } from "../types";
export interface JourneyNode {
  id: string;
  kind: "fight" | "camp" | "forge";
  stage: number;
  name: string;
  x: number;
  y: number;
}
export interface JourneyMapPreset {
  id: string;
  name: string;
  background: string;
  battleBackground: string;
  width: number;
  height: number;
  nodes: JourneyNode[];
  edges: [string, string][];
}
export const JOURNEY_MAP_PRESETS = configs as JourneyMapPreset[];
export const journeyMapPreset = (j?: Pick<Journey, "mapPreset">) =>
  JOURNEY_MAP_PRESETS.find((p) => p.id === j?.mapPreset) ??
  JOURNEY_MAP_PRESETS[0];
export function chooseJourneyMap(random: () => number, previous?: string) {
  const choices = JOURNEY_MAP_PRESETS.filter((p) => p.id !== previous);
  return choices[Math.floor(random() * choices.length)].id;
}
export const JOURNEY_NODES = JOURNEY_MAP_PRESETS[0].nodes;
export const JOURNEY_EDGES = JOURNEY_MAP_PRESETS[0].edges;
export const journeyPath = (j: Journey) =>
  j.path?.length ? j.path : [`fight-${j.stage}`];
export const currentJourneyNode = (j: Journey) => journeyPath(j).at(-1)!;
export const journeyNode = (id: string, j?: Pick<Journey, "mapPreset">) =>
  journeyMapPreset(j).nodes.find((node) => node.id === id);
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
  return journeyMapPreset(j)
    .edges.filter(
      ([from, to]) => from === current && !journeyPath(j).includes(to),
    )
    .map(([, to]) => to);
}
