import { BattleResultDialog } from "../src/features/combat/BattleResultDialog";
import { outcome } from "../stories/fixtures";
// Isolated in-memory fixture. No API requests, browser storage, or saved characters.
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { createGame } from "../src/game/combat/engine";
import { beginClash, publicClash } from "../src/game/combat/reaction-engine";
import { claimJourneyReward } from "../src/game/journey/journey";
import { CharacterStats } from "../src/features/characters/CharacterStats";
import { SoulBalance } from "../src/features/characters/SoulBalance";
import { upgradeAttribute, level } from "../src/game/progression/souls";
import { JourneyScreen } from "../src/features/journey/JourneyScreen";
import { VictoryRewardDialog } from "../src/features/rewards/VictoryRewardDialog";
import { useVictoryRewardWindow } from "../src/features/rewards/useVictoryRewardWindow";
import "../src/app/styles/style.css";
import "../src/features/combat/tactics.css";
import "../src/features/combat/combat-layout.css";
import "../src/app/styles/ui-textures.css";
function fixture() {
  const g = beginClash(
    createGame("Проверка награды", () => 0.5),
    () => 0.5,
  );
  g.phase = "victory";
  g.log = [outcome];
  g.enemy.hp = 0;
  g.journey!.cleared = 1;
  g.reward = { kind: "souls", amount: 2 };
  g.rewardOptions = [
    { kind: "souls", amount: 2 },
    { kind: "item", itemId: "axe" },
    { kind: "skill", skillId: "dodge" },
    { kind: "item", itemId: "buckler" },
  ];
  g.player.skills = ["sidestep", "composure", "bandage"];
  g.player.stats.agility = 2;
  g.souls = 20;
  return g;
}
function Preview() {
  const [game, set] = useState(fixture),
    [replay, setReplay] = useState(true),
    [index, select] = useState(0),
    [error, setError] = useState(""),
    [hero, setHero] = useState(false);
  const [open, setOpen] = useVictoryRewardWindow(game.phase, replay),
    pub = publicClash(game);
  return (
    <>
      <aside style={{ position: "fixed", bottom: 0, left: 0, zIndex: 10 }}>
        <button
          onClick={() => {
            set(fixture());
            select(0);
            setReplay(true);
            setError("");
          }}
        >
          Повторить проверку
        </button>
        <output>
          {game.phase} · Души {game.souls} · Сила {game.player.stats.strength} ·{" "}
          {game.player.gear.weapon ?? "fist"} · {game.player.skills?.join(", ")}
        </output>
      </aside>
      <JourneyScreen
        game={pub}
        busy={false}
        onNext={() => {}}
        onInspect={() => {}}
        onHome={() => {}}
        onHero={() => setHero(true)}
        onRules={() => {}}
        onReward={() => setOpen(true)}
      />
      {replay && (
        <BattleResultDialog game={pub} onClose={() => setReplay(false)} />
      )}
      {hero && (
        <dialog open className="modal" aria-label="Герой">
          <h2>Уровень {level(game.player)}</h2>
          <SoulBalance amount={game.souls} />
          <CharacterStats
            fighter={game.player}
            souls={game.souls}
            onUpgrade={(stat) =>
              set(upgradeAttribute(game, stat, level(game.player), game.souls))
            }
          />
          <button onClick={() => setHero(false)}>Закрыть</button>
        </dialog>
      )}
      {open && game.phase === "victory" && (
        <VictoryRewardDialog
          game={pub}
          busy={false}
          index={index}
          onSelect={select}
          error={error}
          onSpend={(stat) =>
            set(upgradeAttribute(game, stat, level(game.player), game.souls))
          }
          onClaim={(selection, replace, slot) => {
            try {
              set(claimJourneyReward(game, selection, index, replace, slot));
            } catch (e) {
              setError(String(e));
            }
          }}
        />
      )}
    </>
  );
}
createRoot(document.getElementById("root")!).render(<Preview />);
