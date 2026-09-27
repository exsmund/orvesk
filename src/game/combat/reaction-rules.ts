import { allFigures } from "@/game/combat/deck";
import { figureCellDamage } from "@/game/combat/figure-power";
import { placementCells } from "@/game/combat/board";
import type {
  BoardModifiers,
  Fighter,
  Item,
  Maneuver,
  Placement,
} from "@/game/types";
export const isStrike = (m?: Maneuver) => m?.category === "attack";
export const isGuard = (m?: Maneuver) => m?.blocks === true;
export const reactionManeuvers = (f: Fighter): Maneuver[] =>
  f.deck?.hand ?? allFigures(f);
export function itemManeuvers(equipment: Item): Maneuver[] {
  return equipment.figures.map(
    (d) =>
      ({
        ...d,
        weaponId: equipment.id,
        sourceLevel: equipment.level,
      }) as Maneuver,
  );
}
export const usedCells = (
  f: Fighter,
  placed: Placement[],
  mod: BoardModifiers,
) =>
  placed.reduce(
    (n, p) =>
      n +
      placementCells(
        reactionManeuvers(f).find((m) => m.id === p.id)!,
        p,
        mod,
      ).length,
    0,
  );
export const maneuverDamage = (f: Fighter, m: Maneuver) =>
  figureCellDamage(f, m) * m.shape.length;
export const maneuverStaminaDamage = (_f: Fighter, m: Maneuver) =>
  (m.staminaDamagePerCell ?? 0) * m.shape.length;
