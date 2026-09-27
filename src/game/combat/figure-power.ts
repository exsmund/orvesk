import BALANCE from "../../../data/combat-balance.json";
import type { DamageType, Fighter, Maneuver } from "@/game/types";
/** One integer budget per cell, split across damage types without duplicating scaling. */
export function figureCellParts(
  f: Pick<Fighter, "stats">,
  m: Maneuver,
): { type: DamageType; value: number }[] {
  const profile = m.healthDamage;
  if (!profile) return [];
  const invested = profile.stats.reduce(
    (sum, stat) => sum + Math.max(0, f.stats[stat] - 1),
    0,
  );
  const total = Math.max(
    0,
    Math.round(
      profile.base +
        invested * BALANCE.damage.perStatPoint +
        profile.stats.length *
          Math.max(0, (m.sourceLevel ?? 1) - 1) *
          BALANCE.damage.levelPerRequiredStat,
    ),
  );
  const entries = Object.entries(profile.types) as [DamageType, number][];
  const weight = entries.reduce((sum, [, n]) => sum + n, 0);
  if (!weight) return [];
  const result = entries.map(([type, n]) => ({
    type,
    value: Math.floor((total * n) / weight),
    remainder: ((total * n) / weight) % 1,
  }));
  let spare = total - result.reduce((sum, p) => sum + p.value, 0);
  for (const p of [...result].sort((a, b) => b.remainder - a.remainder))
    if (spare-- > 0) p.value++;
  return result.map(({ type, value }) => ({ type, value }));
}
export const figureCellDamage = (f: Pick<Fighter, "stats">, m: Maneuver) =>
  figureCellParts(f, m).reduce((sum, p) => sum + p.value, 0);
export function armorRating(f: Fighter, type: DamageType): number {
  return Object.values(f.gear).reduce(
    (sum, id) => sum + (id ? (item(id).defense?.[type] ?? 0) : 0),
    0,
  );
}
import { item } from "@/game/equipment/catalog";
export const mitigate = (damage: number, armor: number) =>
  (damage * BALANCE.armorK) / (BALANCE.armorK + Math.max(0, armor));
