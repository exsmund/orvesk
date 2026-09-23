// In-memory UI fixture: does not read or write saved characters or call game APIs.
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { createGame } from "../src/game/combat/engine";
import {
  beginClash,
  publicClash,
  submitClash,
} from "../src/game/combat/reaction-engine";
import {
  ReactionBoard,
  ClashOutcome,
} from "../src/features/combat/ReactionBoard";
import { ItemInspection } from "../src/features/equipment/ItemInspection";
import { item } from "../src/game/equipment/catalog";
import type { BoardModifiers, Placement } from "../src/game/types";
import "../src/app/styles/style.css";
function fixture(weapon = "dagger", hidden = false) {
  const g = beginClash(
    createGame("Проверка комбинаций", () => 0.6),
    () => 0.6,
  );
  for (const f of [g.player, g.enemy]) {
    f.stats = {
      strength: 3,
      agility: 3,
      endurance: 3,
      intelligence: 3,
      reaction: 3,
    };
    f.hp = 25;
    f.poise = 4;
    f.prone = false;
    f.tactical = true;
    f.splitBuckler = true;
    f.gear = { weapon, shield: "buckler", body: null, feet: null };
    delete f.archetype;
  }
  g.enemy.gear.weapon = "dagger";
  Object.assign(g.clashPlan!, {
    stage: hidden ? "preparation" : "reaction",
    preparer: hidden ? "player" : "enemy",
    reactor: hidden ? "enemy" : "player",
    blocked: [8],
    special: undefined,
    playerBudget: 5,
    enemyBudget: 5,
    playerModifiers: {},
    enemyModifiers: {},
    enemyPlaced: [
      { id: "strike-1", x: 0, y: 0, rotation: 0 },
      { id: "kick", x: 0, y: 2, rotation: 0 },
    ],
  });
  return g;
}
function Preview() {
  const [g, set] = useState(() => fixture()),
    [revision, revise] = useState(0),
    [replay, showReplay] = useState(false),
    [inspect, setInspect] = useState(false),
    [error, setError] = useState("");
  function reset(weapon = "dagger", hidden = false) {
    set(fixture(weapon, hidden));
    revise((n) => n + 1);
    showReplay(false);
    setInspect(false);
    setError("");
  }
  return (
    <main
      style={{
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      <nav
        style={{
          display: "flex",
          gap: 5,
          padding: 5,
          flexWrap: "wrap",
          fontSize: 12,
        }}
      >
        <button onClick={() => reset()}>Кинжал</button>
        <button onClick={() => reset("axe")}>Топор</button>
        <button onClick={() => reset("shortsword")}>Меч</button>
        <button onClick={() => reset("dagger", true)}>Подготовка</button>
        <button
          onClick={() => {
            const next = fixture();
            next.player.prone = true;
            next.player.poise = 0;
            next.enemy.gear = {
              weapon: "hammer",
              shield: null,
              body: null,
              feet: null,
            };
            Object.assign(next.clashPlan!, {
              blocked: [],
              enemyBudget: 6,
              enemyPlaced: [
                { id: "strike-1", x: 0, y: 0, rotation: 0 },
                { id: "kick", x: 0, y: 1, rotation: 0 },
                { id: "guard", x: 0, y: 2, rotation: 0 },
              ],
            });
            set(next);
            revise((n) => n + 1);
            showReplay(false);
            setInspect(false);
          }}
        >
          Подъём под ударами
        </button>
        <button
          onClick={() => {
            const next = fixture();
            next.player.gear.shield = "kite-shield";
            next.player.poise = 2;
            next.clashPlan!.enemyPlaced = [
              { id: "strike-1", x: 0, y: 0, rotation: 0 },
              { id: "strike-2", x: 1, y: 0, rotation: 0 },
            ];
            set(next);
            revise((n) => n + 1);
            showReplay(false);
            setInspect(false);
          }}
        >
          Щит стража
        </button>
        <button onClick={() => setInspect(!inspect)}>Карточка</button>
      </nav>
      {error && <p role="alert">{error}</p>}
      {inspect ? (
        <div style={{ overflow: "auto" }}>
          <ItemInspection
            equipment={item(
              g.player.gear.shield === "kite-shield"
                ? g.player.gear.shield
                : g.player.gear.weapon,
            )}
            player={g.player}
            own
          />
        </div>
      ) : replay ? (
        <ClashOutcome
          turn={g.log[0]}
          ending="Далее"
          onDone={() => showReplay(false)}
        />
      ) : (
        <ReactionBoard
          key={`${revision}:${g.round}`}
          game={publicClash(g)}
          busy={false}
          session={`combos-preview-${revision}`}
          onInspect={() => {}}
          onSubmit={async (payload) => {
            try {
              const p = payload as {
                placements: Placement[];
                modifiers: BoardModifiers;
              };
              set(submitClash(g, p.placements, p.modifiers, () => 0.9));
              showReplay(true);
            } catch (e) {
              setError(String(e));
            }
          }}
        />
      )}
    </main>
  );
}
function Harness() {
  const [mobile, setMobile] = useState(false);
  return (
    <>
      <nav>
        <button onClick={() => setMobile(!mobile)}>
          {mobile ? "Широкий вид" : "Мобильный вид"}
        </button>
      </nav>
      <iframe
        title="Проверка комбинаций"
        src="?embedded"
        style={{
          border: 0,
          width: mobile ? 390 : 980,
          maxWidth: "100%",
          height: mobile ? 740 : 760,
          display: "block",
          margin: "auto",
        }}
      />
    </>
  );
}
createRoot(document.getElementById("root")!).render(
  location.search.includes("embedded") ? <Preview /> : <Harness />,
);
