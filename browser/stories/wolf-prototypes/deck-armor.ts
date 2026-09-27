import balance from "./deck-balance.json";

export type DeckArmor = { player: number; wolf: number };
export const defaultDeckArmor: DeckArmor = { player: 0, wolf: 0 };
export const armorRules = balance.armor;
export function validArmor(armor: number) {
  return Number.isInteger(armor) && armor >= 0 && armor <= armorRules.max;
}
export function damageAfterArmor(damage: number, armor: number) {
  return (damage * armorRules.k) / (armorRules.k + armor);
}
export function armorReduction(armor: number) {
  return ((100 * armor) / (armorRules.k + armor)).toLocaleString("ru-RU", {
    maximumFractionDigits: 1,
  });
}
