import BALANCE from "../../../data/combat-balance.json";
import { creature, permitsEquipment } from "@/game/creatures/catalog";
import {
  BASE_STAT_TOTAL,
  initialStartingStats,
} from "@/game/progression/creation-rules";
import { soulReward } from "@/game/progression/souls";
import type { RewardSelection } from "@/game/types";
import {
  ITEMS,
  item,
  itemAtLevel,
  rollItemLevel,
} from "@/game/equipment/catalog";
import {
  DEFAULT_PORTRAIT_ID,
  isPortraitId,
  PORTRAITS,
} from "@/game/characters/portraits";
import { SKILLS, knownSkills, learnSkill } from "@/game/skills/skills";
import {
  STAT_KEYS,
  type Fighter,
  type Game,
  type Item,
  type Reward,
  type Stats,
  type EnemyStyle,
} from "@/game/types";

import {
  maxStamina,
  normalizeGame,
  selectedReward,
} from "@/game/combat/tactics";

export type Random = () => number;
export const maxHp = (f: Fighter) =>
  BALANCE.health.base + BALANCE.health.perVitality * (f.stats.vitality - 1);
export const statTotal = (f: Fighter) =>
  STAT_KEYS.reduce((sum, key) => sum + f.stats[key], 0);
export const canUse = (f: Fighter, equipment: Item) =>
  permitsEquipment(f, equipment) &&
  STAT_KEYS.every((key) => f.stats[key] >= (equipment.requirements[key] ?? 0));
export const weapon = (f: Fighter) => item(f.gear.weapon);
export function displaced(f: Fighter, equipment: Item): Item[] {
  const slots = new Set([equipment.slot]);
  if (equipment.hands === 2) slots.add("shield");
  if (equipment.kind === "shield" && weapon(f).hands === 2) slots.add("weapon");
  return [...slots].flatMap((slot) =>
    f.gear[slot] ? [item(f.gear[slot])] : [],
  );
}
export function wear(f: Fighter, equipment: Item) {
  if (!canUse(f, equipment)) throw new Error("Характеристик недостаточно.");
  const dropped = displaced(f, equipment);
  for (const old of dropped) f.gear[old.slot] = null;
  if (!equipment.unarmed) f.gear[equipment.slot] = equipment.id;
  return dropped;
}
const sample = <T>(values: T[], random: Random): T =>
  values[Math.floor(random() * values.length)];
const weighted = <T>(entries: [T, number][], random: Random): T => {
  let cursor = random() * entries.reduce((sum, [, weight]) => sum + weight, 0);
  for (const [value, weight] of entries) {
    cursor -= weight;
    if (cursor < 0) return value;
  }
  return entries[entries.length - 1][0];
};
/** Build an independent, wearable loadout after the enemy's stats are allocated. */
export function generateEnemyGear(
  f: Fighter,
  random: Random = Math.random,
): Fighter["gear"] {
  const growth = Math.max(0, statTotal(f) - BASE_STAT_TOTAL);
  let budget = Math.min(12, 1 + growth);
  const loadout: Fighter = {
    ...f,
    gear: {
      weapon: null,
      shield: null,
      body: null,
      feet: null,
      ring: null,
      amulet: null,
    },
  };
  const candidates = ITEMS.map((i) =>
    itemAtLevel(
      i,
      Object.keys(i.requirements).length
        ? Math.min(
            ...Object.keys(i.requirements).map(
              (key) => f.stats[key as keyof Stats],
            ),
          )
        : 1,
    ),
  ).filter((i) => !i.unarmed && canUse(f, i) && i.tier <= growth);
  const cost = (i: Item) => i.tier + 1;
  const strength = (i: Item) => {
    if (i.kind === "weapon") {
      const profile = i.figures.find(
        (m) => m.category === "attack",
      )?.healthDamage;
      const affinity =
        profile?.stats.reduce((sum, stat) => sum + f.stats[stat] - 1, 0) ?? 0;
      return 1 + affinity * 4 + (i.level ?? 1) * 2 + i.tier;
    }
    const protection = Object.values(i.defense ?? {}).reduce(
      (n, v) => n + v,
      0,
    );
    const affinity = STAT_KEYS.reduce(
      (n, key) =>
        n + Math.min(f.stats[key] - 1, (i.requirements[key] ?? 1) - 1),
      0,
    );
    return Math.max(0.1, 1 + i.tier + protection + affinity);
  };
  const choose = (pool: Item[]) => {
    const rated = pool.map((i) => [i, strength(i)] as [Item, number]);
    const best = Math.max(...rated.map(([, score]) => score));
    return weighted(
      rated.filter(([, score]) => score >= best * 0.7),
      random,
    );
  };
  const arms = candidates.filter(
    (i) => i.kind === "weapon" && cost(i) <= budget,
  );
  if (arms.length) {
    const selected = choose(arms);
    wear(loadout, selected);
    budget -= cost(selected);
  }
  const skippedSlots = new Set(
    Object.entries(creature(f.creatureId)?.equipment.generationSlotChance ?? {})
      .filter(([, chance]) => random() >= chance)
      .map(([slot]) => slot),
  );
  // Each remaining slot competes for a limited budget; beginners do not get a full suit.
  while (budget > 0) {
    const slots = (
      ["shield", "body", "feet", "ring", "amulet"] as const
    ).filter(
      (slot) =>
        !loadout.gear[slot] &&
        !skippedSlots.has(slot) &&
        !(slot === "shield" && weapon(loadout).hands === 2),
    );
    const options = slots
      .map((slot) => ({
        slot,
        pool: candidates.filter((i) => i.slot === slot && cost(i) <= budget),
      }))
      .filter((o) => o.pool.length);
    if (!options.length) break;
    const selectedSlot = weighted(
      options.map((o) => [
        o,
        o.slot === "shield"
          ? f.style === "warden"
            ? 6
            : 2
          : o.slot === "body"
            ? 4
            : o.slot === "feet"
              ? 2
              : 1,
      ]),
      random,
    );
    const selected = choose(selectedSlot.pool);
    wear(loadout, selected);
    budget -= cost(selected);
  }
  return loadout.gear;
}
export function generateEnemy(
  player: Fighter,
  random: Random = Math.random,
  forcedStyle?: EnemyStyle,
  creatureId?: string,
): Fighter {
  const species = creature(creatureId);
  if (creatureId && (!species || !species.encounter.combat))
    throw new Error("Существо недоступно для боя.");
  const style =
    forcedStyle ??
    sample<EnemyStyle>(["berserker", "duelist", "warden"], random);
  const stats: Stats = {
    strength: 1,
    agility: 1,
    vitality: 1,
    intelligence: 1,
  };
  const weights: Stats =
    species?.statWeights ??
    (style === "berserker"
      ? { strength: 6, agility: 1, vitality: 3, intelligence: 1 }
      : style === "duelist"
        ? {
            strength: 1,
            agility: 6,
            vitality: 2,
            intelligence: 1,
          }
        : {
            strength: 2,
            agility: 1,
            vitality: 6,
            intelligence: 1,
          });
  let spare =
    statTotal(player) - STAT_KEYS.reduce((sum, key) => sum + stats[key], 0);
  while (spare-- > 0)
    stats[
      weighted(
        STAT_KEYS.map((key) => [key, weights[key]]),
        random,
      )
    ]++;
  const enemy: Fighter = {
    name: sample(
      [
        "Безымянный",
        "Тихий странник",
        "Пепельный двойник",
        "Последний свидетель",
        "Забытый путник",
      ],
      random,
    ),
    stats,
    hp: 1,
    gear: {
      weapon: null,
      shield: null,
      body: null,
      feet: null,
      ring: null,
      amulet: null,
    },

    style,
  };
  if (species) {
    enemy.creatureId = species.id;
    enemy.name = species.name;
  }
  enemy.gear = generateEnemyGear(enemy, random);
  enemy.hp = maxHp(enemy);
  enemy.stamina = maxStamina();
  enemy.portraitId = species
    ? `creature:${species.id}`
    : sample(
        PORTRAITS.filter((p) => p.id !== player.portraitId),
        random,
      ).id;
  return enemy;
}
function setupBattle(g: Game, random: Random) {
  g.player.hp = maxHp(g.player);

  g.player.stamina = maxStamina();
  g.enemy = generateEnemy(g.player, random);
  g.round = 1;
  g.phase = "combat";
  g.log = [];
  g.reward = null;
  g.rewardOptions = undefined;
  return g;
}
export function createGame(
  name: string,
  random: Random = Math.random,
  portraitId = DEFAULT_PORTRAIT_ID,
  stats: Stats = initialStartingStats(),
): Game {
  if (!isPortraitId(portraitId))
    throw new Error("Выберите портрет из доступных.");
  const player: Fighter = {
    name: name.trim().slice(0, 24) || "Странник",
    portraitId,
    stats: { ...stats },
    hp: 1,
    gear: { weapon: null, shield: null, body: null, feet: null },
  };
  return setupBattle(
    {
      version: 5,
      souls: 0,
      player,
      enemy: structuredClone(player),
      round: 1,
      fight: 1,
      wins: 0,
      log: [],
      phase: "combat",
      reward: null,
    },
    random,
  );
}
export function nextBattle(game: Game, random: Random = Math.random) {
  if (
    game.phase !== "ready" &&
    game.phase !== "defeat" &&
    game.phase !== "draw"
  )
    throw new Error("Сначала выберите награду.");
  const g = normalizeGame(game);
  g.fight++;
  return setupBattle(g, random);
}
export function rollRewards(
  player: Fighter,
  enemy: Fighter,
  random: Random,
): Reward[] {
  const pool = ITEMS.filter(
    (i) => !i.unarmed && i.tier <= statTotal(enemy) - BASE_STAT_TOTAL + 1,
  )
    .map((i) =>
      rollItemLevel(
        i,
        Math.floor(Math.max(0, statTotal(enemy) - BASE_STAT_TOTAL) / 2),
        random,
      ),
    )
    .filter(
      (i) =>
        !Object.values(player.gear).includes(i.id) &&
        permitsEquipment(player, i),
    );
  const arms = pool.filter((i) => i.kind === "weapon" || i.kind === "shield");
  const armor = pool.filter((i) => i.kind !== "weapon" && i.kind !== "shield");
  const first = arms.length ? sample(arms, random) : null;
  const last = armor.length ? sample(armor, random) : null;
  const skills = SKILLS.filter(
    (s) => !knownSkills(player).some((owned) => owned.id === s.id),
  );
  const skillReward = skills.length
    ? { kind: "skill" as const, skillId: sample(skills, random).id }
    : null;
  return [
    { kind: "souls", amount: soulReward(enemy) },
    ...(skillReward ? [skillReward] : []),
    ...(first ? [{ kind: "item" as const, itemId: first.id }] : []),
    ...(last ? [{ kind: "item" as const, itemId: last.id }] : []),
  ];
}
export function claimReward(
  game: Game,
  selection: RewardSelection,
  rewardIndex = 0,
  replaceSkillId?: string,
  skillSlot?: number,
): Game {
  if (game.phase !== "victory" || !game.reward)
    throw new Error("Награда недоступна.");
  if (!Number.isInteger(rewardIndex) || rewardIndex < 0)
    throw new Error("Выберите награду.");
  const chosen = selectedReward(game, rewardIndex);
  if (!chosen) throw new Error("Выберите награду.");
  const g = normalizeGame(game);
  if (chosen.kind === "souls") {
    if (selection !== "souls") throw new Error("Выберите осколки.");
    g.souls += chosen.amount;
  } else if (chosen.kind === "skill") {
    if (selection === "learn")
      learnSkill(g.player, chosen.skillId, replaceSkillId, skillSlot);
    else throw new Error("Выберите изучение навыка.");
  } else if (selection === "equip") wear(g.player, item(chosen.itemId));
  else throw new Error("Выберите принятие предмета.");
  g.phase = "ready";
  g.reward = null;
  g.rewardOptions = undefined;
  g.player.hp = maxHp(g.player);
  return g;
}
