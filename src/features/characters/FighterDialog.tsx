import { FighterPanel } from "./FighterPanel";
import { Modal } from "../../shared/ui/Modal";

import React from "react";

import { type Fighter, type PublicGame } from "../../game/types";

export function FighterDialog({
  side,
  fighter,
  game,
  busy,
  close,
  onInspect,
  onUpgrade,
}: {
  side: "own" | "enemy";
  fighter: Fighter;
  game: PublicGame;
  busy: boolean;
  close: () => void;
  onInspect: (id: string) => void;
  onUpgrade: NonNullable<
    React.ComponentProps<typeof FighterPanel>["onUpgrade"]
  >;
}) {
  return (
    <Modal
      portal
      title={side === "own" ? "Ваш персонаж" : "Противник"}
      close={close}
    >
      <div className="fighter-details">
        <FighterPanel
          souls={side === "own" ? game.souls : undefined}
          busy={busy}
          onUpgrade={
            side === "own" && game.phase !== "combat" ? onUpgrade : undefined
          }
          fighter={fighter}
          enemy={side === "enemy"}
          onInspect={(equipment) => onInspect(equipment.id)}
        />
      </div>
    </Modal>
  );
}
