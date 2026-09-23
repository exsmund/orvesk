import { item } from "../equipment/catalog";
import type {
  BoardModifiers,
  Cell,
  Fighter,
  Maneuver,
  Placement,
} from "../types";
export const MAX_ACTIONS = 4;
export const hasFreeHand = (f: Fighter) =>
  (f.gear.weapon && f.gear.weapon !== "fist"
    ? (item(f.gear.weapon).hands ?? 1)
    : 0) +
    (f.gear.shield ? 1 : 0) <
  2;
const single: Cell[] = [[0, 0]],
  line: Cell[] = [
    [0, 0],
    [1, 0],
  ],
  corner: Cell[] = [
    [0, 0],
    [1, 0],
    [1, 1],
  ],
  square: Cell[] = [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ];
export function maneuvers(f: Fighter): Maneuver[] {
  if (f.prone)
    return [
      {
        id: "stand",
        name: "Подъём",
        action: "stand",
        shape: single,
        description: "Восстановить стойку. Этот розыгрыш уйдёт на подъём.",
      },
    ];
  const w = item(f.gear.weapon),
    light = ["fist", "dagger", "frost-dagger"].includes(w.id);
  const attacks: Maneuver[] = [
    {
      id: "strike-1",
      name: light ? "Удар I" : "Удар",
      action: "attack",
      shape: light
        ? single
        : w.id === "spear"
          ? [
              [0, 0],
              [1, 0],
              [2, 0],
            ]
          : line,
      weaponId: w.id,
      description:
        "Обычный удар оружием. Дальность проверяется в момент исполнения.",
    },
  ];
  if (light) attacks.push({ ...attacks[0], id: "strike-2", name: "Удар II" });
  attacks.push({
    id: "heavy",
    name: "Сильный удар",
    action: "heavy",
    shape:
      w.hands === 2
        ? [
            [0, 0],
            [1, 0],
            [2, 0],
            [1, 1],
          ]
        : corner,
    weaponId: w.id,
    description:
      "Урон ×1,5. Раскрывает вас; проще парировать. Пинок может сорвать ближайший замах.",
  });
  if (w.id !== "fist" && hasFreeHand(f))
    attacks.push({
      id: "fist",
      name: "Кулак",
      action: "attack",
      shape: single,
      weaponId: "fist",
      description: "Короткий удар кулаком; оружие остаётся надетым.",
    });
  return [
    ...attacks,
    {
      id: "advance",
      name: "Шаг вперёд",
      action: "advance",
      shape: single,
      description:
        "Сблизиться перед атакой. При потере равновесия шаг пропускается.",
    },
    {
      id: "retreat",
      name: "Шаг назад",
      action: "retreat",
      shape: single,
      description:
        "Увеличить дистанцию. При потере равновесия шаг пропускается.",
    },
    {
      id: "guard",
      name: f.gear.shield ? "Блок щитом" : "Блок руками",
      action: "block",
      shieldId: f.gear.shield ?? undefined,
      shape: f.gear.shield && f.gear.shield !== "buckler" ? square : line,
      guardHits: f.gear.shield && f.gear.shield !== "buckler" ? 2 : 1,
      description:
        f.gear.shield && f.gear.shield !== "buckler"
          ? "Защищает от двух следующих входящих ударов."
          : "Защищает от одного следующего входящего удара.",
    },
    {
      id: "parry",
      name: "Парирование",
      action: "parry",
      shape: line,
      weaponId: w.id,
      description:
        "До следующего своего действия: парировать один удар и ответить рипостом. Не защищает от пинка и щита.",
    },
    {
      id: "kick",
      name: "Пинок",
      action: "kick",
      shape: line,
      description:
        "−3 стойки при контакте. Срывает следующее действие врага, только если это сильная атака.",
    },
    ...(f.gear.shield
      ? [
          {
            id: "shield",
            name: "Толчок щитом",
            action: "shield" as const,
            shieldId: f.gear.shield,
            shape: line,
            description: "−2 стойки, урон и отталкивание при попадании.",
          },
        ]
      : []),
    {
      id: "rest",
      name: "Передышка",
      action: "rest",
      shape: single,
      description: "Восстановить 2 устойчивости.",
    },
    {
      id: "equip",
      name: "Сменить предмет",
      action: "equip",
      shape: line,
      description:
        "Подобрать выбранный предмет. Приёмы нового оружия появятся со следующего розыгрыша.",
    },
  ];
}
export function cells(shape: Cell[], rotation: number, x = 0, y = 0): Cell[] {
  let result = shape.map(([a, b]) => [a, b] as Cell);
  for (let n = 0; n < rotation; n++) result = result.map(([a, b]) => [-b, a]);
  const minX = Math.min(...result.map((c) => c[0])),
    minY = Math.min(...result.map((c) => c[1]));
  return result.map(([a, b]) => [a - minX + x, b - minY + y]);
}
export function placementCells(
  m: Maneuver,
  p: Placement,
  mod: BoardModifiers,
): number[] {
  return cells(
    mod.compressed === p.id ? single : m.shape,
    p.rotation,
    p.x,
    p.y,
  ).map(([x, y]) => (x < 0 || x > 2 || y < 0 || y > 2 ? -1 : y * 3 + x));
}
export function canPlace(
  m: Maneuver,
  p: Placement,
  blocked: number[],
  occupied: number[],
  mod: BoardModifiers = {},
) {
  const points = placementCells(m, p, mod);
  return points.every(
    (i) =>
      i >= 0 &&
      (!blocked.includes(i) ||
        i === mod.unlocked ||
        m.ignoreBlocked === true) &&
      !occupied.includes(i),
  );
}
export function possiblePlacements(
  m: Maneuver,
  blocked: number[],
  occupied: number[] = [],
  mod: BoardModifiers = {},
): Placement[] {
  const all: Placement[] = [];
  for (let rotation = 0; rotation < 4; rotation++)
    for (let y = 0; y < 3; y++)
      for (let x = 0; x < 3; x++) {
        const p = { id: m.id, x, y, rotation };
        if (canPlace(m, p, blocked, occupied, mod)) all.push(p);
      }
  return all;
}
export function boardFor(f: Fighter, random: () => number): number[] {
  const primary = maneuvers(f)[0];
  for (let attempt = 0; attempt < 40; attempt++) {
    const shuffled = Array.from({ length: 9 }, (_, i) => i);
    for (let i = 8; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const blocked = shuffled.slice(0, 1 + Math.floor(random() * 3));
    if (possiblePlacements(primary, blocked).length)
      return blocked.sort((a, b) => a - b);
  }
  return [];
}
