import { beginClash } from "@/game/combat/reaction-engine";
import type { Game } from "@/game/types";
/** Existing mechanic tests fix the journey mode; the additional mode roll consumes no fixture RNG. */
export function beginClassicClash(
  game: Game,
  random: () => number = Math.random,
): Game {
  let first = true;
  const result = beginClash(
    game,
    game.journey
      ? random
      : () => {
          if (first) {
            first = false;
            return 0;
          }
          return random();
        },
  );
  delete result.enemy.creatureId;
  return beginClash(result, random);
}
