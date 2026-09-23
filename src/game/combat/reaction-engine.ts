import { FEATURE_FLAGS, isCombatActionEnabled } from "../config/features";
import { journeyPath } from "../journey/journey-map";
import { battleMode, chooseBattleMode, figureKey } from "./battle-modes";
import { isEvade, skill } from "../skills/skills";
import { maxHp } from "./engine";
import { comboCandidates } from "./figure-combos";
import { level, loseSoulsOnDefeat } from "../progression/souls";
import { journeyVictory, journeyEnemy } from "../journey/journey";
import { item, ITEMS } from "../equipment/catalog";
import {
  layer,
  attackParts,
  attackDamage,
  calculateClash,
} from "./clash-damage";
export { distributeDamage } from "./clash-damage";
import { canUse, kickChance, rollRewards, wear, type Random } from "./engine";
import { normalizeGame, maxPoise, poise } from "./tactics";
import { canPlace, placementCells, possiblePlacements } from "./board";
import { reactionManeuvers, isStrike, isGuard } from "./reaction-rules";
import type {
  BoardModifiers,
  ClashCell,
  ClashPlan,
  ClashResult,
  Fighter,
  Game,
  Maneuver,
  Placement,
  PublicGame,
  Side,
} from "../types";
const sides = ["player", "enemy"] as const;
const other = (side: Side): Side => (side === "player" ? "enemy" : "player");
const placements = (p: ClashPlan, s: Side) =>
  s === "player" ? p.playerPlaced : p.enemyPlaced;
const modifiers = (p: ClashPlan, s: Side) =>
  s === "player" ? p.playerModifiers : p.enemyModifiers;
const budget = (p: ClashPlan, s: Side) =>
  s === "player" ? p.playerBudget : p.enemyBudget;
const ground = (p: ClashPlan) =>
  p.blocked.filter(
    (n) => n !== p.playerModifiers.unlocked && n !== p.enemyModifiers.unlocked,
  );
const power = (f: Fighter, m: Maneuver) =>
  isStrike(m) ? attackParts(f, m).reduce((n, p) => n + p.value, 0) : 0;
function board(g: Game, random: Random) {
  for (let attempt = 0; attempt < 40; attempt++) {
    const shuffled = Array.from({ length: 9 }, (_, i) => i);
    for (let i = 8; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const blocked = shuffled
      .slice(0, 1 + Math.floor(random() * 2))
      .sort((a, b) => a - b);
    if (
      sides.every((s) => {
        const available = reactionManeuvers(g[s]).filter(
          (m) => !m.spent && !m.cooldown,
        );
        return (
          !available.length ||
          available.some((m) => possiblePlacements(m, blocked).length)
        );
      })
    )
      return blocked;
  }
  return [];
}
export function prepareClash(saved: Game, random: Random = Math.random): Game {
  const g = normalizeGame(saved);
  g.version = 4;
  delete g.roundPlan;
  for (const f of [g.player, g.enemy]) {
    f.gear.ring ??= null;
    f.gear.amulet ??= null;
    f.charmsUsed ??= { ring: false, amulet: false };
    f.exposed = 0;
  }
  g.journey ??= {
    startLevel: level(g.player),
    expedition: 1,
    stage: 1,
    cleared: 0,
    healUsed: false,
  };
  g.journey.battleMode ??= "limited";
  g.journey.path ??= journeyPath(g.journey);
  for (const f of [g.player, g.enemy]) {
    f.battleMode = battleMode(g.journey);
    if (f.battleMode !== "limited") {
      f.offBalance = false;
      f.chilled = false;
      f.frostImmune = false;
    }
  }
  // Keep saved fights playable when a previously available pickup is disabled.
  if (!FEATURE_FLAGS.combatEquipmentSwap && g.clashPlan) {
    const plan = g.clashPlan,
      hadEnemyPickup = plan.enemyPlaced.some((p) => p.id === "equip");
    plan.playerPlaced = plan.playerPlaced.filter((p) => p.id !== "equip");
    plan.enemyPlaced = plan.enemyPlaced.filter((p) => p.id !== "equip");
    for (const mod of [plan.playerModifiers, plan.enemyModifiers])
      if (mod.compressed === "equip") delete mod.compressed;
    if (g.phase === "combat" && hadEnemyPickup && !plan.enemyPlaced.length)
      planEnemy(g, random);
  }
  if (
    g.phase === "combat" &&
    battleMode(g.journey) === "expendable" &&
    sides.every((side) => !hasAttacksRemaining(g, side))
  ) {
    const events: string[] = [];
    finishByHealth(g, events, random);
    g.log.unshift({
      round: g.round,
      playerDie: 0,
      enemyDie: 0,
      playerAction: "Действия завершены",
      enemyAction: "Действия завершены",
      events,
    });
    delete g.clashPlan;
    return prepareClash(g, random);
  }
  if (g.phase === "defeat") {
    g.journey.path = ["fight-1"];
    g.journey.stage = 1;
    g.journey.cleared = 0;
    g.journey.finished = false;
    g.journey.healUsed = false;
    g.journey.offers = [];
    delete g.journey.route;
    delete g.journey.forgeResolved;
  }
  // A previously committed field keeps its original buckler shape until resolution.
  if (g.clashPlan)
    for (const f of [g.player, g.enemy]) f.splitBuckler ??= false;
  if (g.phase !== "combat" || g.clashPlan) return g;
  for (const f of [g.player, g.enemy]) {
    f.tactical = true;
    f.splitBuckler = true;
    f.cooldowns ??= {};
  }
  const pd = 1 + Math.floor(random() * 6),
    ed = 1 + Math.floor(random() * 6);
  const a = pd + g.player.stats.reaction,
    b = ed + g.enemy.stats.reaction;
  const reactor: Side =
    a === b
      ? g.lastReactor
        ? other(g.lastReactor)
        : random() < 0.5
          ? "player"
          : "enemy"
      : a > b
        ? "player"
        : "enemy";
  const preparer = other(reactor);
  g.lastReactor = reactor;
  const available = (s: Side) =>
    battleMode(g.journey) !== "limited"
      ? 9
      : Math.max(
          1,
          (s === preparer ? 5 : 4) -
            (g[s].offBalance ? 1 : 0) +
            (s === "enemy" && g.enemy.elite ? 1 : 0),
        );
  g.clashPlan = {
    battleMode: battleMode(g.journey),
    stage: preparer === "player" ? "preparation" : "reaction",
    preparer,
    reactor,
    playerDie: pd,
    enemyDie: ed,
    blocked: board(g, random),
    playerBudget: available("player"),
    enemyBudget: available("enemy"),
    playerPlaced: [],
    enemyPlaced: [],
    playerModifiers: {},
    enemyModifiers: {},
  };
  const free = Array.from({ length: 9 }, (_, i) => i).filter(
    (i) => !g.clashPlan!.blocked.includes(i),
  );
  g.clashPlan.special = {
    index: free[Math.floor(random() * free.length)],
    kind: (["pierce", "rally", "surge"] as const)[Math.floor(random() * 3)],
  };
  if (preparer === "enemy") planEnemy(g, random);
  return g;
}
export function beginClash(saved: Game, random: Random = Math.random): Game {
  const g = structuredClone(saved);
  if (!g.journey) {
    g.journey = {
      battleMode: chooseBattleMode(random),
      startLevel: level(g.player),
      expedition: 1,
      stage: 1,
      cleared: 0,
      healUsed: false,
    };
    g.enemy = journeyEnemy(g, random);
  }
  delete g.clashPlan;
  delete g.roundPlan;
  delete g.lastReactor;
  for (const f of [g.player, g.enemy]) {
    f.charmsUsed = { ring: false, amulet: false };
    f.cooldowns = {};
    f.spentFigures = [];
    f.actionsFinished = false;
    f.frostImmune = false;
    f.chilled = false;
  }
  return prepareClash(g, random);
}
export function publicClash(g: Game): PublicGame {
  const {
    enemyIntent: _intent,
    enemyTell: _tell,
    roundPlan: _old,
    clashPlan: p,
    ...visible
  } = g;
  if (!p || g.phase !== "combat") return visible;
  const { enemyPlaced, enemyModifiers, ...open } = p;
  return {
    ...visible,
    clash: {
      ...open,
      ...(p.preparer === "enemy" ? { enemyPlaced, enemyModifiers } : {}),
    },
  };
}
export function validateClash(
  g: Game,
  side: Side,
  placed: Placement[],
  mod: BoardModifiers,
): void {
  const plan = g.clashPlan;
  if (!plan) throw new Error("Поле ещё не создано.");
  if (
    !Array.isArray(placed) ||
    placed.length > 9 ||
    (!placed.length &&
      (battleMode(g.journey) !== "expendable" ||
        (g[side].prone && !g[side].actionsFinished)))
  )
    throw new Error(
      "Разместите фигуры на поле. Пропуск доступен в режиме «Единственный шанс», кроме подъёма.",
    );
  if (!mod || typeof mod !== "object" || Array.isArray(mod))
    throw new Error("Некорректные эффекты украшений.");
  const f = g[side];
  if (f.actionsFinished && (placed.length || Object.keys(mod).length))
    throw new Error("Вы уже завершили действия в этом бою.");
  if (
    mod.unlocked !== undefined &&
    (!Number.isInteger(mod.unlocked) ||
      !plan.blocked.includes(mod.unlocked) ||
      f.gear.ring !== "unlock-ring" ||
      f.charmsUsed?.ring)
  )
    throw new Error("Кольцо недоступно или выбрана не скала.");
  if (
    mod.compressed !== undefined &&
    (typeof mod.compressed !== "string" ||
      f.gear.amulet !== "fold-amulet" ||
      f.charmsUsed?.amulet ||
      !placed.some((p) => p.id === mod.compressed))
  )
    throw new Error("Амулет недоступен или фигура не размещена.");
  const tokens = reactionManeuvers(f),
    used: number[] = [],
    ids = new Set<string>();
  for (const p of placed) {
    if (
      !p ||
      ![p.x, p.y, p.rotation].every(Number.isInteger) ||
      p.rotation < 0 ||
      p.rotation > 3 ||
      p.x < 0 ||
      p.x > 2 ||
      p.y < 0 ||
      p.y > 2
    )
      throw new Error("Некорректное положение фигуры.");
    const m = tokens.find((m) => m.id === p.id);
    if (m && !isCombatActionEnabled(m.action))
      throw new Error("Смена экипировки во время боя временно отключена.");
    if (m?.spent) throw new Error("Эта фигура уже использована в этом бою.");
    if (m?.cooldown) throw new Error("Приём восстанавливается ещё один раунд.");
    if (
      m?.choiceGroup &&
      placed.some(
        (other) =>
          other.id !== p.id &&
          tokens.find((t) => t.id === other.id)?.choiceGroup === m.choiceGroup,
      )
    )
      throw new Error("Выберите один рисунок заклинания.");
    if (!m || ids.has(p.id) || !canPlace(m, p, ground(plan), used, mod))
      throw new Error("Фигура пересекает свой слой, скалу или границу поля.");
    if (
      m.action === "equip" &&
      (!ITEMS.some((i) => i.id === p.itemId) ||
        !g.ground.includes(p.itemId!) ||
        !canUse(f, item(p.itemId)))
    )
      throw new Error("Предмет недоступен для подбора.");
    if (m.action !== "equip" && p.itemId !== undefined)
      throw new Error("Предмет указан не для подбора.");
    ids.add(p.id);
    used.push(...placementCells(m, p, mod));
  }
  if (battleMode(g.journey) === "limited" && used.length > budget(plan, side))
    throw new Error(`Доступно ${budget(plan, side)} клеток действий.`);
}
/** AI sees the opposing layer only when it owns the reaction role. */
function planEnemy(g: Game, random: Random) {
  const plan = g.clashPlan!,
    f = g.enemy;
  if (f.actionsFinished) {
    plan.enemyPlaced = [];
    plan.enemyModifiers = {};
    return;
  }
  const tokens = reactionManeuvers(f).filter((m) =>
      isCombatActionEnabled(m.action),
    ),
    mod = plan.enemyModifiers;
  if (
    f.gear.ring === "unlock-ring" &&
    !f.charmsUsed?.ring &&
    plan.blocked.length &&
    random() < 0.35
  )
    mod.unlocked = plan.blocked[Math.floor(random() * plan.blocked.length)];
  if (
    f.gear.amulet === "fold-amulet" &&
    !f.charmsUsed?.amulet &&
    !f.prone &&
    random() < 0.35
  )
    mod.compressed = "heavy";
  const known =
    plan.reactor === "enemy"
      ? layer(g.player, plan.playerPlaced, plan.playerModifiers)
      : undefined;
  const used: number[] = [],
    result: Placement[] = [];
  while (result.length < 9) {
    const choices: {
      p: Placement;
      m: Maneuver;
      score: number;
      cells: number[];
    }[] = [];
    for (const m of tokens) {
      if (
        m.spent ||
        m.cooldown ||
        result.some(
          (p) =>
            p.id === m.id ||
            (m.choiceGroup &&
              tokens.find((t) => t.id === p.id)?.choiceGroup === m.choiceGroup),
        )
      )
        continue;
      const size = mod.compressed === m.id ? 1 : m.shape.length;
      if (
        battleMode(g.journey) === "limited" &&
        used.length + size > plan.enemyBudget
      )
        continue;
      let itemId: string | undefined;
      if (m.action === "equip") {
        const pool = g.ground.filter(
          (id) => canUse(f, item(id)) && !Object.values(f.gear).includes(id),
        );
        if (!pool.length) continue;
        itemId = pool[Math.floor(random() * pool.length)];
      }
      for (const position of possiblePlacements(m, ground(plan), used, mod)) {
        const p = { ...position, ...(itemId ? { itemId } : {}) },
          indices = placementCells(m, p, mod);
        let score = 0;
        for (const n of indices) {
          const opposing = known?.[n];
          if (isStrike(m))
            score +=
              (power(f, m) / size) *
              (isGuard(opposing) || isEvade(opposing)
                ? 0
                : isStrike(opposing)
                  ? 0.5
                  : 1);
          else if (isGuard(m) || isEvade(m))
            score += known
              ? isStrike(opposing)
                ? power(g.player, opposing!) / opposing!.shape.length + 1
                : isGuard(opposing)
                  ? 0
                  : 0.3
              : f.style === "warden"
                ? 1.4
                : 0.5;
          else if (m.skillId) {
            const s = skill(m.skillId)!;
            score +=
              (s.effect === "poise"
                ? Math.min(s.amount, maxPoise(f) - poise(f))
                : s.effect === "heal"
                  ? Math.min(s.amount, maxHp(f) - f.hp)
                  : 0) / size;
          } else
            score +=
              m.action === "stand"
                ? 10
                : m.action === "rest"
                  ? poise(f) < maxPoise(f)
                    ? 1.2
                    : 0.1
                  : 0.35;
        }
        if (isStrike(m) && known)
          score = attackDamage(
            f,
            g.player,
            m,
            indices,
            known,
            plan.special,
          ).damage;
        if (plan.special && indices.includes(plan.special.index))
          score +=
            plan.special.kind === "rally" && isGuard(m)
              ? 2
              : isStrike(m)
                ? 1
                : 0;
        if (known) {
          const draft = calculateClash(
            g,
            { player: plan.playerPlaced, enemy: [...result, p] },
            { player: plan.playerModifiers, enemy: mod },
            plan.special,
          );
          score += draft.sides.enemy.combos.reduce(
            (n, c) => n + c.damageBonus + c.poiseBonus + c.recoveryBonus * 0.5,
            0,
          );
        } else score += comboCandidates(f, [...result, p], mod).length * 0.15;
        if (f.archetype === "duelist" && m.action === "attack") score += 0.8;
        if (f.archetype === "warden" && isGuard(m)) score += 0.8;
        choices.push({
          p,
          m,
          score:
            score +
            random() * 0.6 +
            (f.style === "berserker" && m.action === "heavy" ? 0.3 : 0),
          cells: indices,
        });
      }
    }
    if (!choices.length) break;
    choices.sort((a, b) => b.score - a.score);
    const best = choices[0];
    result.push(best.p);
    used.push(...best.cells);
  }
  if (!result.some((p) => p.id === mod.compressed)) delete mod.compressed;
  plan.enemyPlaced = result;
  if (
    battleMode(g.journey) === "expendable" &&
    !result.length &&
    !hasAttacksRemaining(g, "enemy")
  )
    f.actionsFinished = true;
  validateClash(g, "enemy", result, mod);
}
export function resolveClash(saved: Game, random: Random = Math.random): Game {
  if (saved.phase !== "combat" || !saved.clashPlan)
    throw new Error("Поединок уже завершён.");
  for (const s of sides)
    validateClash(
      saved,
      s,
      placements(saved.clashPlan, s),
      modifiers(saved.clashPlan, s),
    );
  const g = structuredClone(saved),
    plan = g.clashPlan!,
    layers = {
      player: layer(g.player, plan.playerPlaced, plan.playerModifiers),
      enemy: layer(g.enemy, plan.enemyPlaced, plan.enemyModifiers),
    };
  const cells: ClashCell[] = Array.from({ length: 9 }, (_, index) => {
    const a = layers.player[index],
      b = layers.enemy[index];
    const interaction =
      (isEvade(a) && (isStrike(b) || isGuard(b))) ||
      (isEvade(b) && (isStrike(a) || isGuard(a)))
        ? "evaded"
        : isStrike(a) && isStrike(b)
          ? "clash"
          : (isStrike(a) && isGuard(b)) || (isGuard(a) && isStrike(b))
            ? "blocked"
            : isStrike(a) || isStrike(b)
              ? "attack"
              : isGuard(a) && isGuard(b)
                ? "guard"
                : isGuard(a) || isGuard(b)
                  ? "pressure"
                  : a || b
                    ? "utility"
                    : "empty";
    return {
      index,
      player: a,
      enemy: b,
      playerDamage: 0,
      enemyDamage: 0,
      interaction,
    };
  });
  const calculation = calculateClash(
    g,
    { player: plan.playerPlaced, enemy: plan.enemyPlaced },
    { player: plan.playerModifiers, enemy: plan.enemyModifiers },
    plan.special,
  );
  const events: string[] = [
    `Реакция: вы ${plan.playerDie} + ${g.player.stats.reaction}, противник ${plan.enemyDie} + ${g.enemy.stats.reaction}. Подготовка: ${g[plan.preparer].name}; реакция: ${g[plan.reactor].name}.`,
  ];
  const frostProtected = {
    player: !!(g.player.chilled || g.player.offBalance || g.player.frostImmune),
    enemy: !!(g.enemy.chilled || g.enemy.offBalance || g.enemy.frostImmune),
  };
  for (const side of sides) {
    const f = g[side];
    f.frostImmune = !!(f.chilled || f.offBalance);
    f.chilled = false;
    f.offBalance = false;
  }
  const poiseLoss = {
    player: calculation.sides.player.poiseLoss,
    enemy: calculation.sides.enemy.poiseLoss,
  };
  for (const side of sides) {
    const f = g[side],
      target = other(side),
      d = g[target],
      tokens = reactionManeuvers(f),
      mod = modifiers(plan, side);
    if (mod.unlocked !== undefined) f.charmsUsed!.ring = true;
    if (mod.compressed) f.charmsUsed!.amulet = true;
    for (const p of placements(plan, side)) {
      const m = tokens.find((m) => m.id === p.id)!;
      if (isStrike(m)) {
        const { parts, coverage, damage } = calculation.attacks[side][p.id];
        events.push(
          `${f.name}: ${m.name} — прошло ${Math.round(coverage * 100)}% атаки, после брони ${damage} урона.`,
        );
        if (damage > 0 && battleMode(g.journey) === "limited") {
          if (m.action === "kick" && random() < kickChance(f))
            d.offBalance = true;
          if (parts.some((p) => p.type === "frost")) {
            if (!frostProtected[target]) {
              d.offBalance = true;
              d.chilled = true;
              events.push(`${d.name}: мороз — −1 клетка на следующий раунд.`);
            } else
              events.push(
                `${d.name}: защита от повторного замедления морозом.`,
              );
          }
        }
      }
    }
  }
  for (const side of sides) {
    const f = g[side],
      summary = calculation.sides[side],
      lost = summary.damage;
    cells.forEach((c, i) => {
      if (side === "player") c.playerDamage = calculation.cells[i].playerDamage;
      else c.enemyDamage = calculation.cells[i].enemyDamage;
    });
    f.hp = summary.hpAfter;
    f.poise = summary.poiseAfter;
    f.prone = summary.prone;
    events.push(...summary.reasons.map((reason) => `${f.name}: ${reason}.`));
    for (const combo of summary.combos)
      events.push(
        `${f.name}: ${combo.name} — ${combo.kind === "counter" ? `+${combo.damageBonus} урона после брони (до ограничения здоровьем)` : combo.kind === "pressure" ? "−1 стойки противнику" : "до +1 своей стойки"}.`,
      );
    const usedKeys = placements(plan, side)
      .map(
        (p) =>
          reactionManeuvers(saved[side]).find((m) => m.id === p.id)
            ?.cooldownKey,
      )
      .filter((k): k is string => !!k);
    f.cooldowns = Object.fromEntries(
      Object.entries(f.cooldowns ?? {})
        .filter(([, n]) => n > 1)
        .map(([k, n]) => [k, n - 1]),
    );
    if (battleMode(g.journey) !== "expendable")
      for (const key of usedKeys) {
        f.cooldowns[key] = 1;
        events.push(
          `${f.name}: ${key.startsWith("skill:") ? skill(key.slice(6))?.name : key === "heavy" ? "сильный удар" : "усиленный блок"} восстанавливается один раунд.`,
        );
      }
    events.push(`${f.name}: −${lost} здоровья, −${poiseLoss[side]} стойки.`);
  }
  // Consume the original source before equipment changes; stand is a compulsory recovery, not a consumable figure.
  if (battleMode(g.journey) === "expendable")
    for (const side of sides) {
      const tokens = reactionManeuvers(saved[side]);
      g[side].spentFigures = [
        ...new Set([
          ...(g[side].spentFigures ?? []),
          ...placements(plan, side)
            .map((p) => tokens.find((m) => m.id === p.id)!)
            .filter((m) => m.action !== "stand")
            .map(figureKey),
        ]),
      ];
    }
  // Equipment resolves after simultaneous damage, so a pickup cannot alter this round's attack.
  for (const side of [plan.preparer, plan.reactor])
    for (const p of placements(plan, side))
      if (
        FEATURE_FLAGS.combatEquipmentSwap &&
        p.id === "equip" &&
        g[side].hp > 0
      ) {
        if (g.ground.includes(p.itemId!) && canUse(g[side], item(p.itemId))) {
          g.ground.splice(g.ground.indexOf(p.itemId!), 1);
          g.ground.push(...wear(g[side], item(p.itemId)).map((i) => i.id));
          events.push(`${g[side].name}: подбирает ${item(p.itemId).name}.`);
        } else events.push(`${g[side].name}: предмет уже недоступен.`);
      }
  if (g.player.hp <= 0 && g.enemy.hp <= 0) {
    g.phase = "draw";
    g.reward = null;
    g.rewardOptions = undefined;
    events.push("Обоюдный нокаут. Ничья.");
  } else if (g.enemy.hp <= 0) {
    g.phase = "victory";
    g.wins++;
    g.rewardOptions = rollRewards(g.player, g.enemy, random);
    g.reward = g.rewardOptions[0];
    journeyVictory(g, random);
  } else if (g.player.hp <= 0) {
    g.phase = "defeat";
    g.reward = null;
    g.rewardOptions = undefined;
  }
  if (
    g.phase === "combat" &&
    battleMode(g.journey) === "expendable" &&
    sides.every((side) => !hasAttacksRemaining(g, side))
  )
    finishByHealth(g, events, random, false);
  if (g.phase === "defeat") {
    const lost = loseSoulsOnDefeat(g);
    events.push(
      `Потеряно душ: ${lost}. Непотраченные души исчезают при поражении.`,
    );
  }
  const result: ClashResult = {
    battleMode: battleMode(g.journey),
    summary: calculation.sides,
    special: plan.special,
    playerBudget: plan.playerBudget,
    enemyBudget: plan.enemyBudget,
    preparer: plan.preparer,
    reactor: plan.reactor,
    playerDie: plan.playerDie,
    enemyDie: plan.enemyDie,
    playerReaction: g.player.stats.reaction,
    enemyReaction: g.enemy.stats.reaction,
    blocked: plan.blocked,
    playerPlaced: plan.playerPlaced,
    enemyPlaced: plan.enemyPlaced,
    playerModifiers: plan.playerModifiers,
    enemyModifiers: plan.enemyModifiers,
    cells,
    playerDamage:
      Math.round(cells.reduce((n, c) => n + c.playerDamage, 0) * 10) / 10,
    enemyDamage:
      Math.round(cells.reduce((n, c) => n + c.enemyDamage, 0) * 10) / 10,
    playerPoiseLoss: poiseLoss.player,
    enemyPoiseLoss: poiseLoss.enemy,
  };
  const names = (side: Side) =>
    placements(plan, side)
      .map(
        (p) => reactionManeuvers(saved[side]).find((m) => m.id === p.id)!.name,
      )
      .join(" + ") || "Пропуск";
  g.log.unshift({
    clash: result,
    round: g.round,
    playerDie: plan.playerDie,
    enemyDie: plan.enemyDie,
    playerAction: names("player"),
    enemyAction: names("enemy"),
    events,
  });
  g.log = g.log.slice(0, 60);
  g.round++;
  delete g.clashPlan;
  return prepareClash(g, random);
}
/** A pickup can still supply new attacks; an already spent weapon stays spent. */
function hasAttacksRemaining(g: Game, side: Side): boolean {
  if (g[side].actionsFinished) return false;
  const f = { ...g[side], prone: false },
    moves = reactionManeuvers(f);
  if (
    moves.some(
      (m) =>
        !m.spent &&
        m.skillId &&
        skill(m.skillId)?.effect === "heal" &&
        f.hp < maxHp(f),
    )
  )
    return true;
  if (moves.some((m) => isStrike(m) && !m.spent)) return true;
  if (
    !FEATURE_FLAGS.combatEquipmentSwap ||
    !moves.some((m) => m.action === "equip" && !m.spent)
  )
    return false;
  return g.ground.some((id) => {
    const equipment = item(id);
    if (!canUse(f, equipment)) return false;
    const candidate = structuredClone(f);
    wear(candidate, equipment);
    return reactionManeuvers(candidate).some((m) => isStrike(m) && !m.spent);
  });
}
export function submitClash(
  saved: Game,
  placed: Placement[],
  mod: BoardModifiers = {},
  random: Random = Math.random,
): Game {
  if (saved.phase !== "combat" || !saved.clashPlan)
    throw new Error("Поле недоступно.");
  validateClash(saved, "player", placed, mod);
  const g = structuredClone(saved),
    plan = g.clashPlan!;
  plan.playerPlaced = placed.map(({ id, x, y, rotation, itemId }) => ({
    id,
    x,
    y,
    rotation,
    ...(itemId ? { itemId } : {}),
  }));
  plan.playerModifiers = {
    ...(mod.unlocked !== undefined ? { unlocked: mod.unlocked } : {}),
    ...(mod.compressed ? { compressed: mod.compressed } : {}),
  };
  if (plan.reactor === "enemy") planEnemy(g, random);
  return resolveClash(g, random);
}

/** Once neither side can change health, defensive-only moves cannot change the result. */
function finishByHealth(
  g: Game,
  events: string[],
  random: Random,
  loseSouls = true,
) {
  const player = Math.round(g.player.hp * 10),
    enemy = Math.round(g.enemy.hp * 10);
  events.push(
    `Действия завершены. Оставшееся здоровье: ${g.player.name} — ${player / 10}, ${g.enemy.name} — ${enemy / 10}.`,
  );
  if (player > enemy) {
    g.phase = "victory";
    g.wins++;
    g.rewardOptions = rollRewards(g.player, g.enemy, random);
    g.reward = g.rewardOptions[0];
    journeyVictory(g, random);
    events.push("Победа: у вас больше здоровья.");
  } else {
    g.phase = player < enemy ? "defeat" : "draw";
    g.reward = null;
    g.rewardOptions = undefined;
    events.push(
      player < enemy
        ? "Поражение: у противника больше здоровья."
        : "Здоровье одинаковое. Ничья.",
    );
    if (player < enemy && loseSouls) {
      const lost = loseSoulsOnDefeat(g);
      events.push(`Потеряно душ: ${lost}.`);
    }
  }
}
/** Forfeit remaining actions, not the match. The opponent spends its remaining turns. */
export function finishClashActions(
  saved: Game,
  random: Random = Math.random,
): Game {
  if (saved.phase !== "combat" || battleMode(saved.journey) !== "expendable")
    throw new Error(
      "Завершить действия можно только в режиме «Единственный шанс».",
    );
  let g = structuredClone(saved);
  g.player.actionsFinished = true;
  g = prepareClash(g, random);
  for (let round = 0; g.phase === "combat" && round < 100; round++)
    g = submitClash(g, [], {}, random);
  if (g.phase === "combat")
    throw new Error("Не удалось завершить действия противника.");
  return g;
}
