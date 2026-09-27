import type { BoardModifiers, Cell, Maneuver, Placement } from "@/game/types";
const single: Cell[] = [[0, 0]];
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
