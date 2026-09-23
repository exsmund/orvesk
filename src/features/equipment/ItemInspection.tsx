import {
  itemComboRules,
  comboRuleDescription,
} from "../../game/combat/figure-combos";
import "../combat/combat-forecast.css";
import { ItemArtwork } from "./EquipmentDoll";
import { SLOTS, STATS } from "../../game/equipment/catalog";
import {
  compareItem,
  type ComparisonRow,
} from "../../game/equipment/item-comparison";
import type { Fighter, Item } from "../../game/types";
import { ActionFigure } from "../combat/ActionFigures";
import {
  itemManeuvers,
  maneuverDamage,
  maneuverPoiseDamage,
  isGuard,
} from "../../game/combat/reaction-rules";
import { specialEffect } from "../../game/combat/tactics";
import { explainDamage } from "../../game/equipment/damage-explanation";
import "../combat/reaction-board.css";
import "./item-inspection.css";

const number = (value: number) =>
  value.toLocaleString("ru-RU", { maximumFractionDigits: 1 });
function Delta({ row }: { row: ComparisonRow }) {
  const delta = row.candidate - row.current;
  const tone =
    !delta || row.neutral
      ? "same"
      : (row.lowerIsBetter ? delta < 0 : delta > 0)
        ? "better"
        : "worse";
  return (
    <span className={`item-delta ${tone}`}>
      {delta
        ? `${delta > 0 ? "+" : "−"}${number(Math.abs(delta))}${row.unit ? " п.п." : ""}`
        : "—"}
    </span>
  );
}
function ItemCard({
  equipment,
  actor,
  player,
  label,
  rows,
  candidate,
  compare,
  enemy,
}: {
  equipment: Item | null;
  actor: Fighter;
  player: Fighter;
  label: string;
  rows: ComparisonRow[];
  candidate: boolean;
  compare: boolean;
  enemy: boolean;
}) {
  const figures = equipment ? itemManeuvers(equipment, actor) : [],
    combos = equipment ? itemComboRules(equipment) : [];
  const regularBlocks = figures.filter((m) => isGuard(m) && m.id !== "fortify");
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
            <dt className={row.requirementStat ? "stat-name" : undefined}>
              {row.requirementStat ? STATS[row.requirementStat] : row.label}
            </dt>
            <dd>
              {number(value)}
              {current !== undefined && (
                <small className="requirement-current">
                  (у вас {number(current)})
                </small>
              )}
              {row.unit ? ` ${row.unit}` : ""}
              {candidate && compare && !row.requirementStat && (
                <Delta row={row} />
              )}
            </dd>
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
        <span className="inspection-card-label">{label}</span>
        {equipment ? (
          <>
            <ItemArtwork equipment={equipment} size={180} />
            <small>{SLOTS[equipment.slot]}</small>
            <h3>{equipment.name}</h3>
          </>
        ) : (
          <>
            <div className="empty-item-symbol">—</div>
            <h3>Слот свободен</h3>
            <small>Ничего не надето</small>
          </>
        )}
      </header>
      <p className="damage-owner">
        {enemy ? "Урон противника" : "Ваш урон"} <strong>· {actor.name}</strong>
      </p>
      {propertyRows.length > 0 && renderRows(propertyRows)}
      {equipment?.kind === "shield" && (
        <p className="comparison-note shield-block-summary">
          Блок полностью защищает перекрытые клетки от любого типа урона. Щит не
          даёт пассивной защиты. Обычные блоки:{" "}
          {regularBlocks.map((m) => `${m.shape.length} кл.`).join(" + ")};{" "}
          {regularBlocks.length} независимых фигур.
        </p>
      )}
      {equipment?.fullBlockPoiseRecovery && (
        <p className="item-combo-rule shield-recovery-rule">
          {specialEffect(equipment)}
        </p>
      )}
      {requirementRows.length > 0 && (
        <section className="item-requirements" aria-label="Требования">
          <h4>Требования</h4>
          {renderRows(requirementRows)}
        </section>
      )}
      {combos.length > 0 && (
        <section
          className="item-combos"
          aria-label={`Комбинации: ${equipment?.name}`}
        >
          <h4>Комбинации</h4>
          {combos.map((rule) => (
            <div className="item-combo-rule" key={rule.name}>
              <strong>{rule.name}</strong>
              <p>{comboRuleDescription(rule)}</p>
            </div>
          ))}
        </section>
      )}
      <section
        className="item-figures"
        aria-label={`Фигуры: ${equipment?.name ?? "пустой слот"}`}
      >
        <h4>Фигуры-действия</h4>
        {figures.length ? (
          <div className="item-figure-list">
            {figures.map((m) => {
              const damage = maneuverDamage(actor, m),
                parts = explainDamage(actor, m),
                stance = maneuverPoiseDamage(actor, m);
              return (
                <article className="item-figure-card" key={m.id}>
                  <ActionFigure m={m} damage={damage} />
                  <div>
                    <strong>{m.name}</strong>
                    <div
                      className="figure-effects"
                      aria-label={`Эффекты: ${m.name}`}
                    >
                      <b className="figure-total">
                        Урон здоровью: {number(damage)}
                      </b>
                      <b className="figure-stance">
                        Урон стойке: до {number(stance)}
                      </b>
                      <small>
                        За всю фигуру, не за клетку. Урон здоровью — до блока,
                        брони, эффектов поля и условных бонусов комбинаций.
                      </small>
                      {stance > 0 && (
                        <small>
                          {isGuard(m)
                            ? "−1 стойки, если хотя бы одна клетка блока попала на пустое место или вспомогательное действие противника. Блок на блок и блок против поднимающейся цели не снижают стойку."
                            : "Стойка снижается один раз, если фигура нанесла урон здоровью: значение × прошедшая доля атаки, до десятых. Блок убирает долю клетки, встречная атака уменьшает её вдвое (против призрака — до 75%). Вес ударной клетки учитывается. При поглощении бронёй или подъёме цели — 0."}
                        </small>
                      )}
                      {actor.archetype === "crusher" &&
                        m.action === "heavy" && (
                          <small>Включён бонус крушителя: −1 стойки.</small>
                        )}
                      {parts.some((part) => part.type === "magic") && (
                        <small>
                          Включён эффект магии: −1 стойки при уроне здоровью.
                        </small>
                      )}
                      {parts.some((part) => part.type === "frost") && (
                        <small>
                          В режиме «Тактика» мороз при уроне здоровью: −1
                          доступная клетка на следующий раунд. Не продлевает
                          действующее замедление; после него раунд защиты от
                          повторного замедления.
                        </small>
                      )}
                    </div>
                    <small>{m.shape.length} кл.</small>
                    {parts.length > 0 && (
                      <div
                        className="figure-formula"
                        aria-label={`Расчёт урона: ${m.name}`}
                      >
                        <span className="formula-heading">
                          Как считается урон
                        </span>
                        {parts.map((part, index) => (
                          <span key={index}>
                            <b>{part.label}</b>
                            <span>{part.formula}</span>
                          </span>
                        ))}
                        {parts.some((part) => part.rounded) && (
                          <small>→ округление вверх</small>
                        )}
                        {parts.length > 1 && (
                          <strong>
                            Всего:{" "}
                            {parts
                              .map((part) => number(part.value))
                              .join(" + ")}{" "}
                            = {number(damage)}
                          </strong>
                        )}
                      </div>
                    )}
                    <small>{m.description}</small>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p>
            {equipment?.id === "unlock-ring"
              ? "Один раз за бой открывает скалу."
              : equipment?.id === "fold-amulet"
                ? "Один раз за бой сжимает действие до одной клетки."
                : equipment
                  ? "Не добавляет фигур: свойства действуют пассивно."
                  : "Нет предмета и его фигур."}
          </p>
        )}
      </section>
      {equipment && (
        <>
          <p className="inspection-flavor">{equipment.description}</p>
          {!equipment.fullBlockPoiseRecovery && specialEffect(equipment) && (
            <p className="comparison-note">{specialEffect(equipment)}</p>
          )}
        </>
      )}
    </article>
  );
}
export function ItemInspection({
  equipment,
  player,
  opponent,
  own = false,
  source = "Предмет",
}: {
  equipment: Item;
  player: Fighter;
  opponent?: Fighter;
  own?: boolean;
  source?: string;
}) {
  const actor = own ? player : (opponent ?? player),
    comparison = compareItem(equipment, player, actor);
  const rows = comparison.rows.filter(
    (row) => row.key !== "range" && (!own || row.candidate > 0),
  );
  return (
    <section
      className="item-inspection"
      aria-label={`Просмотр: ${equipment.name}`}
    >
      <div className={`inspection-columns ${own ? "single-card" : ""}`}>
        {!own && (
          <ItemCard
            equipment={comparison.current}
            actor={player}
            player={player}
            label="Сейчас на вас"
            rows={rows}
            candidate={false}
            compare={false}
            enemy={false}
          />
        )}
        <ItemCard
          equipment={equipment}
          actor={actor}
          player={player}
          label={own ? "Ваш предмет" : source}
          rows={rows}
          candidate
          compare={!own}
          enemy={!own && !!opponent}
        />
      </div>
      <p className="comparison-note damage-explanation">
        Показан суммарный урон всей фигуры до блока и брони, с учётом
        характеристик{" "}
        {opponent && !own ? "владельца каждой вещи" : "вашего персонажа"}. В
        формулах число в скобках — характеристика владельца; в строках
        требований «у вас» всегда показывает характеристику вашего персонажа.
        Сильный удар умножает каждую составляющую на 1,5 до округления вверх,
        затем составляющие складываются. Требования к предмету определяют, можно
        ли его надеть, а формула — какие характеристики увеличивают урон. Сжатие
        амулетом сохраняет эту сумму.
        {opponent &&
          !own &&
          " Слева — ваш урон, справа — урон противника; разница также учитывает разные характеристики бойцов."}
      </p>
      <p
        className={`inspection-availability ${comparison.usable ? "" : "unmet"}`}
      >
        {own
          ? "Надето на вас"
          : comparison.usable
            ? "Вы можете использовать этот предмет"
            : "Вам пока не хватает характеристик для этого предмета"}
      </p>
      {!own && comparison.removed.length > 0 && (
        <p className="comparison-replacement">
          При замене снимется:{" "}
          {comparison.removed.map((i) => i.name).join(", ")}.
          {comparison.conflicts.length > 0 &&
            " Двуручное оружие и щит нельзя носить вместе."}
        </p>
      )}
      {!own && (
        <p className="comparison-note">
          Разница указана на правой карточке. Зелёный — больше урона или защиты,
          красный — меньше.
        </p>
      )}
    </section>
  );
}
