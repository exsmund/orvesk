import { useState } from "react";
import { Text } from "@/shared/ui/Text";
import { GothicTextButton } from "@/shared/ui/GothicTextButton";
import {
  actions,
  cost,
  hand,
  initial,
  intent,
  resolve,
  shapeCells,
  type Mode,
  type Placement,
} from "./model";
import "./WolfPrototype.css";

export function WolfPrototype({
  mode,
  seed = 42,
}: {
  mode: Mode;
  seed?: number;
}) {
  const [scenario, setScenario] = useState(seed);
  const [state, setState] = useState(initial);
  const [placed, setPlaced] = useState<Placement[]>([]);
  const [selected, setSelected] = useState("guard");
  const [rotation, setRotation] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const [rerolled, setRerolled] = useState(false);
  const [error, setError] = useState("");
  const tactical = mode === "planning";
  const available = tactical
    ? actions.map((a) => a.id)
    : hand(scenario, state.round, Number(rerolled));
  const action = actions.find((a) => a.id === selected)!;
  const wolf = intent(state.round, scenario);
  const remaining = state.energy - cost(placed) - Number(rerolled);
  const preview =
    hover === null ? [] : (shapeCells(action, rotation, hover) ?? []);
  function reset(next = scenario) {
    setScenario(next);
    setState(initial());
    setPlaced([]);
    setSelected("guard");
    setRotation(0);
    setHover(null);
    setRerolled(false);
    setError("");
  }
  function place(n: number) {
    if (state.result) return;
    const existing = placed.find((p) => p.cells.includes(n));
    if (existing) {
      setPlaced(placed.filter((p) => p.id !== existing.id));
      setError("");
      return;
    }
    if (!available.includes(action.id)) {
      setError("Выберите фигуру из текущего набора.");
      return;
    }
    if (tactical && state.cooldowns[action.id] > 0) {
      setError("Эта фигура ещё восстанавливается.");
      return;
    }
    const cells = shapeCells(action, rotation, n);
    const rest = placed.filter((p) => p.id !== action.id);
    if (!cells || rest.some((p) => p.cells.some((c) => cells.includes(c)))) {
      setError(
        "Фигура не помещается. Поверните её или выберите другую клетку.",
      );
      return;
    }
    if (cost(rest) + action.cost + Number(rerolled) > state.energy) {
      setError(
        "Не хватает энергии. Снимите другую фигуру или выберите более дешёвую.",
      );
      return;
    }
    setPlaced([...rest, { id: action.id, cells }]);
    setError("");
  }
  function next() {
    setState(resolve(state, placed, mode, scenario, rerolled));
    setPlaced([]);
    setRerolled(false);
    setHover(null);
    setSelected("guard");
    setError("");
  }
  return (
    <main className="wp-page">
      <div className="wp-title">
        <Text as="h1" font="display" size="2xl">
          {tactical ? "Волк · Планирование" : "Волк · Импровизация"}
        </Text>
        <Text as="p" color="muted">
          Эксперимент. Отдельные правила, без сохранений и изменений основной
          игры. Раскладка №{scenario}.
        </Text>
      </div>
      <div className="wp-toolbar">
        <GothicTextButton
          width="auto"
          size="compact"
          variant="secondary"
          onClick={() => reset()}
        >
          Повторить бой
        </GothicTextButton>
        <GothicTextButton
          width="auto"
          size="compact"
          variant="secondary"
          onClick={() => reset(scenario + 1)}
        >
          Другая раскладка
        </GothicTextButton>
      </div>
      <div className="wp-status">
        <div>
          <Text as="strong" size="lg">
            Герой · {state.hp} / 30 здоровья
          </Text>
          <Text as="p" color="accent">
            Энергия: {remaining} / {state.energy} · максимум 5
          </Text>
        </div>
        <Text size="lg">Ход {state.round}</Text>
        <div className="wp-wolf">
          <img src="/creatures/portraits/wolf.png" alt="Дикий волк" />
          <div>
            <Text as="strong" size="lg">
              Волк · {state.wolf} / 40 здоровья
            </Text>
            <Text as="p" color="danger">
              {wolf.name} ·{" "}
              {wolf.damage ? `${wolf.damage} урона` : "получает двойной урон"}
            </Text>
          </div>
        </div>
      </div>
      <div className="wp-intents">
        {(tactical ? [0, 1, 2] : [0]).map((offset) => {
          const i = intent(state.round + offset, scenario);
          return (
            <div className="wp-intent" key={offset}>
              <Text as="strong">
                {offset === 0
                  ? "Сейчас"
                  : `Через ${offset} ход${offset === 1 ? "" : "а"}`}{" "}
                · {i.name}
              </Text>
              <Text as="p" size="sm">
                {i.damage
                  ? `${i.damage} урона · клетки ${i.cells.map((c) => `${Math.floor(c / 3) + 1}:${(c % 3) + 1}`).join(", ")}`
                  : "Не атакует. Ваш урон ×2."}
              </Text>
            </div>
          );
        })}
      </div>
      <Text as="p">
        {tactical
          ? "Все приёмы доступны. Сохраните уворот для прыжка, а тяжёлый удар — для уязвимости волка."
          : "Каждый ход: 4 случайные фигуры плюс постоянные блок и передышка. Восстановления нет, но нужная фигура может не выпасть. Один раз за ход можно заменить набор за 1 энергию."}
      </Text>
      {state.result ? (
        <div className="wp-result" role="status">
          <Text size="2xl" font="display">
            {state.result === "win"
              ? "Вы победили"
              : state.result === "loss"
                ? "Вы погибли"
                : "Ничья"}
          </Text>
          <Text as="p">
            Бой завершён за {state.round - 1} ходов. Попробуйте повторить ту же
            раскладку с другим планом.
          </Text>
        </div>
      ) : (
        <div className="wp-play">
          <section className="wp-field">
            <Text as="h2" size="lg">
              Поле
            </Text>
            <Text as="p" size="sm" color="muted">
              Красный контур — атака волка. Выберите фигуру → клетку. Клик по
              занятой клетке снимает вашу фигуру.
            </Text>
            <div
              className="wp-grid"
              role="group"
              aria-label="Тестовое поле 3 на 3"
            >
              {Array.from({ length: 9 }, (_, n) => {
                const p = placed.find((p) => p.cells.includes(n));
                const a = actions.find((a) => a.id === p?.id);
                return (
                  <button
                    key={n}
                    className={`wp-cell ${wolf.cells.includes(n) ? "wp-threat" : ""} ${preview.includes(n) ? "wp-preview" : ""}`}
                    onMouseEnter={() => setHover(n)}
                    onMouseLeave={() => setHover(null)}
                    onClick={() => place(n)}
                    aria-label={`Клетка ${Math.floor(n / 3) + 1}:${(n % 3) + 1}${a ? `, ${a.name}` : ""}${wolf.cells.includes(n) ? ", атака волка" : ""}`}
                  >
                    <Text size="xs" color="muted">
                      {Math.floor(n / 3) + 1}:{(n % 3) + 1}
                    </Text>
                    <Text weight="bold">{a?.name ?? "—"}</Text>
                    <Text size="xs" color="danger">
                      {wolf.cells.includes(n)
                        ? `Укус ${Math.round((wolf.damage / wolf.cells.length) * 10) / 10}`
                        : ""}
                    </Text>
                  </button>
                );
              })}
            </div>
            <div className="wp-controls">
              <GothicTextButton
                width="auto"
                size="compact"
                variant="secondary"
                onClick={() => setRotation((rotation + 1) % 4)}
              >
                Поворот ↻
              </GothicTextButton>
              <GothicTextButton
                width="auto"
                size="compact"
                variant="secondary"
                onClick={() => {
                  setPlaced([]);
                  setError("");
                }}
              >
                Снять всё
              </GothicTextButton>
            </div>
            <Text as="p" size="sm">
              Выбрано: {action.name} · поворот {rotation * 90}° · {action.cost}{" "}
              энергии
            </Text>
            <Text as="p" color="danger" role="status">
              {error}
            </Text>
            <GothicTextButton onClick={next}>
              {placed.length ? "Разыграть ход" : "Пропустить ход"}
            </GothicTextButton>
          </section>
          <section className="wp-options">
            <Text as="h2" size="lg">
              {tactical ? "Ваши фигуры" : "Набор этого хода"}
            </Text>
            {!tactical && (
              <GothicTextButton
                size="compact"
                variant="secondary"
                disabled={rerolled || placed.length > 0 || state.energy < 1}
                onClick={() => {
                  setRerolled(true);
                  setSelected("guard");
                  setError("");
                }}
              >
                Заменить набор · 1 энергия
              </GothicTextButton>
            )}
            <div className="wp-cards">
              {actions
                .filter((a) => available.includes(a.id))
                .map((a) => {
                  const cd = tactical ? (state.cooldowns[a.id] ?? 0) : 0;
                  return (
                    <button
                      className="wp-card"
                      key={a.id}
                      aria-pressed={selected === a.id}
                      disabled={cd > 0}
                      onClick={() => {
                        setSelected(a.id);
                        setRotation(0);
                        setError("");
                      }}
                    >
                      <Text as="strong" color="accent">
                        {a.name} · {a.cost} энергии
                      </Text>
                      <div className="wp-mini" aria-hidden="true">
                        {Array.from({ length: 9 }, (_, n) => (
                          <i
                            className={
                              a.shape.some(
                                ([x, y]) =>
                                  x === n % 3 && y === Math.floor(n / 3),
                              )
                                ? "wp-dot"
                                : ""
                            }
                            key={n}
                          />
                        ))}
                      </div>
                      <Text as="span" size="sm">
                        {tactical
                          ? a.description
                          : a.description.replace(
                              / В планировании[^.]*\./g,
                              "",
                            )}
                      </Text>
                      {cd > 0 && (
                        <Text as="span" size="sm" color="muted">
                          Недоступно ещё ходов: {cd}
                        </Text>
                      )}
                      {placed.some((p) => p.id === a.id) && (
                        <Text as="span" size="sm" color="success">
                          На поле
                        </Text>
                      )}
                    </button>
                  );
                })}
            </div>
          </section>
        </div>
      )}
      <section className="wp-rules">
        <Text as="h2" size="lg">
          Правила прототипа
        </Text>
        <Text as="p" size="sm">
          Каждую фигуру можно поставить один раз за ход. Свои фигуры не
          пересекаются. Их урон делится поровну между клетками. При пересечении
          атак обе стороны наносят половину урона в этой клетке. Блок пропускает
          25% урона, уворот — 0. Лечение не воскрешает. После хода +1 энергия,
          передышка даёт ещё +2. Неиспользованная энергия сохраняется, максимум
          5. Каждые три хода атаки волка усиливаются на 2. Это экспериментальные
          правила, отличные от основной игры.
        </Text>
      </section>
      <section className="wp-log">
        <Text as="h2" size="lg">
          Что произошло
        </Text>
        {state.log.length ? (
          state.log.map((line, i) => (
            <Text as="p" size="sm" key={i}>
              {line}
            </Text>
          ))
        ) : (
          <Text as="p" color="muted">
            Здесь появится результат первого хода.
          </Text>
        )}
      </section>
      <Text as="p" color="muted">
        После теста: приходилось ли менять план? Был ли интересный выбор между
        атакой и защитой? Хотелось ли переиграть бой иначе?
      </Text>
    </main>
  );
}
