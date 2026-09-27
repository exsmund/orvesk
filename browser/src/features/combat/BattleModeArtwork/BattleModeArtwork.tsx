import "@/features/combat/BattleModeArtwork/BattleModeArtwork.css";
import { BATTLE_MODES } from "@/game/combat/battle-modes";
import type { BattleMode } from "@/game/types";

import { ARTWORK } from "@/features/combat/BattleModeArtwork/model";
export function BattleModeArtwork({
  mode,
  size = "dialog",
  decorative = false,
}: {
  mode: BattleMode;
  size?: "icon" | "dialog";
  decorative?: boolean;
}) {
  return (
    <img
      className={`battle-mode-artwork battle-mode-artwork--${size}`}
      src={ARTWORK[mode]}
      alt={decorative ? "" : BATTLE_MODES[mode].name}
      width={160}
      height={160}
      draggable={false}
    />
  );
}
