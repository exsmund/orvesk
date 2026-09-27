import "@/app/styles/style.css";
// Isolated preview: no API calls or browser storage writes.
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { CharacterCreation } from "@/features/characters/CharacterCreation/CharacterCreation";
import { type NewCharacter } from "@/features/characters/CharacterCreation/model";
import { createGame } from "@/game/combat/engine";
import { beginClash } from "@/game/combat/reaction-engine";
import { validateStartingStats } from "@/game/progression/creation-rules";
import { level } from "@/game/progression/souls";

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
      `${g.player.name} · Уровень ${level(g.player)} · Осколки ${g.souls} · ${Object.values(g.player.stats).join(", ")}`,
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
