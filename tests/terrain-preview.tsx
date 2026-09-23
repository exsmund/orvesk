// Manual UI fixture: local memory only, never reads or writes character saves.
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { createGame } from "../src/game/combat/engine";
import {
  beginClash,
  applyClashCharm,
  publicClash,
  submitClash,
} from "../src/game/combat/reaction-engine";
import {
  ReactionBoard,
  ClashOutcome,
} from "../src/features/combat/ReactionBoard";
import type { Placement, BoardModifiers } from "../src/game/types";
import "../src/app/styles/style.css";
function fixture(blocked: number[]) {
  const game = beginClash(createGame("Проверка скал"));
  game.player.gear.ring = "unlock-ring";
  game.player.gear.amulet = "fold-amulet";
  Object.assign(game.clashPlan!, {
    blocked,
    preparer: "player",
    reactor: "enemy",
    stage: "preparation",
    playerBudget: 5,
    enemyBudget: 4,
    playerPlaced: [],
    enemyPlaced: [],
    playerModifiers: {},
    enemyModifiers: {},
  });
  return game;
}
function Preview() {
  const [game, setGame] = useState(() => fixture([1, 4])),
    [version, setVersion] = useState(0),
    [result, setResult] = useState(false);
  function reset(blocked: number[]) {
    setGame(fixture(blocked));
    setVersion((v) => v + 1);
    setResult(false);
  }
  return (
    <main
      style={{
        maxWidth: 800,
        margin: "0 auto",
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <nav style={{ display: "flex", gap: 8, padding: 8 }}>
        <button onClick={() => reset([3, 4])}>Горизонталь</button>
        <button onClick={() => reset([1, 4])}>Вертикаль</button>
        <button onClick={() => reset([0, 4])}>Диагональ</button>
      </nav>
      {result ? (
        <ClashOutcome
          turn={game.log[0]}
          ending="Заново"
          onDone={() => reset([1, 4])}
        />
      ) : (
        <ReactionBoard
          key={version}
          game={publicClash(game)}
          session={`terrain-visual-${version}`}
          busy={false}
          onInspect={() => {}}
          onCharm={async (charm, target) => {
            setGame((current) => applyClashCharm(current, charm, target));
            return true;
          }}
          onSubmit={async (payload) => {
            const p = payload as {
              placements: Placement[];
              modifiers: BoardModifiers;
            };
            setGame(submitClash(game, p.placements, p.modifiers));
            setResult(true);
          }}
        />
      )}
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<Preview />);
