import "@/app/styles/style.css";
// Isolated map fixture: does not read or write saved heroes.
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { battle } from "../stories/fixtures";
import { prepareClash, publicClash } from "@/game/combat/reaction-engine";
import { JourneyScreen } from "@/features/journey/JourneyScreen/JourneyScreen";

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
