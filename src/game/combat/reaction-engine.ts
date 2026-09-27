import BALANCE from "../../../data/combat-balance.json";
import { startDeck, spendCards, shuffle } from "@/game/combat/deck";
import { cellInteraction } from "@/game/combat/cell-interaction";
import { battleMode, chooseBattleMode } from "@/game/combat/battle-modes";
import { level, loseSoulsOnDefeat } from "@/game/progression/souls";
import {
  journeyVictory,
  journeyEnemy,
  ensureJourneyEnemies,
} from "@/game/journey/journey";
import { item } from "@/game/equipment/catalog";
import {
  layer,
  calculateClash,
  placementCost,
} from "@/game/combat/clash-damage";
export { distributeDamage } from "@/game/combat/clash-damage";
import { rollRewards, maxHp, type Random } from "@/game/combat/engine";
import { normalizeGame, stamina } from "@/game/combat/tactics";
import {
  canPlace,
  placementCells,
  possiblePlacements,
} from "@/game/combat/board";
import {
  reactionManeuvers,
  isStrike,
  maneuverDamage,
} from "@/game/combat/reaction-rules";
import type {
  BoardModifiers,
  ClashPlan,
  ClashResult,
  Game,
  Placement,
  PublicGame,
  Side,
} from "@/game/types";
const sides = ["player", "enemy"] as const;
const other = (s: Side): Side => (s === "player" ? "enemy" : "player");
const placements = (p: ClashPlan, s: Side) =>
  s === "player" ? p.playerPlaced : p.enemyPlaced;
const modifiers = (p: ClashPlan, s: Side) =>
  s === "player" ? p.playerModifiers : p.enemyModifiers;
const ground = (p: ClashPlan) =>
  p.blocked.filter(
    (n) => n !== p.playerModifiers.unlocked && n !== p.enemyModifiers.unlocked,
  );
export function prepareClash(saved: Game, random: Random = Math.random): Game {
  const g = normalizeGame(saved);
  if (g.version !== 5)
    throw new Error("Сохранение несовместимо. Создайте героя заново.");
  ensureJourneyEnemies(g);
  for (const f of [g.player, g.enemy]) {
    f.battleMode = battleMode(g.journey);
    f.charmsUsed ??= { ring: false, amulet: false };
  }
  if (g.phase !== "combat") return g;
  for (const f of [g.player, g.enemy]) if (!f.deck) startDeck(f, random);
  if (g.clashPlan) return g;
  if (
    battleMode(g.journey) === "expendable" &&
    sides.every((s) => !hasAttacksRemaining(g, s))
  ) {
    const events: string[] = [];
    finishByHealth(g, events, random);
    return g;
  }
  const reactor: Side = g.lastReactor
    ? other(g.lastReactor)
    : random() < 0.5
      ? "player"
      : "enemy";
  g.lastReactor = reactor;
  const preparer = other(reactor);
  g.clashPlan = {
    battleMode: battleMode(g.journey),
    stage: preparer === "player" ? "preparation" : "reaction",
    preparer,
    reactor,
    blocked: [],
    playerPlaced: [],
    enemyPlaced: [],
    playerModifiers: {},
    enemyModifiers: {},
  };
  if (BALANCE.board.rockChance > 0 && random() < BALANCE.board.rockChance)
    g.clashPlan.blocked = [Math.floor(random() * 9)];
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
    };
    g.enemy = journeyEnemy(g, random);
  }
  delete g.clashPlan;
  delete g.lastReactor;
  for (const f of [g.player, g.enemy]) {
    f.battleMode = battleMode(g.journey);
    f.charmsUsed = { ring: false, amulet: false };
    f.actionsFinished = false;
    startDeck(f, random);
  }
  return prepareClash(g, random);
}
/** No draw order, hidden hand, future map enemy decks or unrevealed plan in the response. */
export function publicClash(g: Game): PublicGame {
  const { clashPlan: p, ...visible } = structuredClone(g);
  for (const enemy of Object.values(visible.journey?.enemies ?? {}))
    delete enemy.deck;
  const revealed = p?.preparer === "enemy" || p?.stage === "reveal";
  for (const side of sides) {
    const d = visible[side].deck;
    if (d) {
      d.draw = d.draw.map((m) => ({ id: m.id }) as typeof m);
      if (side === "enemy" && !revealed) d.hand = [];
    }
  }
  // Draw identifiers also reveal template identities; expose counts with opaque placeholders only.
  for (const f of [visible.player, visible.enemy])
    if (f.deck)
      f.deck.draw = f.deck.draw.map(
        (_, i) =>
          ({ id: `hidden-${i}` }) as ReturnType<
            typeof reactionManeuvers
          >[number],
      );
  if (!p || g.phase !== "combat") return visible;
  const { enemyPlaced, enemyModifiers, ...open } = p;
  return {
    ...visible,
    clash: { ...open, ...(revealed ? { enemyPlaced, enemyModifiers } : {}) },
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
    !mod ||
    typeof mod !== "object" ||
    Array.isArray(mod)
  )
    throw new Error("Некорректный план.");
  const f = g[side],
    tokens = reactionManeuvers(f),
    used: number[] = [],
    ids = new Set<string>();
  const committed =
    side === "player" ? plan.committedPlayerModifiers : undefined;
  if (
    mod.unlocked !== undefined &&
    (!plan.blocked.includes(mod.unlocked) ||
      item(f.gear.ring).charmEffect !== "unlock" ||
      (f.charmsUsed?.ring && committed?.unlocked !== mod.unlocked))
  )
    throw new Error("Кольцо недоступно.");
  if (
    mod.compressed !== undefined &&
    (item(f.gear.amulet).charmEffect !== "compress" ||
      (f.charmsUsed?.amulet && committed?.compressed !== mod.compressed))
  )
    throw new Error("Амулет недоступен.");
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
    if (!m || ids.has(p.id) || !canPlace(m, p, ground(plan), used, mod))
      throw new Error(
        "Фигура отсутствует в наборе, пересекает свой слой, скалу или границу поля.",
      );
    ids.add(p.id);
    used.push(...placementCells(m, p, mod));
  }
  const opposing =
    plan.preparer === side
      ? undefined
      : layer(
          g[other(side)],
          placements(plan, other(side)),
          modifiers(plan, other(side)),
        );
  if (placementCost(f, placed, mod, opposing).remaining < 0)
    throw new Error(
      "Не хватает выносливости на атаки и блоки. Уберите фигуру.",
    );
}
function planEnemy(g: Game, random: Random) {
  const p = g.clashPlan!;
  if (g.enemy.actionsFinished) {
    p.enemyPlaced = [];
    return;
  }
  const known = p.reactor === "enemy";
  const opposing = known
    ? layer(g.player, p.playerPlaced, p.playerModifiers)
    : undefined;
  const candidates: Array<{ moves: Placement[]; score: number }> = [];
  for (let attempt = 0; attempt < 16; attempt++) {
    const moves: Placement[] = [],
      used: number[] = [];
    for (const m of shuffle(reactionManeuvers(g.enemy), random)) {
      const options = shuffle(
        possiblePlacements(m, ground(p), used, p.enemyModifiers),
        random,
      );
      const legal = options.filter(
        (pos) =>
          placementCost(g.enemy, [...moves, pos], p.enemyModifiers, opposing)
            .remaining >= 0,
      );
      if (!legal.length) continue;
      const ranked = legal
        .slice(0, 16)
        .map((pos) => {
          const plan = [...moves, pos];
          if (!known)
            return { pos, score: maneuverDamage(g.enemy, m) + random() * 3 };
          const calc = calculateClash(
            g,
            { player: p.playerPlaced, enemy: plan },
            { player: p.playerModifiers, enemy: p.enemyModifiers },
          );
          return {
            pos,
            score:
              calc.playerDamage -
              calc.enemyDamage +
              0.5 *
                (calc.sides.player.staminaLoss - calc.sides.enemy.staminaLoss) +
              random(),
          };
        })
        .sort((a, b) => b.score - a.score);
      const pick = ranked[0];
      moves.push(pick.pos);
      used.push(...placementCells(m, pick.pos, p.enemyModifiers));
    }
    const calc = calculateClash(
      g,
      { player: known ? p.playerPlaced : [], enemy: moves },
      { player: p.playerModifiers, enemy: p.enemyModifiers },
    );
    candidates.push({
      moves,
      score:
        calc.playerDamage -
        calc.enemyDamage +
        0.5 * (calc.sides.player.staminaLoss - calc.sides.enemy.staminaLoss),
    });
  }
  candidates.sort((a, b) => b.score - a.score);
  p.enemyPlaced =
    candidates[Math.floor(random() * Math.min(3, candidates.length))].moves;
}
export function resolveClash(saved: Game, random: Random = Math.random): Game {
  if (saved.phase !== "combat" || !saved.clashPlan)
    throw new Error("Поединок завершён.");
  for (const s of sides)
    validateClash(
      saved,
      s,
      placements(saved.clashPlan, s),
      modifiers(saved.clashPlan, s),
    );
  const g = structuredClone(saved),
    plan = g.clashPlan!;
  const layers = {
    player: layer(g.player, plan.playerPlaced, plan.playerModifiers),
    enemy: layer(g.enemy, plan.enemyPlaced, plan.enemyModifiers),
  };
  const calc = calculateClash(
    g,
    { player: plan.playerPlaced, enemy: plan.enemyPlaced },
    { player: plan.playerModifiers, enemy: plan.enemyModifiers },
  );
  const cells = calc.cells.map((c) => ({
    ...c,
    player: layers.player[c.index],
    enemy: layers.enemy[c.index],
    interaction: cellInteraction(layers.player[c.index], layers.enemy[c.index]),
  }));
  const names = (side: Side) =>
    placements(plan, side)
      .map((p) => reactionManeuvers(g[side]).find((m) => m.id === p.id)!.name)
      .join(" + ") || "Пропуск";
  const playerAction = names("player"),
    enemyAction = names("enemy");
  const events: string[] = [];
  for (const side of sides) {
    const f = g[side],
      summary = calc.sides[side];
    f.hp = summary.hpAfter;
    f.stamina = summary.staminaAfter;
    f.exhausted = summary.exhausted;
    const mod = modifiers(plan, side);
    if (mod.unlocked !== undefined) f.charmsUsed!.ring = true;
    if (mod.compressed) f.charmsUsed!.amulet = true;
    spendCards(
      f,
      placements(plan, side).map((p) => p.id),
      random,
    );
  }
  if (g.player.hp <= 0 && g.enemy.hp <= 0) g.phase = "draw";
  else if (g.enemy.hp <= 0) {
    g.phase = "victory";
    g.wins++;
    g.rewardOptions = rollRewards(g.player, g.enemy, random);
    g.reward = g.rewardOptions[0];
    journeyVictory(g, random);
  } else if (g.player.hp <= 0) g.phase = "defeat";
  else if (
    battleMode(g.journey) === "expendable" &&
    sides.every((s) => !hasAttacksRemaining(g, s))
  )
    finishByHealth(g, events, random, false);
  if (g.phase === "defeat")
    events.push(`Потеряно осколков: ${loseSoulsOnDefeat(g)}.`);
  const result: ClashResult = {
    battleMode: battleMode(g.journey),
    summary: calc.sides,
    preparer: plan.preparer,
    reactor: plan.reactor,
    blocked: plan.blocked,
    playerPlaced: plan.playerPlaced,
    enemyPlaced: plan.enemyPlaced,
    playerModifiers: plan.playerModifiers,
    enemyModifiers: plan.enemyModifiers,
    cells,
    playerDamage: calc.playerDamage,
    enemyDamage: calc.enemyDamage,
    playerStaminaLoss: calc.sides.player.staminaLoss,
    enemyStaminaLoss: calc.sides.enemy.staminaLoss,
  };
  g.log = [
    { round: g.round, clash: result, playerAction, enemyAction, events },
  ];
  g.round++;
  delete g.clashPlan;
  if (g.phase === "combat")
    for (const f of [g.player, g.enemy]) {
      if (!f.exhausted)
        f.stamina = Math.min(
          BALANCE.stamina.max,
          stamina(f) + BALANCE.stamina.recovery,
        );
    }
  return prepareClash(g, random);
}
function hasAttacksRemaining(g: Game, side: Side) {
  const f = g[side];
  if (f.actionsFinished) return false;
  const cards = (fighter: typeof f) => [
    ...(fighter.deck?.hand ?? []),
    ...(fighter.deck?.draw ?? []),
  ];
  const opposite = g[other(side)];
  const canReceiveAttack =
    !opposite.actionsFinished && cards(opposite).some(isStrike);
  return cards(f).some(
    (m) =>
      isStrike(m) ||
      (m.counter && canReceiveAttack) ||
      ((m.healing ?? 0) > 0 && f.hp < maxHp(f)),
  );
}
export function applyClashCharm(
  saved: Game,
  charm: unknown,
  target: unknown,
): Game {
  if (
    saved.phase !== "combat" ||
    !saved.clashPlan ||
    saved.player.actionsFinished ||
    saved.clashPlan.stage === "reveal"
  )
    throw new Error("Украшение сейчас недоступно.");
  const g = structuredClone(saved),
    plan = g.clashPlan!,
    f = g.player;
  const committed = { ...plan.committedPlayerModifiers };
  if (charm === "ring") {
    if (
      item(f.gear.ring).charmEffect !== "unlock" ||
      f.charmsUsed?.ring ||
      typeof target !== "number" ||
      !Number.isInteger(target) ||
      !plan.blocked.includes(target) ||
      plan.enemyModifiers.unlocked === target
    )
      throw new Error("Кольцо недоступно или выбрана не скала.");
    committed.unlocked = target;
  } else if (charm === "amulet") {
    const figure = reactionManeuvers(f).find((m) => m.id === target);
    if (
      item(f.gear.amulet).charmEffect !== "compress" ||
      f.charmsUsed?.amulet ||
      !figure ||
      figure.shape.length <= 1
    )
      throw new Error("Амулет недоступен или фигуру нельзя сжать.");
    committed.compressed = figure.id;
  } else throw new Error("Неизвестное украшение.");
  f.charmsUsed ??= { ring: false, amulet: false };
  f.charmsUsed[charm] = true;
  plan.committedPlayerModifiers = committed;
  plan.playerModifiers = { ...plan.playerModifiers, ...committed };
  return g;
}

export function submitClash(
  saved: Game,
  placed: Placement[],
  mod: BoardModifiers = {},
  random: Random = Math.random,
): Game {
  if (saved.phase !== "combat" || !saved.clashPlan)
    throw new Error("Поле недоступно.");
  if (saved.clashPlan.stage === "reveal") return resolveClash(saved, random);
  mod = { ...mod, ...saved.clashPlan.committedPlayerModifiers };
  validateClash(saved, "player", placed, mod);
  const g = structuredClone(saved),
    p = g.clashPlan!;
  p.playerPlaced = structuredClone(placed);
  p.playerModifiers = mod;
  if (p.preparer === "player") {
    planEnemy(g, random);
    p.stage = "reveal";
    return g;
  }
  return resolveClash(g, random);
}
export function exchangeCard(
  saved: Game,
  id: unknown,
  random: Random = Math.random,
): Game {
  if (
    saved.phase !== "combat" ||
    !saved.clashPlan ||
    saved.clashPlan.stage === "reveal"
  )
    throw new Error("Обмен сейчас недоступен.");
  const g = structuredClone(saved),
    f = g.player,
    d = f.deck!;
  const index = d.hand.findIndex((m) => m.id === id);
  if (
    index < 0 ||
    d.exchanged ||
    stamina(f) < BALANCE.stamina.exchangeCost ||
    (!d.draw.length && (f.battleMode === "expendable" || !d.discard.length))
  )
    throw new Error(
      "Нельзя обменять карту. Нужны карта в стопке и 1 выносливости; один обмен за ход.",
    );
  // Draw before discarding so the exchanged instance cannot return immediately.
  if (!d.draw.length) {
    d.draw = shuffle(d.discard, random);
    d.discard = [];
  }
  const replacement = d.draw.shift()!;
  d.discard.push(d.hand[index]);
  d.hand[index] = replacement;
  d.exchanged = true;
  f.stamina = stamina(f) - BALANCE.stamina.exchangeCost;
  return g;
}
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
      events.push(`Потеряно осколков: ${lost}.`);
    }
  }
}

export function finishClashActions(
  saved: Game,
  random: Random = Math.random,
): Game {
  if (
    saved.phase !== "combat" ||
    saved.clashPlan?.stage === "reveal" ||
    battleMode(saved.journey) !== "expendable"
  )
    throw new Error("Доступно только в режиме «Единственный шанс».");
  let g = structuredClone(saved);
  g.player.actionsFinished = true;
  g.player.deck!.hand = [];
  g.player.deck!.draw = [];
  for (let round = 0; g.phase === "combat" && round < 100; round++)
    g = submitClash(g, [], {}, random);
  if (g.phase === "combat") throw new Error("Противник не завершил действия.");
  return g;
}
