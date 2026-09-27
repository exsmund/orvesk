import { STAT_KEYS, type Stats } from "@/game/types";
export const STARTING_SOULS = 3;
export const MIN_STARTING_STAT = 1;
export const BASE_STAT_TOTAL = STAT_KEYS.length * MIN_STARTING_STAT;
export const STARTING_STAT_TOTAL = BASE_STAT_TOTAL + STARTING_SOULS;
export const initialStartingStats = (): Stats => ({
  strength: 1,
  agility: 1,
  vitality: 1,
  intelligence: 1,
});
export const balancedStartingStats = (): Stats => ({
  strength: 2,
  agility: 2,
  vitality: 2,
  intelligence: 1,
});
/** The creation budget is spent one-for-one; normal level-based prices begin after creation. */
export function validateStartingStats(value: unknown): Stats {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Распределите 3 осколка между характеристиками.");
  const input = value as Record<string, unknown>;
  if (
    Object.keys(input).length !== STAT_KEYS.length ||
    !STAT_KEYS.every(
      (key) =>
        typeof input[key] === "number" &&
        Number.isInteger(input[key]) &&
        (input[key] as number) >= MIN_STARTING_STAT &&
        (input[key] as number) <= MIN_STARTING_STAT + STARTING_SOULS,
    )
  )
    throw new Error("Характеристики должны быть целыми числами от 1 до 4.");
  const stats = Object.fromEntries(
    STAT_KEYS.map((key) => [key, input[key]]),
  ) as Stats;
  if (
    STAT_KEYS.reduce((sum, key) => sum + stats[key], 0) !== STARTING_STAT_TOTAL
  )
    throw new Error("Перед началом игры распределите все 3 осколка.");
  return stats;
}
