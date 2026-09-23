import { skill } from "../skills/skills";
import type { Fighter, SpecialCell } from "../types";
export const ARCHETYPES = {
  warden: {
    name: "Страж",
    description:
      "Блок, не встретивший ни одной атаки, восстанавливает 1 стойки. Предпочитает защиту.",
  },
  duelist: {
    name: "Дуэлянт",
    description:
      "Два обычных выпада по одной клетке вместо большой фигуры. Предпочитает свободные места.",
  },
  crusher: {
    name: "Крушитель",
    description:
      "В сильной атаке 60% урона сосредоточено в первой отмеченной клетке. При попадании снимает ещё 1 стойки.",
  },
  ghost: {
    name: "Призрак",
    description:
      "Атаки проходят сквозь скалы. При столкновении оружия получает 75% урона вместо 50%.",
  },
} as const;
export const SPECIAL_CELLS = {
  pierce: {
    symbol: "◆",
    name: "Брешь",
    description:
      "Атака через эту клетку игнорирует плоскую броню на прошедшей доле урона этой клетки. Блок и сопротивления действуют.",
  },
  rally: {
    symbol: "✚",
    name: "Опора",
    description: "Блок на этой клетке восстанавливает 2 стойки при подсчёте.",
  },
  surge: {
    symbol: "✦",
    name: "Напор",
    description:
      "Атака получает +25% исходного урона в этой клетке и соседних по стороне клетках той же фигуры.",
  },
} as const;
export const sideAdjacent = (a: number, b: number) =>
  Math.abs((a % 3) - (b % 3)) +
    Math.abs(Math.floor(a / 3) - Math.floor(b / 3)) ===
  1;
export function specialHint(s?: SpecialCell) {
  return s
    ? `${SPECIAL_CELLS[s.kind].symbol} ${SPECIAL_CELLS[s.kind].name}: ${SPECIAL_CELLS[s.kind].description}`
    : "";
}
export const strongCooldowns = (f: Fighter) =>
  Object.entries(f.cooldowns ?? {})
    .filter(([, n]) => n > 0)
    .map(([id]) =>
      id.startsWith("skill:")
        ? (skill(id.slice(6))?.name ?? "Навык")
        : id === "fortify"
          ? "Усиленный блок"
          : "Сильный удар",
    );
