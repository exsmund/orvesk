export function soulWord(n: number) {
  const a = Math.abs(n) % 100,
    b = a % 10;
  return a >= 11 && a <= 14
    ? "душ"
    : b === 1
      ? "душа"
      : b >= 2 && b <= 4
        ? "души"
        : "душ";
}
