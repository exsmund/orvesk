import type { BattleMode } from "../../game/types";
import { BATTLE_MODES } from "../../game/combat/battle-modes";
import "./battle-mode-artwork.css";

const ARTWORK: Record<BattleMode, string> = {
  limited: "/ui/battle-modes/limited-v1.png",
  free: "/ui/battle-modes/free-v1.png",
  expendable: "/ui/battle-modes/expendable-v1.png",
};

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
