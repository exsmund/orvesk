import BALANCE from "../../../data/combat-balance.json";
import { DAMAGE, STATS } from "@/game/equipment/catalog";
import { figureCellParts, figureCellDamage } from "@/game/combat/figure-power";
import type { Fighter, Maneuver } from "@/game/types";
const number = (value: number) => value.toLocaleString("ru-RU");

export function explainDamage(f: Pick<Fighter, "stats">, m: Maneuver) {
  const profile = m.healthDamage;
  if (!profile) return [];
  const stats = profile.stats
    .map((s) => {
      const term = `(${STATS[s]} ${number(f.stats[s])} − 1)`;
      return BALANCE.damage.perStatPoint === 1
        ? term
        : `${number(BALANCE.damage.perStatPoint)} × ${term}`;
    })
    .join(" + ");
  const levels =
    profile.stats.length *
    Math.max(0, (m.sourceLevel ?? 1) - 1) *
    BALANCE.damage.levelPerRequiredStat;
  const total = figureCellDamage(f, m);
  const base = number(profile.base + levels);
  const budget = `${base}${stats ? " + " + stats : ""}`;
  const weight = Object.values(profile.types).reduce((sum, n) => sum + n, 0);
  return figureCellParts(f, m)
    .filter((p) => p.value > 0)
    .map((p) => {
      const share = profile.types[p.type]!;
      let expression = budget;
      if (share !== weight) {
        expression = `(${budget}) × ${number(share)}/${number(weight)}`;
        const exact = (total * share) / weight;
        if (!Number.isInteger(exact)) {
          expression = p.value > exact ? `⌈${expression}⌉` : `⌊${expression}⌋`;
        }
      }
      return {
        type: p.type,
        label: DAMAGE[p.type],
        value: p.value,
        formula: `${expression} = ${number(p.value)}×${m.shape.length}`,
      };
    });
}
