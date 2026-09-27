import type { BattleMode, Fighter } from "@/game/types";
import type { ResourceChange } from "@/features/combat/resource-preview";

export type BattleHeaderProps = {
  player: Fighter;
  mode: BattleMode;
  mapNumber?: number;
  onPlayer: () => void;
  playerPreview?: ResourceChange;
} & (
  | {
      screen: "battle";
      enemy: Fighter;
      enemyPreview?: ResourceChange;
      onEnemy: () => void;
    }
  | { screen: "map"; souls: number }
);
