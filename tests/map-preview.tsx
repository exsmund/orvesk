// In-memory UI fixture: no game API or saved-character access.
import { JOURNEY_MAP_PRESETS } from "../src/game/journey/journey-map";
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { createGame } from "../src/game/combat/engine";
import {
  beginClash,
  prepareClash,
  publicClash,
} from "../src/game/combat/reaction-engine";
import { createJourney, chooseJourneyStep } from "../src/game/journey/journey";
import { BattleModeInfo } from "../src/features/journey/AdventureUI";
import { JourneyMap } from "../src/features/journey/JourneyMap";
import { JourneyScreen } from "../src/features/journey/JourneyScreen";
import { ItemInspection } from "../src/features/equipment/ItemInspection";
import { item } from "../src/game/equipment/catalog";
import "../src/app/styles/style.css";
function fixture() {
  const g = beginClash(
    createGame("Проверка карты", () => 0.5),
    () => 0.5,
  );
  g.phase = "ready";
  g.journey!.cleared = 1;
  g.journey!.offers = ["dagger", "rags"];
  g.player.hp = 2;
  return g;
}
function Preview() {
  const [game, set] = useState(fixture),
    [error, setError] = useState(""),
    [inspect, show] = useState("");
  return (
    <main style={{ maxWidth: 680, margin: "auto", padding: 12 }}>
      <nav
        aria-label="Проверка пресетов"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          zIndex: 20,
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        {JOURNEY_MAP_PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => {
              const g = fixture();
              g.journey!.mapPreset = p.id;
              set(g);
              setError("");
            }}
          >
            {p.name}
          </button>
        ))}
        <button
          onClick={() => {
            set(prepareClash(createJourney("Новый герой", () => 0.5)));
            setError("");
          }}
        >
          Новый герой на карте
        </button>
        <button
          onClick={() => {
            set(fixture());
            setError("");
          }}
        >
          Начать проверку
        </button>
        <button
          onClick={() => {
            set(prepareClash(JSON.parse(JSON.stringify(game))));
            setError("");
          }}
        >
          Перечитать сохранение
        </button>
        {game.phase === "combat" && (
          <button
            onClick={() => {
              const g = structuredClone(game);
              g.phase = "ready";
              g.journey!.cleared = g.journey!.stage;
              g.journey!.finished = g.journey!.stage === 5;
              g.journey!.offers = ["dagger", "rags"];
              set(g);
            }}
          >
            Завершить тестовый бой
          </button>
        )}
      </nav>
      <p
        style={{
          position: "fixed",
          bottom: 130,
          left: 0,
          zIndex: 20,
          pointerEvents: "none",
        }}
      >
        Здоровье: {game.player.hp}. Состояние: {game.phase}. Бой: {game.fight}.
      </p>
      {error && <p role="alert">{error}</p>}
      {game.phase === "combat" ? (
        <>
          <BattleModeInfo game={publicClash(game)} />
          <JourneyMap game={publicClash(game)} />
        </>
      ) : (
        <JourneyScreen
          onHome={() => setError("Главный экран")}
          onHero={() => setError("Карточка героя")}
          onCatalog={() => setError("Арсенал")}
          onRules={() => setError("Правила")}
          key={`${game.fight}:${game.journey!.path?.join("/")}`}
          game={publicClash(game)}
          busy={false}
          onInspect={show}
          onNext={(payload) => {
            try {
              const next = chooseJourneyStep(game, payload);
              set(next.phase === "combat" ? beginClash(next) : next);
            } catch (e) {
              setError(String(e));
            }
          }}
        />
      )}
      {inspect && (
        <div>
          <button onClick={() => show("")}>Закрыть предмет</button>
          <ItemInspection equipment={item(inspect)} player={game.player} />
        </div>
      )}
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<Preview />);
