import { DAMAGE, item, STATS } from "@/game/equipment/catalog";
import { displaced, canUse } from "@/game/combat/engine";
import {
  STAT_KEYS,
  type DamageType,
  type Fighter,
  type Item,
  type Stat,
} from "@/game/types";

export interface ComparisonRow {
  key: string;
  label: string;
  current: number;
  candidate: number;
  requirementStat?: Stat;
  unit?: "%" | "п.п.";
  lowerIsBetter?: boolean;
  neutral?: boolean;
}

/** Compare equipment properties; damage belongs to each figure. */
export function compareItem(candidate: Item, player: Fighter) {
  const current =
    candidate.slot === "weapon"
      ? item(player.gear.weapon)
      : player.gear[candidate.slot]
        ? item(player.gear[candidate.slot])
        : null;
  const rows: ComparisonRow[] = [];
  const add = (
    key: string,
    label: string,
    oldValue = 0,
    newValue = 0,
    extra: Partial<ComparisonRow> = {},
  ) => {
    if (oldValue || newValue)
      rows.push({
        key,
        label,
        current: oldValue,
        candidate: newValue,
        ...extra,
      });
  };
  if (candidate.kind === "weapon" || candidate.kind === "shield") {
    add(
      "hands",
      "Занимает рук",
      current?.unarmed ? 0 : current?.hands,
      candidate.unarmed ? 0 : candidate.hands,
      { neutral: true },
    );
  }
  // Shield defense belongs to legacy combat; current blocks negate covered cells.
  if (candidate.kind !== "shield")
    for (const type of Object.keys(DAMAGE) as DamageType[]) {
      add(
        `defense-${type}`,
        `Защита · ${DAMAGE[type].toLowerCase()}`,
        current?.defense?.[type],
        candidate.defense?.[type],
      );
    }
  add("level", "Уровень предмета", current?.level ?? 1, candidate.level ?? 1);
  for (const stat of STAT_KEYS)
    add(
      `require-${stat}`,
      `Требуется · ${STATS[stat].toLowerCase()}`,
      current?.requirements[stat],
      candidate.requirements[stat],
      { lowerIsBetter: true, requirementStat: stat },
    );
  return {
    current,
    candidate,
    rows,
    usable: canUse(player, candidate),
    removed: displaced(player, candidate).filter(
      (old) => old.id !== candidate.id,
    ),
    conflicts: displaced(player, candidate).filter(
      (old) => old.slot !== candidate.slot,
    ),
  };
}
