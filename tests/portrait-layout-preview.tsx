import { CombatMenu } from "../src/features/combat/CombatMenu";
// Isolated layout preview; does not read or modify saved characters.
import { createRoot } from "react-dom/client";
import { createGame } from "../src/game/combat/engine";
import { beginClash, publicClash } from "../src/game/combat/reaction-engine";
import { FighterPanel } from "../src/features/characters/FighterPanel";
import { ReactionBoard } from "../src/features/combat/ReactionBoard";
import "../src/app/styles/style.css";
import "../src/features/characters/portraits.css";
import "../src/features/combat/combat-layout.css";
import "../src/features/combat/tactics.css";
import "../src/features/characters/fighter-portraits.css";
import "../src/app/styles/ui-textures.css";
const game = publicClash(
  beginClash(
    createGame("Проверка портрета", () => 0.5),
    () => 0.5,
  ),
);
createRoot(document.getElementById("root")!).render(
  <div className="app combat-app">
    <CombatMenu
      busy={false}
      onHome={() => {}}
      onMap={() => {}}
      onRules={() => {}}
      onJournal={() => {}}
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
            session="portrait-layout-preview"
            onInspect={() => {}}
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
