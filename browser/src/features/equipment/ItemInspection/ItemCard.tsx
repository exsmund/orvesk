import { Text } from "@/shared/ui/Text";
import "@/features/equipment/ItemInspection/ItemCard.css";

import { itemManeuvers } from "@/game/combat/reaction-rules";
import { SLOTS, STATS, WEAPON_WEIGHTS } from "@/game/equipment/catalog";
import { type ComparisonRow } from "@/game/equipment/item-comparison";
import type { Fighter, Item } from "@/game/types";
import { EquipmentIcon } from "@/shared/ui/EquipmentIcon/EquipmentIcon";
import { FigureCard } from "@/features/combat/FigureCard";

import { Delta } from "@/features/equipment/ItemInspection/Delta";
import { number } from "@/features/equipment/ItemInspection/model";
export function ItemCard({
  equipment,
  actor,
  player,
  label,
  rows,
  candidate,
  compare,
}: {
  equipment: Item | null;
  actor: Fighter;
  player: Fighter;
  label: string;
  rows: ComparisonRow[];
  candidate: boolean;
  compare: boolean;
}) {
  const figures = equipment ? itemManeuvers(equipment) : [];
  const propertyRows = rows.filter((row) => !row.requirementStat),
    requirementRows = rows.filter((row) => row.requirementStat);
  const renderRows = (entries: ComparisonRow[]) => (
    <dl className="inspection-properties">
      {entries.map((row) => {
        const value = candidate ? row.candidate : row.current,
          current = row.requirementStat
            ? player.stats[row.requirementStat]
            : undefined;
        const unmet = current !== undefined && current < value;
        return (
          <div
            key={row.key}
            className={unmet ? "requirement-unmet" : undefined}
            title={unmet ? "Ваша характеристика ниже требуемой" : undefined}
          >
            <Text
              as="dt"
              className={row.requirementStat ? "stat-name" : undefined}
            >
              {row.requirementStat ? STATS[row.requirementStat] : row.label}
            </Text>
            <Text as="dd">
              {number(value)}
              {current !== undefined && (
                <Text as="small" className="requirement-current">
                  (у вас {number(current)})
                </Text>
              )}
              {row.unit ? ` ${row.unit}` : ""}
              {candidate && compare && !row.requirementStat && (
                <Delta row={row} />
              )}
            </Text>
          </div>
        );
      })}
    </dl>
  );
  return (
    <article
      className={`inspection-card ${candidate ? "candidate-card" : "current-card"}`}
      aria-label={label}
    >
      <header className="inspection-card-heading">
        <Text as="span" className="inspection-card-label">
          {label}
        </Text>
        {equipment ? (
          <>
            <EquipmentIcon equipment={equipment} framed size={180} />
            <Text as="small">{SLOTS[equipment.slot]}</Text>
            <Text as="h3">{equipment.name}</Text>
            {equipment.weightClass && (
              <Text as="small">
                {WEAPON_WEIGHTS[equipment.weightClass].name}
              </Text>
            )}
            <Text>Уровень {equipment.level ?? 1}</Text>
          </>
        ) : (
          <>
            <div className="empty-item-symbol">
              <Text>—</Text>
            </div>
            <Text as="h3">Слот свободен</Text>
            <Text as="small">Ничего не надето</Text>
          </>
        )}
      </header>
      {propertyRows.length > 0 && renderRows(propertyRows)}
      {requirementRows.length > 0 && (
        <section className="item-requirements" aria-label="Требования">
          <Text as="h4">Требования</Text>
          {renderRows(requirementRows)}
        </section>
      )}
      <section
        className="item-figures"
        aria-label={`Фигуры: ${equipment?.name ?? "пустой слот"}`}
      >
        <Text as="h4">Фигуры-действия</Text>
        {figures.length ? (
          <div className="item-figure-list">
            {figures.map((figure) => (
              <FigureCard key={figure.id} figure={figure} stats={actor.stats} />
            ))}
          </div>
        ) : (
          <Text as="p">
            {equipment?.charmEffect === "unlock"
              ? "Один раз за бой открывает скалу."
              : equipment?.charmEffect === "compress"
                ? "Один раз за бой сжимает действие до одной клетки."
                : equipment
                  ? "Не добавляет фигур: свойства действуют пассивно."
                  : "Нет предмета и его фигур."}
          </Text>
        )}
      </section>
      {equipment && (
        <>
          <Text as="p" className="inspection-flavor">
            {equipment.description}
          </Text>
        </>
      )}
    </article>
  );
}
