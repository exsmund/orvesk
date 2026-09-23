// Isolated UI fixture; never reads or writes saves.
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { createGame } from "../src/game/combat/engine";
import { item } from "../src/game/equipment/catalog";
import { ItemInspectionWindow } from "../src/features/equipment/ItemInspectionWindow";
import "../src/app/styles/style.css";
import "../src/app/styles/ui-textures.css";
const game = createGame("Проверка", () => 0.5);
function Preview() {
  const [view, setView] = useState<"own" | "compare" | null>(null);
  return (
    <>
      <button onClick={() => setView("own")}>Свой предмет</button>
      <button onClick={() => setView("compare")}>Сравнение</button>
      {view && (
        <ItemInspectionWindow
          equipment={item(view === "own" ? "fist" : "dagger")}
          player={game.player}
          own={view === "own"}
          source="Предмет"
          close={() => setView(null)}
        />
      )}
    </>
  );
}
createRoot(document.getElementById("root")!).render(<Preview />);
