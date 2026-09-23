import { initialStartingStats } from "../progression/creation-rules";
import { soulReward, loseSoulsOnDefeat } from "../progression/souls";
import type { RewardSelection } from "../types";
import { ACTIONS, ITEMS, item } from "../equipment/catalog";
import {
  DEFAULT_PORTRAIT_ID,
  isPortraitId,
  PORTRAITS,
} from "../characters/portraits";
import { SKILLS, knownSkills, learnSkill } from "../skills/skills";
import {
  STAT_KEYS,
  type Action,
  type Choice,
  type DamageType,
  type Fighter,
  type Game,
  type Item,
  type Reward,
  type Stats,
  type EnemyStyle,
} from "../types";

import {
  actionCost,
  exposed,
  maxPoise,
  maxStamina,
  normalizeGame,
  poise,
  requirementGap,
  selectedReward,
  stamina,
  tellFor,
} from "./tactics";

export type Random = () => number;
export const maxHp = (f: Fighter) =>
  8 + f.stats.endurance * 4 + 2 * (statTotal(f) - 5);
export const statTotal = (f: Fighter) =>
  STAT_KEYS.reduce((sum, key) => sum + f.stats[key], 0);
export const stepSize = (f: Fighter) => Math.min(75, 40 + 5 * f.stats.agility);
export const canUse = (f: Fighter, equipment: Item) =>
  STAT_KEYS.every((key) => f.stats[key] >= (equipment.requirements[key] ?? 0));
export const weapon = (f: Fighter, fist = false) =>
  item(fist ? "fist" : f.gear.weapon);
export const canStep = (f: Fighter, action: Action) =>
  !f.offBalance && !f.prone && (action === "attack" || action === "block");
export const range = (f: Fighter, choice: Choice) =>
  choice.action === "kick"
    ? 90
    : choice.action === "shield"
      ? 70
      : weapon(f, choice.useFist).range!;
export const previewDistance = (
  g: Pick<Game, "player" | "distance">,
  choice: Choice,
) =>
  Math.max(
    40,
    Math.min(
      350,
      g.distance -
        (canStep(g.player, choice.action)
          ? choice.step * stepSize(g.player)
          : 0),
    ),
  );
export const reaches = (g: Pick<Game, "player" | "distance">, choice: Choice) =>
  previewDistance(g, choice) <= range(g.player, choice);
export function damageParts(
  f: Fighter,
  choice: Choice,
): { type: DamageType; value: number }[] {
  if (choice.action === "kick" || choice.action === "shield")
    return [
      {
        type: "blunt",
        value: f.stats.strength + (choice.action === "shield" ? 1 : 0),
      },
    ];
  return weapon(f, choice.useFist).damage!.map((d) => ({
    type: d.type,
    value: Math.ceil(
      (d.base + d.scale * f.stats[d.stat]) *
        (choice.action === "heavy" ? 1.5 : 1),
    ),
  }));
}
export const attackPower = (f: Fighter, choice: Choice) =>
  damageParts(f, choice).reduce((sum, d) => sum + d.value, 0);
export const kickChance = (f: Fighter) =>
  0.05 + (f.gear.feet ? (item(f.gear.feet).kickBonus ?? 0) : 0);
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
  if (equipment.id !== "fist") f.gear[equipment.slot] = equipment.id;
  return dropped;
}
const sample = <T>(values: T[], random: Random): T =>
  values[Math.floor(random() * values.length)];
const die = (random: Random) => 1 + Math.floor(random() * 20);
function eligible(f: Fighter, kind: "arms" | "armor") {
  return ITEMS.filter(
    (i) =>
      i.id !== "fist" &&
      (kind === "armor"
        ? i.kind === "armor" || i.kind === "jewelry"
        : i.kind === "weapon" || i.kind === "shield") &&
      canUse(f, i) &&
      i.tier <= statTotal(f) - 5,
  );
}
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
  const growth = Math.max(0, statTotal(f) - 5);
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
  const candidates = ITEMS.filter(
    (i) => i.id !== "fist" && canUse(f, i) && i.tier <= growth,
  );
  const cost = (i: Item) => i.tier + 1;
  const strength = (i: Item) => {
    if (i.kind === "weapon") {
      const parts = i.damage ?? [],
        scales = parts.reduce((n, p) => n + p.scale, 0) || 1;
      const affinity =
        parts.reduce((n, p) => n + p.scale * (f.stats[p.stat] - 1), 0) / scales;
      const power = parts.reduce(
        (n, p) => n + Math.ceil(p.base + p.scale * f.stats[p.stat]),
        0,
      );
      const preference =
        f.style === "berserker" && i.hands === 2
          ? 1.2
          : f.style === "duelist" && parts.some((p) => p.stat === "agility")
            ? 1.2
            : f.style === "warden" && i.hands === 1
              ? 1.2
              : 1;
      return (1 + power + 2 * affinity + 2 * i.tier) * preference;
    }
    const protection =
      Object.values(i.defense ?? {}).reduce((n, v) => n + v, 0) +
      Object.values(i.resistance ?? {}).reduce((n, v) => n + v * 4, 0);
    const affinity = STAT_KEYS.reduce(
      (n, key) =>
        n + Math.min(f.stats[key] - 1, (i.requirements[key] ?? 1) - 1),
      0,
    );
    return Math.max(
      0.1,
      1 + i.tier + protection + affinity + (i.kickBonus ?? 0) * 20,
    );
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
  // Each remaining slot competes for a limited budget; beginners do not get a full suit.
  while (budget > 0) {
    const slots = (
      ["shield", "body", "feet", "ring", "amulet"] as const
    ).filter(
      (slot) =>
        !loadout.gear[slot] &&
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
): Fighter {
  const style =
    forcedStyle ??
    sample<EnemyStyle>(["berserker", "duelist", "warden"], random);
  const stats: Stats = {
    strength: 1,
    agility: 1,
    endurance: 1,
    intelligence: 1,
    reaction: 1,
  };
  const weights: Stats =
    style === "berserker"
      ? { strength: 6, agility: 1, endurance: 3, intelligence: 1, reaction: 1 }
      : style === "duelist"
        ? {
            strength: 1,
            agility: 6,
            endurance: 2,
            intelligence: 1,
            reaction: 1,
          }
        : {
            strength: 2,
            agility: 1,
            endurance: 6,
            intelligence: 1,
            reaction: 1,
          };
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
    offBalance: false,
    prone: false,
    style,
    exposed: 0,
  };
  enemy.gear = generateEnemyGear(enemy, random);
  enemy.hp = maxHp(enemy);
  enemy.stamina = maxStamina(enemy);
  enemy.poise = maxPoise(enemy);
  enemy.portraitId = sample(
    PORTRAITS.filter((p) => p.id !== player.portraitId),
    random,
  ).id;
  return enemy;
}
export function chooseEnemy(g: Game, random: Random): Choice {
  const f = g.enemy;
  if (f.prone || stamina(f) < 1) return { action: "rest", step: 0 };
  const recent = g.log
    .slice(0, 3)
    .map(
      (turn) =>
        turn.playerMove ??
        (Object.keys(ACTIONS) as Action[]).find(
          (a) => ACTIONS[a].short === turn.playerAction,
        ),
    );
  const heavyCount = recent.filter((a) => a === "heavy").length;
  const guards = recent.filter((a) => a === "parry" || a === "block").length;
  const style = f.style ?? "berserker";
  const affordable = (c: Choice) => actionCost(f, c) <= stamina(f);
  if (stamina(f) < 3 && (exposed(f) || random() < 0.65))
    return { action: "rest", step: 0 };
  if (
    heavyCount >= 1 &&
    random() < (heavyCount >= 2 ? 0.95 : style === "berserker" ? 0.7 : 0.9)
  ) {
    const retreat: Choice = { action: "block", step: -1 };
    if (
      !f.offBalance &&
      affordable(retreat) &&
      g.distance + stepSize(f) > weapon(g.player).range! &&
      (style === "duelist" || random() < 0.35)
    )
      return retreat;
    return { action: "parry", step: 0 };
  }
  if (recent.filter((a) => a === "kick").length >= 2 && random() < 0.8) {
    const retreat: Choice = { action: "block", step: -1 };
    if (!f.offBalance && affordable(retreat) && g.distance + stepSize(f) > 90)
      return retreat;
    return { action: "attack", step: 0 };
  }
  const accessible = g.ground.filter(
    (id) => canUse(f, item(id)) && !Object.values(f.gear).includes(id),
  );
  if (accessible.length && random() < 0.06)
    return { action: "equip", step: 0, itemId: sample(accessible, random) };
  if (g.distance > weapon(f).range!) {
    const close: Choice = {
      action: style === "warden" ? "block" : "attack",
      step: f.offBalance ? 0 : 1,
    };
    return affordable(close) ? close : { action: "rest", step: 0 };
  }
  const choices: [Choice, number][] = [];
  const add = (action: Action, weight: number, step: Choice["step"] = 0) => {
    const c: Choice = { action, step };
    if (affordable(c)) choices.push([c, weight]);
  };
  add("attack", style === "duelist" ? 5 : 3);
  add("heavy", style === "berserker" ? 7 : style === "warden" ? 2 : 1);
  add(
    "block",
    style === "warden" ? 6 : 1,
    style === "duelist" && !f.offBalance && random() < 0.4 ? -1 : 0,
  );
  add("parry", style === "duelist" ? 5 : 2);
  if (stamina(f) < maxStamina(f) - 2 || poise(f) < 3) add("rest", 4);
  if (g.distance <= 90) add("kick", guards >= 2 ? 12 : 2);
  if (f.gear.shield && g.distance <= 70)
    add("shield", style === "warden" ? 7 : 2);
  if (exposed(g.player)) add("attack", 8);
  return weighted(choices, random);
}
function setupBattle(g: Game, random: Random) {
  g.player.hp = maxHp(g.player);
  g.player.offBalance = false;
  g.player.prone = false;
  g.player.stamina = maxStamina(g.player);
  g.player.poise = maxPoise(g.player);
  g.player.exposed = 0;
  g.enemy = generateEnemy(g.player, random);
  g.round = 1;
  g.distance = 120;
  g.phase = "combat";
  g.log = [];
  g.reward = null;
  g.rewardOptions = undefined;
  const pool = eligible(g.player, "arms");
  g.ground = [];
  while (g.ground.length < 3 && pool.length) {
    const index = Math.floor(random() * pool.length);
    g.ground.push(pool.splice(index, 1)[0].id);
  }
  g.enemyIntent = chooseEnemy(g, random);
  g.enemyTell = tellFor(g.enemyIntent, g.enemy);
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
    offBalance: false,
    prone: false,
  };
  return setupBattle(
    {
      version: 2,
      souls: 0,
      player,
      enemy: structuredClone(player),
      round: 1,
      fight: 1,
      wins: 0,
      distance: 120,
      ground: [],
      log: [],
      phase: "combat",
      reward: null,
      enemyIntent: { action: "attack", step: 0 },
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
  const unused = (i: Item) => !Object.values(player.gear).includes(i.id);
  const arms = eligible(player, "arms").filter(unused);
  const armor = eligible(player, "armor").filter(unused);
  const near = ITEMS.filter(
    (i) =>
      i.id !== "fist" &&
      unused(i) &&
      requirementGap(player, i) === 1 &&
      i.tier <= statTotal(player) - 4,
  );
  const first = arms.length ? sample(arms, random) : null;
  const pool = near.length && random() < 0.5 ? near : armor;
  const second = pool.filter((i) => i.id !== first?.id);
  const fallback = ITEMS.filter(
    (i) =>
      i.id !== "fist" &&
      canUse(player, i) &&
      unused(i) &&
      i.id !== first?.id &&
      i.tier <= statTotal(player) - 5,
  );
  const last = second.length
    ? sample(second, random)
    : fallback.length
      ? sample(fallback, random)
      : null;
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
    if (selection !== "souls") throw new Error("Выберите души.");
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
export function validateChoice(
  g: Pick<Game, "phase" | "player" | "ground">,
  c: Choice,
): string | null {
  if (g.phase !== "combat") return "Бой уже завершён.";
  if (g.player.prone) return null;
  if (!ACTIONS[c.action]) return "Неизвестное действие.";
  if (actionCost(g.player, c) > stamina(g.player))
    return `Не хватает сил: нужно ${actionCost(g.player, c)}, осталось ${stamina(g.player)}. Выберите передышку.`;
  if (c.action === "shield" && !g.player.gear.shield)
    return "Для этого действия нужен щит.";
  if (c.action === "equip") {
    if (!c.itemId) return "Выберите предмет на арене.";
    if (c.itemId === "fist")
      return g.player.gear.weapon ? null : "В руке уже нет оружия.";
    if (!g.ground.includes(c.itemId)) return "Предмета больше нет на арене.";
    if (!canUse(g.player, item(c.itemId))) return "Не хватает характеристик.";
  }
  return null;
}

export function resolveTurn(
  game: Game,
  choice: Choice,
  random: Random = Math.random,
): Game {
  const error = validateChoice(game, choice);
  if (error) throw new Error(error);
  const g = normalizeGame(game),
    p = g.player,
    e = g.enemy;
  const pc = { ...choice },
    ec = { ...g.enemyIntent };
  const pd = die(random),
    ed = die(random),
    events: string[] = [];
  const down = new Map([
      [p, p.prone],
      [e, e.prone],
    ]),
    interrupted = new Set<Fighter>(),
    acted = new Set<Fighter>(),
    impacted = new Set<Fighter>(),
    guardBroken = new Set<Fighter>();
  const pStep = canStep(p, pc.action) ? pc.step : 0,
    eStep = canStep(e, ec.action) ? ec.step : 0;
  for (const [f, c] of [
    [p, pc],
    [e, ec],
  ] as const) {
    f.exposed = Math.max(0, (f.exposed ?? 0) - 1);
    f.stamina = stamina(f) - actionCost(f, c);
    f.prone = false;
    f.offBalance = false;
    if (down.get(f)) f.poise = maxPoise(f);
    if (!down.get(f) && c.action === "heavy") f.exposed = 2;
  }
  g.distance = Math.max(
    40,
    Math.min(350, g.distance - pStep * stepSize(p) - eStep * stepSize(e)),
  );
  if (pStep) events.push(`${p.name}: шаг ${pStep > 0 ? "вперёд" : "назад"}.`);
  if (eStep) events.push(`${e.name}: шаг ${eStep > 0 ? "вперёд" : "назад"}.`);
  const destabilize = (f: Fighter, amount: number) => {
    if (down.get(f) || f.prone || f.hp <= 0) return;
    impacted.add(f);
    f.poise = Math.max(0, poise(f) - amount);
    events.push(`${f.name}: −${amount} устойчивости.`);
    if (f.poise === 0) {
      f.prone = true;
      guardBroken.add(f);
      events.push(
        `${f.name}: стойка сломлена — падение! Следующий ход уйдёт на подъём.`,
      );
    }
  };
  const protection = (f: Fighter, type: DamageType, shielded: boolean) => {
    const armor = [f.gear.body, f.gear.feet]
      .filter(Boolean)
      .map((id) => item(id));
    const flat = armor.reduce((n, a) => n + (a.defense?.[type] ?? 0), 0);
    const factor = armor.reduce(
      (n, a) => n * (1 - (a.resistance?.[type] ?? 0)),
      1,
    );
    const shield = shielded
      ? f.gear.shield
        ? (item(f.gear.shield).defense?.[type] ?? 0)
        : ["pierce", "slash", "blunt"].includes(type)
          ? 1
          : 0
      : 0;
    return { flat: flat + shield, factor };
  };
  const strike = (
    attacker: Fighter,
    defender: Fighter,
    attack: Choice,
    defense: Choice,
    attackDie: number,
    defenseDie: number,
    counter = false,
  ): void => {
    if (g.distance > range(attacker, attack)) {
      events.push(
        `${attacker.name}: ${counter ? "рипост" : ACTIONS[attack.action].short.toLowerCase()} не достаёт.`,
      );
      if (attack.action === "heavy") {
        attacker.exposed = 3;
        events.push(
          `${attacker.name}: промах сильной атакой — раскрытие ещё на два хода.`,
        );
      }
      return;
    }
    let shielded = false;
    const critical = attackDie === 20 && defenseDie < 20;
    const pressure =
      attack.action === "kick"
        ? 3
        : attack.action === "shield"
          ? 2
          : attack.action === "heavy" && defense.action === "block"
            ? 3
            : 0;
    if (pressure) destabilize(defender, pressure);
    if (
      attack.action === "kick" &&
      defense.action === "heavy" &&
      !down.get(defender) &&
      !acted.has(defender)
    ) {
      interrupted.add(defender);
      events.push(`${attacker.name}: пинок срывает сильную атаку.`);
    }
    const vulnerable = exposed(defender) ? 4 : 0;
    if (
      !counter &&
      !down.get(defender) &&
      !guardBroken.has(defender) &&
      defense.action === "block"
    ) {
      if (critical) events.push(`${attacker.name}: 20 — блок пробит!`);
      else if (
        stamina(defender) > 0 &&
        attackDie + vulnerable + (attack.action === "heavy" ? 4 : 0) <=
          defenseDie
      ) {
        defender.stamina = Math.max(0, stamina(defender) - 1);
        events.push(`${defender.name}: блокирует удар полностью.`);
        return;
      } else {
        shielded = true;
        defender.stamina = Math.max(0, stamina(defender) - 1);
        events.push(`${defender.name}: частичный блок.`);
      }
    }
    if (
      !counter &&
      !down.get(defender) &&
      !guardBroken.has(defender) &&
      defense.action === "parry" &&
      ["attack", "heavy"].includes(attack.action)
    ) {
      const agility = Math.max(
        -4,
        Math.min(
          4,
          Math.floor((defender.stats.agility - attacker.stats.agility) / 2),
        ),
      );
      const defenseScore =
        defenseDie + agility + (attack.action === "heavy" ? 5 : 0);
      if (!critical && defenseScore >= attackDie + vulnerable) {
        events.push(`${defender.name}: парирование и рипост!`);
        strike(
          defender,
          attacker,
          { action: "attack", step: 0 },
          { action: "attack", step: 0 },
          defenseDie,
          attackDie,
          true,
        );
        return;
      }
      events.push(`${defender.name}: парирование не удалось.`);
    }
    const parts = damageParts(attacker, attack);
    const amount = parts.reduce((sum, part) => {
      const armor = protection(defender, part.type, shielded);
      const penetration =
        part.type === "fire"
          ? Math.min(3, Math.floor(attacker.stats.intelligence / 3))
          : 0;
      return (
        sum +
        Math.max(
          0,
          (part.value - Math.max(0, armor.flat - penetration)) * armor.factor,
        )
      );
    }, 0);
    const damage =
      Math.round(amount * (exposed(defender) ? 1.25 : 1) * 10) / 10;
    defender.hp = Math.max(0, Math.round((defender.hp - damage) * 10) / 10);
    events.push(
      `${attacker.name}: ${counter ? "рипост" : ACTIONS[attack.action].short.toLowerCase()} → ${damage} урона${exposed(defender) ? " по раскрытому противнику" : ""}${damage === 0 ? " — броня выдержала" : ""}.`,
    );
    if (damage > 0) {
      if (!pressure) destabilize(defender, attack.action === "heavy" ? 2 : 1);
      if (
        attack.action === "kick" &&
        !down.get(defender) &&
        random() < kickChance(attacker)
      ) {
        defender.offBalance = true;
        events.push(
          `${defender.name}: потеря равновесия — следующий ход без шага.`,
        );
      }
      if (attack.action === "shield") {
        g.distance = Math.min(350, g.distance + 40);
        events.push(`${attacker.name}: отталкивает щитом.`);
      }
      if (parts.some((part) => part.type === "frost")) {
        const drain =
          1 + Math.min(3, Math.floor(attacker.stats.intelligence / 4));
        defender.stamina = Math.max(0, stamina(defender) - drain);
        events.push(`${defender.name}: мороз отнимает ${drain} силы.`);
      }
      if (parts.some((part) => part.type === "wind")) {
        g.distance = Math.min(
          350,
          g.distance + 15 + Math.min(20, attacker.stats.intelligence * 3),
        );
        events.push(`${attacker.name}: порыв ветра отбрасывает противника.`);
      }
      if (parts.some((part) => part.type === "magic"))
        destabilize(
          defender,
          1 + Math.min(3, Math.floor(attacker.stats.intelligence / 4)),
        );
    }
  };
  const act = (
    actor: Fighter,
    target: Fighter,
    c: Choice,
    other: Choice,
    aDie: number,
    dDie: number,
  ) => {
    if (down.get(actor)) {
      events.push(`${actor.name} поднимается и восстанавливает стойку.`);
      return;
    }
    if (interrupted.has(actor)) {
      events.push(`${actor.name}: подготовка сорвана, сильная атака отменена.`);
      return;
    }
    if (c.action === "equip") {
      const id = c.itemId;
      if (
        !id ||
        (id !== "fist" && !g.ground.includes(id)) ||
        !canUse(actor, item(id))
      ) {
        events.push(`${actor.name}: предмет уже недоступен.`);
        return;
      }
      if (id !== "fist") g.ground.splice(g.ground.indexOf(id), 1);
      const dropped = wear(actor, item(id));
      g.ground.push(...dropped.map((i) => i.id));
      events.push(
        `${actor.name}: ${id === "fist" ? "освобождает руку" : `подбирает «${item(id).name}»`}${dropped.length ? `; на земле: ${dropped.map((i) => i.name).join(", ")}` : ""}.`,
      );
    } else if (["attack", "heavy", "kick", "shield"].includes(c.action)) {
      if (c.action !== "shield" || actor.gear.shield)
        strike(actor, target, c, other, aDie, dDie);
    } else
      events.push(
        `${actor.name}: ${c.action === "block" ? "держит блок" : c.action === "parry" ? "готовит парирование" : "переводит дыхание"}.`,
      );
  };
  act(p, e, pc, ec, pd, ed);
  acted.add(p);
  if (p.hp > 0 && e.hp > 0) act(e, p, ec, pc, ed, pd);
  for (const [f, c] of [
    [p, pc],
    [e, ec],
  ] as const) {
    if (f.hp <= 0) continue;
    f.stamina = Math.min(
      maxStamina(f),
      stamina(f) + (c.action === "rest" || down.get(f) ? 3 : 1),
    );
    if (!f.prone && !down.get(f))
      f.poise = Math.min(
        maxPoise(f),
        poise(f) +
          (c.action === "rest"
            ? 2
            : c.action === "block" && !impacted.has(f)
              ? 1
              : 0),
      );
  }
  if (e.hp <= 0) {
    g.phase = "victory";
    g.wins++;
    g.rewardOptions = rollRewards(p, e, random);
    g.reward = g.rewardOptions[0];
    events.push("Поединок окончен. Выберите одну награду.");
  } else if (p.hp <= 0) {
    g.phase = "defeat";
    loseSoulsOnDefeat(g);
    g.reward = null;
    g.rewardOptions = undefined;
    events.push("Вы повержены. Персонаж и экипировка сохранены.");
  }
  g.log.unshift({
    round: g.round,
    playerDie: pd,
    enemyDie: ed,
    playerAction: down.get(p) ? "Подъём" : ACTIONS[pc.action].short,
    enemyAction: down.get(e) ? "Подъём" : ACTIONS[ec.action].short,
    playerMove: pc.action,
    enemyMove: ec.action,
    events,
  });
  g.log = g.log.slice(0, 60);
  g.round++;
  if (g.phase === "combat") g.enemyIntent = chooseEnemy(g, random);
  g.enemyTell = tellFor(g.enemyIntent, g.enemy);
  return g;
}
