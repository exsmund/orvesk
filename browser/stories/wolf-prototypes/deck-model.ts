// Isolated experiment: no production battle rules or persistent saves.
import { random } from "./model";
import {
  damageAfterArmor,
  defaultDeckArmor,
  validArmor,
  type DeckArmor,
} from "./deck-armor";
import {
  balance,
  defaultDeckStats,
  deckMaxHealth,
  validDeckStats,
  healthDamageScaling,
  type DeckStats,
  type DeckStat,
  type DeckFighterStats,
} from "./deck-progression";
export const deckActions = {
  strike: {
    name: "Удар",
    kind: "attack",
    stamina: 2,
    healthDamagePerCell: 3,
    shape: [
      [0, 0],
      [1, 0],
    ],
    description: "Стоимость: 2 выносливости за всю фигуру.",
  },
  heavy: {
    name: "Тяжёлый удар",
    kind: "attack",
    stamina: 4,
    healthDamagePerCell: 3,
    shape: [
      [0, 0],
      [1, 0],
      [0, 1],
    ],
    description: "Стоимость: 4 выносливости за всю фигуру.",
  },
  thrust: {
    name: "Выпад",
    kind: "attack",
    stamina: 3,
    healthDamagePerCell: 6,
    shape: [[0, 0]],
    description: "Стоимость: 3 выносливости за всю фигуру.",
  },
  guard: {
    name: "Блок",
    kind: "guard",
    stamina: 0,
    healthDamagePerCell: 0,
    shape: [
      [0, 0],
      [1, 0],
    ],
    description:
      "Полный блок здоровья. Каждая перекрытая клетка атаки тратит 1 выносливость. На весь блок должно хватать выносливости, иначе ход нельзя завершить.",
  },
  dodge: {
    name: "Уклонение",
    kind: "dodge",
    stamina: 2,
    healthDamagePerCell: 0,
    shape: [
      [0, 0],
      [1, 0],
      [0, 1],
    ],
    description:
      "2 выносливости заранее. Полная защита от обоих типов урона в трёх клетках.",
  },
  parry: {
    name: "Парирование",
    kind: "parry",
    stamina: 2,
    healthDamagePerCell: 2,
    shape: [[0, 0]],
    description:
      "2 выносливости заранее. Блокирует оба типа урона и наносит ответный урон только при попадании атаки.",
  },
} as const;
export const playerStaminaDamagePerCell = {
  strike: 0,
  heavy: 1,
  thrust: 0,
  guard: 0,
  dodge: 0,
  parry: 0,
};
export function damageFormula(perCell: number, cells: number) {
  return `${Number.isInteger(perCell) ? perCell : perCell.toLocaleString("ru-RU", { maximumFractionDigits: 2 })}×${cells}`;
}
export type DeckActionId = keyof typeof deckActions;
export function healthDamagePerCell(action: DeckActionId, stats: DeckStats) {
  const scaling =
    healthDamageScaling[action as keyof typeof healthDamageScaling];
  return (
    deckActions[action].healthDamagePerCell +
    (scaling
      ? (stats[scaling.stat as DeckStat] - balance.baseStat) * scaling.perPoint
      : 0)
  );
}
export function healthDamageExplanation(
  action: DeckActionId,
  stats: DeckStats,
) {
  const scaling =
    healthDamageScaling[action as keyof typeof healthDamageScaling];
  if (!scaling) return "Урона здоровью нет.";
  const stat = scaling.stat as DeckStat;
  return `За клетку: ${deckActions[action].healthDamagePerCell} + ${scaling.perPoint} × (${balance.stats[stat]} ${stats[stat]} − ${balance.baseStat}) = ${healthDamagePerCell(action, stats)}`;
}
export type Card = { uid: string; action: DeckActionId };
export type DeckPlacement = { uid: string; cells: number[] };
export function shuffled(cards: Card[], seed: number) {
  const result = [...cards],
    rng = random(seed);
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function cardCells(
  action: DeckActionId,
  rotation: number,
  origin: number,
) {
  let points: number[][] = deckActions[action].shape.map((p) => [...p]);
  for (let i = 0; i < rotation % 4; i++)
    points = points.map(([x, y]) => [-y, x]);
  const left = Math.min(...points.map((p) => p[0])),
    top = Math.min(...points.map((p) => p[1]));
  const shifted = points.map(([x, y]) => [
    x - left + (origin % 3),
    y - top + Math.floor(origin / 3),
  ]);
  return shifted.some(([x, y]) => x < 0 || y < 0 || x > 2 || y > 2)
    ? null
    : shifted.map(([x, y]) => y * 3 + x);
}

export type DeckState = {
  stats: DeckFighterStats;
  armor: DeckArmor;
  round: number;
  exchanged: boolean;
  hp: number;
  wolf: number;
  stamina: number;
  wolfStamina: number;
  wolfDeck: { hand: Card[]; draw: Card[]; discard: Card[]; shuffles: number };
  hand: Card[];
  draw: Card[];
  discard: Card[];
  seed: number;
  shuffles: number;
  log: string[];
  result?: "win" | "loss" | "draw";
};
export const MAX_STAMINA = 8;
export const STAMINA_PER_TURN = 2;
export const wolfNames: Record<DeckActionId, string> = {
  strike: "Удар лапой",
  heavy: "Прыжок",
  thrust: "Укус",
  guard: "Защита",
  dodge: "Отпрыгивание",
  parry: "Ответ",
};
export const wolfStaminaDamagePerCell: Record<DeckActionId, number> = {
  strike: 0,
  heavy: 0,
  thrust: 2,
  guard: 0,
  dodge: 0,
  parry: 0,
};
export function deckWolfIntent(state: DeckState) {
  const rng = random(state.seed + state.round * 3571);
  const placements: DeckPlacement[] = [];
  let remaining = state.wolfStamina;
  // Choose from the wolf's hand only, independently of the player's draft.
  const cards = shuffled(state.wolfDeck.hand, state.seed + state.round * 97);
  if (remaining >= 2)
    for (const card of cards) {
      const action = deckActions[card.action];
      const reserved =
        action.kind === "guard" ? action.shape.length : action.stamina;
      if (reserved > remaining) continue;
      const candidates: number[][] = [];
      for (let r = 0; r < 4; r++)
        for (let n = 0; n < 9; n++) {
          const cells = cardCells(card.action, r, n);
          if (
            cells &&
            !cells.some((n) => placements.some((p) => p.cells.includes(n)))
          )
            candidates.push(cells);
        }
      if (!candidates.length) continue;
      placements.push({
        uid: card.uid,
        cells: candidates[Math.floor(rng() * candidates.length)],
      });
      remaining -= reserved;
    }
  const actions = placements.map((p) => ({
    ...p,
    action: state.wolfDeck.hand.find((c) => c.uid === p.uid)!.action,
  }));
  const cellDamage = Array.from({ length: 9 }, (_, n) => {
    const p = actions.find((p) => p.cells.includes(n));
    return p ? healthDamagePerCell(p.action, state.stats.wolf) : 0;
  });
  return {
    placements,
    actions,
    cellDamage,
    cellStaminaDamage: Array.from({ length: 9 }, (_, n) => {
      const p = actions.find((p) => p.cells.includes(n));
      return p ? wolfStaminaDamagePerCell[p.action] : 0;
    }),
    name: actions.length
      ? actions.map((p) => wolfNames[p.action]).join(" + ")
      : "Пропуск хода",
    cells: actions.flatMap((p) => p.cells),
    damage: cellDamage.reduce<number>((a, b) => a + b, 0),
    cost: actions.reduce((sum, p) => sum + deckActions[p.action].stamina, 0),
    reservedCost: state.wolfStamina - remaining,
    skipped: placements.length === 0,
  };
}
function refillWolf(state: DeckState): DeckState {
  const filled = refill({
    ...state,
    ...state.wolfDeck,
    seed: state.seed + 104729,
  });
  return {
    ...state,
    wolfDeck: {
      hand: filled.hand,
      draw: filled.draw,
      discard: filled.discard,
      shuffles: filled.shuffles,
    },
  };
}
export function refill(state: DeckState): DeckState {
  const next = {
    ...state,
    hand: [...state.hand],
    draw: [...state.draw],
    discard: [...state.discard],
  };
  while (next.hand.length < 4) {
    if (!next.draw.length) {
      if (!next.discard.length) break;
      next.shuffles++;
      next.draw = shuffled(next.discard, next.seed + next.shuffles * 7919);
      next.discard = [];
    }
    next.hand.push(next.draw.shift()!);
  }
  return next;
}
export const composition: DeckActionId[] = [
  "strike",
  "strike",
  "strike",
  "heavy",
  "heavy",
  "thrust",
  "thrust",
  "guard",
  "guard",
  "guard",
];
export const playerComposition: DeckActionId[] = [
  "strike",
  "strike",
  "strike",
  "heavy",
  "heavy",
  "thrust",
  "thrust",
  "guard",
  "dodge",
  "parry",
];
export function initialDeck(
  seed = 42,
  stats: DeckFighterStats = {
    player: defaultDeckStats,
    wolf: defaultDeckStats,
  },
  armor: DeckArmor = defaultDeckArmor,
): DeckState {
  if (!validArmor(armor.player) || !validArmor(armor.wolf))
    throw new Error("Броня должна быть целым числом от 0 до 99.");
  if (!validDeckStats(stats.player) || !validDeckStats(stats.wolf))
    throw new Error(
      `Характеристики должны быть целыми числами от ${balance.baseStat} до ${balance.maxStat}.`,
    );
  return refillWolf(
    refill({
      stats: { player: { ...stats.player }, wolf: { ...stats.wolf } },
      armor: { ...armor },
      round: 1,
      exchanged: false,
      hp: deckMaxHealth(stats.player),
      wolf: deckMaxHealth(stats.wolf),
      stamina: MAX_STAMINA,
      wolfStamina: MAX_STAMINA,
      wolfDeck: {
        hand: [],
        draw: shuffled(
          composition.map((action, i) => ({ uid: `wolf-${i}`, action })),
          seed + 104729,
        ),
        discard: [],
        shuffles: 0,
      },
      hand: [],
      draw: shuffled(
        playerComposition.map((action, i) => ({ uid: `card-${i}`, action })),
        seed,
      ),
      discard: [],
      seed,
      shuffles: 0,
      log: [],
    }),
  );
}
export function exchangeCard(
  state: DeckState,
  uid: string,
  placements: DeckPlacement[] = [],
): DeckState {
  if (state.result || state.exchanged)
    throw new Error("Замена уже использована или бой завершён.");
  const card = state.hand.find((c) => c.uid === uid);
  if (!card || placements.some((p) => p.uid === uid))
    throw new Error("Выберите карту вне поля.");
  if (
    state.stamina < 1 ||
    calculateDeck(state, placements).shortage > 0 ||
    state.stamina -
      calculateDeck(state, placements).attackCost -
      calculateDeck(state, placements).blockCost <
      1
  )
    throw new Error("Для замены нужна 1 свободная выносливость.");
  // Draw before discarding so the same instance cannot be immediately redrawn.
  const next = refill({
    ...state,
    hand: state.hand.filter((c) => c.uid !== uid),
    stamina: state.stamina - 1,
    exchanged: true,
  });
  return { ...next, discard: [...next.discard, card] };
}
export function placementError(
  state: DeckState,
  placements: DeckPlacement[],
): string | undefined {
  const seen = new Set<string>(),
    occupied = new Set<number>();
  for (const p of placements) {
    const card = state.hand.find((c) => c.uid === p.uid);
    if (!card || seen.has(p.uid))
      return "Этой карты нет в наборе или она уже использована.";
    if (
      ![0, 1, 2, 3].some((r) =>
        Array.from({ length: 9 }, (_, n) => cardCells(card.action, r, n)).some(
          (c) =>
            c &&
            c.length === p.cells.length &&
            c.every((n) => p.cells.includes(n)),
        ),
      ) ||
      p.cells.some((n) => occupied.has(n))
    )
      return "Фигура не помещается или пересекается с вашей фигурой.";
    seen.add(p.uid);
    p.cells.forEach((n) => occupied.add(n));
  }
  return undefined;
}
export function calculateDeck(
  state: DeckState,
  placements: DeckPlacement[],
  plan = deckWolfIntent(state),
) {
  const error = placementError(state, placements);
  if (error) throw new Error(error);
  const wolf = plan;
  const attackCost = placements.reduce(
    (sum, p) =>
      sum +
      deckActions[state.hand.find((c) => c.uid === p.uid)!.action].stamina,
    0,
  );
  let stamina = state.stamina - attackCost,
    outgoingStamina = 0,
    incomingStamina = 0,
    incoming = 0,
    outgoing = 0,
    blocked = 0;
  let wolfStamina = state.wolfStamina - wolf.cost,
    wolfBlocked = 0;
  for (let n = 0; n < 9; n++) {
    const own = placements.find((p) => p.cells.includes(n));
    const ownId = own
      ? state.hand.find((c) => c.uid === own.uid)!.action
      : undefined;
    const ownAction = ownId ? deckActions[ownId] : undefined;
    const ownHealthDamage = ownId
      ? healthDamagePerCell(ownId, state.stats.player)
      : 0;
    const enemy = wolf.actions.find((p) => p.cells.includes(n));
    const enemyAction = enemy ? deckActions[enemy.action] : undefined;
    let hit = wolf.cellDamage[n];
    let staminaHit = wolf.cellStaminaDamage[n];
    if ((hit || staminaHit) && ownAction?.kind === "guard") {
      stamina--;
      blocked++;
      hit = 0;
      staminaHit = 0;
    } else if (ownAction?.kind === "attack") {
      hit *= 0.5;
      staminaHit *= 0.5;
    }
    let counter = 0;
    if (
      (hit || staminaHit) &&
      (ownAction?.kind === "dodge" || ownAction?.kind === "parry")
    ) {
      counter = ownAction.kind === "parry" ? ownHealthDamage : 0;
      hit = 0;
      staminaHit = 0;
    }
    incomingStamina += staminaHit;
    incoming += hit;
    let damage = ownAction?.kind === "attack" ? ownHealthDamage : 0;
    let staminaDamage = own
      ? playerStaminaDamagePerCell[
          state.hand.find((c) => c.uid === own.uid)!.action
        ]
      : 0;
    if ((damage || staminaDamage) && enemyAction?.kind === "guard") {
      wolfStamina--;
      wolfBlocked++;
      damage = 0;
      staminaDamage = 0;
    } else if (enemyAction?.kind === "attack") {
      damage *= 0.5;
      staminaDamage *= 0.5;
    }
    outgoingStamina += staminaDamage;
    outgoing += damage + counter;
  }
  const skipped = placements.length === 0;
  // Mitigate the total health damage after cell interactions, including counters.
  // Round total damage once, never per cell or for stamina damage.
  const incomingAfterArmor = damageAfterArmor(incoming, state.armor.player);
  const outgoingAfterArmor = damageAfterArmor(outgoing, state.armor.wolf);
  const incomingDamage = Math.min(
    state.hp,
    Math.round(incomingAfterArmor * 10) / 10,
  );
  const outgoingDamage = Math.min(
    state.wolf,
    Math.round(outgoingAfterArmor * 10) / 10,
  );
  // Clean up floating-point subtraction; both operands already have one decimal.
  const hp = Math.max(0, Math.round((state.hp - incomingDamage) * 10) / 10),
    enemy = Math.max(0, Math.round((state.wolf - outgoingDamage) * 10) / 10);
  return {
    hp,
    wolf: enemy,
    stamina:
      skipped && hp > 0 ? MAX_STAMINA : Math.max(0, stamina - incomingStamina),
    incomingStamina,
    outgoingStamina,
    exhausted: incomingStamina > 0 && stamina - incomingStamina <= 0,
    wolfExhausted: outgoingStamina > 0 && wolfStamina - outgoingStamina <= 0,
    wolfStamina:
      wolf.skipped && enemy > 0
        ? MAX_STAMINA
        : Math.max(0, wolfStamina - outgoingStamina),
    wolfCost: wolf.cost + wolfBlocked,
    attackCost,
    blockCost: blocked,
    shortage: Math.max(0, -stamina),
    incoming: Math.round((state.hp - hp) * 10) / 10,
    outgoing: Math.round((state.wolf - enemy) * 10) / 10,
    incomingAbsorbed: incoming - incomingAfterArmor,
    outgoingAbsorbed: outgoing - outgoingAfterArmor,
    skipped,
  };
}
export function resolveDeck(
  state: DeckState,
  placements: DeckPlacement[],
  plan = deckWolfIntent(state),
): DeckState {
  if (state.result) return state;
  const result = calculateDeck(state, placements, plan);
  if (result.shortage > 0)
    throw new Error(
      `Не хватает ${result.shortage} выносливости. Уберите или переместите фигуру.`,
    );
  const used = new Set(placements.map((p) => p.uid));
  const wolfUsed = new Set(plan.placements.map((p) => p.uid));
  const next: DeckState = {
    ...state,
    round: state.round + 1,
    exchanged: false,
    hp: result.hp,
    wolf: result.wolf,
    stamina: result.stamina,
    wolfStamina: result.wolfStamina,
    wolfDeck: {
      ...state.wolfDeck,
      hand: state.wolfDeck.hand.filter((c) => !wolfUsed.has(c.uid)),
      discard: [
        ...state.wolfDeck.discard,
        ...state.wolfDeck.hand.filter((c) => wolfUsed.has(c.uid)),
      ],
    },
    hand: state.hand.filter((c) => !used.has(c.uid)),
    discard: [...state.discard, ...state.hand.filter((c) => used.has(c.uid))],
    result:
      result.hp <= 0 && result.wolf <= 0
        ? "draw"
        : result.hp <= 0
          ? "loss"
          : result.wolf <= 0
            ? "win"
            : undefined,
    log: [
      `Ход ${state.round} · ${plan.name}: вы −${result.incoming}, волк −${result.outgoing} здоровья. Выносливость: атаки −${result.attackCost}, блоки −${result.blockCost}, урон выносливости −${result.incomingStamina}; волк −${result.wolfCost}, урон его выносливости −${result.outgoingStamina}.${result.skipped && result.hp > 0 ? " Пропуск хода: выносливость восстановлена полностью." : ""}${result.exhausted ? " Истощение героя: следующий ход без +2." : ""}${result.wolfExhausted ? " Истощение волка: следующий ход без +2." : ""} Разыграно карт: ${used.size}.`,
      ...state.log,
    ],
  };
  if (next.result) return next;
  return refillWolf(
    refill({
      ...next,
      stamina: Math.min(
        MAX_STAMINA,
        next.stamina + (result.exhausted ? 0 : STAMINA_PER_TURN),
      ),
      wolfStamina: Math.min(
        MAX_STAMINA,
        next.wolfStamina + (result.wolfExhausted ? 0 : STAMINA_PER_TURN),
      ),
    }),
  );
}

export function playerLeads(state: DeckState) {
  const first = random(Math.imul(state.seed + 811, 2654435761))() < 0.5;
  return state.round % 2 === 1 ? first : !first;
}
export function reservedPlayerCost(
  state: DeckState,
  placements: DeckPlacement[],
) {
  return placements.reduce((sum, p) => {
    const a = deckActions[state.hand.find((c) => c.uid === p.uid)!.action];
    return sum + a.stamina + (a.kind === "guard" ? p.cells.length : 0);
  }, 0);
}
export function hiddenWolfPlan(
  state: DeckState,
): ReturnType<typeof deckWolfIntent> {
  return {
    ...deckWolfIntent(state),
    placements: [],
    actions: [],
    cells: [],
    cellDamage: Array(9).fill(0),
    cellStaminaDamage: Array(9).fill(0),
    cost: 0,
    reservedCost: 0,
    damage: 0,
    skipped: false,
    name: "Ответ скрыт",
  };
}
export function wolfResponse(state: DeckState, placements: DeckPlacement[]) {
  const error = placementError(state, placements);
  if (error) throw new Error(error);
  if (reservedPlayerCost(state, placements) > state.stamina)
    throw new Error("Не хватает выносливости на резерв защиты.");
  // Sample legal plans using only the current wolf hand and committed board.
  const choices = Array.from({ length: 16 }, (_, i) => {
    const plan = deckWolfIntent({ ...state, seed: state.seed + i * 1741 });
    const r = calculateDeck(state, placements, plan);
    return {
      plan,
      score:
        r.incoming - r.outgoing + 0.5 * (r.incomingStamina - r.outgoingStamina),
    };
  }).sort((a, b) => b.score - a.score);
  return choices[
    Math.floor(
      random(state.seed + state.round * 1237)() * Math.min(3, choices.length),
    )
  ].plan;
}
