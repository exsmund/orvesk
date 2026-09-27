// Experimental rules only. No imports from or writes to the production engine.
export type Mode = "planning" | "improvisation";
export type Kind = "attack" | "guard" | "evade" | "rest" | "heal";
export const actions = [
  {
    id: "strike",
    name: "Удар",
    mark: "М",
    kind: "attack",
    cost: 1,
    power: 5,
    cooldown: 0,
    shape: [
      [0, 0],
      [1, 0],
    ],
    description: "5 урона на две клетки. Без восстановления.",
  },
  {
    id: "heavy",
    name: "Тяжёлый удар",
    mark: "Т",
    kind: "attack",
    cost: 2,
    power: 10,
    cooldown: 2,
    shape: [
      [0, 0],
      [1, 0],
      [0, 1],
    ],
    description: "10 урона. В планировании недоступен два следующих хода.",
  },
  {
    id: "thrust",
    name: "Выпад",
    mark: "В",
    kind: "attack",
    cost: 2,
    power: 6,
    cooldown: 1,
    shape: [[0, 0]],
    description:
      "6 урона в одной клетке. В планировании недоступен следующий ход.",
  },
  {
    id: "dodge",
    name: "Уворот",
    mark: "У",
    kind: "evade",
    cost: 2,
    power: 0,
    cooldown: 2,
    shape: [
      [0, 0],
      [1, 0],
      [2, 0],
    ],
    description:
      "Полностью защищает три клетки. В планировании недоступен два следующих хода.",
  },
  {
    id: "sidestep",
    name: "Шаг в сторону",
    mark: "Ш",
    kind: "evade",
    cost: 1,
    power: 0,
    cooldown: 1,
    shape: [[0, 0]],
    description:
      "Полностью защищает одну клетку. В планировании недоступен следующий ход.",
  },
  {
    id: "heal",
    name: "Перевязка",
    mark: "+",
    kind: "heal",
    cost: 2,
    power: 4,
    cooldown: 3,
    shape: [
      [0, 0],
      [0, 1],
    ],
    description:
      "Восстановить 4 здоровья после урона, если вы выжили. В планировании восстановление три хода.",
  },
  {
    id: "guard",
    name: "Блок",
    mark: "Б",
    kind: "guard",
    cost: 1,
    power: 0,
    cooldown: 0,
    shape: [
      [0, 0],
      [1, 0],
    ],
    description:
      "Снижает входящий урон на 75% в двух клетках. Всегда доступен.",
  },
  {
    id: "rest",
    name: "Передышка",
    mark: "О",
    kind: "rest",
    cost: 0,
    power: 2,
    cooldown: 0,
    shape: [[0, 0]],
    description:
      "Возвращает 2 энергии после хода. Не защищает. Всегда доступна.",
  },
] as const;
export type Action = (typeof actions)[number];
export type Placement = { id: string; cells: number[] };
export type State = {
  round: number;
  hp: number;
  wolf: number;
  energy: number;
  cooldowns: Record<string, number>;
  log: string[];
  result?: "win" | "loss" | "draw";
};
export function initial(): State {
  return { round: 1, hp: 30, wolf: 40, energy: 4, cooldowns: {}, log: [] };
}
export function random(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}
export function intent(round: number, seed: number) {
  const phase = (round - 1) % 3;
  const row = Math.floor(random(seed ^ Math.imul(round, 2654435761))() * 3);
  const pressure = Math.floor((round - 1) / 3);
  return {
    name: ["Охота", "Прыжок", "Восстановление"][phase],
    cells:
      phase === 2
        ? []
        : phase === 1
          ? [row * 3, row * 3 + 1, row * 3 + 2]
          : [row * 3, row * 3 + 1],
    damage: phase === 2 ? 0 : (phase === 1 ? 12 : 6) + pressure * 2,
    vulnerable: phase === 2,
  };
}
export function hand(seed: number, round: number, redraw = 0): string[] {
  const rng = random(seed + round * 7919 + redraw * 104729);
  const pool: string[] = actions
    .filter((a) => a.id !== "guard" && a.id !== "rest")
    .map((a) => a.id);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return [...pool.slice(0, 4), "guard", "rest"];
}
export function shapeCells(
  action: Action,
  rotation: number,
  origin: number,
): number[] | null {
  let points: number[][] = action.shape.map((p) => [...p]);
  for (let r = 0; r < rotation % 4; r++)
    points = points.map(([x, y]) => [-y, x]);
  const minX = Math.min(...points.map((p) => p[0])),
    minY = Math.min(...points.map((p) => p[1]));
  points = points.map(([x, y]) => [
    x - minX + (origin % 3),
    y - minY + Math.floor(origin / 3),
  ]);
  return points.some(([x, y]) => x > 2 || y > 2)
    ? null
    : points.map(([x, y]) => y * 3 + x);
}
export function cost(placements: Placement[]) {
  return placements.reduce(
    (sum, p) => sum + actions.find((a) => a.id === p.id)!.cost,
    0,
  );
}
export function resolve(
  state: State,
  placements: Placement[],
  mode: Mode,
  seed: number,
  rerolled = false,
): State {
  if (state.result) return state;
  const ids = new Set<string>(),
    cells = new Set<number>();
  for (const p of placements) {
    const a = actions.find((a) => a.id === p.id);
    if (
      !a ||
      ids.has(p.id) ||
      (mode === "planning" && state.cooldowns[p.id] > 0) ||
      (mode === "improvisation" &&
        !hand(seed, state.round, Number(rerolled)).includes(p.id)) ||
      ![0, 1, 2, 3].some((r) =>
        Array.from({ length: 9 }, (_, n) => shapeCells(a, r, n)).some(
          (c) =>
            c &&
            c.length === p.cells.length &&
            c.every((n) => p.cells.includes(n)),
        ),
      ) ||
      p.cells.some((n) => cells.has(n))
    )
      throw new Error("Недопустимая раскладка");
    ids.add(p.id);
    p.cells.forEach((n) => cells.add(n));
  }
  if (cost(placements) + Number(rerolled) > state.energy)
    throw new Error("Недостаточно энергии");
  const wolf = intent(state.round, seed);
  let incoming = 0,
    outgoing = 0,
    recovery = 0,
    healing = 0;
  for (const n of wolf.cells) {
    const p = placements.find((p) => p.cells.includes(n));
    const a = actions.find((a) => a.id === p?.id);
    incoming +=
      (wolf.damage / wolf.cells.length) *
      (a?.kind === "evade"
        ? 0
        : a?.kind === "guard"
          ? 0.25
          : a?.kind === "attack"
            ? 0.5
            : 1);
  }
  for (const p of placements) {
    const a = actions.find((a) => a.id === p.id)!;
    if (a.kind === "attack")
      outgoing += p.cells.reduce(
        (sum, n) =>
          sum +
          (a.power / p.cells.length) *
            (wolf.cells.includes(n) ? 0.5 : 1) *
            (wolf.vulnerable ? 2 : 1),
        0,
      );
    if (a.kind === "rest") recovery += a.power;
    if (a.kind === "heal") healing += a.power;
  }
  const round = (n: number) => Math.round(n * 10) / 10;
  incoming = round(incoming);
  outgoing = round(outgoing);
  const hp = round(Math.max(0, state.hp - incoming)),
    enemyHp = round(Math.max(0, state.wolf - outgoing));
  const cooldowns = Object.fromEntries(
    Object.entries(state.cooldowns).map(([id, n]) => [id, Math.max(0, n - 1)]),
  );
  if (mode === "planning")
    placements.forEach((p) => {
      cooldowns[p.id] = actions.find((a) => a.id === p.id)!.cooldown;
    });
  return {
    round: state.round + 1,
    hp: hp > 0 ? Math.min(30, hp + healing) : 0,
    wolf: enemyHp,
    energy: Math.min(
      5,
      state.energy - cost(placements) - Number(rerolled) + 1 + recovery,
    ),
    cooldowns,
    result:
      hp <= 0 && enemyHp <= 0
        ? "draw"
        : hp <= 0
          ? "loss"
          : enemyHp <= 0
            ? "win"
            : undefined,
    log: [
      `Ход ${state.round} · ${wolf.name}: вы −${incoming}, волк −${outgoing} здоровья.${wolf.vulnerable ? " Урон по волку удвоен." : ""}${healing && hp > 0 ? ` Лечение +${Math.min(30 - hp, healing)}.` : ""} ${recovery ? "Передышка +2 энергии; " : ""}за ход +1 энергии (максимум 5).`,
      ...state.log,
    ],
  };
}
