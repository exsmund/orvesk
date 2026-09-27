import type { JourneyNode } from "@/game/journey/journey-map";

export const nodeImage = (node: JourneyNode) =>
  `/ui/journey/${node.kind === "fight" ? (node.stage === 5 ? "champion" : "battle") : node.kind}-v1.png`;
