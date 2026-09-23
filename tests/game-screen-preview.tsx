// Isolated view fixture: no API requests or saved character changes.
import { createRoot } from "react-dom/client";
import { useState } from "react";
import { GameScreen } from "../src/features/combat/GameScreen";
import { pub, mapGame } from "../stories/fixtures";
import "../src/app/App";
function Preview() {
  const [game, setGame] = useState(mapGame);
  return (
    <GameScreen
      game={game}
      session="refactor-preview"
      busy={false}
      error=""
      setError={() => {}}
      goHome={() => setGame(mapGame)}
      sendAction={async () => {
        const next = { ...pub, journey: mapGame.journey };
        setGame(next);
        return next;
      }}
    />
  );
}
const narrow = new URLSearchParams(location.search).has("narrow");
createRoot(document.getElementById("root")!).render(
  narrow ? (
    <iframe
      title="Мобильный игровой экран"
      src="/tests/game-screen-preview.html"
      style={{ width: 390, height: 844, border: 0 }}
    />
  ) : (
    <Preview />
  ),
);
