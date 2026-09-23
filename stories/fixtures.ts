import { reactionManeuvers } from "../src/game/combat/reaction-rules";
import { possiblePlacements } from "../src/game/combat/board";
import { createGame } from "../src/game/combat/engine";
import {
  beginClash,
  publicClash,
  resolveClash,
} from "../src/game/combat/reaction-engine";
import { beginBattle, resolveSequence } from "../src/game/combat/board-engine";
import { createJourney } from "../src/game/journey/journey";
import {
  CHARACTERS_KEY,
  type StoragePort,
} from "../src/features/characters/characters";
export function battle() {
  const g = beginClash(
    createGame("Вереск", () => 0.5),
    () => 0.5,
  );
  g.player.gear.weapon = "dagger";
  g.player.gear.shield = "buckler";
  g.player.skills = ["dodge", "sidestep", "bandage"];
  g.souls = 12;
  return g;
}
export const game = battle(),
  pub = publicClash(game),
  fighter = game.player;
export const mapGame = publicClash(createJourney("Вереск", () => 0.5));
const resolved = battle();
for (const side of ["player", "enemy"] as const) {
  const move = reactionManeuvers(resolved[side]).find(
    (m) => m.action === "attack",
  )!;
  resolved.clashPlan![side === "player" ? "playerPlaced" : "enemyPlaced"] = [
    possiblePlacements(move, resolved.clashPlan!.blocked)[0],
  ];
}
export const outcome = resolveClash(resolved, () => 0.5).log[0];
const classic = beginBattle(
  createGame("Вереск", () => 0.5),
  () => 0.5,
);
classic.roundPlan!.stage = "ordering";
classic.roundPlan!.playerPlaced = [{ id: "strike-1", x: 0, y: 0, rotation: 0 }];
classic.roundPlan!.enemyPlaced = [{ id: "strike-1", x: 1, y: 0, rotation: 0 }];
classic.roundPlan!.enemyOrder = ["strike-1"];
export const replay = resolveSequence(classic, ["strike-1"], () => 0.5).log[0];
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
