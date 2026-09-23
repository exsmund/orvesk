import { useState } from "react";
import type { PublicGame } from "../../game/types";
export function useVictoryRewardWindow(
  phase: PublicGame["phase"] | undefined,
  replayOpen: boolean,
) {
  const [open, setOpen] = useState(phase === "victory" && !replayOpen);
  const [previous, setPrevious] = useState({ phase, replayOpen });
  if (previous.phase !== phase || previous.replayOpen !== replayOpen) {
    setPrevious({ phase, replayOpen });
    setOpen(phase === "victory" && !replayOpen);
  }
  return [open, setOpen] as const;
}
