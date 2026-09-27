import "@/app/styles/style.css";
import { reactionManeuvers, isStrike } from "@/game/combat/reaction-rules";
import { CombatMenu } from "@/features/combat/CombatMenu/CombatMenu";
// Isolated layout preview; does not read or modify saved characters.
import { createRoot } from "react-dom/client";
import { createGame } from "@/game/combat/engine";
import { beginClash, publicClash } from "@/game/combat/reaction-engine";
import { FighterPanel } from "@/features/characters/FighterPanel/FighterPanel";
import { ReactionBoard } from "@/features/combat/ReactionBoard/ReactionBoard";

const game = publicClash(
  beginClash(
    createGame("Проверка портрета", () => 0.5),
    () => 0.5,
  ),
);
game.clash!.stage = "reaction";
game.clash!.preparer = "enemy";
game.clash!.reactor = "player";
game.clash!.enemyPlaced = [
  {
    id: reactionManeuvers(game.enemy).find(isStrike)!.id,
    x: 1,
    y: 0,
    rotation: 0,
  },
];
createRoot(document.getElementById("root")!).render(
  <div className="app combat-app">
    <CombatMenu
      busy={false}
      onHome={() => {}}
      onMap={() => {}}
      onRules={() => {}}
    />
    <main>
      <div className="arena-layout">
        <FighterPanel
          fighter={game.player}
          onInspect={() => {}}
          onOpen={() => {}}
        />
        <section className="battle-center">
          <ReactionBoard
            game={game}
            busy={false}
            session="interaction-preview"
            onSubmit={async () => {}}
          />
        </section>
        <FighterPanel
          fighter={game.enemy}
          enemy
          onInspect={() => {}}
          onOpen={() => {}}
        />
      </div>
    </main>
  </div>,
);
