import { useState } from "react";
import { Text } from "@/shared/ui/Text";
import { GothicTextButton } from "@/shared/ui/GothicTextButton";
import {
  initialDeck,
  playerLeads,
  reservedPlayerCost,
  hiddenWolfPlan,
  wolfResponse,
  deckActions,
  cardCells,
  placementError,
  calculateDeck,
  resolveDeck,
  playerComposition,
  composition,
  exchangeCard,
  MAX_STAMINA,
  STAMINA_PER_TURN,
  deckWolfIntent,
  wolfNames,
  wolfStaminaDamagePerCell,
  playerStaminaDamagePerCell,
  damageFormula,
  healthDamagePerCell,
  healthDamageExplanation,
  type DeckPlacement,
} from "./deck-model";
import { DeckStatsEditor } from "./DeckStatsEditor";
import {
  deckLevel,
  deckMaxHealth,
  defaultDeckStats,
  type DeckStats,
} from "./deck-progression";
import "./DeckWolfPrototype.css";
import { armorReduction } from "./deck-armor";

export function DeckWolfPrototype({
  seed = 42,
  alternating = false,
  playerStats = defaultDeckStats,
  wolfStats = defaultDeckStats,
  playerArmor = 0,
  wolfArmor = 0,
}: {
  seed?: number;
  alternating?: boolean;
  playerStats?: DeckStats;
  wolfStats?: DeckStats;
  playerArmor?: number;
  wolfArmor?: number;
}) {
  const [state, setState] = useState(() =>
    initialDeck(
      seed,
      { player: playerStats, wolf: wolfStats },
      { player: playerArmor, wolf: wolfArmor },
    ),
  );
  const [placed, setPlaced] = useState<DeckPlacement[]>([]);
  const [selected, setSelected] = useState(state.hand[0].uid);
  const [rotation, setRotation] = useState(0);
  const [error, setError] = useState("");
  const [revealed, setRevealed] = useState<ReturnType<
    typeof deckWolfIntent
  > | null>(null);
  const first = alternating && playerLeads(state);
  const hidden = first && !revealed && !state.result;
  const card = state.hand.find((c) => c.uid === selected);
  const wolf =
    revealed ?? (hidden ? hiddenWolfPlan(state) : deckWolfIntent(state));
  const forecast = calculateDeck(state, placed, wolf);
  const reservation = reservedPlayerCost(state, placed);
  const shortage = hidden
    ? Math.max(0, reservation - state.stamina)
    : forecast.shortage;
  const preview = !state.result && !hidden;
  const formatResource = (value: number) =>
    Number(value.toFixed(1)).toLocaleString("ru-RU");
  function reset(
    nextSeed = state.seed,
    stats = state.stats,
    armor = state.armor,
  ) {
    const next = initialDeck(nextSeed, stats, armor);
    setState(next);
    setRevealed(null);
    setPlaced([]);
    setSelected(next.hand[0].uid);
    setRotation(0);
    setError("");
  }
  function place(n: number) {
    if (revealed) return;
    const own = placed.find((p) => p.cells.includes(n));
    if (own) {
      setPlaced(placed.filter((p) => p.uid !== own.uid));
      setError("");
      return;
    }
    if (!card) {
      setError("Сначала выберите карту.");
      return;
    }
    const cells = cardCells(card.action, rotation, n);
    if (!cells) {
      setError(
        "Фигура выходит за край поля. Поверните её или выберите другую клетку.",
      );
      return;
    }
    const next = [
      ...placed.filter((p) => p.uid !== card.uid),
      { uid: card.uid, cells },
    ];
    const message = placementError(state, next);
    if (message) {
      setError(message);
      return;
    }
    setPlaced(next);
    setError("");
  }
  function exchange() {
    try {
      if (hidden && state.stamina - reservation < 1)
        throw new Error("Нужна 1 выносливость сверх резерва защиты.");
      const next = exchangeCard(state, selected, placed);
      setState(next);
      setSelected(next.hand.at(-1)!.uid);
      setRotation(0);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Замена недоступна");
    }
  }
  function finish() {
    if (hidden) {
      if (shortage > 0) return;
      setRevealed(wolfResponse(state, placed));
      return;
    }
    const next = resolveDeck(state, placed, wolf);
    setState(next);
    setRevealed(null);
    setPlaced([]);
    setSelected(next.hand[0]?.uid ?? "");
    setRotation(0);
    setError("");
  }
  return (
    <main className="dw-page">
      <Text as="h1" font="display" size="2xl">
        Волк · {alternating ? "Чередование ходов" : "Колода и выносливость"}
      </Text>
      <Text as="p" color="muted">
        Третий прототип. Отдельные правила, без сохранений. Раскладка №
        {state.seed}.
      </Text>
      <div className="dw-controls">
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
          onClick={() => reset(state.seed + 1)}
        >
          Перемешать и начать
        </GothicTextButton>
      </div>
      <DeckStatsEditor
        key={JSON.stringify([state.stats, state.armor])}
        value={state.stats}
        armor={state.armor}
        onApply={(stats, armor) => reset(state.seed, stats, armor)}
      />
      {alternating && (
        <Text as="p" color="accent">
          {first ? "Вы ходите первым" : "Волк ходит первым — вы реагируете"}
          {revealed ? " · Ответ волка раскрыт, расстановка зафиксирована" : ""}
        </Text>
      )}
      <div className="dw-status">
        <div>
          <Text as="p" color="accent">
            Герой · Уровень {deckLevel(state.stats.player)}
          </Text>
          <Text as="p" size="sm" color="muted">
            Броня {state.armor.player} · поглощение{" "}
            {armorReduction(state.armor.player)}%
          </Text>
          <Text as="strong" size="lg">
            Герой · {formatResource(state.hp)} /{" "}
            {deckMaxHealth(state.stats.player)}
            {preview && (
              <Text color="danger" size="inherit" weight="inherit">
                {" −"}
                {formatResource(forecast.incoming)}
              </Text>
            )}
          </Text>
          <Text
            as="p"
            color={preview && forecast.shortage > 0 ? "danger" : "accent"}
          >
            Выносливость:{" "}
            {formatResource(
              state.stamina -
                (hidden
                  ? reservation
                  : preview
                    ? forecast.attackCost + forecast.blockCost
                    : 0),
            )}{" "}
            / {MAX_STAMINA}
            {preview && (
              <Text color="danger" size="inherit">
                {" −"}
                {formatResource(forecast.incomingStamina)}
              </Text>
            )}
          </Text>
          <Text size="sm">Ход {state.round}</Text>
        </div>
        <div className="dw-wolf">
          <img src="/creatures/portraits/wolf.png" alt="Дикий волк" />
          <div>
            <Text as="p" color="accent">
              Волк · Уровень {deckLevel(state.stats.wolf)}
            </Text>
            <Text as="p" size="sm" color="muted">
              Броня {state.armor.wolf} · поглощение{" "}
              {armorReduction(state.armor.wolf)}%
            </Text>
            <Text as="strong" size="lg">
              Волк · {formatResource(state.wolf)} /{" "}
              {deckMaxHealth(state.stats.wolf)}
              {preview && (
                <Text color="danger" size="inherit" weight="inherit">
                  {" −"}
                  {formatResource(forecast.outgoing)}
                </Text>
              )}
            </Text>
            <Text as="p" color="accent">
              Выносливость:{" "}
              {formatResource(
                state.wolfStamina - (preview ? forecast.wolfCost : 0),
              )}{" "}
              / {MAX_STAMINA}
              {preview && (
                <Text color="danger" size="inherit">
                  {" −"}
                  {formatResource(forecast.outgoingStamina)}
                </Text>
              )}
            </Text>
            <Text as="p" color="danger">
              {hidden
                ? "Ответ волка будет виден после подтверждения"
                : `${wolf.name}: ${wolf.damage} урона до защиты`}
            </Text>
          </div>
        </div>
      </div>
      <div className="dw-piles">
        <Text>Стопка: {state.draw.length}</Text>
        <Text>Сброс: {state.discard.length}</Text>
        <Text>Набор: {state.hand.length} / 4</Text>
      </div>
      {state.result ? (
        <section className="dw-result" role="status">
          <Text size="2xl" font="display">
            {state.result === "win"
              ? "Вы победили"
              : state.result === "loss"
                ? "Вы погибли"
                : "Ничья"}
          </Text>
          <Text as="p">Бой завершён за {state.round - 1} ходов.</Text>
        </section>
      ) : (
        <div className="dw-play">
          <section>
            <Text as="h2" size="lg">
              Поле
            </Text>
            <Text as="p" size="sm" color="muted">
              Выберите карту → клетку. Красный контур — фигура волка. Клик по
              своей фигуре снимает её, сохраняя карту. Лимита клеток нет — можно
              занять все 9 клеток, если хватает карт и выносливости.
            </Text>
            <div
              className="dw-grid"
              role="group"
              aria-label="Поле прототипа колоды"
            >
              {Array.from({ length: 9 }, (_, n) => {
                const own = placed.find((p) => p.cells.includes(n));
                const c = state.hand.find((c) => c.uid === own?.uid);
                return (
                  <button
                    key={n}
                    className={`dw-cell ${wolf.cells.includes(n) ? "dw-threat" : ""}`}
                    onClick={() => place(n)}
                    aria-label={`Клетка ${Math.floor(n / 3) + 1}:${(n % 3) + 1}${c ? `, ${deckActions[c.action].name}` : ""}`}
                  >
                    <Text size="xs" color="muted">
                      {Math.floor(n / 3) + 1}:{(n % 3) + 1}
                    </Text>
                    <Text weight="bold">
                      {c ? deckActions[c.action].name : "—"}
                    </Text>
                    <Text size="xs" color="danger">
                      {wolf.cells.includes(n)
                        ? `${wolf.actions.find((p) => p.cells.includes(n)) ? wolfNames[wolf.actions.find((p) => p.cells.includes(n))!.action] : ""}: ${Number(wolf.cellDamage[n].toFixed(1))} урона${wolf.cellStaminaDamage[n] ? ` + ${wolf.cellStaminaDamage[n]} выносливости` : ""}`
                        : ""}
                    </Text>
                  </button>
                );
              })}
            </div>
            <div className="dw-controls">
              <GothicTextButton
                width="auto"
                size="compact"
                variant="secondary"
                disabled={!!revealed}
                onClick={() => setRotation((rotation + 1) % 4)}
              >
                Поворот ↻
              </GothicTextButton>
              <GothicTextButton
                width="auto"
                size="compact"
                variant="secondary"
                disabled={!!revealed}
                onClick={() => {
                  setPlaced([]);
                  setError("");
                }}
              >
                Снять всё
              </GothicTextButton>
            </div>
            <Text as="p" size="sm">
              Выбрано: {card ? deckActions[card.action].name : "—"} ·{" "}
              {rotation * 90}°
            </Text>
            <div className="dw-forecast">
              <Text as="strong">
                {hidden ? "Подготовка хода" : "Прогноз хода"}
              </Text>
              {hidden ? (
                <Text as="p">
                  Стоимость и резерв: {reservation}. Ответ волка неизвестен.{" "}
                  {shortage > 0
                    ? `Не хватает ${shortage} выносливости.`
                    : placed.length
                      ? "Можно подтвердить расстановку. Для пропуска снимите все свои фигуры."
                      : "Поле пустое: можно пропустить ход. Сначала раскроется ответ волка, затем при расчёте боя выносливость восстановится полностью, если герой выживет. Карты сохранятся."}
                </Text>
              ) : (
                <>
                  {forecast.exhausted && (
                    <Text as="p" color="danger">
                      Истощение героя: следующий ход без +2 выносливости.
                    </Text>
                  )}
                  {forecast.wolfExhausted && (
                    <Text as="p" color="success">
                      Истощение волка: следующий ход без +2 выносливости.
                    </Text>
                  )}
                  <Text as="p" size="sm">
                    Вы −{formatResource(forecast.incoming)}, волк −
                    {formatResource(forecast.outgoing)} здоровья.
                  </Text>
                  <Text as="p" size="sm" color="muted">
                    Броня поглотит примерно: у героя{" "}
                    {formatResource(forecast.incomingAbsorbed)}, у волка{" "}
                    {formatResource(forecast.outgoingAbsorbed)} урона.
                  </Text>
                  <Text as="p" size="sm">
                    Выносливость: стоимость фигур −{forecast.attackCost}, блоки
                    −{forecast.blockCost}, урон выносливости −
                    {formatResource(forecast.incomingStamina)}. После расчёта:{" "}
                    {formatResource(forecast.stamina)}.
                  </Text>
                  {forecast.shortage > 0 && (
                    <Text as="p" size="sm" color="danger">
                      Не хватает {forecast.shortage} выносливости. Уберите или
                      переместите фигуру.
                    </Text>
                  )}
                  {forecast.shortage === 0 && (
                    <Text as="p" size="sm">
                      К следующему ходу, если бой продолжится: вы{" "}
                      {Math.min(
                        MAX_STAMINA,
                        forecast.stamina +
                          (forecast.exhausted ? 0 : STAMINA_PER_TURN),
                      )}
                      , волк{" "}
                      {Math.min(
                        MAX_STAMINA,
                        forecast.wolfStamina +
                          (forecast.wolfExhausted ? 0 : STAMINA_PER_TURN),
                      )}{" "}
                      выносливости.
                    </Text>
                  )}
                </>
              )}
            </div>
            <Text as="p" color="danger" role="status">
              {error}
            </Text>
            {revealed && placed.length === 0 && (
              <Text as="p" color="accent">
                Пропуск подтверждён. Нажмите «Рассчитать · следующий ход»: герой
                примет атаку без защиты и восстановит всю выносливость, если
                выживет.
              </Text>
            )}
            <GothicTextButton disabled={shortage > 0} onClick={() => finish()}>
              {revealed
                ? "Рассчитать · следующий ход"
                : hidden
                  ? placed.length
                    ? "Подтвердить · раскрыть ответ"
                    : "Пропустить ход · восстановить выносливость"
                  : placed.length
                    ? "Разыграть ход и добрать карты"
                    : "Пропустить ход · восстановить выносливость"}
            </GothicTextButton>
          </section>
          <section>
            <Text as="h2" size="lg">
              Доступные карты
            </Text>
            <GothicTextButton
              variant="secondary"
              size="compact"
              disabled={
                !!revealed ||
                !!state.result ||
                (hidden && state.stamina - reservation < 1) ||
                state.exchanged ||
                !card ||
                placed.some((p) => p.uid === selected) ||
                state.stamina - forecast.attackCost - forecast.blockCost < 1
              }
              onClick={exchange}
            >
              {state.exchanged ? "Замена использована" : "Заменить карту · −1"}
            </GothicTextButton>
            <div className="dw-cards">
              {state.hand.map((c, i) => {
                const a = deckActions[c.action];
                return (
                  <button
                    disabled={!!revealed}
                    className="dw-card"
                    key={c.uid}
                    aria-pressed={selected === c.uid}
                    onClick={() => {
                      setSelected(c.uid);
                      setRotation(0);
                      setError("");
                    }}
                  >
                    <Text as="strong" color="accent">
                      {i + 1}. {a.name}
                    </Text>
                    <div className="dw-mini" aria-hidden="true">
                      {Array.from({ length: 9 }, (_, n) => (
                        <i
                          key={n}
                          className={
                            a.shape.some(
                              ([x, y]) =>
                                x === n % 3 && y === Math.floor(n / 3),
                            )
                              ? "dw-dot"
                              : ""
                          }
                        />
                      ))}
                    </div>
                    <Text size="sm">
                      {a.kind === "parry"
                        ? "Ответный урон здоровью"
                        : "Урон здоровью"}
                      :{" "}
                      {damageFormula(
                        healthDamagePerCell(c.action, state.stats.player),
                        a.shape.length,
                      )}
                    </Text>
                    <Text size="xs" color="muted">
                      {healthDamageExplanation(c.action, state.stats.player)}
                    </Text>
                    <Text size="sm">
                      Урон выносливости:{" "}
                      {damageFormula(
                        playerStaminaDamagePerCell[c.action],
                        a.shape.length,
                      )}
                    </Text>
                    <Text size="sm">{a.description}</Text>
                    {placed.some((p) => p.uid === c.uid) && (
                      <Text color="success" size="sm">
                        На поле · уйдёт в сброс
                      </Text>
                    )}
                  </button>
                );
              })}
            </div>
            <Text as="p" size="sm" color="muted">
              Урон на картах и клетках показан до защиты. Прогноз здоровья
              учитывает броню. Одинаковые карты — отдельные экземпляры. Можно
              разыграть обе, если хватает клеток и выносливости. Добор не
              заменяет оставленные карты.
            </Text>
          </section>
        </div>
      )}
      <section className="dw-log">
        <Text as="h2" size="lg">
          Результаты ходов
        </Text>
        {state.log.map((line, i) => (
          <Text as="p" size="sm" key={i}>
            {line}
          </Text>
        ))}
      </section>
      {alternating && (
        <Text as="p">
          Первый участник определяется жеребьёвкой в начале боя, затем порядок
          чередуется. Первый резервирует выносливость на все клетки блока, но
          платит только за реальные блокирования. Ответ раскрывается после
          подтверждения; менять фигуры после раскрытия нельзя.
        </Text>
      )}
      <Text as="p" size="sm" color="muted">
        Стоимость фигур и блокирования уже вычтена из выносливости.
        Отрицательный остаток запрещает завершить ход. Красное «−» у здоровья —
        ожидаемый урон. Восстановление здесь не учитывается.
      </Text>
      <Text as="p">
        Четыре карты сохраняются между ходами. Использованные уходят в сброс;
        новые приходят только после хода. Чтобы полностью восстановить
        выносливость, снимите все свои фигуры и пропустите ход. Волк атакует без
        вашей защиты. В начале каждого хода обе стороны получают +
        {STAMINA_PER_TURN}
        выносливости, максимум {MAX_STAMINA}.
      </Text>
      <Text as="p">
        Замена: один раз за ход можно обменять карту вне поля за 1 свободную
        выносливость; новая карта доступна сразу. Истощение: если урон обнуляет
        выносливость, следующего бонуса +2 не будет. Пропуск по-прежнему
        восстанавливает весь запас после урона.
      </Text>
      <details className="dw-rules">
        <summary>
          <Text>Правила и состав колоды</Text>
        </summary>
        <Text as="p" size="sm">
          Колода: {playerComposition.length} карт — 3 удара, 2 тяжёлых удара, 2
          выпада, 1 блок, 1 уклонение и 1 парирование. Сброс перемешивается,
          когда стопка пуста. В начале каждого хода обе стороны восстанавливают
          +{STAMINA_PER_TURN} выносливости, до {MAX_STAMINA}.
        </Text>
        <Text as="p" size="sm">
          Сначала оплачиваются атаки, уклонения и парирования, затем обычные
          блоки: 1 выносливость за перекрытую клетку атаки. Блок на пустой
          клетке бесплатный. При нехватке выносливости завершение хода
          недоступно. Атака на атаку — половина урона обеим сторонам. Пропуск
          хода без своих фигур полностью восстанавливает выносливость после
          входящего урона, если герой выжил. Карты остаются в наборе, добора
          нет.
        </Text>
        <Text as="p" size="sm">
          Тяжёлый удар героя наносит 3 урона выносливости, по 1 на клетку. Укус
          дополнительно наносит 2 урона выносливости. Блок защищает от него
          полностью, атака против атаки уменьшает его вдвое. Этот урон не
          запрещает завершение хода и не опускает запас ниже нуля. Пропуск
          восстанавливает запас после урона. У волка своя колода: 3 удара лапой,
          2 прыжка, 2 укуса и 3 защиты. Он выбирает доступные фигуры до вашего
          действия. Использованные карты заменяются после хода, оставленные
          сохраняются. Защита расходует 1 выносливость за перекрытую клетку
          атаки, как у героя. При выборе фигур волк резервирует запас на все
          клетки защиты. Неатакованные клетки этот запас не тратят. Пропуск
          восстанавливает весь запас, но не увеличивает входящий урон.
        </Text>
      </details>
      {!hidden && (
        <section className="dw-rules">
          <Text as="h2" size="lg">
            Набор волка · {state.wolfDeck.hand.length} / 4
          </Text>
          <Text as="p" size="sm">
            Стопка: {state.wolfDeck.draw.length} · Сброс:{" "}
            {state.wolfDeck.discard.length}
          </Text>
          {state.wolfDeck.hand.map((c) => (
            <Text as="p" size="sm" key={c.uid}>
              {wolfNames[c.action]} · Здоровье:{" "}
              {damageFormula(
                healthDamagePerCell(c.action, state.stats.wolf),
                deckActions[c.action].shape.length,
              )}{" "}
              · Выносливость:{" "}
              {damageFormula(
                wolfStaminaDamagePerCell[c.action],
                deckActions[c.action].shape.length,
              )}{" "}
              ·{" "}
              {c.action === "guard"
                ? "1 выносливость за блокируемую клетку"
                : `${deckActions[c.action].stamina} выносливости за атаку`}
              {wolf.placements.some((p) => p.uid === c.uid)
                ? " · На поле"
                : " · Оставлена"}
            </Text>
          ))}
        </section>
      )}
      <section
        className="dw-deck-comparison"
        aria-label="Сравнение полных колод"
      >
        <Text as="h2" size="xl">
          Все карты игрока и волка
        </Text>
        <Text as="p" color="muted" size="sm">
          Полный состав: игрок — {playerComposition.length} карт, волк —{" "}
          {composition.length}. Одинаковые карты объединены, рядом указано
          количество копий. Урон показан до защиты: урон одной клетки × число
          клеток.
        </Text>
        <div className="dw-deck-comparison__rows">
          {[...new Set([...playerComposition, ...composition])].map(
            (action) => {
              const definition = deckActions[action];
              return (
                <div className="dw-deck-comparison__row" key={action}>
                  {(["player", "wolf"] as const).map((side) => {
                    const deck =
                      side === "player" ? playerComposition : composition;
                    const count = deck.filter((id) => id === action).length;
                    const name =
                      side === "player" ? definition.name : wolfNames[action];
                    const staminaDamage =
                      side === "player"
                        ? playerStaminaDamagePerCell[action]
                        : wolfStaminaDamagePerCell[action];
                    return (
                      <article className="dw-deck-comparison__card" key={side}>
                        <Text size="sm" color="muted">
                          {side === "player" ? "Игрок" : "Волк"}
                        </Text>
                        {count ? (
                          <>
                            <Text as="h3" size="lg" color="accent">
                              {name} · {count} шт.
                            </Text>
                            <div
                              className="dw-mini"
                              role="img"
                              aria-label={`Форма: ${definition.shape.length} клеток`}
                            >
                              {Array.from({ length: 9 }, (_, n) => (
                                <i
                                  key={n}
                                  className={
                                    definition.shape.some(
                                      ([x, y]) =>
                                        x === n % 3 && y === Math.floor(n / 3),
                                    )
                                      ? "dw-dot"
                                      : ""
                                  }
                                />
                              ))}
                            </div>
                            <Text size="sm">
                              {definition.kind === "parry"
                                ? "Ответный урон здоровью"
                                : "Урон здоровью"}
                              :{" "}
                              {damageFormula(
                                healthDamagePerCell(action, state.stats[side]),
                                definition.shape.length,
                              )}
                            </Text>
                            <Text size="xs" color="muted">
                              {healthDamageExplanation(
                                action,
                                state.stats[side],
                              )}
                            </Text>
                            <Text size="sm">
                              Урон выносливости:{" "}
                              {damageFormula(
                                staminaDamage,
                                definition.shape.length,
                              )}
                            </Text>
                            <Text size="sm">{definition.description}</Text>
                          </>
                        ) : (
                          <>
                            <Text as="h3" size="lg">
                              {definition.name}
                            </Text>
                            <Text color="muted" size="sm">
                              Нет в колоде волка
                            </Text>
                          </>
                        )}
                      </article>
                    );
                  })}
                </div>
              );
            },
          )}
        </div>
      </section>
    </main>
  );
}
