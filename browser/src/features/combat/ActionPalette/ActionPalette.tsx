import { Text } from "@/shared/ui/Text";
import "@/features/combat/ActionPalette/ActionPalette.css";
import type { PointerEventHandler } from "react";
import { useLayoutEffect } from "react";
import type {
  BoardModifiers,
  Fighter,
  Maneuver,
  Placement,
} from "@/game/types";
import { useFittingFigureRows } from "@/features/combat/useFittingFigureRows";

import { maneuverDamage } from "@/game/combat/reaction-rules";
import { explainDamage } from "@/game/equipment/damage-explanation";
import { ActionFigure } from "@/features/combat/ActionFigure/ActionFigure";
import { sourceName } from "@/features/combat/ActionSource/model";
export function ActionPalette({
  tokens,
  selected,
  rotation,
  mod,
  placed,
  busy,
  onSelect,
  onScale,
  fighter,
  onFigurePointerDown,
  onFigurePointerMove,
  onFigurePointerUp,
  onFigurePointerCancel,
  rotations,
}: {
  rotations?: Record<string, number>;
  onFigurePointerDown?: (
    e: import("react").PointerEvent<HTMLButtonElement>,
    id: string,
  ) => void;
  onFigurePointerMove?: PointerEventHandler<HTMLButtonElement>;
  onFigurePointerUp?: PointerEventHandler<HTMLButtonElement>;
  onFigurePointerCancel?: PointerEventHandler<HTMLButtonElement>;
  fighter?: Fighter;
  tokens: Maneuver[];
  selected: string;
  rotation: number;
  mod: BoardModifiers;
  placed: Placement[];
  busy: boolean;
  onSelect: (id: string) => void;
  onScale: (value: number) => void;
}) {
  useLayoutEffect(() => onScale(36), [onScale]);
  const placedIds = new Set(placed.map((p) => p.id));
  const available = tokens.filter((m) => !placedIds.has(m.id));
  const trayRef = useFittingFigureRows(
    `${available.map((m) => m.id).join(",")}:${rotation}:${JSON.stringify(rotations)}:${mod.compressed}`,
  );
  return (
    <div className="piece-tray" ref={trayRef}>
      <div
        className="maneuver-palette figure-palette"
        role="group"
        aria-label="Доступные фигуры"
      >
        {available.map((m) => {
          const damage =
            fighter && !m.id.startsWith("charm-")
              ? maneuverDamage(fighter, m)
              : undefined;
          return (
            <button
              key={m.id}
              className={`maneuver-piece ${m.id === selected ? "selected" : ""}`}
              aria-label={`Выбрать: ${m.name}`}
              aria-pressed={m.id === selected}
              disabled={busy}
              onPointerDown={(e) => onFigurePointerDown?.(e, m.id)}
              onPointerMove={onFigurePointerMove}
              onPointerUp={onFigurePointerUp}
              onPointerCancel={onFigurePointerCancel}
              onDragStart={(e) => e.preventDefault()}
              onClick={() => onSelect(m.id)}
              title={`${m.name} · ${sourceName(m)}. ${m.description}${
                fighter
                  ? " " +
                    explainDamage(fighter, m)
                      .map((part) => `${part.label}: ${part.formula}`)
                      .join("; ")
                  : ""
              }`}
            >
              <ActionFigure
                m={m}
                damage={damage}
                rotation={
                  rotations?.[m.id] ?? (m.id === selected ? rotation : 0)
                }
                compressed={mod.compressed === m.id}
              />
              <Text as="span" className="piece-caption">
                {m.name}
              </Text>
            </button>
          );
        })}
      </div>
    </div>
  );
}
