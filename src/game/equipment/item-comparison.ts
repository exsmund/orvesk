import { DAMAGE, item, STATS } from "./catalog";
import { displaced, canUse } from "../combat/engine";
import {
  STAT_KEYS,
  type DamageType,
  type Fighter,
  type Item,
  type Stat,
} from "../types";

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

function damage(
  equipment: Item | null,
  fighter: Fighter,
): Partial<Record<DamageType, number>> {
  if (equipment?.kind === "shield")
    return { blunt: fighter.stats.strength + 1 };
  const values: Partial<Record<DamageType, number>> = {};
  for (const part of equipment?.damage ?? [])
    values[part.type] =
      (values[part.type] ?? 0) +
      Math.ceil(part.base + part.scale * fighter.stats[part.stat]);
  return values;
}

/** Rewards use the player; opponent inspection may supply the actual attacker. */
export function compareItem(
  candidate: Item,
  player: Fighter,
  candidateFighter: Fighter = player,
) {
  const current =
    candidate.slot === "weapon"
      ? item(player.gear.weapon)
      : player.gear[candidate.slot]
        ? item(player.gear[candidate.slot])
        : null;
  const before = damage(current, player),
    after = damage(candidate, candidateFighter);
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
      "damage",
      candidate.kind === "shield" ? "Урон ударом щита" : "Урон обычной атаки",
      Object.values(before).reduce((a, b) => a + b, 0),
      Object.values(after).reduce((a, b) => a + b, 0),
    );
    for (const type of Object.keys(DAMAGE) as DamageType[])
      add(
        `damage-${type}`,
        `Урон · ${DAMAGE[type].toLowerCase()}`,
        before[type],
        after[type],
      );
    add(
      "hands",
      "Занимает рук",
      current?.id === "fist" ? 0 : current?.hands,
      candidate.id === "fist" ? 0 : candidate.hands,
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
      add(
        `resist-${type}`,
        `Сопротивление · ${DAMAGE[type].toLowerCase()}`,
        Math.round((current?.resistance?.[type] ?? 0) * 100),
        Math.round((candidate.resistance?.[type] ?? 0) * 100),
        { unit: "%" },
      );
    }
  add(
    "kick",
    "Бонус к потере равновесия от пинка",
    Math.round((current?.kickBonus ?? 0) * 100),
    Math.round((candidate.kickBonus ?? 0) * 100),
    { unit: "п.п." },
  );
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
