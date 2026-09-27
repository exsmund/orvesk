import { Text } from "@/shared/ui/Text";
import "@/features/combat/ActionFigure/ActionFigure.css";
import { cells } from "@/game/combat/board";
import type { Maneuver } from "@/game/types";

import { formatDamage } from "@/game/combat/battle-feedback";
import { distributeDamage } from "@/game/combat/clash-damage";
import { ActionSource } from "@/features/combat/ActionSource/ActionSource";
export function ActionFigure({
  m,
  rotation = 0,
  compressed = false,
  damage,
}: {
  m: Maneuver;
  rotation?: number;
  compressed?: boolean;
  damage?: number;
}) {
  const points = cells(compressed ? [[0, 0]] : m.shape, rotation),
    width = Math.max(...points.map((p) => p[0])) + 1,
    height = Math.max(...points.map((p) => p[1])) + 1;
  const perCell =
    damage === undefined
      ? []
      : distributeDamage(
          damage,
          points.map(() => 1),
        );
  const staminaPerCell =
    ((m.staminaDamagePerCell ?? 0) * m.shape.length) / points.length;
  const cost = m.staminaCost ?? 0;
  const blockCost = m.blockCost ?? 0;
  const maxCost = cost + blockCost * points.length;
  const costLabel =
    maxCost > cost
      ? `${formatDamage(cost)}–${formatDamage(maxCost)}`
      : formatDamage(cost);
  return (
    <Text
      as="span"
      className="action-figure"
      style={{
        gridTemplateColumns: `repeat(${width}, var(--piece-cell, 26px))`,
        gridTemplateRows: `repeat(${height}, var(--piece-cell, 26px))`,
      }}
      aria-label={`${points.length} ${points.length === 1 ? "клетка" : "клетки"}`}
    >
      {points.map(([x, y], i) => (
        <Text
          as="span"
          className="piece-square"
          key={`${x}-${y}`}
          style={{ gridColumn: x + 1, gridRow: y + 1 }}
        >
          <ActionSource m={m} size="100%" />
          {damage !== undefined && (perCell[i] > 0 || staminaPerCell > 0) && (
            <Text
              as="small"
              className="piece-cell-power"
              title={`Урон клетки${m.counter ? " при контратаке" : ""} до блока и брони: здоровье — ${formatDamage(perCell[i])}, выносливость — ${formatDamage(staminaPerCell)}`}
            >
              <Text
                color="danger"
                aria-label={`Урон здоровью: ${formatDamage(perCell[i])}`}
              >
                {formatDamage(perCell[i])}
              </Text>
              <Text
                color="success"
                aria-label={`Урон выносливости: ${formatDamage(staminaPerCell)}`}
              >
                {formatDamage(staminaPerCell)}
              </Text>
            </Text>
          )}
        </Text>
      ))}
      {maxCost > 0 && (
        <Text
          as="b"
          className="figure-cost"
          aria-label={`Цена фигуры: ${maxCost > cost ? `от ${formatDamage(cost)} до ${formatDamage(maxCost)}` : costLabel} выносливости`}
          title={`Цена размещения: ${formatDamage(cost)} выносливости${blockCost > 0 ? `; дополнительно ${formatDamage(blockCost)} за заблокированную клетку. Всего: ${costLabel} выносливости` : ""}`}
        >
          {costLabel}
        </Text>
      )}
    </Text>
  );
}
