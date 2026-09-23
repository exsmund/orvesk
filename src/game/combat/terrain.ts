export interface RockRegion {
  cells: number[];
  x: number;
  y: number;
  width: number;
  height: number;
  texture: string;
}

/** Side-connected rock regions; diagonals and the ends of different rows never join. */
export function rockRegions(
  blocked: readonly number[],
  unlocked: readonly (number | undefined)[] = [],
): RockRegion[] {
  const remaining = new Set(
    blocked.filter(
      (n) => Number.isInteger(n) && n >= 0 && n < 9 && !unlocked.includes(n),
    ),
  );
  const regions: RockRegion[] = [];
  while (remaining.size) {
    const first = remaining.values().next().value!,
      cells = [first];
    remaining.delete(first);
    for (let i = 0; i < cells.length; i++) {
      const n = cells[i],
        x = n % 3,
        y = Math.floor(n / 3);
      for (const [dx, dy] of [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ]) {
        const nx = x + dx,
          ny = y + dy,
          next = ny * 3 + nx;
        if (nx >= 0 && nx < 3 && ny >= 0 && ny < 3 && remaining.delete(next))
          cells.push(next);
      }
    }
    const xs = cells.map((n) => n % 3),
      ys = cells.map((n) => Math.floor(n / 3));
    const x = Math.min(...xs),
      y = Math.min(...ys),
      width = Math.max(...xs) - x + 1,
      height = Math.max(...ys) - y + 1;
    const texture =
      width > height
        ? "rock-horizontal.png"
        : height > width
          ? "rock-vertical.png"
          : "rock.png";
    regions.push({ cells, x, y, width, height, texture });
  }
  return regions;
}
