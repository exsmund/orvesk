import { loseSoulsOnDefeat } from "../progression/souls";
import { item, ITEMS } from "../equipment/catalog";
import {
  canUse,
  damageParts,
  kickChance,
  range,
  rollRewards,
  stepSize,
  wear,
} from "./engine";
import { maxPoise, normalizeGame, poise } from "./tactics";
import {
  hasFreeHand,
  boardFor,
  canPlace,
  maneuvers,
  MAX_ACTIONS,
  placementCells,
  possiblePlacements,
} from "./board";
import {
  type CombatSnapshot,
  type CombatStep,
  type BoardModifiers,
  type Choice,
  type Fighter,
  type Game,
  type Maneuver,
  type Placement,
  type PublicGame,
  type Side,
} from "../types";
import type { Random } from "./engine";
const pick = <T>(a: T[], random: Random) => a[Math.floor(random() * a.length)];
const clamp = (n: number) => Math.max(40, Math.min(350, n));
const sorted = (p: Placement[]) =>
  [...p].sort((a, b) => a.id.localeCompare(b.id));
function aiPlacements(g: Game, random: Random): Placement[] {
  const plan = g.roundPlan!,
    f = g.enemy,
    tokens = maneuvers(f),
    result: Placement[] = [],
    used: number[] = [];
  const scored = tokens
    .map((m) => ({
      m,
      score:
        random() * 3 +
        (m.action === "advance" && g.distance > item(f.gear.weapon).range!
          ? 15
          : 0) +
        (m.action === "attack" ? 5 : 0) +
        (m.action === "heavy" && f.style === "berserker" ? 5 : 0) +
        (m.action === "block" && f.style === "warden" ? 5 : 0) +
        (m.action === "parry" && f.style === "duelist" ? 4 : 0) +
        (m.action === "rest" && poise(f) < 3 ? 6 : 0),
    }))
    .sort((a, b) => b.score - a.score);
  for (const { m } of scored) {
    if (result.length === MAX_ACTIONS) break;
    const fits = possiblePlacements(
      m,
      plan.enemyBlocked,
      used,
      plan.enemyModifiers,
    );
    if (!fits.length) continue;
    const p = pick(fits, random);
    if (m.action === "equip") {
      const available = g.ground.filter(
        (id) => canUse(f, item(id)) && !Object.values(f.gear).includes(id),
      );
      if (!available.length) continue;
      p.itemId = pick(available, random);
    }
    result.push(p);
    used.push(...placementCells(m, p, plan.enemyModifiers));
  }
  return result;
}
/** Initialize once, then persist before returning to the client. Never regenerate on GET. */
export function prepareRound(saved: Game, random: Random = Math.random): Game {
  const g = normalizeGame(saved);
  g.version = 3;
  for (const f of [g.player, g.enemy]) {
    f.gear.ring ??= null;
    f.gear.amulet ??= null;
    f.charmsUsed ??= { ring: false, amulet: false };
  }
  if (
    g.roundPlan &&
    (["player", "enemy"] as const).some((side) => {
      const valid = maneuvers(g[side]).map((m) => m.id);
      return (
        side === "player" ? g.roundPlan!.playerPlaced : g.roundPlan!.enemyPlaced
      ).some((p) => !valid.includes(p.id));
    })
  )
    delete g.roundPlan;
  if (g.phase !== "combat" || g.roundPlan) return g;
  g.roundPlan = {
    stage: "placement",
    blocked: boardFor(g.player, random),
    enemyBlocked: boardFor(g.enemy, random),
    playerPlaced: [],
    enemyPlaced: [],
    enemyOrder: [],
    modifiers: {},
    enemyModifiers: {},
  };
  if (
    g.enemy.gear.ring === "unlock-ring" &&
    !g.enemy.charmsUsed!.ring &&
    g.roundPlan.enemyBlocked.length &&
    random() < 0.3
  )
    g.roundPlan.enemyModifiers.unlocked = pick(
      g.roundPlan.enemyBlocked,
      random,
    );
  if (
    g.enemy.gear.amulet === "fold-amulet" &&
    !g.enemy.charmsUsed!.amulet &&
    !g.enemy.prone &&
    random() < 0.3
  )
    g.roundPlan.enemyModifiers.compressed = "heavy";
  g.roundPlan.enemyPlaced = aiPlacements(g, random);
  if (
    !g.roundPlan.enemyPlaced.some(
      (p) => p.id === g.roundPlan!.enemyModifiers.compressed,
    )
  )
    delete g.roundPlan.enemyModifiers.compressed;
  return g;
}
export function beginBattle(saved: Game, random: Random = Math.random): Game {
  const g = normalizeGame(saved);
  delete g.roundPlan;
  delete g.lastFirst;
  for (const f of [g.player, g.enemy])
    f.charmsUsed = { ring: false, amulet: false };
  return prepareRound(g, random);
}
export function publicBoard(g: Game): PublicGame {
  const {
    enemyIntent: _intent,
    enemyTell: _tell,
    roundPlan: plan,
    ...visible
  } = g;
  return {
    ...visible,
    ...(plan && g.phase === "combat"
      ? {
          planning: {
            stage: plan.stage,
            blocked: plan.blocked,
            placed: plan.playerPlaced,
            modifiers: plan.modifiers,
            ...(plan.stage === "ordering"
              ? {
                  enemyActions: sorted(plan.enemyPlaced).map((p) => {
                    const m = maneuvers(g.enemy).find((m) => m.id === p.id)!;
                    return {
                      id: p.id,
                      name: m.name,
                      description: m.description,
                    };
                  }),
                }
              : {}),
          },
        }
      : {}),
  };
}
export function validatePlacements(
  g: Game,
  placed: Placement[],
  mod: BoardModifiers,
): void {
  if (!Array.isArray(placed) || !placed.length || placed.length > MAX_ACTIONS)
    throw new Error("Разместите от одного до четырёх действий.");
  if (!mod || typeof mod !== "object" || Array.isArray(mod))
    throw new Error("Некорректные эффекты украшений.");
  if (
    mod.unlocked !== undefined &&
    (!Number.isInteger(mod.unlocked) ||
      !g.roundPlan!.blocked.includes(mod.unlocked) ||
      g.player.gear.ring !== "unlock-ring" ||
      g.player.charmsUsed?.ring)
  )
    throw new Error("Кольцо недоступно или клетка не заблокирована.");
  if (
    mod.compressed !== undefined &&
    (typeof mod.compressed !== "string" ||
      g.player.gear.amulet !== "fold-amulet" ||
      g.player.charmsUsed?.amulet ||
      !placed.some((p) => p.id === mod.compressed))
  )
    throw new Error("Амулет недоступен или действие не размещено.");
  const tokens = maneuvers(g.player),
    used: number[] = [],
    ids = new Set<string>();
  for (const p of placed) {
    if (
      !p ||
      typeof p !== "object" ||
      ![p.x, p.y, p.rotation].every(Number.isInteger) ||
      p.rotation < 0 ||
      p.rotation > 3 ||
      p.x < 0 ||
      p.x > 2 ||
      p.y < 0 ||
      p.y > 2
    )
      throw new Error("Некорректное размещение.");
    const m = tokens.find((m) => m.id === p.id);
    if (!m || ids.has(p.id) || !canPlace(m, p, g.roundPlan!.blocked, used, mod))
      throw new Error(
        "Фигуры пересекаются, выходят за поле или действие недоступно.",
      );
    if (
      m.action === "equip" &&
      (!ITEMS.some((i) => i.id === p.itemId) ||
        !g.ground.includes(p.itemId!) ||
        !canUse(g.player, item(p.itemId)))
    )
      throw new Error("Предмет недоступен для подбора.");
    if (m.action !== "equip" && p.itemId !== undefined)
      throw new Error("Предмет можно указать только для смены экипировки.");
    ids.add(p.id);
    used.push(...placementCells(m, p, mod));
  }
}
/** AI receives only the opponent's unordered set. Placement and submitted order never enter this function. */
export function orderEnemy(
  g: Game,
  opponentActions: string[],
  random: Random,
): string[] {
  const plan = g.roundPlan!,
    tokens = maneuvers(g.enemy);
  return sorted(plan.enemyPlaced)
    .map((p) => {
      const m = tokens.find((m) => m.id === p.id)!;
      const score =
        random() * 4 +
        (m.action === "advance" && g.distance > item(g.enemy.gear.weapon).range!
          ? 20
          : 0) +
        (m.action === "block" && opponentActions.includes("attack") ? 7 : 0) +
        (m.action === "parry" && opponentActions.includes("heavy") ? 8 : 0) +
        (m.action === "kick" && opponentActions.includes("heavy") ? 6 : 0) +
        (m.action === "rest" && poise(g.enemy) < 3 ? 9 : 0) +
        (m.action === "retreat" ? -4 : 0);
      return { id: p.id, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((p) => p.id);
}
export function reveal(
  saved: Game,
  placed: Placement[],
  mod: BoardModifiers = {},
  random: Random = Math.random,
): Game {
  if (saved.phase !== "combat" || saved.roundPlan?.stage !== "placement")
    throw new Error("Размещение уже завершено.");
  validatePlacements(saved, placed, mod);
  const g = structuredClone(saved),
    p = g.roundPlan!;
  // Drop extraneous input properties and canonicalize; placement order cannot leak into AI ordering.
  p.playerPlaced = sorted(
    placed.map(({ id, x, y, rotation, itemId }) => ({
      id,
      x,
      y,
      rotation,
      ...(itemId ? { itemId } : {}),
    })),
  );
  p.modifiers = {
    ...(mod.unlocked !== undefined ? { unlocked: mod.unlocked } : {}),
    ...(mod.compressed ? { compressed: mod.compressed } : {}),
  };
  p.enemyOrder = orderEnemy(
    g,
    p.playerPlaced
      .map((p) => maneuvers(g.player).find((m) => m.id === p.id)!.action)
      .sort(),
    random,
  );
  p.stage = "ordering";
  return g;
}
export function resolveSequence(
  saved: Game,
  order: string[],
  random: Random = Math.random,
): Game {
  if (saved.phase !== "combat" || saved.roundPlan?.stage !== "ordering")
    throw new Error("Сначала раскройте действия.");
  const expected = saved.roundPlan.playerPlaced.map((p) => p.id);
  if (
    !Array.isArray(order) ||
    order.length !== expected.length ||
    new Set(order).size !== expected.length ||
    !order.every((id) => expected.includes(id))
  )
    throw new Error(
      "Очередь должна содержать каждое выбранное действие ровно один раз.",
    );
  const g = structuredClone(saved),
    plan = g.roundPlan!,
    events: string[] = [],
    steps: CombatStep[] = [];
  const snapshot = (): CombatSnapshot => {
    const state = (f: Fighter) => ({
      hp: f.hp,
      poise: f.poise,
      prone: f.prone,
      offBalance: f.offBalance,
      exposed: f.exposed,
      gear: { ...f.gear },
    });
    return {
      player: state(g.player),
      enemy: state(g.enemy),
      distance: g.distance,
    };
  };
  const queues: Record<Side, { m: Maneuver; p: Placement }[]> = {
    player: [],
    enemy: [],
  };
  for (const side of ["player", "enemy"] as const) {
    const ids = side === "player" ? order : plan.enemyOrder,
      placed = side === "player" ? plan.playerPlaced : plan.enemyPlaced;
    queues[side] = ids.map((id) => ({
      m: maneuvers(g[side]).find((m) => m.id === id)!,
      p: placed.find((p) => p.id === id)!,
    }));
    const mod = side === "player" ? plan.modifiers : plan.enemyModifiers;
    if (mod.unlocked !== undefined) g[side].charmsUsed!.ring = true;
    if (mod.compressed) g[side].charmsUsed!.amulet = true;
    if (mod.unlocked !== undefined || mod.compressed)
      events.push(
        `${g[side].name}: использует ${[mod.unlocked !== undefined ? "кольцо" : "", mod.compressed ? "амулет" : ""].filter(Boolean).join(" и ")}.`,
      );
    g[side].exposed = Math.max(0, (g[side].exposed ?? 0) - 1);
  }
  const initial = snapshot();
  const pd = 1 + Math.floor(random() * 6),
    ed = 1 + Math.floor(random() * 6);
  const first: Side =
    pd + g.player.stats.reaction === ed + g.enemy.stats.reaction
      ? g.lastFirst
        ? g.lastFirst === "player"
          ? "enemy"
          : "player"
        : random() < 0.5
          ? "player"
          : "enemy"
      : pd + g.player.stats.reaction > ed + g.enemy.stats.reaction
        ? "player"
        : "enemy";
  g.lastFirst = first;
  events.push(
    `Инициатива: вы ${pd} + ${g.player.stats.reaction}, противник ${ed} + ${g.enemy.stats.reaction}. Первым действует ${g[first].name}.`,
  );
  const guards: Record<
    Side,
    {
      kind: "block" | "parry";
      hits: number;
      weaponId?: string;
      itemId: string;
    } | null
  > = { player: null, enemy: null };
  const cursor: Record<Side, number> = { player: 0, enemy: 0 },
    cancelled = new Set<string>();
  const opposite = (s: Side): Side => (s === "player" ? "enemy" : "player");
  const finished = new WeakSet<CombatStep>();
  const startStep = (
    actor: Side,
    m: Maneuver,
    itemId?: string,
    counter = false,
  ): CombatStep => {
    const guard = guards[opposite(actor)];
    const step: CombatStep = {
      actor,
      action: m.action,
      name: m.name,
      itemId: itemId ?? m.shieldId ?? m.weaponId,
      ...(guard
        ? {
            defense: {
              kind: guard.kind,
              itemId:
                guard.kind === "block"
                  ? (g[opposite(actor)].gear.shield ?? "fist")
                  : guard.itemId,
              hits: guard.hits,
              ...(counter ? { bypassed: true } : {}),
            },
          }
        : {}),
      result: "Выполнено",
      ...(counter ? { counter: true } : {}),
      events: [],
      after: snapshot(),
    };
    steps.push(step);
    return step;
  };
  const finishStep = (step: CombatStep, eventStart: number) => {
    if (finished.has(step)) return;
    step.events = events.slice(eventStart);
    step.after = snapshot();
    finished.add(step);
  };
  const impact = (side: Side, n: number) => {
    const f = g[side];
    if (f.hp <= 0 || f.prone) return;
    f.poise = Math.max(0, poise(f) - n);
    events.push(`${f.name}: −${n} устойчивости.`);
    if (f.poise === 0) {
      f.prone = true;
      guards[side] = null;
      events.push(`${f.name}: падение — следующее действие уйдёт на подъём.`);
    }
  };
  const strike = (
    side: Side,
    m: Maneuver,
    step: CombatStep,
    counter = false,
  ): void => {
    step.damage = 0;
    const other = opposite(side),
      a = g[side],
      d = g[other],
      armed = {
        ...a,
        gear: { ...a.gear, weapon: m.weaponId ?? a.gear.weapon },
      };
    if (m.weaponId === "fist" && !hasFreeHand(a)) {
      step.result = "Обе руки заняты";
      events.push(`${a.name}: ${m.name} отменён — обе руки заняты.`);
      return;
    }
    if (m.weaponId && m.weaponId !== "fist" && a.gear.weapon !== m.weaponId) {
      step.result = "Оружие сменено";
      events.push(`${a.name}: ${m.name} отменён — оружие уже сменено.`);
      return;
    }
    const choice: Choice = { action: m.action as Choice["action"], step: 0 };
    if (g.distance > range(armed, choice)) {
      step.result = "Не достаёт";
      events.push(`${a.name}: ${m.name} не достаёт.`);
      if (m.action === "heavy") a.exposed = 3;
      return;
    }
    const ad = 1 + Math.floor(random() * 20),
      dd = 1 + Math.floor(random() * 20);
    step.dice = { attack: ad, defense: dd };
    events.push(`${a.name}: ${m.name}, d20 ${ad} : ${dd}.`);
    const guard = counter ? null : guards[other];
    if (m.action === "kick") {
      impact(other, 3);
      const next = queues[other][cursor[other]];
      if (next?.m.action === "heavy") {
        cancelled.add(`${other}:${cursor[other]}`);
        events.push(`${a.name}: срывает ближайший сильный удар.`);
      }
    } else if (m.action === "shield") impact(other, 2);
    else if (m.action === "heavy" && guard?.kind === "block") impact(other, 3);
    if (guard && d.prone) step.result = "Защита сорвана";
    let shielded = false;
    if (guard && !d.prone) {
      guard.hits--;
      if (guard.hits <= 0) guards[other] = null;
      const critical = ad === 20 && dd < 20;
      if (guard.kind === "parry" && ["attack", "heavy"].includes(m.action)) {
        const bonus =
          Math.max(
            -4,
            Math.min(4, Math.floor((d.stats.agility - a.stats.agility) / 2)),
          ) + (m.action === "heavy" ? 5 : 0);
        if (!critical && dd + bonus >= ad + (d.exposed ? 4 : 0)) {
          events.push(`${d.name}: парирование и рипост.`);
          step.result = "Парировано";
          finishStep(step, stepEventStart);
          const riposte: Maneuver = {
            id: "riposte",
            name: "Рипост",
            action: "attack",
            shape: [[0, 0]],
            description: "",
            weaponId: guard.weaponId,
          };
          const reply = startStep(other, riposte, undefined, true),
            replyStart = events.length;
          strike(other, riposte, reply, true);
          finishStep(reply, replyStart);
          return;
        }
      }
      if (guard.kind === "block") {
        if (
          !critical &&
          dd >= ad + (d.exposed ? 4 : 0) + (m.action === "heavy" ? 4 : 0)
        ) {
          step.result = "Полный блок";
          events.push(`${d.name}: полный блок.`);
          return;
        }
        shielded = !critical;
        step.result = critical ? "Блок пробит" : "Частичный блок";
        events.push(
          `${d.name}: ${critical ? "блок пробит" : "частичный блок"}.`,
        );
      }
    }
    const parts = damageParts(armed, choice),
      armor = [d.gear.body, d.gear.feet].filter(Boolean).map((id) => item(id));
    const amount = parts.reduce((sum, p) => {
      const flat =
        armor.reduce((v, i) => v + (i.defense?.[p.type] ?? 0), 0) +
        (shielded
          ? d.gear.shield
            ? (item(d.gear.shield).defense?.[p.type] ?? 0)
            : ["blunt", "pierce", "slash"].includes(p.type)
              ? 1
              : 0
          : 0);
      const penetration =
        p.type === "fire"
          ? Math.min(3, Math.floor(a.stats.intelligence / 3))
          : 0;
      return (
        sum +
        Math.max(0, p.value - Math.max(0, flat - penetration)) *
          armor.reduce((v, i) => v * (1 - (i.resistance?.[p.type] ?? 0)), 1)
      );
    }, 0);
    const damage = Math.round(amount * (d.exposed ? 1.25 : 1) * 10) / 10;
    step.damage = Math.round(Math.min(d.hp, damage) * 10) / 10;
    if (step.result === "Выполнено")
      step.result = damage > 0 ? "Попадание" : "Поглощено бронёй";
    d.hp = Math.max(0, Math.round((d.hp - damage) * 10) / 10);
    events.push(`${a.name}: ${m.name} → ${damage} урона.`);
    if (damage > 0) {
      if (
        !["kick", "shield"].includes(m.action) &&
        !(m.action === "heavy" && guard?.kind === "block")
      )
        impact(other, m.action === "heavy" ? 2 : 1);
      if (m.action === "kick" && random() < kickChance(a)) d.offBalance = true;
      if (m.action === "shield") g.distance = clamp(g.distance + 40);
      if (parts.some((p) => p.type === "wind"))
        g.distance = clamp(
          g.distance + 15 + Math.min(20, a.stats.intelligence * 3),
        );
      if (parts.some((p) => p.type === "magic"))
        impact(other, 1 + Math.min(3, Math.floor(a.stats.intelligence / 4)));
      if (parts.some((p) => p.type === "frost")) {
        d.offBalance = true;
        events.push(`${d.name}: мороз сковывает следующий шаг.`);
      }
    }
  };
  let side = first,
    stepEventStart = 0;
  while (
    (cursor.player < queues.player.length ||
      cursor.enemy < queues.enemy.length) &&
    g.player.hp > 0 &&
    g.enemy.hp > 0
  ) {
    if (cursor[side] >= queues[side].length) {
      side = opposite(side);
      continue;
    }
    const index = cursor[side]++,
      { m, p } = queues[side][index],
      f = g[side];
    if (guards[side]?.kind === "parry") guards[side] = null;
    const step = startStep(side, m, p.itemId);
    stepEventStart = events.length;
    try {
      if (f.prone || m.action === "stand") {
        step.action = "stand";
        step.name = "Подъём";
        delete step.itemId;
        step.result = "Снова на ногах";
        f.prone = false;
        f.offBalance = false;
        f.poise = maxPoise(f);
        events.push(`${f.name}: поднимается вместо действия.`);
        side = opposite(side);
        continue;
      }
      if (cancelled.has(`${side}:${index}`)) {
        step.result = "Действие сорвано";
        events.push(`${f.name}: ${m.name} сорван.`);
        side = opposite(side);
        continue;
      }
      if (
        (m.shieldId && f.gear.shield !== m.shieldId) ||
        (m.action === "parry" &&
          m.weaponId !== "fist" &&
          f.gear.weapon !== m.weaponId)
      ) {
        step.result = "Предмет сменён";
        events.push(`${f.name}: ${m.name} отменён — предмет уже сменён.`);
        side = opposite(side);
        continue;
      }
      if (m.action === "advance" || m.action === "retreat") {
        if (f.offBalance) {
          step.result = "Шаг потерян";
          f.offBalance = false;
          events.push(`${f.name}: теряет шаг из-за равновесия.`);
        } else {
          step.result = m.action === "advance" ? "Сближение" : "Отступление";
          g.distance = clamp(
            g.distance + (m.action === "advance" ? -1 : 1) * stepSize(f),
          );
          events.push(`${f.name}: ${m.name.toLowerCase()}.`);
        }
      } else if (m.action === "block" || m.action === "parry") {
        step.result =
          m.action === "block" ? "Блок активен" : "Парирование активно";
        guards[side] = {
          kind: m.action,
          hits: m.guardHits ?? 1,
          weaponId: m.weaponId,
          itemId: m.shieldId ?? m.weaponId ?? "fist",
        };
        events.push(`${f.name}: ${m.name.toLowerCase()}.`);
      } else if (m.action === "rest") {
        step.result = "Стойка восстановлена";
        f.poise = Math.min(maxPoise(f), poise(f) + 2);
        events.push(`${f.name}: передышка, +2 устойчивости.`);
      } else if (m.action === "equip") {
        if (g.ground.includes(p.itemId!) && canUse(f, item(p.itemId))) {
          step.result = "Предмет экипирован";
          g.ground.splice(g.ground.indexOf(p.itemId!), 1);
          const old = wear(f, item(p.itemId));
          g.ground.push(...old.map((i) => i.id));
          events.push(`${f.name}: подбирает ${item(p.itemId).name}.`);
        } else {
          step.result = "Предмет недоступен";
          events.push(`${f.name}: предмет уже недоступен.`);
        }
      } else {
        if (m.action === "heavy") f.exposed = 2;
        strike(side, m, step);
      }
    } finally {
      finishStep(step, stepEventStart);
    }
    side = opposite(side);
  }
  if (g.enemy.hp <= 0) {
    g.phase = "victory";
    g.wins++;
    g.rewardOptions = rollRewards(g.player, g.enemy, random);
    g.reward = g.rewardOptions[0];
  } else if (g.player.hp <= 0) {
    g.phase = "defeat";
    loseSoulsOnDefeat(g);
    g.reward = null;
    g.rewardOptions = undefined;
  }
  g.log.unshift({
    replay: {
      first,
      playerInitiative: g.player.stats.reaction,
      enemyInitiative: g.enemy.stats.reaction,
      initial,
      steps,
    },
    reaction: true,
    round: g.round,
    playerDie: pd,
    enemyDie: ed,
    playerAction: order
      .map((id) => queues.player.find((q) => q.m.id === id)!.m.name)
      .join(" → "),
    enemyAction: plan.enemyOrder
      .map((id) => queues.enemy.find((q) => q.m.id === id)!.m.name)
      .join(" → "),
    events,
  });
  g.log = g.log.slice(0, 60);
  g.round++;
  delete g.roundPlan;
  return prepareRound(g, random);
}
