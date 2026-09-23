import { formatDamage } from "../../game/combat/battle-feedback";
import { COMBOS, type FigureCombo } from "../../game/combat/figure-combos";
import type {
  ClashCalculation,
  ClashSideSummary,
} from "../../game/combat/clash-damage";
import type { Side } from "../../game/types";
import "./combat-forecast.css";

const signed = (n: number) =>
  `${n > 0 ? "+" : n < 0 ? "−" : ""}${formatDamage(Math.abs(n))}`;
export function ComboLinks({
  combos,
}: {
  combos: Partial<Record<Side, FigureCombo[]>>;
}) {
  return (
    <svg
      className="combo-links"
      viewBox="0 0 300 300"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {(["player", "enemy"] as const).flatMap((side) =>
        (combos[side] ?? []).flatMap((combo, i) =>
          combo.links.map(([a, b], j) => {
            const x = (n: number) =>
                (n % 3) * 100 + (side === "player" ? 25 : 75),
              y = (n: number) => Math.floor(n / 3) * 100 + 38;
            return (
              <g key={`${side}-${i}-${j}`} className={`combo-link-${side}`}>
                <line x1={x(a)} y1={y(a)} x2={x(b)} y2={y(b)} />
                <circle cx={x(a)} cy={y(a)} r="3" />
                <circle cx={x(b)} cy={y(b)} r="3" />
              </g>
            );
          }),
        ),
      )}
    </svg>
  );
}
function comboEffect(combo: FigureCombo) {
  return combo.kind === "counter"
    ? `+${formatDamage(combo.damageBonus)} урона после брони`
    : combo.kind === "pressure"
      ? "−1 стойки врагу"
      : "до +1 своей стойки";
}
export function ComboNotes({
  sides,
}: {
  sides: Record<Side, ClashSideSummary>;
}) {
  return (
    <div className="combo-notes">
      {(["player", "enemy"] as const).flatMap((side) =>
        sides[side].combos.map((combo) => (
          <p
            key={`${side}-${combo.kind}-${combo.actionIds[0]}`}
            title={`${COMBOS[combo.kind].description} ${combo.kind === "counter" ? "Один раз на каждую фигуру атаки" : "Один раз за ход"}. Бонус урона указан до ограничения оставшимся здоровьем.`}
          >
            <b>
              {side === "player" ? "Вы" : "Враг"} · {combo.name}
            </b>{" "}
            {comboEffect(combo)}
          </p>
        )),
      )}
    </div>
  );
}
export function CombatForecast({
  forecast,
  baseline,
  hovering,
  pending,
}: {
  forecast: ClashCalculation | null;
  baseline: ClashCalculation | null;
  hovering: boolean;
  pending: FigureCombo[];
}) {
  if (!forecast && !pending.length) return null;
  if (!forecast)
    return (
      <aside
        className="combat-forecast forecast-hidden"
        aria-label="Условия комбинаций"
      >
        {pending.map((c, i) => (
          <p key={i} title={COMBOS[c.kind].description}>
            <b>{c.name}: фигуры связаны.</b>{" "}
            {c.kind === "counter"
              ? "Нужен блок атаки щитом."
              : c.kind === "pressure"
                ? "Обе атаки должны нанести урон."
                : "Нужны попадание мечом и блок атаки щитом."}
          </p>
        ))}
      </aside>
    );
  return (
    <aside
      className="combat-forecast"
      aria-label="Прогноз здоровья и стойки"
      aria-live="polite"
    >
      <div className="forecast-totals">
        {(["player", "enemy"] as const).map((side) => {
          const s = forecast.sides[side];
          return (
            <div key={side} className={`forecast-${side}`}>
              <b>{side === "player" ? "ВЫ" : "ПРОТИВНИК"}</b>
              <span>
                Здоровье{" "}
                <strong>
                  {formatDamage(s.hpBefore)} → {formatDamage(s.hpAfter)}
                </strong>{" "}
                <small>
                  (−{formatDamage(s.damage)}
                  {s.healed ? `; лечение +${formatDamage(s.healed)}` : ""})
                </small>
              </span>
              <span>
                Стойка{" "}
                <strong>
                  {formatDamage(s.poiseBefore)} → {formatDamage(s.poiseAfter)}
                </strong>{" "}
                <small>({signed(s.poiseAfter - s.poiseBefore)})</small>
              </span>
              {s.prone && s.hpAfter > 0 && <em>Следующий ход — подъём</em>}
            </div>
          );
        })}
      </div>
      <p className="forecast-blocked">
        Блок и уклонение до брони: вы{" "}
        {formatDamage(forecast.sides.player.blocked)} · противник{" "}
        {formatDamage(forecast.sides.enemy.blocked)}
      </p>
      <ComboNotes sides={forecast.sides} />
      {baseline && (
        <p className="forecast-delta">
          {hovering ? "Если поставить" : "Последняя фигура"}: ваши потери HP{" "}
          {signed(forecast.playerDamage - baseline.playerDamage)}, урон врагу{" "}
          {signed(forecast.enemyDamage - baseline.enemyDamage)}; стойка: вы{" "}
          {signed(
            forecast.sides.player.poiseAfter - baseline.sides.player.poiseAfter,
          )}
          , враг{" "}
          {signed(
            forecast.sides.enemy.poiseAfter - baseline.sides.enemy.poiseAfter,
          )}
          .
        </p>
      )}
      <details>
        <summary>Почему такой итог</summary>
        {(["player", "enemy"] as const).map((side) => (
          <div key={side}>
            <b>{side === "player" ? "Вы" : "Противник"}</b>
            <p>
              {forecast.sides[side].reasons.join(" · ") ||
                "Нет эффектов на стойку."}
            </p>
            <p>
              Восстановлено: {formatDamage(forecast.sides[side].poiseRecovered)}
              . Входящий урон стойке:{" "}
              {formatDamage(forecast.sides[side].poiseLoss)}.
            </p>
          </div>
        ))}
        <p>
          Здоровье — после блока и брони, в пределах оставшегося HP.
          Восстановление стойки ограничено максимумом и учитывается до урона.
          При подъёме стойка восстанавливается полностью и защищена весь раунд.
          Урон стойке от атаки пропорционален её прошедшей доле. Случайный
          эффект пинка не входит в прогноз.
        </p>
      </details>
    </aside>
  );
}
