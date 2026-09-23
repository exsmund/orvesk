import { validateStartingStats } from "../src/game/progression/creation-rules";
import express from "express";
import { mkdir, readFile, writeFile, rename, unlink } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import {
  beginClash as beginBattle,
  prepareClash as prepareRound,
  publicClash as publicGame,
  submitClash,
  finishClashActions,
} from "../src/game/combat/reaction-engine";
import { upgradeAttribute } from "../src/game/progression/souls";
import { useHealingCharge } from "../src/game/progression/healing";
import {
  createJourney,
  claimJourneyReward,
  chooseJourneyStep,
} from "../src/game/journey/journey";
import { ITEMS } from "../src/game/equipment/catalog";
import {
  DEFAULT_PORTRAIT_ID,
  isPortraitId,
} from "../src/game/characters/portraits";
import { type Game } from "../src/game/types";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sessions = resolve(root, "data/sessions");
await mkdir(sessions, { recursive: true });
const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "4kb" }));
app.use("/api", (_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});
const validId = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id,
  );
async function save(id: string, game: Game) {
  const temp = resolve(sessions, `${id}.${randomUUID()}.tmp`);
  try {
    await writeFile(temp, JSON.stringify(game, null, 2), { mode: 0o600 });
    await rename(temp, resolve(sessions, `${id}.json`));
  } catch (error) {
    await unlink(temp).catch(() => {});
    throw error;
  }
}
app.get("/api/catalog", (_req, res) => res.json(ITEMS));
app.post("/api/sessions", async (req, res) => {
  try {
    const name = req.body?.name;
    if (typeof name !== "string" || !name.trim() || name.trim().length > 24) {
      res
        .status(400)
        .json({ error: "Имя должно содержать от 1 до 24 символов." });
      return;
    }
    const portraitId =
      req.body.portraitId === undefined
        ? DEFAULT_PORTRAIT_ID
        : req.body.portraitId;
    if (!isPortraitId(portraitId)) {
      res.status(400).json({ error: "Выберите портрет из доступных." });
      return;
    }
    let stats;
    try {
      stats = validateStartingStats(req.body.stats);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
      return;
    }
    const id = randomUUID(),
      game = prepareRound(createJourney(name, Math.random, portraitId, stats));
    await save(id, game);
    res.status(201).json({ id, game: publicGame(game) });
  } catch {
    res.status(500).json({ error: "Не удалось сохранить персонажа." });
  }
});
const locks = new Set<string>();
app.delete("/api/sessions/:id", async (req, res) => {
  const id = req.params.id;
  if (!validId(id)) {
    res.status(400).json({ error: "Некорректная сессия." });
    return;
  }
  if (locks.has(id)) {
    res.status(409).json({ error: "Сохранение занято. Попробуйте ещё раз." });
    return;
  }
  locks.add(id);
  try {
    await unlink(resolve(sessions, `${id}.json`));
    res.json({ deleted: true });
  } catch (error) {
    const missing = (error as NodeJS.ErrnoException).code === "ENOENT";
    res.status(missing ? 404 : 500).json({
      error: missing ? "Сохранение не найдено." : "Не удалось удалить героя.",
    });
  } finally {
    locks.delete(id);
  }
});
app.get("/api/sessions/:id", async (req, res) => {
  const id = req.params.id;
  if (!validId(id)) {
    res.status(400).json({ error: "Некорректная сессия." });
    return;
  }
  while (locks.has(id)) await new Promise((resolve) => setTimeout(resolve, 5));
  locks.add(id);
  try {
    const saved = JSON.parse(
      await readFile(resolve(sessions, `${id}.json`), "utf8"),
    ) as Game;
    const game = prepareRound(saved);
    if (JSON.stringify(saved) !== JSON.stringify(game)) await save(id, game);
    res.json(publicGame(game));
  } catch {
    res.status(404).json({ error: "Сохранение не найдено." });
  } finally {
    locks.delete(id);
  }
});
app.post("/api/sessions/:id/action", async (req, res) => {
  const id = req.params.id;
  if (!validId(id)) {
    res.status(400).json({ error: "Некорректная сессия." });
    return;
  }
  if (locks.has(id)) {
    res.status(409).json({ error: "Предыдущий ход ещё обрабатывается." });
    return;
  }
  locks.add(id);
  try {
    const game = prepareRound(
      JSON.parse(
        await readFile(resolve(sessions, `${id}.json`), "utf8"),
      ) as Game,
    );
    const {
      type,
      selection,
      rewardIndex = 0,
      round,
      fight,
      phase,
      stage,
      placements,
      modifiers,
      expectedSouls,
      expectedLevel,
      replaceSkillId,
      skillSlot,
    } = req.body ?? {};
    if (round !== game.round || fight !== game.fight || phase !== game.phase) {
      res.status(409).json({
        error: "Состояние изменилось. Обновите вкладку.",
        game: publicGame(game),
      });
      return;
    }
    let updated: Game;
    if (type === "finish-actions") updated = finishClashActions(game);
    else if (type === "clash") {
      if (stage !== game.clashPlan?.stage) {
        res
          .status(409)
          .json({ error: "Этап хода изменился.", game: publicGame(game) });
        return;
      }
      updated = submitClash(game, placements, modifiers);
    } else if (type === "travel" || type === "next") {
      updated = chooseJourneyStep(game, type === "travel" ? req.body : {});
      if (updated.phase === "combat") updated = beginBattle(updated);
    } else if (type === "heal") updated = useHealingCharge(game);
    else if (type === "upgrade")
      updated = upgradeAttribute(game, selection, expectedLevel, expectedSouls);
    else if (
      type === "reward" &&
      ["souls", "equip", "learn"].includes(selection)
    )
      updated = claimJourneyReward(
        game,
        selection as "souls" | "equip" | "learn",
        rewardIndex,
        replaceSkillId,
        skillSlot,
      );
    else throw new Error("Неизвестное действие.");
    await save(id, updated);
    res.json(publicGame(updated));
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Действие не выполнено.",
    });
  } finally {
    locks.delete(id);
  }
});
app.use("/api", (_req, res) =>
  res.status(404).json({ error: "Неизвестный запрос." }),
);
if (process.env.NODE_ENV === "production") {
  app.use(express.static(resolve(root, "dist")));
  app.get("*", (_req, res) => res.sendFile(resolve(root, "dist/index.html")));
} else {
  const { createServer } = await import("vite");
  const vite = await createServer({
    root,
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
}
const port = Number(process.env.PORT ?? 5173);
app.listen(port, "127.0.0.1", () =>
  console.log(`Герои Орвеска: http://127.0.0.1:${port}`),
);
