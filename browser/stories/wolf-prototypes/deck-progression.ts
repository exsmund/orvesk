import balance from "./deck-balance.json";

export { balance };
export type DeckStat = keyof typeof balance.stats;
export type DeckStats = Record<DeckStat, number>;
export type DeckFighterStats = { player: DeckStats; wolf: DeckStats };
export const deckStatKeys = Object.keys(balance.stats) as DeckStat[];
export const defaultDeckStats: DeckStats = {
  strength: 1,
  agility: 1,
  intelligence: 1,
};
export function validDeckStats(stats: DeckStats) {
  return deckStatKeys.every(
    (key) =>
      Number.isInteger(stats[key]) &&
      stats[key] >= balance.baseStat &&
      stats[key] <= balance.maxStat,
  );
}
export function statPoints(stats: DeckStats) {
  return deckStatKeys.reduce(
    (sum, key) => sum + stats[key] - balance.baseStat,
    0,
  );
}
export function deckLevel(stats: DeckStats) {
  return balance.baseLevel + statPoints(stats);
}
export function deckMaxHealth(stats: DeckStats) {
  return balance.baseHealth + balance.healthPerPoint * statPoints(stats);
}
export const healthDamageScaling = balance.healthDamageScaling satisfies Record<
  string,
  { stat: string; perPoint: number }
>;
