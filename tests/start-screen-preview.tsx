// In-memory preview: no API calls, no persistent characters or browser-storage writes.
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { StartScreen } from "../src/features/home/StartScreen";
import { CharacterHome } from "../src/features/characters/CharacterHome";
import {
  rememberCharacter,
  forgetCharacter,
} from "../src/features/characters/characters";
import { createGame } from "../src/game/combat/engine";
import { beginClash, publicClash } from "../src/game/combat/reaction-engine";
import { upgradeAttribute } from "../src/game/progression/souls";
import { PORTRAITS } from "../src/game/characters/portraits";
import type { Game, Stat } from "../src/game/types";
import "../src/app/styles/style.css";
import "../src/features/combat/tactics.css";
import "../src/features/combat/combat-layout.css";
import "../src/features/characters/fighter-portraits.css";
import "../src/app/styles/ui-textures.css";
const first = "6498eb04-c68a-45d1-89a2-72e0c441ef9e",
  last = "7498eb04-c68a-45d1-89a2-72e0c441ef9e";
const games: Record<string, Game> = {};
for (const [id, name, index] of [
  [first, "Пепел", 3],
  [last, "Вереск", 12],
] as const) {
  const g = beginClash(
    createGame(name, () => 0.5, PORTRAITS[index].id),
    () => 0.5,
  );
  g.phase = "ready";
  g.player.gear.weapon = "dagger";
  g.player.skills = ["dodge"];
  g.souls = 20;
  games[id] = g;
}
let registry = JSON.stringify([
  { id: last, name: "Вереск" },
  { id: first, name: "Пепел" },
]);
const storage = {
  getItem: () => registry,
  setItem: (_key: string, value: string) => {
    registry = value;
  },
};
async function load(path: string, body?: unknown) {
  const id = path.split("/")[2];
  const game = games[id];
  if (!game) throw new Error("Сохранение не найдено.");
  if (body) {
    const b = body as {
      selection: Stat;
      expectedLevel: number;
      expectedSouls: number;
    };
    games[id] = upgradeAttribute(
      game,
      b.selection,
      b.expectedLevel,
      b.expectedSouls,
    );
  }
  return publicClash(games[id]);
}
function Preview() {
  const [screen, setScreen] = useState<
      "home" | "heroes" | "create" | "continued"
    >("home"),
    [current, setCurrent] = useState("");
  function play(id: string) {
    rememberCharacter(storage, { id, name: games[id].player.name });
    setCurrent(games[id].player.name);
    setScreen("continued");
  }
  return screen === "home" ? (
    <StartScreen
      load={load}
      storage={storage}
      onContinue={play}
      onCreate={() => setScreen("create")}
      onHeroes={() => setScreen("heroes")}
    />
  ) : screen === "heroes" ? (
    <CharacterHome
      onDelete={async (id) => {
        delete games[id];
        forgetCharacter(storage, id);
      }}
      load={load}
      storage={storage}
      onOpen={play}
      onBack={() => setScreen("home")}
      onCreate={() => setScreen("create")}
    />
  ) : (
    <main>
      <h1>
        {screen === "continued"
          ? `Продолжаем: ${current}`
          : "Создание персонажа"}
      </h1>
      <button onClick={() => setScreen("home")}>Главное меню</button>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<Preview />);
