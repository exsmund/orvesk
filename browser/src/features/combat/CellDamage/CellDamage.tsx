import { Heart, Zap } from "lucide-react";
import { Text } from "@/shared/ui/Text";
import { formatDamage } from "@/game/combat/battle-feedback";
import {
  describeCellDamage,
  type CellDamageValues,
} from "@/features/combat/CellDamage/model";
import "@/features/combat/CellDamage/CellDamage.css";

export function CellDamage({ damage }: { damage: CellDamageValues }) {
  const sides = [
    {
      side: "player",
      label: "Вы",
      color: "success",
      health: damage.playerDamage,
      stamina: damage.playerStaminaDamage,
    },
    {
      side: "enemy",
      label: "Противник",
      color: "accent",
      health: damage.enemyDamage,
      stamina: damage.enemyStaminaDamage,
    },
  ] as const;
  return (
    <span className="cell-damage" title={describeCellDamage(damage)}>
      {sides.map(({ side, label, color, health, stamina }) => (
        <Text
          as="span"
          key={side}
          className="cell-damage__side"
          size="xs"
          weight="semibold"
          color={color}
        >
          <Text
            as="span"
            className="cell-damage__resource"
            aria-label={`${label}: −${formatDamage(health)} здоровья`}
          >
            <Heart aria-hidden="true" />−{formatDamage(health)}
          </Text>
          <Text
            as="span"
            className="cell-damage__resource"
            aria-label={`${label}: −${formatDamage(stamina)} выносливости`}
          >
            <Zap aria-hidden="true" />−{formatDamage(stamina)}
          </Text>
        </Text>
      ))}
    </span>
  );
}
