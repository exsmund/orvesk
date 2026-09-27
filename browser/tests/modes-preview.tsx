import "@/app/styles/style.css";
// Isolated in-memory fixture. No API calls or character-save access.
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { createGame } from "@/game/combat/engine";
import {
  beginClash,
  publicClash,
  submitClash,
} from "@/game/combat/reaction-engine";
import { BATTLE_MODES } from "@/game/combat/battle-modes";
import { chooseJourneyStep } from "@/game/journey/journey";
import { ReactionBoard } from "@/features/combat/ReactionBoard/ReactionBoard";
import { ClashOutcome } from "@/features/combat/ClashOutcome/ClashOutcome";
import { JourneyChoices } from "@/features/journey/JourneyChoices/JourneyChoices";
import type { BattleMode, Placement, BoardModifiers } from "@/game/types";

function fixture(mode: BattleMode) {
  const g = createGame("Проверка режимов", () => 0.5);
  g.journey = {
    battleMode: mode,
    startLevel: 1,
    expedition: 1,
    stage: 1,
    cleared: 0,
  };
  for (const f of [g.player, g.enemy]) {
    f.skills = ["dodge", "attack-training", "bandage"];
    f.hp = 15;
    f.gear = { weapon: "dagger", shield: "buckler", body: null, feet: null };

  }
  const ready = beginClash(g, () => 0.5);
  Object.assign(ready.clashPlan!, {
    stage: "reaction",
    preparer: "enemy",
    reactor: "player",
    blocked: [8],
    special: undefined,


    playerPlaced: [],
    enemyPlaced: [{ id: "strike-1", x: 0, y: 0, rotation: 0 }],
    playerModifiers: {},
    enemyModifiers: {},
  });
  return ready;
}
function Preview() {
  const [g, set] = useState(() => fixture("free")),
    [view, show] = useState<"board" | "outcome" | "journey">("board"),
    [revision, revise] = useState(0),
    [error, setError] = useState("");
  return (
    <main
      style={{
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        maxWidth: 1000,
        margin: "auto",
      }}
    >
      <nav style={{ display: "flex", gap: 6, padding: 6, flexWrap: "wrap" }}>
        {(Object.keys(BATTLE_MODES) as BattleMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => {
              set(fixture(mode));
              show("board");
              revise((n) => n + 1);
              setError("");
            }}
          >
            {BATTLE_MODES[mode].name}
          </button>
        ))}
        <button
          onClick={() => {
            set({ ...g, phase: "ready" });
            show("journey");
          }}
        >
          Путешествие
        </button>
      </nav>
      {error && <p role="alert">{error}</p>}
      {view === "outcome" ? (
        <ClashOutcome
          turn={g.log[0]}
          ending="Далее"
          onDone={() => show(g.phase === "combat" ? "board" : "journey")}
        />
      ) : view === "journey" ? (
        <div style={{ overflow: "auto", padding: 16 }}>
          <JourneyChoices
            game={publicClash(g)}
            busy={false}
            onInspect={() => {}}
            onNext={(payload) => {
              const next = chooseJourneyStep(g, payload);
              set(next.phase === "combat" ? beginClash(next) : next);
              show(next.phase === "combat" ? "board" : "journey");
              revise((n) => n + 1);
            }}
          />
        </div>
      ) : (
        <ReactionBoard
          key={`${revision}-${g.fight}-${g.round}`}
          game={publicClash(g)}
          busy={false}
          session={`modes-preview-${revision}`}
          onSubmit={async (payload) => {
            const { placements, modifiers } = payload as {
              placements: Placement[];
              modifiers: BoardModifiers;
            };
            try {
              set(submitClash(g, placements, modifiers, () => 0.5));
              show("outcome");
            } catch (e) {
              setError(String(e));
            }
          }}
        />
      )}
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<Preview />);
