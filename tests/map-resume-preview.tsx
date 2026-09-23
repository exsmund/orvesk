// Isolated map fixture: does not read or write saved heroes.
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { battle } from "../stories/fixtures";
import { prepareClash, publicClash } from "../src/game/combat/reaction-engine";
import { JourneyScreen } from "../src/features/journey/JourneyScreen";
import "../src/app/styles/style.css";
import "../src/app/styles/ui-textures.css";
function Preview() {
  const [entered, setEntered] = useState(false);
  const [g] = useState(() => {
    const game = battle();
    const phase = new URLSearchParams(location.search).get("phase");
    if (phase === "draw" || phase === "defeat") game.phase = phase;
    return prepareClash(game, () => 0.5);
  });
  return entered ? (
    <p>Бой открыт</p>
  ) : (
    <JourneyScreen
      game={publicClash(g)}
      busy={false}
      onNext={() => setEntered(true)}
      onInspect={() => {}}
      onHome={() => {}}
      onHero={() => {}}
      onRules={() => {}}
    />
  );
}
createRoot(document.getElementById("root")!).render(<Preview />);
