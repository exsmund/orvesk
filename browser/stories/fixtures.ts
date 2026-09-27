import { reactionManeuvers } from "@/game/combat/reaction-rules";
import { possiblePlacements } from "@/game/combat/board";
import { createGame } from "@/game/combat/engine";
import {
  beginClash,
  publicClash,
  resolveClash,
} from "@/game/combat/reaction-engine";
import { createJourney } from "@/game/journey/journey";
import {
  CHARACTERS_KEY,
  type StoragePort,
} from "@/features/characters/characters";
export function battle() {
  const g = createGame("Вереск", () => 0.5);
  g.player.gear.weapon = "dagger";
  g.player.gear.shield = "buckler";
  g.player.skills = ["dodge", "sidestep", "bandage"];
  g.souls = 12;
  return beginClash(g, () => 0.5);
}
export const game = battle(),
  pub = publicClash(game),
  fighter = game.player;
export const mapGame = publicClash(createJourney("Вереск", () => 0.5));
const resolved = battle();
for (const side of ["player", "enemy"] as const) {
  const available = reactionManeuvers(resolved[side]);
  const move = available.find((m) => m.category === "attack") ?? available[0];
  resolved.clashPlan![side === "player" ? "playerPlaced" : "enemyPlaced"] = [
    possiblePlacements(move, resolved.clashPlan!.blocked)[0],
  ];
}
export const outcome = resolveClash(resolved, () => 0.5).log[0];
export const storage: StoragePort = {
  getItem: (key) =>
    key === CHARACTERS_KEY
      ? JSON.stringify([
          { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", name: "Вереск" },
        ])
      : null,
  setItem: () => {},
};
export const emptyStorage: StoragePort = {
  getItem: () => null,
  setItem: () => {},
};
export const load = async () => structuredClone(mapGame);
export const noop = () => {};
