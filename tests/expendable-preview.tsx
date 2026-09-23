import { CombatBackdrop } from "../src/features/combat/CombatBackdrop";
// Isolated engine/UI fixture; no API or saved heroes.
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { battle } from "../stories/fixtures";
import {
  beginClash,
  publicClash,
  submitClash,
  finishClashActions,
} from "../src/game/combat/reaction-engine";
import { BattleModeDialog } from "../src/features/combat/BattleModeDialog";
import { BattleResultDialog } from "../src/features/combat/BattleResultDialog";
import { ReactionBoard } from "../src/features/combat/ReactionBoard";
import type { Placement, BoardModifiers } from "../src/game/types";
import "../src/app/styles/style.css";
import "../src/app/styles/ui-textures.css";
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
          onInspect={() => {}}
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
