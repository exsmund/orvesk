// Isolated in-memory UI fixture. Never reads or writes saved characters or calls game APIs.
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { createGame } from "../src/game/combat/engine";
import {
  beginClash,
  publicClash,
  submitClash,
} from "../src/game/combat/reaction-engine";
import { claimJourneyReward } from "../src/game/journey/journey";
import {
  ReactionBoard,
  ClashOutcome,
} from "../src/features/combat/ReactionBoard";
import { FighterSkills } from "../src/features/skills/SkillUI";
import { VictoryRewardDialog } from "../src/features/rewards/VictoryRewardDialog";
import { upgradeAttribute, level } from "../src/game/progression/souls";
import type { Placement, BoardModifiers } from "../src/game/types";
import "../src/app/styles/style.css";
import "../src/features/combat/tactics.css";
function fixture() {
  const g = beginClash(
    createGame("Проверка навыков", () => 0.5),
    () => 0.5,
  );
  for (const f of [g.player, g.enemy]) {
    f.skills = ["dodge", "composure", "bandage"];
    f.hp = 8;
    f.poise = 2;
    f.gear = { weapon: "dagger", shield: null, body: null, feet: null };
    delete f.archetype;
  }
  Object.assign(g.clashPlan!, {
    stage: "reaction",
    preparer: "enemy",
    reactor: "player",
    blocked: [8],
    special: undefined,
    playerBudget: 5,
    enemyBudget: 5,
    playerPlaced: [],
    enemyPlaced: [{ id: "heavy", x: 0, y: 0, rotation: 0 }],
    playerModifiers: {},
    enemyModifiers: {},
  });
  return g;
}
function Preview() {
  const [g, set] = useState(fixture),
    [mode, view] = useState<"board" | "reward" | "skills" | "outcome">("board"),
    [error, setError] = useState(""),
    [rewardIndex, select] = useState(1),
    [revision, revise] = useState(0);
  function reward(full: boolean) {
    const g = fixture();
    g.phase = "victory";
    g.player.skills = full ? ["dodge", "composure", "bandage"] : [];
    g.reward = { kind: "skill", skillId: "sidestep" };
    g.rewardOptions = [{ kind: "souls", amount: 2 }, g.reward];
    set(g);
    view("reward");
    select(1);
    setError("");
    revise((n) => n + 1);
  }
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
        <button
          onClick={() => {
            set(fixture());
            view("board");
            revise((n) => n + 1);
          }}
        >
          Поле
        </button>
        <button onClick={() => reward(false)}>Новый навык</button>
        <button onClick={() => reward(true)}>Замена навыка</button>
        <button onClick={() => view("skills")}>Персонажи</button>
      </nav>
      {error && <p role="alert">{error}</p>}
      {mode === "reward" ? (
        <VictoryRewardDialog
          game={publicClash(g)}
          busy={false}
          index={rewardIndex}
          onSelect={select}
          error={error}
          onSpend={(stat) =>
            set(upgradeAttribute(g, stat, level(g.player), g.souls))
          }
          onClaim={(selection, replace, slot) => {
            try {
              set(claimJourneyReward(g, selection, rewardIndex, replace, slot));
              view("skills");
            } catch (e) {
              setError(String(e));
            }
          }}
        />
      ) : mode === "skills" ? (
        <div style={{ overflow: "auto", padding: 16 }}>
          <h2>Ваш персонаж</h2>
          <FighterSkills fighter={g.player} />
          <h2>Противник</h2>
          <FighterSkills fighter={g.enemy} />
        </div>
      ) : mode === "outcome" ? (
        <ClashOutcome
          turn={g.log[0]}
          ending="Далее"
          onDone={() => view("board")}
        />
      ) : (
        <ReactionBoard
          key={`skills-${revision}-${g.round}`}
          game={publicClash(g)}
          busy={false}
          session={`skills-preview-${revision}`}
          onInspect={() => {}}
          onSubmit={async (payload) => {
            const { placements, modifiers } = payload as {
              placements: Placement[];
              modifiers: BoardModifiers;
            };
            try {
              set(submitClash(g, placements, modifiers, () => 0.9));
              view("outcome");
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
