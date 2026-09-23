import { isCombatActionEnabled } from "../../game/config/features";
import "./battle-result-dialog.css";
import { ModalFooter } from "../../shared/ui/ModalFooter";
import { GothicTextButton } from "../../shared/ui/GothicTextButton";
import { createPortal } from "react-dom";
import { Modal } from "../../shared/ui/Modal";
import { useFigureDrag } from "./useFigureDrag";
import "./square-battle-layout.css";
import { battleMode as journeyBattleMode } from "../../game/combat/battle-modes";
import { CombatForecast, ComboLinks, ComboNotes } from "./CombatForecast";
import { comboCandidates, groupCombos } from "../../game/combat/figure-combos";
import { useState, type CSSProperties } from "react";
import { RotateCw, Undo2, ArrowRight } from "lucide-react";
import { item } from "../../game/equipment/catalog";
import { canUse, maxHp } from "../../game/combat/engine";
import { canPlace, placementCells } from "../../game/combat/board";
import {
  reactionManeuvers,
  usedCells,
  isStrike,
  maneuverDamage,
} from "../../game/combat/reaction-rules";
import { ActionPalette, ActionSource, ActionFigure } from "./ActionFigures";
import type {
  BoardModifiers,
  Maneuver,
  Placement,
  PublicGame,
  Side,
  TurnRecord,
} from "../../game/types";
import { formatDamage } from "../../game/combat/battle-feedback";
import {
  previewClashDamage,
  preparationDamage,
} from "../../game/combat/clash-damage";
import { SpecialMark } from "../journey/AdventureUI";
import { specialHint } from "../../game/combat/battle-traits";
import { RockTerrain } from "./RockTerrain";
import "./board.css";
import "./reaction-board.css";
function LayerIcon({ m, side }: { m?: Maneuver; side: Side }) {
  return m ? (
    <span
      className={`cell-layer layer-${side}`}
      title={`${side === "player" ? "Вы" : "Противник"}: ${m.name}`}
    >
      <ActionSource m={m} />
    </span>
  ) : null;
}
export function ReactionBoard({
  game,
  busy,
  session,
  onSubmit,
  onInspect,
  onHeal,
  onFinish,
}: {
  game: PublicGame;
  busy: boolean;
  session: string;
  onSubmit: (payload: object) => Promise<void>;
  onInspect: (id: string) => void;
  onHeal?: () => void;
  onFinish?: () => void;
}) {
  const mode = journeyBattleMode(game.journey),
    limited = mode === "limited",
    canPass = mode === "expendable" && !game.player.prone;
  const plan = game.clash!,
    tokens = reactionManeuvers(game.player),
    enemyTokens = reactionManeuvers(game.enemy),
    key = `duelyant.clash4.${session}.${game.fight}.${game.round}`;
  const [initial] = useState(() => {
    try {
      const draft = JSON.parse(sessionStorage.getItem(key) ?? "null");
      if (draft && Array.isArray(draft.placed)) {
        const blocked = plan.blocked.filter(
          (n) => n !== plan.enemyModifiers?.unlocked,
        );
        const used: number[] = [];
        let okay = draft.placed.length <= 9;
        const ids = new Set();
        for (const p of draft.placed) {
          const m = tokens.find((m) => m.id === p.id);
          if (
            !m ||
            !isCombatActionEnabled(m.action) ||
            m.spent ||
            m.cooldown ||
            ids.has(p.id) ||
            !canPlace(m, p, blocked, used, draft.mod ?? {})
          ) {
            okay = false;
            break;
          }
          used.push(...placementCells(m, p, draft.mod ?? {}));
          ids.add(p.id);
        }
        if (okay && (!limited || used.length <= plan.playerBudget))
          return {
            placed: draft.placed as Placement[],
            mod: (draft.mod ?? {}) as BoardModifiers,
          };
      }
    } catch {
      /* Ignore malformed local drafts. */
    }
    return { placed: [] as Placement[], mod: {} as BoardModifiers };
  });
  const [placed, setPlaced] = useState<Placement[]>(initial.placed),
    [mod, setMod] = useState<BoardModifiers>(initial.mod),
    [selected, setSelected] = useState(
      tokens.find((m) => !m.spent && !m.cooldown)?.id ?? tokens[0].id,
    ),
    [rotation, setRotation] = useState(0),
    [cellSize, setCellSize] = useState(36),
    [hover, setHover] = useState<number | null>(null),
    [ringMode, setRingMode] = useState(false),
    [message, setMessage] = useState(""),
    [equip, setEquip] = useState("");
  const [finishConfirm, setFinishConfirm] = useState(false);
  const [rotations, setRotations] = useState<Record<string, number>>({}),
    [cellInfo, setCellInfo] = useState<number | null>(null);
  const enemy = plan.enemyPlaced ?? [],
    enemyMod = plan.enemyModifiers ?? {},
    blocked = plan.blocked.filter((n) => n !== enemyMod.unlocked),
    selectedToken = tokens.find((m) => m.id === selected) ?? tokens[0];
  const drag = useFigureDrag({
    onStart: (id) => {
      setSelected(id);
      const existing = placed.find((p) => p.id === id);
      setRotation(existing?.rotation ?? rotations[id] ?? 0);
      setRingMode(false);
      setMessage("");
    },
    onHover: setHover,
    onDrop: (n) => place(n),
  });
  const moving = drag.ghost?.id;
  const fixedPlaced = moving ? placed.filter((p) => p.id !== moving) : placed;
  const count = usedCells(game.player, placed, mod),
    occupied = fixedPlaced.flatMap((p) =>
      placementCells(
        tokens.find((m) => m.id === p.id)!,
        p,
        mod,
      ),
    );
  const candidate =
    hover === null
      ? null
      : { id: selected, x: hover % 3, y: Math.floor(hover / 3), rotation };
  const preview = candidate
      ? placementCells(selectedToken, candidate, mod)
      : [],
    validPreview =
      !busy &&
      !ringMode &&
      !selectedToken.cooldown &&
      !selectedToken.spent &&
      (!selectedToken.choiceGroup ||
        !placed.some(
          (p) =>
            tokens.find((t) => t.id === p.id)?.choiceGroup ===
              selectedToken.choiceGroup && p.id !== moving,
        )) &&
      placed.length < 9 &&
      (selectedToken.action !== "equip" || !!equip) &&
      !!candidate &&
      canPlace(selectedToken, candidate, blocked, occupied, mod) &&
      (!limited ||
        usedCells(game.player, fixedPlaced, mod) +
          (mod.compressed === selected ? 1 : selectedToken.shape.length) <=
          plan.playerBudget) &&
      (!placed.some((p) => p.id === selected) || moving === selected);
  const previewPlaced =
      validPreview && candidate ? [...fixedPlaced, candidate] : placed,
    forecast = previewClashDamage(game, previewPlaced, mod);
  const pending = groupCombos(comboCandidates(game.player, previewPlaced, mod));
  const potential = forecast
    ? null
    : preparationDamage(game.player, previewPlaced, mod, plan.special);
  const linked = {
    player: forecast?.sides.player.combos ?? pending,
    enemy: forecast?.sides.enemy.combos ?? [],
  };
  const comboCells = {
    player: linked.player.flatMap((c) => c.cells),
    enemy: linked.enemy.flatMap((c) => c.cells),
  };
  const baseline = validPreview
    ? previewClashDamage(game, placed, mod)
    : placed.length
      ? previewClashDamage(game, placed.slice(0, -1), mod)
      : null;
  function change(next: Placement[], mods = mod) {
    setPlaced(next);
    setMod(mods);
    setMessage("");
    sessionStorage.setItem(key, JSON.stringify({ placed: next, mod: mods }));
  }
  function place(n: number) {
    if (busy) return;
    setHover(null);
    if (ringMode) {
      if (!plan.blocked.includes(n)) {
        setMessage("Выберите скалу.");
        return;
      }
      const next = { ...mod };
      if (next.unlocked === n) delete next.unlocked;
      else next.unlocked = n;
      if (
        placed.some(
          (p) =>
            !canPlace(
              tokens.find((m) => m.id === p.id)!,
              p,
              blocked,
              [],
              next,
            ),
        )
      ) {
        setMessage("Сначала уберите свою фигуру со скалы.");
        return;
      }
      change(placed, next);
      setRingMode(false);
      return;
    }
    if (selectedToken.spent) {
      setMessage("Эта фигура уже использована в этом бою.");
      return;
    }
    if (selectedToken.cooldown) {
      setMessage("Приём восстанавливается: ещё один раунд.");
      return;
    }
    const remaining = placed.filter((p) => p.id !== selected);
    const occupied = remaining.flatMap((p) =>
      placementCells(
        tokens.find((m) => m.id === p.id)!,
        p,
        mod,
      ),
    );
    if (
      selectedToken.choiceGroup &&
      remaining.some(
        (p) =>
          tokens.find((m) => m.id === p.id)?.choiceGroup ===
          selectedToken.choiceGroup,
      )
    ) {
      setMessage("Можно выбрать один рисунок заклинания.");
      return;
    }
    if (
      limited &&
      usedCells(game.player, remaining, mod) +
        (mod.compressed === selected ? 1 : selectedToken.shape.length) >
        plan.playerBudget
    ) {
      setMessage(`Не хватает клеток. Ваш лимит — ${plan.playerBudget}.`);
      return;
    }
    if (selectedToken.action === "equip" && !equip) {
      setMessage("Выберите предмет для подбора.");
      return;
    }
    const p: Placement = {
      id: selected,
      x: n % 3,
      y: Math.floor(n / 3),
      rotation,
      ...(selectedToken.action === "equip" ? { itemId: equip } : {}),
    };
    if (!canPlace(selectedToken, p, blocked, occupied, mod)) {
      setMessage("Фигура не помещается: свой слой, скала или граница поля.");
      return;
    }
    change([...remaining, p]);
  }
  function clickCell(n: number) {
    if (drag.consumeClick()) return;
    if (ringMode) {
      place(n);
      return;
    }
    const own = placed.find((p) =>
      placementCells(
        tokens.find((m) => m.id === p.id)!,
        p,
        mod,
      ).includes(n),
    );
    if (own) {
      change(placed.filter((p) => p.id !== own.id));
      return;
    }
    setCellInfo(n);
  }
  function rotateFigure(id: string) {
    if (drag.consumeClick()) return;
    const next = ((rotations[id] ?? 0) + 1) % 4;
    setRotations((r) => ({ ...r, [id]: next }));
    setSelected(id);
    setRotation(next);
    setMessage("");
    setRingMode(false);
  }
  const infoPlacement =
    cellInfo === null
      ? undefined
      : enemy.find((p) =>
          placementCells(
            enemyTokens.find((m) => m.id === p.id)!,
            p,
            enemyMod,
          ).includes(cellInfo),
        );
  const infoFigure = infoPlacement
    ? enemyTokens.find((m) => m.id === infoPlacement.id)
    : undefined;
  function compress() {
    const next = { ...mod };
    if (next.compressed === selected) delete next.compressed;
    else next.compressed = selected;
    const used: number[] = [];
    for (const p of placed) {
      const m = tokens.find((m) => m.id === p.id)!;
      if (!canPlace(m, p, blocked, used, next)) {
        setMessage("Сначала освободите место для полной фигуры.");
        return;
      }
      used.push(...placementCells(m, p, next));
    }
    if (limited && used.length > plan.playerBudget) {
      setMessage("Отмена сжатия превышает лимит клеток.");
      return;
    }
    change(placed, next);
  }
  const damage = isStrike(selectedToken)
    ? maneuverDamage(game.player, selectedToken)
    : null;
  return (
    <section
      className="board-combat reaction-board"
      style={{ "--piece-cell": `${cellSize}px` } as CSSProperties}
      aria-label="Подготовка и реакция"
    >
      <div className="expedition-tools">
        {onHeal && (
          <button
            className="secondary"
            disabled={
              busy ||
              !!game.journey?.healUsed ||
              placed.length > 0 ||
              game.player.hp >= maxHp(game.player)
            }
            onClick={onHeal}
            title="Один заряд на путешествие. Восстанавливает 50% максимального здоровья. Применяется до размещения фигур, не занимает клетки."
          >
            {game.journey?.healUsed
              ? "Лечение: 0/1"
              : `Лечение: 1/1 · +${maxHp(game.player) * 0.5} HP`}
          </button>
        )}
      </div>
      <header className="planning-header">
        <div>
          <span className="eyebrow">
            {plan.preparer === "player" ? "01 · ПОДГОТОВКА" : "02 · РЕАКЦИЯ"}
          </span>
          <h2>
            {plan.preparer === "player"
              ? "Подготовьте действия"
              : "Ответьте поверх фигур врага"}
          </h2>
        </div>
        <span>
          {limited
            ? `${count}/${plan.playerBudget} клеток`
            : `${count} кл. · без лимита`}
        </span>
      </header>
      <div className="planning-workspace">
        <div className="board-column">
          <div
            className="action-board outcome-field terrain-board"
            role="group"
            aria-label="Общее поле 3 на 3"
          >
            <RockTerrain blocked={blocked} unlocked={[mod.unlocked]} />
            <ComboLinks combos={linked} />
            {Array.from({ length: 9 }, (_, n) => {
              const own = previewPlaced.find((p) =>
                  placementCells(
                    tokens.find((m) => m.id === p.id)!,
                    p,
                    mod,
                  ).includes(n),
                ),
                opposing = enemy.find((p) =>
                  placementCells(
                    enemyTokens.find((m) => m.id === p.id)!,
                    p,
                    enemyMod,
                  ).includes(n),
                );
              const a = own ? tokens.find((m) => m.id === own.id) : undefined,
                b = opposing
                  ? enemyTokens.find((m) => m.id === opposing.id)
                  : undefined,
                rock = blocked.includes(n) && mod.unlocked !== n,
                prediction = forecast?.cells[n];
              return (
                <button
                  key={n}
                  disabled={busy}
                  className={`board-cell terrain-cell ${rock ? "rock" : "grass"} ${a ? "own-layer" : ""} ${b ? "enemy-layer" : ""} ${comboCells.player.includes(n) ? "combo-player" : ""} ${comboCells.enemy.includes(n) ? "combo-enemy" : ""} ${preview.includes(n) ? (validPreview ? "valid-preview" : "invalid-preview") : ""}`}
                  data-board-cell={n}
                  onClick={() => clickCell(n)}
                  onPointerDown={(e) => {
                    const p = placed.find((p) =>
                      placementCells(
                        tokens.find((m) => m.id === p.id)!,
                        p,
                        mod,
                      ).includes(n),
                    );
                    if (p && !ringMode) drag.start(e, p.id);
                  }}
                  onPointerMove={drag.move}
                  onPointerUp={drag.end}
                  onPointerCancel={drag.cancel}
                  onDragStart={(e) => e.preventDefault()}
                  aria-label={`Клетка ${Math.floor(n / 3) + 1}, ${(n % 3) + 1}: ${a ? "вы — " + a.name + "; " : ""}${b ? "противник — " + b.name + "; " : ""}${rock ? "скала" : "земля"}${plan.special?.index === n ? "; " + specialHint(plan.special) : ""}${prediction ? `; прогноз: вы −${formatDamage(prediction.playerDamage)}, противник −${formatDamage(prediction.enemyDamage)} здоровья` : a && isStrike(a) && potential ? `; урон клетки до блока и брони: ${formatDamage(potential.potential[n])}${potential.conditional[n] > 0 ? `, ещё ${formatDamage(potential.conditional[n])} при блоке щитом` : ""}` : ""}`}
                  title={
                    prediction
                      ? `${plan.special?.index === n ? specialHint(plan.special) + " " : ""}Прогноз после брони: вы −${formatDamage(prediction.playerDamage)}, противник −${formatDamage(prediction.enemyDamage)} здоровья`
                      : undefined
                  }
                >
                  <SpecialMark special={plan.special} index={n} />
                  <LayerIcon m={a} side="player" />
                  <LayerIcon m={b} side="enemy" />
                  {rock && <small className="rock-mark">×</small>}
                  {(a || b) && prediction ? (
                    <span className="cell-damage">
                      <b className="damage-player">
                        −{formatDamage(prediction.playerDamage)}
                      </b>
                      <b className="damage-enemy">
                        −{formatDamage(prediction.enemyDamage)}
                      </b>
                    </span>
                  ) : (
                    a &&
                    isStrike(a) &&
                    potential && (
                      <span
                        className="cell-attack-power"
                        title="Урон этой клетки до блока и брони, с эффектами поля. Бонус контратаки сработает, только если связанный щит перекроет атаку."
                      >
                        <b>
                          {formatDamage(potential.potential[n])}{" "}
                          <small>ур.</small>
                        </b>
                        {potential.conditional[n] > 0 && (
                          <small>
                            +{formatDamage(potential.conditional[n])} при блоке
                          </small>
                        )}
                      </span>
                    )
                  )}
                </button>
              );
            })}
          </div>
          <div className="placement-tools">
            <div className="board-tools">
              <button disabled={busy} onClick={() => rotateFigure(selected)}>
                <RotateCw size={14} />
                Поворот
              </button>
              <button
                disabled={busy || !placed.length}
                onClick={() => change(placed.slice(0, -1))}
              >
                <Undo2 size={14} />
                Убрать
              </button>
            </div>
            <div className="charm-tools">
              <button
                disabled={
                  busy ||
                  game.player.gear.ring !== "unlock-ring" ||
                  game.player.charmsUsed?.ring
                }
                aria-pressed={ringMode}
                onClick={() => setRingMode(!ringMode)}
              >
                ◇ Кольцо{" "}
                {game.player.charmsUsed?.ring
                  ? "0/1"
                  : game.player.gear.ring
                    ? "1/1"
                    : "—"}
              </button>
              <button
                disabled={
                  busy ||
                  game.player.gear.amulet !== "fold-amulet" ||
                  game.player.charmsUsed?.amulet
                }
                aria-pressed={mod.compressed === selected}
                onClick={compress}
              >
                ◈ Амулет{" "}
                {game.player.charmsUsed?.amulet
                  ? "0/1"
                  : game.player.gear.amulet
                    ? "1/1"
                    : "—"}
              </button>
            </div>
            <CombatForecast
              forecast={forecast}
              baseline={baseline}
              hovering={!!validPreview}
              pending={pending}
            />
          </div>
        </div>
        <div className="maneuver-column">
          <ActionPalette
            fighter={game.player}
            tokens={tokens}
            selected={selected}
            rotation={rotation}
            mod={mod}
            placed={placed}
            busy={busy}
            onScale={setCellSize}
            rotations={rotations}
            onFigurePointerDown={drag.start}
            onFigurePointerMove={drag.move}
            onFigurePointerUp={drag.end}
            onFigurePointerCancel={drag.cancel}
            onSelect={rotateFigure}
          />
          {selectedToken.action === "equip" && (
            <div className="board-pickup">
              <select
                aria-label="Предмет для подбора"
                value={equip}
                onChange={(e) => setEquip(e.target.value)}
              >
                <option value="">Выберите предмет</option>
                {[...new Set(game.ground)]
                  .filter((id) => canUse(game.player, item(id)))
                  .map((id) => (
                    <option key={id} value={id}>
                      {item(id).name}
                    </option>
                  ))}
              </select>
              {equip && (
                <button onClick={() => onInspect(equip)}>Свойства</button>
              )}
            </div>
          )}
        </div>
      </div>
      {mode === "expendable" && onFinish && (
        <GothicTextButton
          disabled={busy}
          onClick={() => setFinishConfirm(true)}
        >
          Завершить действия
        </GothicTextButton>
      )}
      {finishConfirm && (
        <Modal
          title="Завершить действия?"
          close={() => setFinishConfirm(false)}
          size="small"
          className="battle-result-dialog"
        >
          <div className="battle-result-scroll">
            <p>
              Вы больше не сможете использовать фигуры в этом бою. Противник
              разыграет оставшиеся действия. Победит тот, у кого останется
              больше единиц здоровья.
            </p>
          </div>
          <ModalFooter>
            <GothicTextButton onClick={() => setFinishConfirm(false)}>
              Отмена
            </GothicTextButton>
            <GothicTextButton
              disabled={busy}
              onClick={() => {
                setFinishConfirm(false);
                onFinish?.();
              }}
            >
              Завершить
            </GothicTextButton>
          </ModalFooter>
        </Modal>
      )}
      <footer className="planning-footer">
        <div aria-live="polite">
          {message ||
            (ringMode
              ? "Нажмите скалу. Кольцо открывает её для обеих сторон."
              : `${forecast ? "Прогноз потерь здоровья: зелёное — ваши, медное — противника. " : ""}${damage !== null ? `${damage} урона на всю фигуру. ` : ""}${selectedToken.description}`)}
          {limited && game.player.offBalance && (
            <b> Потеря равновесия: лимит уменьшен на 1.</b>
          )}
        </div>
        <button
          className="primary"
          disabled={busy || (!placed.length && !canPass)}
          onClick={() => onSubmit({ placements: placed, modifiers: mod })}
        >
          {busy
            ? "Подсчёт…"
            : !placed.length && canPass
              ? "Пропустить ход"
              : plan.preparer === "player"
                ? "Передать реакцию"
                : "Подсчитать"}
          <ArrowRight size={16} />
        </button>
      </footer>
      {drag.ghost &&
        createPortal(
          <div
            className="figure-drag-ghost"
            style={{ left: drag.ghost.x + 12, top: drag.ghost.y - 28 }}
          >
            <ActionFigure
              m={tokens.find((m) => m.id === drag.ghost!.id)!}
              rotation={rotation}
              compressed={mod.compressed === selected}
            />
          </div>,
          document.body,
        )}
      {cellInfo !== null && (
        <Modal
          title={`Клетка ${Math.floor(cellInfo / 3) + 1}, ${(cellInfo % 3) + 1}`}
          size="small"
          className="cell-info-modal"
          close={() => setCellInfo(null)}
        >
          <div className="cell-info-content">
            {plan.special?.index === cellInfo && (
              <p>{specialHint(plan.special)}</p>
            )}
            {blocked.includes(cellInfo) && mod.unlocked !== cellInfo && (
              <p>
                Камень: сюда нельзя ставить фигуры, кроме особых фигур, которые
                игнорируют камни. Кольцо может открыть эту клетку.
              </p>
            )}
            {infoFigure && (
              <>
                <h3>{infoFigure.name}</h3>
                <ActionFigure
                  m={infoFigure}
                  rotation={infoPlacement?.rotation}
                  compressed={enemyMod.compressed === infoFigure.id}
                />
                <p>{infoFigure.description}</p>
                {isStrike(infoFigure) && (
                  <p>
                    Урон всей фигуры:{" "}
                    {formatDamage(maneuverDamage(game.enemy, infoFigure))}. Урон
                    этой клетки:{" "}
                    {formatDamage(
                      preparationDamage(
                        game.enemy,
                        enemy,
                        enemyMod,
                        plan.special,
                      ).potential[cellInfo],
                    )}{" "}
                    до блока и брони.
                  </p>
                )}
              </>
            )}
            {!infoFigure &&
              plan.special?.index !== cellInfo &&
              !blocked.includes(cellInfo) && (
                <p>Свободная клетка. Перетащите сюда свою фигуру.</p>
              )}
          </div>
        </Modal>
      )}
    </section>
  );
}
const interactionText = {
  evaded: "Уклонение: урон здоровью и стойке в этой клетке отменён",
  empty: "Пустая клетка",
  attack: "Атака в открытое место",
  blocked: "Эта часть атаки заблокирована",
  clash: "Обмен ударами: проходит 50% урона, по призраку — 75%",
  guard: "Блок против блока: без эффекта",
  pressure: "Блок на пустоте: −1 стойки за фигуру; при подъёме цели — 0",
  utility: "Вспомогательное действие",
};
export function ClashOutcome({
  turn,
  onDone,
  ending,
  showContinue = true,
}: {
  turn: TurnRecord;
  onDone: () => void;
  ending: string;
  showContinue?: boolean;
}) {
  const r = turn.clash!,
    [selected, setSelected] = useState<number | null>(null),
    cell = selected === null ? null : r.cells[selected];
  return (
    <section
      className="clash-outcome"
      aria-label={`Итог поля, ход ${turn.round}`}
    >
      <header>
        <span className="eyebrow">
          ХОД {turn.round} · ОДНОВРЕМЕННЫЙ ПОДСЧЁТ
        </span>
        <h2>Каждая клетка — столкновение</h2>
      </header>
      <div className="outcome-layout">
        <div
          className="outcome-field terrain-board"
          role="group"
          aria-label="Урон по клеткам"
        >
          <RockTerrain
            blocked={r.blocked}
            unlocked={[r.playerModifiers.unlocked, r.enemyModifiers.unlocked]}
          />
          {r.summary && (
            <ComboLinks
              combos={{
                player: r.summary.player.combos,
                enemy: r.summary.enemy.combos,
              }}
            />
          )}
          {r.cells.map((c) => {
            const rock =
              r.blocked.includes(c.index) &&
              r.playerModifiers.unlocked !== c.index &&
              r.enemyModifiers.unlocked !== c.index;
            return (
              <button
                key={c.index}
                onClick={() => setSelected(c.index)}
                className={`terrain-cell ${rock ? "rock" : "grass"} ${c.player ? "own-layer" : ""} ${c.enemy ? "enemy-layer" : ""}`}
                aria-pressed={selected === c.index}
                aria-label={`Клетка ${Math.floor(c.index / 3) + 1}, ${(c.index % 3) + 1}. Вы: −${formatDamage(c.playerDamage)}, противник: −${formatDamage(c.enemyDamage)}. ${interactionText[c.interaction]}`}
              >
                <SpecialMark special={r.special} index={c.index} />
                <LayerIcon m={c.player} side="player" />
                <LayerIcon m={c.enemy} side="enemy" />
                <span className="cell-damage">
                  <b className="damage-player">
                    −{formatDamage(c.playerDamage)}
                  </b>
                  <b className="damage-enemy">−{formatDamage(c.enemyDamage)}</b>
                </span>
              </button>
            );
          })}
        </div>
        <div className="outcome-info">
          <div className="outcome-totals">
            <p>
              <span>ВЫ</span>
              <strong>
                −{formatDamage(r.playerDamage)} <small>здоровья</small>
              </strong>
              <small>
                {r.summary
                  ? `Стойка: ${formatDamage(r.summary.player.poiseBefore)} → ${formatDamage(r.summary.player.poiseAfter)}`
                  : `−${r.playerPoiseLoss} стойки`}
              </small>
              {!!r.summary?.player.healed && (
                <small>
                  Лечение: +{formatDamage(r.summary.player.healed)} здоровья
                </small>
              )}
            </p>
            <p>
              <span>ПРОТИВНИК</span>
              <strong>
                −{formatDamage(r.enemyDamage)} <small>здоровья</small>
              </strong>
              <small>
                {r.summary
                  ? `Стойка: ${formatDamage(r.summary.enemy.poiseBefore)} → ${formatDamage(r.summary.enemy.poiseAfter)}`
                  : `−${r.enemyPoiseLoss} стойки`}
              </small>
              {!!r.summary?.enemy.healed && (
                <small>
                  Лечение: +{formatDamage(r.summary.enemy.healed)} здоровья
                </small>
              )}
            </p>
          </div>
          {r.summary && <ComboNotes sides={r.summary} />}
          <p className="cell-explanation" aria-live="polite">
            {cell ? (
              <>
                <b>
                  Клетка {Math.floor(cell.index / 3) + 1},{" "}
                  {(cell.index % 3) + 1}
                </b>
                <span>
                  {cell.player?.name ?? "Пусто"} / {cell.enemy?.name ?? "Пусто"}
                </span>
                {interactionText[cell.interaction]}. Урон после брони и с учётом
                оставшегося здоровья.
              </>
            ) : (
              "Выберите клетку для объяснения. Зелёное число — потеряли вы, медное — противник. Броня вычитается один раз из каждого действия."
            )}
          </p>
        </div>
      </div>
      {showContinue && (
        <footer className="planning-footer">
          <div>Оба слоя применены одновременно.</div>
          <button className="primary" onClick={onDone}>
            {ending}
            <ArrowRight size={16} />
          </button>
        </footer>
      )}
    </section>
  );
}
