import { creature, sampleCreature } from "@/game/creatures/catalog";
import encounterRules from "../../../data/journey-encounters.json";
import { maxStamina } from "@/game/combat/tactics";
import {
  BASE_STAT_TOTAL,
  STARTING_SOULS,
} from "@/game/progression/creation-rules";
import {
  chooseJourneyMap,
  generateJourneyMap,
  ensureJourneyMap,
  availableJourneyNodes,
  currentJourneyNode,
  journeyNode,
  journeyPath,
} from "@/game/journey/journey-map";
import { battleMode, chooseBattleMode } from "@/game/combat/battle-modes";
import { ITEMS, item, rollItemLevel } from "@/game/equipment/catalog";
import {
  canUse,
  claimReward,
  createGame,
  generateEnemy,
  maxHp,
  nextBattle,
  statTotal,
  wear,
  type Random,
} from "@/game/combat/engine";
import { level, journeyEnemyLevel } from "@/game/progression/souls";
import type { Game, RewardSelection } from "@/game/types";
const encounterVariant = (expedition: number, stage: number) =>
  encounterRules.find(
    (rule) => rule.expedition === expedition && rule.stages.includes(stage),
  )?.creatureVariant;
export const ROUTES = {
  camp: {
    name: "У костра",
    description:
      "Полностью восстановить здоровье и выносливость перед следующим боем.",
  },
  forge: {
    name: "Кузница",
    description: "Заменить один предмет предложенным. Старый предмет теряется.",
  },
} as const;

/** New heroes wait on the map until the first encounter is confirmed. */
export function createJourney(...args: Parameters<typeof createGame>): Game {
  const g = createGame(...args),
    random = args[1] ?? Math.random;
  g.phase = "ready";
  g.journey = {
    mapPreset: chooseJourneyMap(random),
    battleMode: "free",
    startLevel: level(g.player),
    expedition: 1,
    stage: 1,
    cleared: 0,
    path: ["fight-1"],
    awaitingFirstBattle: true,
  };
  g.journey.map ??= generateJourneyMap(random);
  ensureJourneyEnemies(g, random, false);
  g.enemy = structuredClone(g.journey.enemies!["fight-1"]);
  return g;
}

/** Rosters survive retries and upgrades; balance profiles update before a fight starts. */
export function ensureJourneyEnemies(
  g: Game,
  random: Random | undefined = undefined,
  preserveCurrent = true,
) {
  const j = g.journey;
  if (!j) return;
  ensureJourneyMap(j);
  if (j.stage === 5) g.enemy.elite = false;
  if (j.enemies?.["fight-5"]) j.enemies["fight-5"].elite = false;
  for (const enemy of [g.enemy, ...Object.values(j.enemies ?? {})])
    if (enemy.name === "Чемпион круга") enemy.name = "Босс круга";
  for (let stage = 1; stage <= 5; stage++) {
    const variant = encounterVariant(j.expedition, stage);
    const template = j.enemies?.[`fight-${stage}`];
    if (
      variant &&
      template &&
      creature(template.creatureId)?.variants?.[variant] &&
      template.creatureVariant !== variant
    ) {
      template.creatureVariant = variant;
      delete template.deck;
    }
    // Never replace a hand or a committed plan in an already started battle.
    if (
      variant &&
      stage === j.stage &&
      !g.enemy.deck &&
      creature(g.enemy.creatureId)?.variants?.[variant]
    )
      g.enemy.creatureVariant = variant;
  }
  if (j.enemies) return;
  // Legacy saves get a stable roster without consuming a committed round's RNG.
  let seed = [...g.player.name].reduce(
    (n, c) => (n * 31 + c.charCodeAt(0)) >>> 0,
    j.expedition,
  );
  random ??= () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  j.enemies = {};
  for (let stage = 1; stage <= 5; stage++) {
    const enemy =
      preserveCurrent && stage === j.stage
        ? structuredClone(g.enemy)
        : journeyEnemy({ ...g, journey: { ...j, stage } }, random);
    enemy.hp = maxHp(enemy);
    enemy.stamina = maxStamina();

    j.enemies[`fight-${stage}`] = enemy;
  }
}

export function journeyEnemy(g: Game, random: Random) {
  const stage = Math.max(1, Math.min(5, g.journey?.stage ?? 1));
  const variant = encounterVariant(g.journey!.expedition, stage);
  const species = sampleCreature(g.journey!.expedition, random, variant);
  const template = {
    ...g.player,
    stats: {
      strength:
        g.journey!.expedition === 1 && stage < 5
          ? 1
          : journeyEnemyLevel(
              g.journey!.startLevel,
              stage,
              g.journey!.expedition,
            ) + STARTING_SOULS,
      agility: 1,
      vitality: 1,
      intelligence: 1,
    },
  };
  const enemy = generateEnemy(template, random, undefined, species.id);
  if (variant) enemy.creatureVariant = variant;
  if (g.journey!.expedition === 1 && stage < 5)
    enemy.gear = {
      weapon: null,
      shield: null,
      body: null,
      feet: null,
      ring: null,
      amulet: null,
    };
  enemy.elite = false;
  return enemy;
}
export function journeyVictory(g: Game, random: Random) {
  if (!g.journey) return;
  const cache = g.journey.lostSouls;
  if (cache?.nodeId === `fight-${g.journey.stage}`) {
    g.souls += cache.amount;
    delete g.journey.lostSouls;
  }
  g.journey.cleared = g.journey.stage;
  g.journey.finished = g.journey.stage === 5;
  const pool = ITEMS.map((i) =>
    rollItemLevel(
      i,
      Math.floor(Math.max(0, statTotal(g.enemy) - BASE_STAT_TOTAL) / 2),
      random,
    ),
  ).filter(
    (i) =>
      !i.unarmed &&
      !Object.values(g.player.gear).includes(i.id) &&
      i.tier <= Math.max(1, statTotal(g.player) - BASE_STAT_TOTAL + 1),
  );
  const extra = pool.filter(
    (i) =>
      !g.rewardOptions?.some((r) => r.kind === "item" && r.itemId === i.id),
  );
  if (g.enemy.elite && extra.length) {
    const best = extra.filter(
      (i) => i.tier === Math.max(...extra.map((i) => i.tier)),
    );
    const chosen = best[Math.floor(random() * best.length)];
    g.rewardOptions?.push({ kind: "item", itemId: chosen.id });
  }
  g.journey.offers = [];
  for (let i = 0; i < 3 && pool.length; i++)
    g.journey.offers.push(
      pool.splice(Math.floor(random() * pool.length), 1)[0].id,
    );
}
export function claimJourneyReward(
  g: Game,
  selection: RewardSelection,
  index = 0,
  replaceSkillId?: string,
  skillSlot?: number,
  random: Random = Math.random,
) {
  const hp = g.player.hp,
    next = claimReward(g, selection, index, replaceSkillId, skillSlot);
  if (next.journey?.finished) {
    const fresh = nextJourneyBattle(next, undefined, undefined, random);
    fresh.phase = "ready";
    fresh.journey!.awaitingFirstBattle = true;
    delete fresh.clashPlan;
    return fresh;
  }
  if (next.journey) next.player.hp = Math.min(hp, maxHp(next.player));
  return next;
}
export function nextJourneyBattle(
  saved: Game,
  route?: string,
  itemId?: string,
  random: Random = Math.random,
  targetStage?: number,
): Game {
  if (!saved.journey) return nextBattle(saved, random);
  if (!["ready", "defeat", "draw"].includes(saved.phase))
    throw new Error("Сначала завершите бой и выберите награду.");
  const old = saved.journey,
    newJourney = saved.phase !== "defeat" && old.finished,
    restart = saved.phase === "defeat" || newJourney;
  if (
    !restart &&
    saved.phase !== "draw" &&
    route !== "direct" &&
    !Object.hasOwn(ROUTES, route ?? "")
  )
    throw new Error("Выберите путь к следующему бою.");
  const base = structuredClone(saved);
  ensureJourneyEnemies(base, random);
  if (!restart && saved.phase === "ready" && route === "forge") {
    if (
      !itemId ||
      !old.offers?.includes(itemId) ||
      !canUse(base.player, item(itemId))
    )
      throw new Error("Выберите доступный предмет кузницы.");
    wear(base.player, item(itemId));
  }
  const g = nextBattle(base, random);
  g.journey = {
    map: newJourney ? undefined : base.journey!.map,
    enemies: newJourney ? undefined : base.journey!.enemies,
    lostSouls: newJourney ? undefined : old.lostSouls,
    mapPreset: newJourney
      ? chooseJourneyMap(random, old.mapPreset)
      : old.mapPreset,
    path: restart
      ? ["fight-1"]
      : saved.phase === "draw"
        ? [...journeyPath(old)]
        : [
            ...journeyPath(old),
            `fight-${targetStage ?? Math.min(5, old.stage + 1)}`,
          ],
    battleMode: newJourney
      ? chooseBattleMode(random, battleMode(old))
      : battleMode(old),
    startLevel: newJourney ? level(g.player) : old.startLevel,
    expedition: old.expedition + (newJourney ? 1 : 0),
    stage: restart
      ? 1
      : saved.phase === "draw"
        ? old.stage
        : (targetStage ?? Math.min(5, old.stage + 1)),
    cleared: restart ? 0 : old.cleared,
    route:
      restart || saved.phase === "draw" || route === "direct"
        ? undefined
        : (route as "camp" | "forge"),
  };
  if (!restart && saved.phase !== "draw") {
    g.player.stamina = route === "camp" ? maxStamina() : saved.player.stamina;

    g.player.hp = Math.min(
      maxHp(g.player),
      Math.round(
        (saved.player.hp + maxHp(g.player) * (route === "camp" ? 1 : 0)) * 10,
      ) / 10,
    );
  }
  g.journey.map ??= generateJourneyMap(random);
  ensureJourneyEnemies(g, random, false);
  g.enemy = structuredClone(g.journey.enemies![`fight-${g.journey.stage}`]);
  return g;
}

/** A stop is persisted independently from combat; visits cannot be replayed to heal twice. */
export function visitJourneyNode(
  saved: Game,
  nodeId: string,
  fromNode: string,
  random: Random = Math.random,
): Game {
  const old = saved.journey;
  if (
    !old ||
    currentJourneyNode(old) !== fromNode ||
    !availableJourneyNodes(saved).includes(nodeId)
  )
    throw new Error(
      "Этот переход недоступен. Выберите соседний узел на карте.",
    );
  if (saved.phase === "defeat")
    throw new Error("Сначала подтвердите начало заново на экране поражения.");
  if (saved.phase === "draw")
    return nextJourneyBattle(saved, undefined, undefined, random);
  if (saved.phase === "combat") throw new Error("Продолжите текущий бой.");
  const node = journeyNode(nodeId, old)!;
  if (node.kind === "fight") {
    if (
      node.id === fromNode &&
      old.awaitingFirstBattle &&
      old.stage === 1 &&
      old.cleared === 0
    ) {
      const g = structuredClone(saved);
      g.phase = "combat";
      delete g.journey!.awaitingFirstBattle;
      return g;
    }
    return nextJourneyBattle(saved, "direct", undefined, random, node.stage);
  }
  const g = structuredClone(saved),
    j = g.journey!;
  j.path = [...journeyPath(old), nodeId];
  j.forgeResolved = node.kind !== "forge";
  if (node.kind === "camp") {
    g.player.hp = maxHp(g.player);
    g.player.stamina = maxStamina();
  }
  return g;
}
export function resolveJourneyForge(
  saved: Game,
  fromNode: string,
  itemId?: string,
): Game {
  const old = saved.journey;
  if (
    !old ||
    saved.phase !== "ready" ||
    old.finished ||
    currentJourneyNode(old) !== fromNode ||
    journeyNode(fromNode, old)?.kind !== "forge" ||
    old.forgeResolved
  )
    throw new Error("Кузница сейчас недоступна.");
  const g = structuredClone(saved);
  if (itemId !== undefined) {
    if (
      typeof itemId !== "string" ||
      !old.offers?.includes(itemId) ||
      !canUse(g.player, item(itemId))
    )
      throw new Error("Выберите доступный предмет кузницы.");
    wear(g.player, item(itemId));
  }
  g.journey!.forgeResolved = true;
  return g;
}
/** Shared by the server and isolated UI fixtures. Clients never supply graph edges or healing amounts. */
export function chooseJourneyStep(
  saved: Game,
  payload: {
    nodeId?: unknown;
    fromNode?: unknown;
    forge?: unknown;
    restart?: unknown;
    itemId?: unknown;
  },
  random: Random = Math.random,
): Game {
  if (payload.restart === true) {
    if (
      saved.phase !== "defeat" ||
      payload.nodeId !== undefined ||
      payload.forge !== undefined
    )
      throw new Error("Начать заново можно только после поражения.");
    const g = nextJourneyBattle(saved, undefined, undefined, random);
    g.phase = "ready";
    if (g.journey) g.journey.awaitingFirstBattle = true;
    return g;
  }
  if (payload.forge === true) {
    if (
      typeof payload.fromNode !== "string" ||
      payload.nodeId !== undefined ||
      (payload.itemId !== undefined && typeof payload.itemId !== "string")
    )
      throw new Error("Некорректный выбор кузницы.");
    return resolveJourneyForge(
      saved,
      payload.fromNode,
      payload.itemId as string | undefined,
    );
  }
  if (payload.nodeId !== undefined) {
    if (
      typeof payload.nodeId !== "string" ||
      typeof payload.fromNode !== "string" ||
      payload.itemId !== undefined
    )
      throw new Error("Некорректный узел карты.");
    return visitJourneyNode(saved, payload.nodeId, payload.fromNode, random);
  }
  if (
    saved.phase === "draw" ||
    (saved.phase === "ready" && saved.journey?.finished)
  )
    return nextJourneyBattle(saved, undefined, undefined, random);
  throw new Error("Выберите следующий узел на карте.");
}
