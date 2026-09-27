import { Text } from "@/shared/ui/Text";
import "@/features/combat/ReactionBoard/LayerIcon.css";

import type { Maneuver, Side } from "@/game/types";
import { ActionSource } from "@/features/combat/ActionSource/ActionSource";

export function LayerIcon({ m, side }: { m?: Maneuver; side: Side }) {
  return m ? (
    <Text
      as="span"
      className={`cell-layer layer-${side}`}
      title={`${side === "player" ? "Вы" : "Противник"}: ${m.name}`}
    >
      <ActionSource m={m} />
    </Text>
  ) : null;
}
