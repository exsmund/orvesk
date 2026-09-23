import type { ReactNode } from "react";

/** Shared field and lower area for planning, turn results, and battle results. */
export function BattleWorkspace({
  children,
  below,
}: {
  children: ReactNode;
  below?: ReactNode;
}) {
  return (
    <div className="planning-workspace battle-workspace">
      <div className="board-column">{children}</div>
      <div className="maneuver-column battle-workspace__below">{below}</div>
    </div>
  );
}
