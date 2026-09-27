import { Text } from "@/shared/ui/Text";
import "@/features/combat/BattleWorkspace/BattleWorkspace.css";
import type { ReactNode } from "react";
/** Shared field and lower area for planning, turn results, and battle results. */
export function BattleWorkspace({
  children,
  below,
  hint,
}: {
  children: ReactNode;
  below?: ReactNode;
  hint?: string;
}) {
  return (
    <div className="planning-workspace battle-workspace">
      <Text
        as="p"
        size="sm"
        color="muted"
        align="center"
        className="battle-workspace__hint"
        aria-hidden={!hint}
      >
        {hint || "\u00a0"}
      </Text>
      <div className="board-column">{children}</div>
      <div className="maneuver-column battle-workspace__below">{below}</div>
    </div>
  );
}
