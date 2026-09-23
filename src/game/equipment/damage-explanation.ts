import { DAMAGE, STATS, item } from "./catalog";
import { damageParts } from "../combat/engine";
import { isStrike } from "../combat/reaction-rules";
import type { Damage, Fighter, Maneuver } from "../types";

const number = (value: number) =>
  value.toLocaleString("ru-RU", { maximumFractionDigits: 4 });

/** Describe the same source and rounding order as combat, for this figure's owner. */
export function explainDamage(fighter: Fighter, maneuver: Maneuver) {
  if (!isStrike(maneuver)) return [];
  const actor = {
    ...fighter,
    gear: { ...fighter.gear, weapon: maneuver.weaponId ?? fighter.gear.weapon },
  };
  const parts = damageParts(actor, {
    action: maneuver.action as "attack" | "heavy" | "kick" | "shield",
    step: 0,
  });
  const sources: Damage[] =
    maneuver.action === "kick" || maneuver.action === "shield"
      ? [
          {
            type: "blunt",
            stat: "strength",
            scale: 1,
            base: maneuver.action === "shield" ? 1 : 0,
          },
        ]
      : item(actor.gear.weapon).damage!;
  const multiplier = maneuver.action === "heavy" ? 1.5 : 1;
  return sources.map((source, index) => {
    const stat = fighter.stats[source.stat];
    const base = source.base ? `${number(source.base)} + ` : "";
    const scale = source.scale === 1 ? "" : `${number(source.scale)} × `;
    const expression = `${base}${scale}${STATS[source.stat]} (${number(stat)})`;
    const raw = (source.base + source.scale * stat) * multiplier;
    const value = parts[index].value;
    const rounded = raw !== value;
    return {
      type: source.type,
      label: DAMAGE[source.type],
      value: value * (maneuver.powerScale ?? 1),
      rounded,
      formula: `${multiplier === 1 ? expression : `(${expression}) × ${number(multiplier)}`} = ${number(raw)}${rounded ? ` → ${number(value)}` : ""}${maneuver.powerScale ? ` × ${maneuver.powerScale} (молот) = ${number(value * maneuver.powerScale)}` : ""}`,
    };
  });
}
