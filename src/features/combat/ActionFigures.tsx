import { isCombatActionEnabled } from "../../game/config/features";
import type { PointerEventHandler } from "react";
import { SkillIcon } from "../skills/SkillIcon";
import { skill } from "../../game/skills/skills";
import { itemComboDescription } from "../../game/combat/figure-combos";
import { useLayoutEffect } from "react";
import { Footprints, Hand, PersonStanding, RotateCcw } from "lucide-react";
import { item } from "../../game/equipment/catalog";
import { ItemArtwork } from "../equipment/EquipmentDoll";
import { cells } from "../../game/combat/board";
import type {
  BoardModifiers,
  Fighter,
  Maneuver,
  Placement,
} from "../../game/types";
import "./action-figures.css";
import { maneuverDamage } from "../../game/combat/reaction-rules";
import { distributeDamage } from "../../game/combat/clash-damage";
import { formatDamage } from "../../game/combat/battle-feedback";
import { explainDamage } from "../../game/equipment/damage-explanation";
function sourceName(m: Maneuver) {
  return m.skillId
    ? `Навык: ${skill(m.skillId)?.name}`
    : m.weaponId || m.shieldId
      ? item(m.weaponId ?? m.shieldId).name
      : "Базовое действие";
}
export function ActionSource({ m }: { m: Maneuver }) {
  if (m.skillId)
    return (
      <span
        className="action-source skill-source"
        role="img"
        aria-label={sourceName(m)}
        title={sourceName(m)}
      >
        <SkillIcon id={m.skillId} />
      </span>
    );
  const id =
    m.weaponId ?? m.shieldId ?? (m.action === "block" ? "fist" : undefined);
  const Icon =
    m.action === "rest"
      ? RotateCcw
      : m.action === "stand"
        ? PersonStanding
        : m.action === "equip"
          ? Hand
          : Footprints;
  return (
    <span
      className="action-source"
      role="img"
      aria-label={sourceName(m)}
      title={sourceName(m)}
    >
      {m.action === "kick" ? (
        <img src="/actions/kick.png" alt="Пинок" />
      ) : id ? (
        <ItemArtwork equipment={item(id)} size={40} />
      ) : (
        <Icon aria-hidden="true" />
      )}
    </span>
  );
}
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
          !compressed && m.cellWeights ? m.cellWeights : points.map(() => 1),
        );
  return (
    <span
      className="action-figure"
      style={{
        gridTemplateColumns: `repeat(${width}, var(--piece-cell))`,
        gridTemplateRows: `repeat(${height}, var(--piece-cell))`,
      }}
      aria-label={`${points.length} ${points.length === 1 ? "клетка" : "клетки"}`}
    >
      {points.map(([x, y], i) => (
        <span
          className="piece-square"
          key={`${x}-${y}`}
          style={{ gridColumn: x + 1, gridRow: y + 1 }}
        >
          {i === 0 && <ActionSource m={m} />}{" "}
          {!!damage && (
            <small
              className="piece-cell-power"
              title="Урон клетки до блока, брони и эффектов поля"
            >
              {formatDamage(perCell[i])}
            </small>
          )}
        </span>
      ))}
      {damage !== undefined && (
        <b
          className={`figure-damage ${damage === 0 ? "zero-damage" : ""}`}
          aria-label={`Суммарный урон фигуры: ${damage}`}
          title="Урон всей фигуры до блока и брони"
        >
          {damage}
          <small> ур.</small>
        </b>
      )}
    </span>
  );
}
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
  const available = tokens.filter(
    (m) => !placedIds.has(m.id) && isCombatActionEnabled(m.action),
  );
  return (
    <div className="piece-tray">
      <div
        className="maneuver-palette figure-palette"
        role="group"
        aria-label="Доступные фигуры"
      >
        {available.map((m) => (
          <button
            key={m.id}
            className={`maneuver-piece ${m.id === selected ? "selected" : ""}`}
            aria-label={`Выбрать: ${m.name}`}
            aria-pressed={m.id === selected}
            disabled={
              busy ||
              !!m.spent ||
              !!m.cooldown ||
              (!!m.choiceGroup &&
                placed.some(
                  (p) =>
                    p.id !== m.id &&
                    tokens.find((t) => t.id === p.id)?.choiceGroup ===
                      m.choiceGroup,
                ))
            }
            onPointerDown={(e) => onFigurePointerDown?.(e, m.id)}
            onPointerMove={onFigurePointerMove}
            onPointerUp={onFigurePointerUp}
            onPointerCancel={onFigurePointerCancel}
            onDragStart={(e) => e.preventDefault()}
            onClick={() => onSelect(m.id)}
            title={`${m.spent ? "Уже использована в этом бою. " : ""}${m.cooldown ? "Восстановление: ещё 1 раунд. " : ""}${m.name} · ${sourceName(m)}. ${m.description}${m.weaponId ? " " + (itemComboDescription(m.weaponId) ?? "") : ""}${
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
              damage={fighter ? maneuverDamage(fighter, m) : undefined}
              rotation={rotations?.[m.id] ?? (m.id === selected ? rotation : 0)}
              compressed={mod.compressed === m.id}
            />
            <span className="piece-caption">
              {m.spent ? "Использована · " : ""}
              {m.cooldown ? "⌛ 1 раунд · " : ""}
              {m.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
