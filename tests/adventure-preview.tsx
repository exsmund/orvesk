// Manual integration fixture, local memory only. No API and no saved characters.
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { createGame } from "../src/game/combat/engine";
import {
  beginClash,
  publicClash,
  submitClash,
} from "../src/game/combat/reaction-engine";
import {
  claimJourneyReward,
  journeyVictory,
  chooseJourneyStep,
} from "../src/game/journey/journey";
import {
  ReactionBoard,
  ClashOutcome,
} from "../src/features/combat/ReactionBoard";
import { JourneyChoices } from "../src/features/journey/AdventureUI";
import { FighterDebuffs } from "../src/features/characters/FighterDebuffs";
import type { Placement, BoardModifiers } from "../src/game/types";
import "../src/app/styles/style.css";
function fixture() {
  const g = beginClash(
    createGame("Проверка тактики", () => 0.6),
    () => 0.6,
  );
  g.player.gear.weapon = "axe";
  g.player.stats.strength = 3;
  g.player.hp = 40;
  g.player.gear.shield = "buckler";
  g.player.frostImmune = true;
  g.enemy.gear.weapon = "club";
  g.enemy.archetype = "crusher";
  g.enemy.cooldowns = { heavy: 1 };
  g.enemy.hp = 40;
  Object.assign(g.clashPlan!, {
    preparer: "enemy",
    reactor: "player",
    stage: "reaction",
    blocked: [6, 7],
    enemyPlaced: [{ id: "strike-1", x: 0, y: 0, rotation: 0 }],
    enemyModifiers: {},
    playerBudget: 4,
    enemyBudget: 5,
    special: { index: 1, kind: "surge" },
  });
  return g;
}
function Preview() {
  const [g, setGame] = useState(fixture),
    [result, setResult] = useState(false),
    [revision, setRevision] = useState(0),
    [message, setMessage] = useState("");
  return (
    <main
      style={{
        maxWidth: 900,
        height: "100dvh",
        margin: "auto",
        display: "flex",
        flexDirection: "column",
        overflow: "auto",
      }}
    >
      <nav style={{ display: "flex", gap: 8, padding: 5 }}>
        <button
          onClick={() => {
            setGame(fixture());
            setRevision((n) => n + 1);
            setResult(false);
          }}
        >
          Сброс
        </button>
        <button
          onClick={() => {
            const next = structuredClone(g);
            next.phase = "victory";
            next.reward = { kind: "souls", amount: 2 };
            next.rewardOptions = [next.reward];
            next.player.hp = 4;
            journeyVictory(next, () => 0.5);
            setGame(claimJourneyReward(next, "souls"));
            setResult(false);
          }}
        >
          Победа (тест)
        </button>
        <button
          onClick={() => {
            const next = fixture();
            next.player.gear.weapon = "staff";
            setGame(next);
            setRevision((n) => n + 1);
            setResult(false);
          }}
        >
          Посох
        </button>
      </nav>
      <FighterDebuffs fighter={g.player} />
      {message && <p>{message}</p>}
      {result ? (
        <ClashOutcome
          turn={g.log[0]}
          ending="Далее"
          onDone={() => setResult(false)}
        />
      ) : g.phase === "combat" ? (
        <ReactionBoard
          key={revision + ":" + g.fight + ":" + g.round}
          game={publicClash(g)}
          busy={false}
          session={`adventure-qa-${revision}`}
          onInspect={setMessage}
          onSubmit={async (payload) => {
            try {
              const p = payload as {
                placements: Placement[];
                modifiers: BoardModifiers;
              };
              setGame(submitClash(g, p.placements, p.modifiers));
              setResult(true);
            } catch (e) {
              setMessage(String(e));
            }
          }}
        />
      ) : (
        <JourneyChoices
          key={g.fight}
          game={publicClash(g)}
          busy={false}
          onInspect={setMessage}
          onNext={(payload) => {
            const next = chooseJourneyStep(g, payload);
            setGame(next.phase === "combat" ? beginClash(next) : next);
            setResult(false);
          }}
        />
      )}
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<Preview />);
