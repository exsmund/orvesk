export interface ResourceBarProps {
  value: number;
  change?: number;
  max: number;
  kind: "health" | "stamina";
  className?: string;
  compact?: boolean;
  effect?: "plasma" | "smoke" | "flame";
  label?: string;
}
export const displayValue = (value: number) =>
  value.toLocaleString("ru-RU", { maximumFractionDigits: 1 });
export const finite = (n: number) => (Number.isFinite(n) ? n : 0);
