import { STARTING_STAT_TOTAL } from "./creation-rules";
import { STAT_KEYS, type Fighter, type Game, type Stat } from "../types";
/** Starting stats total 8: each permanent +1 grants one level. */
export const level = (fighter: Pick<Fighter, "stats">) =>
  Math.max(
    1,
    STAT_KEYS.reduce((sum, key) => sum + fighter.stats[key], 0) -
      STARTING_STAT_TOTAL +
      1,
  );
export const upgradeCost = (fighter: Pick<Fighter, "stats">) =>
  level(fighter) + 2;
export const soulReward = (enemy: Pick<Fighter, "stats">) => level(enemy) + 1;
export const ENEMY_LEVEL_OFFSETS = [-2, -1, -1, 0, 1] as const;
export const journeyEnemyLevel = (startLevel: number, stage: number) =>
  Math.max(
    1,
    startLevel + ENEMY_LEVEL_OFFSETS[Math.max(1, Math.min(5, stage)) - 1],
  );
export function upgradeAttribute(
  saved: Game,
  stat: Stat,
  expectedLevel: number,
  expectedSouls: number,
): Game {
  if (saved.phase === "combat")
    throw new Error("Характеристики можно повысить только вне боя.");
  if (!STAT_KEYS.includes(stat)) throw new Error("Выберите характеристику.");
  if (expectedLevel !== level(saved.player) || expectedSouls !== saved.souls)
    throw new Error("Состояние изменилось. Обновите карточку персонажа.");
  const cost = upgradeCost(saved.player);
  if (saved.souls < cost)
    throw new Error(`Не хватает душ: требуется ${cost}, у вас ${saved.souls}.`);
  const g = structuredClone(saved);
  g.souls -= cost;
  g.player.stats[stat]++;
  return g;
}
/** Currency is lost only on defeat; draws keep it. */
export function loseSoulsOnDefeat(g: Game): number {
  if (g.phase !== "defeat") return 0;
  const lost = g.souls;
  g.souls = 0;
  return lost;
}
