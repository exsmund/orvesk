import { creatureFigures } from "@/game/creatures/catalog";
import baseFigures from "../../../data/base-figures.json";
import { item } from "@/game/equipment/catalog";
import type { Fighter, Maneuver, Slot } from "@/game/types";
export interface FigureDefinition extends Partial<Maneuver> {
  id: string;
  order?: number;
  enabled?: boolean;
  availability?: string;
}
export const hasFreeHand = (f: Fighter) =>
  !f.gear.shield && item(f.gear.weapon).hands !== 2;
export function configuredManeuvers(f: Fighter): Maneuver[] {
  const intrinsic = f.creatureId
    ? creatureFigures(f)
    : (baseFigures as FigureDefinition[]);
  const available = (d: FigureDefinition) =>
    d.availability === "emptyWeapon"
      ? !f.gear.weapon
      : d.availability === "emptyShield"
        ? hasFreeHand(f)
        : d.availability === "emptyFeet"
          ? !f.gear.feet
          : true;
  const figures = intrinsic.filter(available).map(
    (d) =>
      ({
        ...structuredClone(d),
        sourceLevel: d.naturalLevel
          ? Math.min(
              ...(d.healthDamage?.stats.length
                ? d.healthDamage.stats.map((stat) => f.stats[stat])
                : [1]),
            )
          : 1,
        id: `base:${d.id}`,
      }) as Maneuver,
  );
  for (const slot of [
    "weapon",
    "shield",
    "body",
    "feet",
    "ring",
    "amulet",
  ] as Slot[]) {
    if (!f.gear[slot]) continue;
    const equipment = item(f.gear[slot]);
    if (equipment.charmEffect) continue;
    const source =
      equipment.kind === "weapon"
        ? { weaponId: equipment.id }
        : equipment.kind === "shield"
          ? { shieldId: equipment.id }
          : { equipmentId: equipment.id };
    figures.push(
      ...equipment.figures.map(
        (d) =>
          ({
            ...structuredClone(d),
            ...source,
            sourceLevel: equipment.level,
            id: `${equipment.id}:${d.id}`,
          }) as Maneuver,
      ),
    );
  }
  return figures;
}
export function charmManeuvers(f: Fighter): Maneuver[] {
  return (["ring", "amulet"] as const).flatMap((slot) => {
    const id = f.gear[slot];
    if (!id || f.charmsUsed?.[slot]) return [];
    const equipment = item(id);
    return equipment.charmEffect
      ? equipment.figures.map((d) => ({ ...d, weaponId: id }) as Maneuver)
      : [];
  });
}
