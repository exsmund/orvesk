export function soulWord(n: number) {
  const a = Math.abs(n) % 100,
    b = a % 10;
  return a >= 11 && a <= 14
    ? "осколков"
    : b === 1
      ? "осколок"
      : b >= 2 && b <= 4
        ? "осколка"
        : "осколков";
}
