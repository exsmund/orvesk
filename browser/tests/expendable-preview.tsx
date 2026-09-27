import "@/app/styles/style.css";
import { CombatBackdrop } from "@/features/combat/CombatBackdrop/CombatBackdrop";
// Isolated engine/UI fixture; no API or saved heroes.
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { battle } from "../stories/fixtures";
import {
  beginClash,
  publicClash,
  submitClash,
  finishClashActions,
} from "@/game/combat/reaction-engine";
import { BattleModeDialog } from "@/features/combat/BattleModeDialog/BattleModeDialog";
import { BattleResultDialog } from "@/features/combat/BattleResultDialog/BattleResultDialog";
import { ReactionBoard } from "@/features/combat/ReactionBoard/ReactionBoard";
import type { Placement, BoardModifiers } from "@/game/types";

function Preview() {
  const [game, setGame] = useState(() => {
    const g = battle();
    g.journey!.battleMode = "expendable";
    g.journey!.mapPreset =
      new URLSearchParams(location.search).get("preset") ?? "forest";
    return beginClash(g, () => 0.5);
  });
  const [intro, setIntro] = useState(true),
    [closed, setClosed] = useState(false);
  return (
    <div className="app combat-app">
      <CombatBackdrop journey={game.journey} />
      {game.phase === "combat" ? (
        <ReactionBoard
          game={publicClash(game)}
          session="expendable-preview"
          busy={false}
          onSubmit={async (payload) => {
            const p = payload as {
              placements: Placement[];
              modifiers: BoardModifiers;
            };
            setGame(submitClash(game, p.placements, p.modifiers, () => 0.5));
          }}
          onFinish={() => setGame(finishClashActions(game, () => 0.5))}
        />
      ) : closed ? (
        <p>Карта</p>
      ) : (
        <BattleResultDialog
          game={publicClash(game)}
          onClose={() => setClosed(true)}
        />
      )}
      {intro && (
        <BattleModeDialog
          mode="expendable"
          onContinue={() => setIntro(false)}
        />
      )}
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<Preview />);
