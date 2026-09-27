import { Text } from "@/shared/ui/Text";
import "@/features/equipment/ItemInspection/Delta.css";

import { type ComparisonRow } from "@/game/equipment/item-comparison";

import { number } from "@/features/equipment/ItemInspection/model";
export function Delta({ row }: { row: ComparisonRow }) {
  const delta = row.candidate - row.current;
  const tone =
    !delta || row.neutral
      ? "same"
      : (row.lowerIsBetter ? delta < 0 : delta > 0)
        ? "better"
        : "worse";
  return (
    <Text as="span" className={`item-delta ${tone}`}>
      {delta
        ? `${delta > 0 ? "+" : "−"}${number(Math.abs(delta))}${row.unit ? " п.п." : ""}`
        : "—"}
    </Text>
  );
}
