// Isolated presentation fixture: no saved heroes or API calls.
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { GameScreen } from "../src/features/combat/GameScreen";
import { pub, outcome, noop } from "../stories/fixtures";
import type { PublicGame } from "../src/game/types";
import "../src/app/App";
function Preview() {
  const [game, setGame] = useState<PublicGame>({
    ...structuredClone(pub),
    ...(new URLSearchParams(location.search).has("unclaimed")
      ? {
          phase: "victory" as const,
          reward: { kind: "souls" as const, amount: 2 },
          rewardOptions: [{ kind: "souls" as const, amount: 2 }],
        }
      : {}),
    journey: { ...pub.journey!, battleMode: "expendable" },
    clash: { ...pub.clash!, battleMode: "expendable" },
  });
  return (
    <GameScreen
      game={game}
      session="ending-preview"
      busy={false}
      error=""
      setError={noop}
      goHome={noop}
      sendAction={async (type) => {
        const phase =
          new URLSearchParams(location.search).get("result") === "defeat"
            ? "defeat"
            : "victory";
        const next: PublicGame = {
          ...game,
          phase: type === "reward" ? "ready" : phase,
          clash: undefined,
          log: [outcome],
          reward: { kind: "souls", amount: 2 },
          rewardOptions: [{ kind: "souls", amount: 2 }],
        };
        setGame(next);
        return next;
      }}
    />
  );
}
createRoot(document.getElementById("root")!).render(<Preview />);
