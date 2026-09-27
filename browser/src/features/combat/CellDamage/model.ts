import { formatDamage } from "@/game/combat/battle-feedback";
import type { ClashCell } from "@/game/types";

export type CellDamageValues = Pick<
  ClashCell,
  "playerDamage" | "enemyDamage"
> & {
  playerStaminaDamage: number;
  enemyStaminaDamage: number;
};

export function describeCellDamage(damage: CellDamageValues) {
  return `Вы: −${formatDamage(damage.playerDamage)} здоровья, −${formatDamage(damage.playerStaminaDamage)} выносливости. Противник: −${formatDamage(damage.enemyDamage)} здоровья, −${formatDamage(damage.enemyStaminaDamage)} выносливости`;
}
