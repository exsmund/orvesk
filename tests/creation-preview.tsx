// Isolated preview: no API calls or browser storage writes.
import { useState } from "react";
import { createRoot } from "react-dom/client";
import {
  CharacterCreation,
  type NewCharacter,
} from "../src/features/characters/CharacterCreation";
import { createGame } from "../src/game/combat/engine";
import { beginClash } from "../src/game/combat/reaction-engine";
import { validateStartingStats } from "../src/game/progression/creation-rules";
import { level } from "../src/game/progression/souls";
import "../src/app/styles/style.css";
import "../src/app/styles/ui-textures.css";
function Preview() {
  const [open, setOpen] = useState(true),
    [result, setResult] = useState("");
  function create(draft: NewCharacter) {
    const g = beginClash(
      createGame(
        draft.name,
        () => 0.5,
        draft.portraitId,
        validateStartingStats(draft.stats),
      ),
      () => 0.5,
    );
    setResult(
      `${g.player.name} · Уровень ${level(g.player)} · Души ${g.souls} · ${Object.values(g.player.stats).join(", ")}`,
    );
    setOpen(false);
  }
  return open ? (
    <CharacterCreation onClose={() => setOpen(false)} onCreate={create} />
  ) : (
    <main>
      <button onClick={() => setOpen(true)}>Создать снова</button>
      <output>{result || "Главный экран"}</output>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<Preview />);
