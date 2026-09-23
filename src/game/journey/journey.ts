import { encounterPortrait, encounterIdentity } from "../characters/portraits";
import { maxPoise } from "../combat/tactics";
import { STARTING_SOULS } from "../progression/creation-rules";
import {
  chooseJourneyMap,
  generateJourneyMap,
  ensureJourneyMap,
  availableJourneyNodes,
  currentJourneyNode,
  journeyNode,
  journeyPath,
} from "./journey-map";
import { battleMode, chooseBattleMode } from "../combat/battle-modes";
import { SKILLS } from "../skills/skills";
import { ITEMS, item } from "../equipment/catalog";
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
} from "../combat/engine";
import { level, journeyEnemyLevel } from "../progression/souls";
import type { Game, RewardSelection } from "../types";
export const ROUTES = {
  camp: {
    name: "У костра",
    description:
      "Полностью восстановить здоровье и стойку перед следующим боем.",
  },
  forge: {
    name: "Кузница",
    description: "Заменить один предмет предложенным. Старый предмет теряется.",
  },
  risk: {
    name: "Опасный путь",
    description:
      "Восстановить 50% максимального здоровья. Враг получает +1 клетку; за победу — дополнительный редкий предмет на выбор.",
  },
} as const;

/** New heroes wait on the map until the first encounter is confirmed. */
export function createJourney(...args: Parameters<typeof createGame>): Game {
  const g = createGame(...args),
    random = args[1] ?? Math.random;
  g.phase = "ready";
  g.journey = {
    mapPreset: chooseJourneyMap(random),
    battleMode: chooseBattleMode(random),
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

/** Immutable encounter templates survive retries, upgrades and map resets. */
export function ensureJourneyEnemies(
  g: Game,
  random: Random | undefined = undefined,
  preserveCurrent = true,
) {
  const j = g.journey;
  if (!j) return;
  ensureJourneyMap(j);
  for (const enemy of [g.enemy, ...Object.values(j.enemies ?? {})])
    if (enemy.name === "Чемпион круга") enemy.name = "Босс круга";
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
    enemy.poise = maxPoise(enemy);
    enemy.prone = false;
    enemy.offBalance = false;
    j.enemies[`fight-${stage}`] = enemy;
  }
}

export function journeyEnemy(g: Game, random: Random) {
  const stage = Math.max(1, Math.min(5, g.journey?.stage ?? 1));
  const identity = encounterIdentity(g.player, g.journey!.expedition, stage),
    archetype = identity.archetype;
  const template = {
    ...g.player,
    stats: {
      strength:
        journeyEnemyLevel(g.journey!.startLevel, stage) + STARTING_SOULS,
      agility: 1,
      endurance: 1,
      intelligence: 1,
      reaction: 1,
    },
  };
  const enemy = generateEnemy(
    template,
    random,
    archetype === "warden"
      ? "warden"
      : archetype === "duelist"
        ? "duelist"
        : "berserker",
  );
  enemy.portraitId = encounterPortrait(
    g.player,
    g.journey!.expedition,
    stage,
  ).id;
  enemy.archetype = archetype;
  const skillPool = [...SKILLS];
  enemy.skills = [];
  for (let i = 0; i < Math.max(0, stage - 2); i++)
    enemy.skills.push(
      skillPool.splice(Math.floor(random() * skillPool.length), 1)[0].id,
    );
  if (stage === 1 && level(enemy) === 1)
    enemy.gear = {
      weapon: null,
      shield: null,
      body: null,
      feet: null,
      ring: null,
      amulet: null,
    };
  if (stage === 2 && level(enemy) === 1)
    enemy.gear = {
      weapon: archetype === "duelist" ? "dagger" : "club",
      shield: archetype === "warden" ? "buckler" : null,
      body: null,
      feet: null,
      ring: null,
      amulet: null,
    };
  if (stage === 3 && level(enemy) <= 2)
    for (const slot of Object.keys(enemy.gear) as Array<
      keyof typeof enemy.gear
    >) {
      const id = enemy.gear[slot];
      if (id && item(id).tier > 1) enemy.gear[slot] = null;
    }
  enemy.elite = stage === 5 || (stage > 1 && g.journey?.route === "risk");
  enemy.name = identity.name;
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
  const pool = ITEMS.filter(
    (i) =>
      i.id !== "fist" &&
      canUse(g.player, i) &&
      !Object.values(g.player.gear).includes(i.id) &&
      i.tier <= Math.max(1, statTotal(g.player) - 4),
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
    delete fresh.roundPlan;
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
        : (route as "camp" | "forge" | "risk"),
  };
  if (!restart && saved.phase !== "draw") {
    g.player.poise = route === "camp" ? maxPoise(g.player) : saved.player.poise;
    g.player.prone = route === "camp" ? false : saved.player.prone;
    g.player.hp = Math.min(
      maxHp(g.player),
      Math.round(
        (saved.player.hp +
          maxHp(g.player) *
            (route === "camp" ? 1 : route === "risk" ? 0.5 : 0)) *
          10,
      ) / 10,
    );
  }
  g.journey.map ??= generateJourneyMap(random);
  ensureJourneyEnemies(g, random, false);
  g.enemy = structuredClone(g.journey.enemies![`fight-${g.journey.stage}`]);
  if (g.journey.route === "risk") g.enemy.elite = true;
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
  if (saved.phase === "draw" || saved.phase === "defeat")
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
    g.player.poise = maxPoise(g.player);
    g.player.prone = false;
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
    itemId?: unknown;
  },
  random: Random = Math.random,
): Game {
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
    saved.phase === "defeat" ||
    saved.phase === "draw" ||
    (saved.phase === "ready" && saved.journey?.finished)
  )
    return nextJourneyBattle(saved, undefined, undefined, random);
  throw new Error("Выберите следующий узел на карте.");
}
